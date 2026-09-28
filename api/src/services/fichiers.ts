/**
 * Téléversement sécurisé des fichiers (ADR-0005) : type vérifié par **signature** (et non par
 * l'extension ou le type annoncé par le navigateur), taille limitée, images ré-encodées et
 * redimensionnées — ce qui supprime au passage les métadonnées EXIF (géolocalisation notamment).
 *
 * Redimensionnement et enregistrement des fichiers téléversés (sharp).
 */
import { randomBytes } from 'node:crypto';
import { mkdirSync, unlinkSync } from 'node:fs';
import { extname, join, relative, resolve } from 'node:path';
import sharp from 'sharp';
import { config } from '../config.js';
import { erreur } from '../erreurs.js';

export const IMAGE = 'image';
export const PDF = 'pdf';
export const AUDIO = 'audio';
export const VIDEO = 'video';

export type GenreFichier = typeof IMAGE | typeof PDF | typeof AUDIO | typeof VIDEO;

/** Débuts de fichier des MP3 (ID3 ou trame MPEG). */
const SIGNATURES_AUDIO = [
	Buffer.from('ID3', 'latin1'),
	Buffer.from([0xff, 0xfb]),
	Buffer.from([0xff, 0xf3]),
	Buffer.from([0xff, 0xf2])
];

/** Reconnaît le type réel d'un fichier d'après ses premiers octets. */
function detecter(entete: Buffer): GenreFichier | null {
	if (entete.subarray(0, 4).toString('latin1') === '%PDF') return PDF;
	if (entete.subarray(4, 8).toString('latin1') === 'ftyp') return VIDEO;
	if (SIGNATURES_AUDIO.some((s) => entete.subarray(0, s.length).equals(s))) return AUDIO;

	const jpeg = entete.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]));
	const png = entete
		.subarray(0, 8)
		.equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
	const webp = entete.subarray(8, 12).toString('latin1') === 'WEBP';
	const gif = ['GIF87a', 'GIF89a'].includes(entete.subarray(0, 6).toString('latin1'));
	if (jpeg || png || webp || gif) return IMAGE;
	return null;
}

const EXTENSIONS: Record<Exclude<GenreFichier, typeof IMAGE>, string> = {
	[PDF]: 'pdf',
	[AUDIO]: 'mp3',
	[VIDEO]: 'mp4'
};

/**
 * Enregistre le fichier sous `media/<dossier>/` et retourne son chemin relatif
 * (`dossier/nom.ext`), tel qu'il est stocké en base.
 */
export async function enregistrer(
	contenu: Buffer,
	dossier: string,
	types: Set<GenreFichier>,
	champ = 'fichier'
): Promise<string> {
	if (!contenu || contenu.length === 0) {
		throw erreur('Le fichier est vide.', { [champ]: 'Le fichier est vide.' });
	}
	if (contenu.length > config.uploadMaxOctets) {
		const mo = Math.floor(config.uploadMaxOctets / (1024 * 1024));
		throw erreur(`Fichier trop volumineux (maximum ${mo} Mo).`, { [champ]: `Maximum ${mo} Mo.` });
	}
	const genre = detecter(contenu.subarray(0, 16));
	if (!genre || !types.has(genre)) {
		const attendus = [...types].sort().join(', ');
		throw erreur('Type de fichier non accepté.', { [champ]: `Formats acceptés : ${attendus}.` });
	}

	const cible = join(config.mediaDir, dossier);
	mkdirSync(cible, { recursive: true });
	const nom = randomBytes(8).toString('hex');

	if (genre === IMAGE) {
		try {
			await sharp(contenu)
				// `rotate()` sans argument applique l'orientation EXIF avant de la supprimer.
				.rotate()
				.resize({
					width: config.photoLargeurMax,
					height: config.photoLargeurMax,
					fit: 'inside',
					withoutEnlargement: true
				})
				.jpeg({ quality: 82, progressive: true, mozjpeg: true })
				.toFile(join(cible, `${nom}.jpg`));
		} catch {
			throw erreur('Image illisible.', { [champ]: 'Image illisible ou corrompue.' });
		}
		return `${dossier}/${nom}.jpg`;
	}

	const extension = EXTENSIONS[genre];
	const { writeFileSync } = await import('node:fs');
	writeFileSync(join(cible, `${nom}.${extension}`), contenu);
	return `${dossier}/${nom}.${extension}`;
}

/** Supprime un fichier téléversé, en refusant tout chemin sortant du dossier `media`. */
export function supprimer(cheminRelatif: string | null | undefined): void {
	if (!cheminRelatif) return;
	const racine = resolve(config.mediaDir);
	const cible = resolve(racine, cheminRelatif);
	const dansRacine = !relative(racine, cible).startsWith('..');
	if (!dansRacine) return;
	try {
		unlinkSync(cible);
	} catch {
		// Fichier déjà absent : rien à faire.
	}
}

export function url(cheminRelatif: string | null | undefined): string | null {
	return cheminRelatif ? `${config.mediaUrl}/${cheminRelatif}` : null;
}

export function genreFichier(cheminRelatif: string): GenreFichier {
	const extension = extname(cheminRelatif).toLowerCase();
	const table: Record<string, GenreFichier> = {
		'.jpg': IMAGE,
		'.pdf': PDF,
		'.mp3': AUDIO,
		'.mp4': VIDEO
	};
	return table[extension] ?? IMAGE;
}

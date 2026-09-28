/**
 * Règles de diffusion des publicités (portage de `app/services/publicites.py` ;
 * legacy incl-publicite.php, incl-affichpub.php).
 */
import { TypeFichierPub } from '../enums.js';
import { AUDIO, genreFichier, IMAGE, VIDEO, type GenreFichier } from './fichiers.js';

/** Type déclaré → genre de fichier accepté au téléversement. */
export const GENRE_ATTENDU: Record<number, GenreFichier> = {
	[TypeFichierPub.IMAGE]: IMAGE,
	[TypeFichierPub.SON]: AUDIO,
	[TypeFichierPub.VIDEO]: VIDEO
};

export const FORMATS: Record<string, string> = {
	[IMAGE]: 'une image JPG, PNG ou WebP',
	[AUDIO]: 'un son MP3',
	[VIDEO]: 'une vidéo MP4'
};

/** Genre réel du fichier → libellé court utilisé par le frontend. */
const GENRE_PUBLIC: Record<string, string> = {
	[IMAGE]: 'image',
	[AUDIO]: 'son',
	[VIDEO]: 'video'
};

/** Robots d'indexation et aperçus de liens : ils ne comptent pas comme des vues. */
const ROBOTS = /bot|crawl|spider|slurp|facebookexternalhit|whatsapp|preview|lighthouse/i;

interface PubliciteDiffusable {
	etat: number;
	date_debut: Date | null;
	date_fin: Date | null;
}

/** Le jour civil, heure locale, pour comparer des dates sans heure. */
function jourCivil(d: Date): number {
	return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

/** Active (état 2) et dans sa fenêtre de dates. */
export function enDiffusion(pub: PubliciteDiffusable, jour?: Date): boolean {
	if (pub.etat !== 2 || !pub.date_debut || !pub.date_fin) return false;
	const reference = jourCivil(jour ?? new Date());
	return jourCivil(pub.date_debut) <= reference && reference <= jourCivil(pub.date_fin);
}

/** Genre du fichier réellement enregistré (correctif F-TRV-47 : la vignette suit le vrai type). */
export function genreReel(chemin: string | null | undefined): string | null {
	if (!chemin) return null;
	return GENRE_PUBLIC[genreFichier(chemin)] ?? null;
}

/**
 * Texte affichable : le legacy stockait du HTML saisi à la main (barre d'édition) ; on garde les
 * sauts de ligne et on retire balises et entités (le frontend échappe ensuite tout le texte).
 */
export function texteBrut(texte: string | null | undefined): string {
	let t = (texte ?? '').replace(/<br\s*\/?>/gi, '\n');
	t = t.replace(/<\/p\s*>/gi, '\n\n');
	t = t.replace(/<[^>]*>/g, '');
	t = desechapper(t).replace(/\r\n/g, '\n');
	return t.replace(/\n{3,}/g, '\n\n').trim();
}

/** Remplace les entités HTML courantes (équivalent de `html.unescape` pour ce qui est stocké). */
function desechapper(texte: string): string {
	const nommees: Record<string, string> = {
		'&amp;': '&',
		'&lt;': '<',
		'&gt;': '>',
		'&quot;': '"',
		'&#39;': "'",
		'&apos;': "'",
		'&nbsp;': ' ',
		'&eacute;': 'é',
		'&egrave;': 'è',
		'&ecirc;': 'ê',
		'&agrave;': 'à',
		'&ccedil;': 'ç',
		'&ugrave;': 'ù',
		'&ocirc;': 'ô',
		'&icirc;': 'î',
		'&iuml;': 'ï',
		'&acirc;': 'â',
		'&ucirc;': 'û',
		'&euml;': 'ë'
	};
	return texte
		.replace(/&#x([0-9a-f]+);/gi, (_, hex: string) => String.fromCodePoint(parseInt(hex, 16)))
		.replace(/&#(\d+);/g, (_, dec: string) => String.fromCodePoint(Number(dec)))
		.replace(/&[a-z]+;/gi, (entite) => nommees[entite.toLowerCase()] ?? entite);
}

export function estRobot(agent: string | null | undefined): boolean {
	return !!agent && ROBOTS.test(agent);
}

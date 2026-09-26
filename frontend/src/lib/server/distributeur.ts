/**
 * Assistant d'adhésion distributeur : lecture du formulaire d'une étape et construction du corps
 * attendu par `PUT /distributeur/souscription` (seuls les champs de l'étape sont utiles).
 */

function texte(fd: FormData, champ: string): string {
	const v = fd.get(champ);
	return typeof v === 'string' ? v.trim() : '';
}

function entier(fd: FormData, champ: string): number {
	const n = Math.trunc(Number(texte(fd, champ).replace(/\s/g, '')));
	return Number.isFinite(n) && n > 0 ? n : 0;
}

function dateOuNull(fd: FormData, champ: string): string | null {
	return texte(fd, champ) || null;
}

export const NOMBRE_PROSPECTS = 25;
export const NOMBRE_FILLEULS = 3;

export function corpsEtape(fd: FormData, etape: number): Record<string, unknown> {
	switch (etape) {
		case 1:
			return { objectifs: texte(fd, 'objectifs') };
		case 2:
			return { mon_histoire: texte(fd, 'mon_histoire') };
		case 3:
			return { disponibilite_hebdo: entier(fd, 'disponibilite_hebdo') };
		case 4: {
			const prospects = [];
			for (let i = 1; i <= NOMBRE_PROSPECTS; i++) {
				const p = {
					nom_prenom: texte(fd, `prospect_${i}_nom`),
					telephone: texte(fd, `prospect_${i}_tel`),
					email: texte(fd, `prospect_${i}_email`),
					commentaire: texte(fd, `prospect_${i}_commentaire`)
				};
				if (p.nom_prenom || p.telephone || p.email || p.commentaire) prospects.push(p);
			}
			return { prospects, date_limite_complement: dateOuNull(fd, 'date_limite_complement') };
		}
		case 5:
			return {
				formations: [1, 2, 3, 4].map((p) => ({
					prestation: p,
					date: dateOuNull(fd, `formation_${p}_date`),
					lieu: texte(fd, `formation_${p}_lieu`),
					heure: texte(fd, `formation_${p}_heure`)
				}))
			};
		case 7:
			return { nombre_rdv: Math.min(999, entier(fd, 'nombre_rdv')) };
		case 8: {
			const filleuls = [];
			for (let i = 1; i <= NOMBRE_FILLEULS; i++) {
				const f = {
					nom: texte(fd, `filleul_${i}_nom`),
					email: texte(fd, `filleul_${i}_email`),
					adresse: texte(fd, `filleul_${i}_adresse`),
					montant: entier(fd, `filleul_${i}_montant`),
					date_presentation: dateOuNull(fd, `filleul_${i}_date`)
				};
				if (f.nom || f.email || f.adresse || f.montant || f.date_presentation) filleuls.push(f);
			}
			return { filleuls };
		}
		case 9: {
			const produits: { produit_id: number; quantite: number }[] = [];
			for (const [cle] of fd.entries()) {
				const m = /^kit_(\d+)$/.exec(cle);
				if (m) produits.push({ produit_id: Number(m[1]), quantite: Math.min(999, entier(fd, cle)) });
			}
			return { mode_souscription: entier(fd, 'mode_souscription'), produits: produits.filter((p) => p.quantite > 0) };
		}
		default:
			return {};
	}
}

/** Valeurs brutes du formulaire, pour le réafficher tel quel après une erreur. */
export function valeursBrutes(fd: FormData): Record<string, string> {
	const out: Record<string, string> = {};
	for (const [cle, v] of fd.entries()) if (typeof v === 'string') out[cle] = v;
	return out;
}

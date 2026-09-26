/** Lecture des formulaires Likelemba (groupe, adhésion avec caution et 3 témoins). */
import { lireFormulaire } from './api';

export function lireGroupe(fd: FormData) {
	return lireFormulaire(fd, {
		responsable_id: 'entier?',
		montant_cotisation: 'entier',
		periodicite: 'entier?',
		date_debut: 'date?',
		observation: 'texte'
	});
}

/**
 * Les témoins arrivent à plat (`temoin1_nom`, `temoin1_telephone`…) : on garde ces clés dans les
 * valeurs réaffichées en cas d'erreur, et on construit la liste attendue par l'API.
 */
export function lireAdhesion(fd: FormData) {
	const valeurs = lireFormulaire(fd, {
		membre_id: 'entier?',
		date_entree: 'date?',
		observation: 'texte',
		caution_nom: 'texte',
		caution_est_membre: 'bool',
		caution_piece_identite: 'texte',
		caution_adresse: 'texte',
		caution_activite: 'texte',
		caution_telephone: 'texte',
		...Object.fromEntries(
			[1, 2, 3].flatMap((i) => [
				[`temoin${i}_nom`, 'texte'] as const,
				[`temoin${i}_telephone`, 'texte'] as const,
				[`temoin${i}_emploi`, 'texte'] as const,
				[`temoin${i}_est_membre`, 'bool'] as const
			])
		)
	});
	const temoins = [1, 2, 3].map((i) => ({
		nom: valeurs[`temoin${i}_nom`],
		telephone: valeurs[`temoin${i}_telephone`],
		emploi: valeurs[`temoin${i}_emploi`],
		est_membre: valeurs[`temoin${i}_est_membre`]
	}));
	const corps: Record<string, unknown> = { temoins };
	for (const [cle, v] of Object.entries(valeurs)) if (!cle.startsWith('temoin')) corps[cle] = v;
	return { valeurs, corps };
}

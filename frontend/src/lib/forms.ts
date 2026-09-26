/** Aides pour réafficher un formulaire après une action (valeurs saisies + erreurs par champ). */

type Retour = { cle?: string; valeurs?: Record<string, unknown>; champs?: Record<string, string> } | null | undefined;

/**
 * `<Saisie label="Nom" {...champ(form, 'nom', data.fiche?.nom)} />`
 * Renvoie `{name, value, erreur}` ; la valeur saisie prime sur la valeur initiale après une erreur.
 */
export function champ(form: Retour, nom: string, initiale: unknown = '', cle?: string) {
	const actif = form && (!cle || form.cle === cle) ? form : null;
	const saisi = actif?.valeurs?.[nom];
	const valeur = saisi !== undefined ? saisi : initiale;
	return {
		name: nom,
		value: valeur === null || valeur === undefined ? '' : (valeur as string | number),
		erreur: actif?.champs?.[nom]
	};
}

export function erreur(form: Retour, nom: string, cle?: string): string | undefined {
	return form && (!cle || form.cle === cle) ? form.champs?.[nom] : undefined;
}

export function valeur<T>(form: Retour, nom: string, initiale: T, cle?: string): T {
	const actif = form && (!cle || form.cle === cle) ? form : null;
	const v = actif?.valeurs?.[nom];
	return (v !== undefined ? v : initiale) as T;
}

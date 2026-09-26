<script lang="ts">
	/**
	 * Champs d'un ordre de virement (S7-10). `suffixe` = « _0 », « _1 »… dans la grille de saisie,
	 * vide sur la fiche. Les valeurs réaffichées après une erreur priment sur `initial`.
	 */
	import { page } from '$app/state';
	import Saisie from '$lib/components/ui/Saisie.svelte';
	import Liste from '$lib/components/ui/Liste.svelte';
	import ChoixBanque from './ChoixBanque.svelte';
	import { champ } from '$lib/forms';
	import type { BanqueCourte, OperationDetail } from '$lib/types/tresorerie';

	type Retour = { valeurs?: Record<string, unknown>; champs?: Record<string, string> } | null | undefined;

	let {
		form,
		banques,
		suffixe = '',
		initial = null
	}: {
		form: Retour;
		banques: BanqueCourte[];
		suffixe?: string;
		initial?: OperationDetail | null;
	} = $props();

	const c = (nom: string, init: unknown = '') => champ(form, nom + suffixe, init);
	const enums = $derived(page.data.enums ?? {});
	const idOuAutre = (id: number | null | undefined, nom: string | undefined) => (id ? String(id) : nom ? 'autre' : '');
	const saisi = (nom: string) => form?.valeurs?.[nom + suffixe] as string | undefined;
</script>

<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
	<Saisie label="Date de l'opération" type="date" requis {...c('date_operation', initial?.date_operation)} />
	<div class="grid grid-cols-[1fr_7rem] gap-2">
		<Saisie label="Montant" inputmode="numeric" requis autocomplete="off" {...c('montant', initial?.montant)} />
		<Liste label="Devise" options={enums.Devise ?? []} vide={null} {...c('devise', initial?.devise ?? 1)} />
	</div>
	<Liste label="Type d'opération" requis options={enums.TypeOperationBanque ?? []} {...c('type_operation', initial?.type_operation)} />

	<ChoixBanque
		label="Banque émettrice"
		name="banque_emettrice_id{suffixe}"
		nomLibre="banque_emettrice_nom{suffixe}"
		{banques}
		requis
		valeur={saisi('banque_emettrice_id') ?? idOuAutre(initial?.banque_emettrice_id, initial?.banque_emettrice_nom)}
		valeurLibre={saisi('banque_emettrice_nom') ?? initial?.banque_emettrice_nom ?? ''}
		erreur={form?.champs?.[`banque_emettrice_id${suffixe}`]}
	/>
	<Saisie
		label="E-mail de la banque émettrice"
		type="email"
		aide="L'ordre lui est envoyé automatiquement."
		autocomplete="off"
		{...c('banque_emettrice_email', initial?.banque_emettrice_email)}
	/>
	<Saisie label="Bénéficiaire" requis autocomplete="off" {...c('beneficiaire', initial?.beneficiaire)} />

	<ChoixBanque
		label="Banque du bénéficiaire"
		name="banque_beneficiaire_id{suffixe}"
		nomLibre="banque_beneficiaire_nom{suffixe}"
		{banques}
		aide="Facultatif pour un versement ou un retrait."
		valeur={saisi('banque_beneficiaire_id') ?? idOuAutre(initial?.banque_beneficiaire_id, initial?.banque_beneficiaire_nom)}
		valeurLibre={saisi('banque_beneficiaire_nom') ?? initial?.banque_beneficiaire_nom ?? ''}
		erreur={form?.champs?.[`banque_beneficiaire_id${suffixe}`]}
	/>
	<Saisie label="Adresse de la banque du bénéficiaire" autocomplete="off" {...c('banque_beneficiaire_adresse', initial?.banque_beneficiaire_adresse)} />
</div>

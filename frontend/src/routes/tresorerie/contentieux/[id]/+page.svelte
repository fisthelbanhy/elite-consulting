<script lang="ts">
	import EnTeteTresorerie from '$lib/components/tresorerie/EnTeteTresorerie.svelte';
	import FormulaireContentieux from '$lib/components/tresorerie/FormulaireContentieux.svelte';
	import PanneauFiche from '$lib/components/tresorerie/PanneauFiche.svelte';
	import FilDialogue from '$lib/components/dialogues/FilDialogue.svelte';
	import Alerte from '$lib/components/ui/Alerte.svelte';
	import { date, fcfa } from '$lib/format';

	let { data, form } = $props();
	const c = $derived(data.fiche);
	const edition = $derived(data.modifier && c.peut_modifier);
	const reste = $derived(c.revenus_mensuels - c.charges_fixes - c.charges_variables);
	const lignes = $derived<[string, number, string][]>([
		['Dette compromise', c.dette_compromise, c.dette_compromise_detail],
		['Revenus journaliers', c.revenus_journaliers, c.revenus_journaliers_detail],
		['Revenus hebdomadaires', c.revenus_hebdomadaires, c.revenus_hebdomadaires_detail],
		['Revenus mensuels', c.revenus_mensuels, c.revenus_mensuels_detail],
		['Charges fixes mensuelles', c.charges_fixes, c.charges_fixes_detail],
		['Charges variables mensuelles', c.charges_variables, c.charges_variables_detail],
		['Entrées attendues sur les activités en cours', c.entrees_activite_en_cours, c.entrees_activite_en_cours_detail],
		['Entrées attendues sur l’activité prévisionnelle', c.entrees_previsionnelles, c.entrees_previsionnelles_detail],
		['Entrées attendues au total', c.entrees_totales, c.entrees_totales_detail],
		['Échéance supportable', c.echeance_supportable, c.echeance_supportable_detail]
	]);
	const textes = $derived<[string, string][]>([
		['Échéance actuelle du crédit', c.echeance_actuelle],
		['Activités en cours', c.activites_en_cours],
		['Activité prévisionnelle', c.activite_previsionnelle],
		['Éléments favorables', c.elements_favorables]
	]);
</script>

<svelte:head>
	<title>Contentieux {c.reference} — {data.parametres.nom_site}</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<EnTeteTresorerie titre="Contentieux {c.reference}" fil={[{ href: '/tresorerie/contentieux', label: 'Contentieux' }]} />

<div class="conteneur grid gap-8 py-8 lg:grid-cols-[1fr_20rem]">
	<div class="space-y-6">
		{#if data.enregistre}<Alerte type="succes" titre="Ce contentieux est enregistré.">Référence {c.reference}. Un conseiller étudie votre situation et vous écrit ici.</Alerte>{/if}
		{#if data.modifie}<Alerte type="succes" titre="Modification effectuée." />{/if}
		{#if edition}
			<FormulaireContentieux {form} initial={c} action="?/modifier" annuler="/tresorerie/contentieux/{c.id}" />
		{:else}
			<section class="carte p-6">
				<p class="text-sm text-ardoise">Dossier du {date(c.date_dossier)}{#if c.membre && data.membre?.est_gestionnaire} · membre <strong class="text-encre">{c.membre.pseudonyme}</strong>{/if}</p>
				<div class="mt-4 overflow-x-auto">
					<table class="w-full text-left text-[15px]">
						<caption class="sr-only">Montants du dossier</caption>
						<thead class="text-sm text-ardoise"><tr><th scope="col" class="py-2 pr-4 font-semibold">Rubrique</th><th scope="col" class="py-2 pr-4 text-right font-semibold">Montant</th><th scope="col" class="py-2 font-semibold">Détail</th></tr></thead>
						<tbody class="divide-y divide-fleuve-900/5">
							{#each lignes as [l, m, d] (l)}
								<tr><th scope="row" class="py-2 pr-4 font-semibold">{l}</th><td class="montant py-2 pr-4 text-right">{fcfa(m)}</td><td class="py-2 whitespace-pre-line text-ardoise">{d || '—'}</td></tr>
							{/each}
						</tbody>
					</table>
				</div>
				<p class="mt-4 rounded-xl bg-creme p-4">
					Reste mensuel indicatif : <strong class="montant {reste < 0 ? 'text-alerte' : 'text-foret-700'}">{fcfa(reste)}</strong>
				</p>
				{#each textes as [l, v] (l)}
					{#if v}<h2 class="mt-6 text-lg font-bold">{l}</h2><p class="mt-1 whitespace-pre-line">{v}</p>{/if}
				{/each}
			</section>
		{/if}
		<FilDialogue dialogue={data.dialogue} {form} sujet="ce dossier" />
	</div>
	<div>
		<PanneauFiche etat={c.etat} peutModerer={c.peut_moderer} peutModifier={c.peut_modifier && !edition} peutAnnuler={c.peut_annuler} lienModifier="?modifier=1" {form} />
	</div>
</div>

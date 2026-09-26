<script lang="ts">
	import EnTeteTresorerie from '$lib/components/tresorerie/EnTeteTresorerie.svelte';
	import FormulairePlacement from '$lib/components/tresorerie/FormulairePlacement.svelte';
	import PanneauFiche from '$lib/components/tresorerie/PanneauFiche.svelte';
	import FilDialogue from '$lib/components/dialogues/FilDialogue.svelte';
	import Alerte from '$lib/components/ui/Alerte.svelte';
	import { date, fcfa, libelle } from '$lib/format';

	let { data, form } = $props();
	const p = $derived(data.fiche);
	const edition = $derived(data.modifier && p.peut_modifier);
	const details = $derived<[string, string][]>([
		['Type', libelle(data.enums, 'TypePlacement', p.type_placement)],
		['Montant', fcfa(p.montant)],
		['Durée', `${p.duree_mois} mois`],
		['Taux escompté', `${p.taux} %`],
		...(p.secteur_activite ? ([['Secteur d’activité', p.secteur_activite]] as [string, string][]) : []),
		['Date de la demande', date(p.date_placement)],
		...(p.membre && data.membre?.est_gestionnaire ? ([['Membre', p.membre.pseudonyme]] as [string, string][]) : [])
	]);
</script>

<svelte:head>
	<title>Placement {p.reference} — {data.parametres.nom_site}</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<EnTeteTresorerie titre="Placement {p.reference}" fil={[{ href: '/tresorerie/placements', label: 'Placements' }]} />

<div class="conteneur grid gap-8 py-8 lg:grid-cols-[1fr_20rem]">
	<div class="space-y-6">
		{#if data.enregistre}<Alerte type="succes" titre="Le placement est enregistré.">Référence {p.reference}. Un conseiller étudie votre demande et revient vers vous.</Alerte>{/if}
		{#if data.modifie}<Alerte type="succes" titre="Modification effectuée." />{/if}

		{#if edition}
			<FormulairePlacement {form} banques={data.banques} initial={p} action="?/modifier" annuler="/tresorerie/placements/{p.id}" />
		{:else}
			<section class="carte p-6">
				<dl class="grid gap-x-8 gap-y-3 sm:grid-cols-2">
					{#each details as [l, v] (l)}<div><dt class="text-sm text-ardoise">{l}</dt><dd class="font-semibold">{v}</dd></div>{/each}
				</dl>
				<h2 class="mt-6 text-lg font-bold">Banques consultées</h2>
				<ul class="mt-2 flex flex-wrap gap-2">
					{#each p.banques as b (b.id)}<li class="rounded-full bg-fleuve-50 px-3 py-1 text-sm font-semibold text-fleuve-700">{b.nom}</li>{:else}<li class="text-ardoise">—</li>{/each}
				</ul>
				{#if p.observation}<h2 class="mt-6 text-lg font-bold">Observation</h2><p class="mt-2 whitespace-pre-line">{p.observation}</p>{/if}
			</section>
		{/if}
		<FilDialogue dialogue={data.dialogue} {form} sujet="ce placement" />
	</div>
	<div>
		<PanneauFiche etat={p.etat} peutModerer={p.peut_moderer} peutModifier={p.peut_modifier && !edition} peutAnnuler={p.peut_annuler} lienModifier="?modifier=1" {form} />
	</div>
</div>

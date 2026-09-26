<script lang="ts">
	import EnTeteTresorerie from '$lib/components/tresorerie/EnTeteTresorerie.svelte';
	import FormulaireCredit from '$lib/components/tresorerie/FormulaireCredit.svelte';
	import PanneauFiche from '$lib/components/tresorerie/PanneauFiche.svelte';
	import FilDialogue from '$lib/components/dialogues/FilDialogue.svelte';
	import Alerte from '$lib/components/ui/Alerte.svelte';
	import Jauge from '$lib/components/ui/Jauge.svelte';
	import { date, fcfa } from '$lib/format';

	let { data, form } = $props();
	const c = $derived(data.fiche);
	const edition = $derived(data.modifier && c.peut_modifier);
	const textes = $derived<[string, string][]>([
		['Objet', c.objet],
		['Garantie proposée', c.garantie],
		['Devis global du projet', c.devis_global],
		['Apport sur fonds propres', c.apport_propre],
		['Observation et choix des banques', c.observation]
	]);
</script>

<svelte:head>
	<title>Demande de crédit {c.reference} — {data.parametres.nom_site}</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<EnTeteTresorerie titre="Demande de crédit {c.reference}" fil={[{ href: '/tresorerie/credits', label: 'Demandes de crédit' }]} />

<div class="conteneur grid gap-8 py-8 lg:grid-cols-[1fr_20rem]">
	<div class="space-y-6">
		{#if data.enregistre}<Alerte type="succes" titre="Votre demande de crédit est enregistrée.">Référence {c.reference}. Un conseiller la relit et vous écrit ici.</Alerte>{/if}
		{#if data.modifie}<Alerte type="succes" titre="Modification effectuée." />{/if}
		{#if edition}
			<FormulaireCredit {form} initial={c} action="?/modifier" annuler="/tresorerie/credits/{c.id}" />
		{:else}
			<section class="carte space-y-6 p-6">
				<dl class="grid gap-x-8 gap-y-3 sm:grid-cols-3">
					<div><dt class="text-sm text-ardoise">Montant</dt><dd class="montant text-xl font-bold">{fcfa(c.montant)}</dd></div>
					<div><dt class="text-sm text-ardoise">Durée</dt><dd class="font-semibold">{c.duree_mois} mois</dd></div>
					<div><dt class="text-sm text-ardoise">Réponse souhaitée</dt><dd class="font-semibold">{c.delai_reponse_jours ? `sous ${c.delai_reponse_jours} jours` : '—'}</dd></div>
					<div><dt class="text-sm text-ardoise">Date</dt><dd class="font-semibold">{date(c.date_demande)}</dd></div>
					{#if c.membre && data.membre?.est_gestionnaire}<div><dt class="text-sm text-ardoise">Membre</dt><dd class="font-semibold">{c.membre.pseudonyme}</dd></div>{/if}
				</dl>
				<div>
					<p class="mb-1 text-sm text-ardoise">Niveau de réalisation du projet : <strong class="text-encre">{c.niveau_realisation} %</strong></p>
					<Jauge valeur={c.niveau_realisation} max={100} label="Niveau de réalisation du projet" couleur="fleuve" />
				</div>
				{#each textes as [l, v] (l)}
					{#if v}<div><h2 class="text-lg font-bold">{l}</h2><p class="mt-1 whitespace-pre-line">{v}</p></div>{/if}
				{/each}
			</section>
		{/if}
		<FilDialogue dialogue={data.dialogue} {form} sujet="cette demande de crédit" />
	</div>
	<div>
		<PanneauFiche etat={c.etat} peutModerer={c.peut_moderer} peutModifier={c.peut_modifier && !edition} peutAnnuler={c.peut_annuler} lienModifier="?modifier=1" {form} />
	</div>
</div>

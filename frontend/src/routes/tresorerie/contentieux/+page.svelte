<script lang="ts">
	import Plus from '@lucide/svelte/icons/plus';
	import Scale from '@lucide/svelte/icons/scale';
	import EnTeteTresorerie from '$lib/components/tresorerie/EnTeteTresorerie.svelte';
	import BarreFiltres from '$lib/components/tresorerie/BarreFiltres.svelte';
	import CarteFiche from '$lib/components/tresorerie/CarteFiche.svelte';
	import FilDialogue from '$lib/components/dialogues/FilDialogue.svelte';
	import Bouton from '$lib/components/ui/Bouton.svelte';
	import Pagination from '$lib/components/ui/Pagination.svelte';
	import EtatVide from '$lib/components/ui/EtatVide.svelte';
	import Alerte from '$lib/components/ui/Alerte.svelte';
	import { dateCourte, fcfa } from '$lib/format';
	import { ETATS_TRESORERIE } from '$lib/types/tresorerie';

	let { data, form } = $props();
	const gestion = $derived(!!data.membre?.est_gestionnaire);
</script>

<svelte:head>
	<title>Contentieux — {data.parametres.nom_site}</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<EnTeteTresorerie titre="Contentieux" sousTitre="Crédit en difficulté ? On fait le point ensemble et on prépare la renégociation." compteurs={data.compteurs}>
	<Bouton href="/tresorerie/contentieux/nouveau"><Plus class="size-5" aria-hidden="true" />Nouveau dossier</Bouton>
</EnTeteTresorerie>

<div class="conteneur space-y-8 py-8">
	{#if data.supprime}<Alerte type="succes" titre="Le dossier est annulé." />{/if}
	<div>
		<BarreFiltres q={data.filtres.q} etat={data.filtres.etat} etats={gestion ? ETATS_TRESORERIE : undefined} />
		{#if data.liste.items.length}
			<p class="mb-4 text-ardoise" aria-live="polite">{data.liste.total} dossier{data.liste.total > 1 ? 's' : ''}</p>
			<ul class="grid gap-4 md:grid-cols-2">
				{#each data.liste.items as c (c.id)}
					<li>
						<CarteFiche
							href="/tresorerie/contentieux/{c.id}"
							reference={c.reference}
							date={dateCourte(c.date_dossier)}
							titre="Dette compromise"
							montant={fcfa(c.dette_compromise)}
							etat={c.etat}
							membre={gestion ? c.membre?.pseudonyme : null}
							details={[
								['Revenus mensuels', fcfa(c.revenus_mensuels)],
								['Charges mensuelles', fcfa(c.charges_fixes + c.charges_variables)],
								['Entrées attendues', fcfa(c.entrees_previsionnelles)],
								['Échéance supportable', fcfa(c.echeance_supportable)]
							]}
						/>
					</li>
				{/each}
			</ul>
			<Pagination total={data.liste.total} page={data.liste.page} taille={data.liste.taille} />
		{:else}
			<EtatVide
				icone={Scale}
				titre={data.filtres.q ? 'Aucun dossier ne correspond à votre recherche' : 'Des échéances trop lourdes ?'}
				texte="N’attendez pas la saisie : décrivez votre situation, un conseiller prépare avec vous une proposition de restructuration."
				messageWhatsApp="Bonjour la Frangine, j’ai du mal à rembourser mon crédit. Pouvez-vous m’aider ?"
			>
				<Bouton href="/tresorerie/contentieux/nouveau">Faire le point sur ma dette</Bouton>
			</EtatVide>
		{/if}
	</div>
	<FilDialogue dialogue={data.dialogue} {form} sujet="votre dossier de contentieux" />
</div>

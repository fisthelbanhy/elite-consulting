<script lang="ts">
	import Plus from '@lucide/svelte/icons/plus';
	import HandCoins from '@lucide/svelte/icons/hand-coins';
	import EnTeteTresorerie from '$lib/components/tresorerie/EnTeteTresorerie.svelte';
	import BarreFiltres from '$lib/components/tresorerie/BarreFiltres.svelte';
	import CarteFiche from '$lib/components/tresorerie/CarteFiche.svelte';
	import FilDialogue from '$lib/components/dialogues/FilDialogue.svelte';
	import Bouton from '$lib/components/ui/Bouton.svelte';
	import Pagination from '$lib/components/ui/Pagination.svelte';
	import EtatVide from '$lib/components/ui/EtatVide.svelte';
	import Alerte from '$lib/components/ui/Alerte.svelte';
	import { dateCourte, fcfa, tronquer } from '$lib/format';
	import { ETATS_TRESORERIE } from '$lib/types/tresorerie';

	let { data, form } = $props();
	const gestion = $derived(!!data.membre?.est_gestionnaire);
</script>

<svelte:head>
	<title>Demandes de crédit — {data.parametres.nom_site}</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<EnTeteTresorerie titre="Demandes de crédit" sousTitre="Présentez votre besoin une seule fois : nous le portons auprès des banques." compteurs={data.compteurs}>
	<Bouton href="/tresorerie/credits/nouveau"><Plus class="size-5" aria-hidden="true" />Nouvelle demande</Bouton>
</EnTeteTresorerie>

<div class="conteneur space-y-8 py-8">
	{#if data.supprime}<Alerte type="succes" titre="La demande est annulée." />{/if}
	<div>
		<BarreFiltres q={data.filtres.q} etat={data.filtres.etat} etats={gestion ? ETATS_TRESORERIE : undefined} placeholder="Référence, objet, garantie…" />
		{#if data.liste.items.length}
			<p class="mb-4 text-ardoise" aria-live="polite">{data.liste.total} demande{data.liste.total > 1 ? 's' : ''}</p>
			<ul class="grid gap-4 md:grid-cols-2">
				{#each data.liste.items as c (c.id)}
					<li>
						<CarteFiche
							href="/tresorerie/credits/{c.id}"
							reference={c.reference}
							date={dateCourte(c.date_demande)}
							titre={tronquer(c.objet, 70) || 'Demande de crédit'}
							montant={fcfa(c.montant)}
							etat={c.etat}
							membre={gestion ? c.membre?.pseudonyme : null}
							details={[
								['Durée', `${c.duree_mois} mois`],
								['Réalisation', `${c.niveau_realisation} %`],
								['Garantie', tronquer(c.garantie, 40)]
							]}
						/>
					</li>
				{/each}
			</ul>
			<Pagination total={data.liste.total} page={data.liste.page} taille={data.liste.taille} />
		{:else}
			<EtatVide
				icone={HandCoins}
				titre={data.filtres.q ? 'Aucune demande ne correspond à votre recherche' : 'Besoin de financement ?'}
				texte="Montant, objet, durée, garantie : en 3 minutes, votre demande est prête à être présentée aux banques."
				messageWhatsApp="Bonjour la Frangine, je cherche un crédit. Pouvez-vous m’aider à monter ma demande ?"
			>
				<Bouton href="/tresorerie/credits/nouveau">Préparer ma demande</Bouton>
			</EtatVide>
		{/if}
	</div>
	<FilDialogue dialogue={data.dialogue} {form} sujet="vos demandes de crédit" />
</div>

<script lang="ts">
	import Plus from '@lucide/svelte/icons/plus';
	import PiggyBank from '@lucide/svelte/icons/piggy-bank';
	import EnTeteTresorerie from '$lib/components/tresorerie/EnTeteTresorerie.svelte';
	import BarreFiltres from '$lib/components/tresorerie/BarreFiltres.svelte';
	import CarteFiche from '$lib/components/tresorerie/CarteFiche.svelte';
	import FilDialogue from '$lib/components/dialogues/FilDialogue.svelte';
	import Bouton from '$lib/components/ui/Bouton.svelte';
	import Pagination from '$lib/components/ui/Pagination.svelte';
	import EtatVide from '$lib/components/ui/EtatVide.svelte';
	import Alerte from '$lib/components/ui/Alerte.svelte';
	import { dateCourte, fcfa, libelle } from '$lib/format';
	import { ETATS_TRESORERIE } from '$lib/types/tresorerie';

	let { data, form } = $props();
	const gestion = $derived(!!data.membre?.est_gestionnaire);
</script>

<svelte:head>
	<title>Placements — {data.parametres.nom_site}</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<EnTeteTresorerie titre="Placements" sousTitre="Dépôt à terme ou investissement : nous comparons les propositions des banques pour vous." compteurs={data.compteurs}>
	<Bouton href="/tresorerie/placements/nouveau"><Plus class="size-5" aria-hidden="true" />Nouveau placement</Bouton>
</EnTeteTresorerie>

<div class="conteneur space-y-8 py-8">
	{#if data.supprime}<Alerte type="succes" titre="La fiche est annulée." />{/if}
	<div>
		<BarreFiltres q={data.filtres.q} etat={data.filtres.etat} etats={gestion ? ETATS_TRESORERIE : undefined} />
		{#if data.liste.items.length}
			<p class="mb-4 text-ardoise" aria-live="polite">{data.liste.total} placement{data.liste.total > 1 ? 's' : ''}</p>
			<ul class="grid gap-4 md:grid-cols-2">
				{#each data.liste.items as p (p.id)}
					<li>
						<CarteFiche
							href="/tresorerie/placements/{p.id}"
							reference={p.reference}
							date={dateCourte(p.date_placement)}
							titre={libelle(data.enums, 'TypePlacement', p.type_placement) || 'Placement'}
							montant={fcfa(p.montant)}
							etat={p.etat}
							membre={gestion ? p.membre?.pseudonyme : null}
							details={[
								['Durée', `${p.duree_mois} mois`],
								['Taux', `${p.taux} %`],
								['Banques', p.banques.map((b) => b.sigle || b.nom).join(' · ')]
							]}
						/>
					</li>
				{/each}
			</ul>
			<Pagination total={data.liste.total} page={data.liste.page} taille={data.liste.taille} />
		{:else}
			<EtatVide
				icone={PiggyBank}
				titre={data.filtres.q ? 'Aucun placement ne correspond à votre recherche' : 'Faites travailler votre épargne'}
				texte="Indiquez le montant, la durée et le taux espéré : nous consultons les banques de votre choix."
				messageWhatsApp="Bonjour la Frangine, je voudrais placer mon épargne. Pouvez-vous me conseiller ?"
			>
				<Bouton href="/tresorerie/placements/nouveau">Préparer un placement</Bouton>
			</EtatVide>
		{/if}
	</div>

	<FilDialogue dialogue={data.dialogue} {form} sujet="vos placements" />
</div>

<script lang="ts">
	import Search from '@lucide/svelte/icons/search';
	import Plus from '@lucide/svelte/icons/plus';
	import HandCoins from '@lucide/svelte/icons/hand-coins';
	import SlidersHorizontal from '@lucide/svelte/icons/sliders-horizontal';
	import EnTetePage from '$lib/components/ui/EnTetePage.svelte';
	import Onglets from '$lib/components/ui/Onglets.svelte';
	import Bouton from '$lib/components/ui/Bouton.svelte';
	import Pagination from '$lib/components/ui/Pagination.svelte';
	import EncartPublicites from '$lib/components/publicites/EncartPublicites.svelte';
	import EtatVide from '$lib/components/ui/EtatVide.svelte';
	import Alerte from '$lib/components/ui/Alerte.svelte';
	import CarteProjet from '$lib/components/projets/CarteProjet.svelte';
	import AvertissementProjets from '$lib/components/projets/AvertissementProjets.svelte';
	import { fcfa } from '$lib/format';

	let { data } = $props();
	const f = $derived(data.filtres);
	const connecte = $derived(!!data.membre);
	const filtre = $derived(!!(f.q || f.secteur_id || f.devis_min || f.besoin_min || f.realisation_min));
	const niveaux = Array.from({ length: 11 }, (_, i) => i * 10);
</script>

<svelte:head>
	<title>Appels de fonds : soutenez les projets de Brazzaville — {data.parametres.nom_site}</title>
	<meta
		name="description"
		content="Financement participatif entre membres : découvrez les projets d'entrepreneurs congolais, promettez un don, un prêt ou une prise de participation, et suivez chaque versement."
	/>
</svelte:head>

<EnTetePage
	titre="Appels de fonds"
	sousTitre="Des projets portés par des membres, relus par la frangine. Promettez un apport, suivez chaque versement."
	surtitre="Financer & épargner"
	fil={[{ href: '/financer', label: 'Financer & épargner' }, { href: '/projets', label: 'Appels de fonds' }]}
>
	<Bouton href="/projets/nouveau"><Plus class="size-5" aria-hidden="true" />Présenter mon projet</Bouton>
	{#snippet bas()}
		<div class="mt-6">
			<Onglets
				onglets={[
					{ href: '/projets', label: 'Tous les projets', compteur: data.compteurs.projets, actif: !f.miens },
					...(connecte
						? [
								{ href: '/projets?miens=1', label: 'Mes projets', actif: !!f.miens },
								{ href: '/projets/apports', label: data.membre?.est_gestionnaire ? 'Tous les apports' : 'Mes apports' }
							]
						: [])
				]}
			/>
		</div>
	{/snippet}
</EnTetePage>

<div class="conteneur py-8">
	{#if data.supprime}<Alerte type="succes" titre="Le projet a été supprimé." class="mb-6" />{/if}

	{#if data.compteurs.projets}
		<section aria-label="Chiffres clés" class="mb-6 grid grid-cols-3 gap-3 text-center">
			<div class="carte p-3"><p class="text-xs text-ardoise sm:text-sm">Besoin total</p><p class="montant font-display text-base font-bold text-fleuve-800 sm:text-xl">{fcfa(data.compteurs.besoin_total)}</p></div>
			<div class="carte p-3"><p class="text-xs text-ardoise sm:text-sm">Promis</p><p class="montant font-display text-base font-bold text-fleuve-800 sm:text-xl">{fcfa(data.compteurs.montant_promis)}</p></div>
			<div class="carte p-3"><p class="text-xs text-ardoise sm:text-sm">Collecté</p><p class="montant font-display text-base font-bold text-foret-700 sm:text-xl">{fcfa(data.compteurs.montant_collecte)}</p></div>
		</section>
	{/if}

	<form method="GET" class="carte mb-6 p-4" data-sveltekit-keepfocus>
		{#if f.miens}<input type="hidden" name="miens" value="1" />{/if}
		<div class="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
			<div>
				<label for="q" class="mb-1.5 block text-[15px] font-semibold">Rechercher un projet</label>
				<div class="relative">
					<Search class="pointer-events-none absolute top-1/2 left-3 size-5 -translate-y-1/2 text-ardoise" aria-hidden="true" />
					<input id="q" name="q" type="search" value={f.q} placeholder="Boulangerie, élevage, couture…" class="pl-10" />
				</div>
			</div>
			<Bouton type="submit" variante="fleuve">Rechercher</Bouton>
		</div>
		<details class="mt-3" open={!!(f.secteur_id || f.devis_min || f.besoin_min || f.realisation_min)}>
			<summary class="inline-flex min-h-11 cursor-pointer items-center gap-2 font-semibold text-fleuve-700">
				<SlidersHorizontal class="size-4" aria-hidden="true" />Plus de filtres
			</summary>
			<div class="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
				<div>
					<label for="secteur_id" class="mb-1.5 block text-[15px] font-semibold">Secteur</label>
					<select id="secteur_id" name="secteur_id">
						<option value="">Tous les secteurs</option>
						{#each data.secteurs as s (s.id)}<option value={s.id} selected={String(s.id) === f.secteur_id}>{s.libelle}</option>{/each}
					</select>
				</div>
				<div>
					<label for="devis_min" class="mb-1.5 block text-[15px] font-semibold">Coût minimum (FCFA)</label>
					<input id="devis_min" name="devis_min" type="number" inputmode="numeric" min="0" value={f.devis_min} />
				</div>
				<div>
					<label for="besoin_min" class="mb-1.5 block text-[15px] font-semibold">Besoin minimum (FCFA)</label>
					<input id="besoin_min" name="besoin_min" type="number" inputmode="numeric" min="0" value={f.besoin_min} />
				</div>
				<div>
					<label for="realisation_min" class="mb-1.5 block text-[15px] font-semibold">Réalisé au moins</label>
					<select id="realisation_min" name="realisation_min">
						{#each niveaux as n (n)}<option value={n || ''} selected={String(n || '') === f.realisation_min}>{n ? `${n} %` : 'Indifférent'}</option>{/each}
					</select>
				</div>
			</div>
		</details>
	</form>

	<AvertissementProjets class="mb-6" />

	{#if data.liste.items.length}
		<p class="mb-4 text-ardoise" aria-live="polite">{data.liste.total} projet{data.liste.total > 1 ? 's' : ''}</p>
		<ul class="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
			{#each data.liste.items as p (p.id)}
				<li><CarteProjet projet={p} /></li>
			{/each}
		</ul>
		<Pagination total={data.liste.total} page={data.liste.page} taille={data.liste.taille} />
	{:else}
		<EtatVide
			icone={HandCoins}
			titre={filtre ? 'Aucun projet ne correspond à votre recherche' : f.miens ? "Vous n'avez pas encore présenté de projet" : 'Aucun projet en recherche de financement pour le moment'}
			texte="Vous avez un projet ? Présentez-le : la frangine le relit et le fait connaître aux membres. Ou laissez votre numéro pour être prévenu·e des prochains projets."
			messageWhatsApp="Bonjour la Frangine, prévenez-moi quand un nouveau projet cherche des financements."
		>
			<Bouton href="/projets/nouveau">Présenter mon projet</Bouton>
		</EtatVide>
	{/if}
	{#if data.publicites.length}
		<div class="mt-10"><EncartPublicites publicites={data.publicites} variante="bande" /></div>
	{/if}
</div>

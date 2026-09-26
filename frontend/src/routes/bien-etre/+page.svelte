<script lang="ts">
	import Leaf from '@lucide/svelte/icons/leaf';
	import ArrowRight from '@lucide/svelte/icons/arrow-right';
	import EnTetePage from '$lib/components/ui/EnTetePage.svelte';
	import Onglets from '$lib/components/ui/Onglets.svelte';
	import EtatVide from '$lib/components/ui/EtatVide.svelte';
	import AvertissementBienEtre from '$lib/components/boutique/AvertissementBienEtre.svelte';
	import ModuleIndisponible from '$lib/components/boutique/ModuleIndisponible.svelte';
	import { tronquer } from '$lib/format';

	let { data } = $props();
</script>

<svelte:head>
	<title>Fiches bien-être — {data.parametres.nom_site}</title>
	<!-- Contenus à risque réglementaire (ADR-0009) : non indexés -->
	<meta name="robots" content="noindex" />
</svelte:head>

<EnTetePage
	titre="Fiches bien-être"
	surtitre="Bien-être"
	sousTitre="Des repères simples et les conseils d'utilisation des produits à l'aloe vera, par besoin."
	fil={[{ href: '/boutique', label: 'Boutique' }, { href: '/bien-etre', label: 'Fiches bien-être' }]}
>
	{#snippet bas()}
		<div class="mt-6">
			<Onglets
				label="Bien-être"
				onglets={[
					{ href: '/boutique', label: 'Produits' },
					{ href: '/devenir-distributeur', label: 'Devenir distributeur' },
					{ href: '/bien-etre', label: 'Fiches bien-être', actif: true }
				]}
			/>
		</div>
	{/snippet}
</EnTetePage>

<div class="conteneur space-y-8 py-8">
	{#if !data.actif}
		<ModuleIndisponible />
	{:else}
		<AvertissementBienEtre />
		{#if data.fiches.length}
			<ul class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
				{#each data.fiches as f (f.id)}
					<li>
						<a href="/bien-etre/{f.id}" class="carte group flex h-full flex-col gap-2 p-5 transition-shadow hover:shadow-levee">
							<Leaf class="size-7 text-foret-600" aria-hidden="true" />
							<h2 class="text-xl font-bold group-hover:underline">{f.libelle}</h2>
							{#if f.description}<p class="text-[15px] text-ardoise">{tronquer(f.description, 120)}</p>{/if}
							<p class="mt-auto flex items-center gap-1 pt-2 text-sm font-semibold text-fleuve-700">
								{f.nombre_produits
									? `${f.nombre_produits} produit${f.nombre_produits > 1 ? 's' : ''} et conseils d'utilisation`
									: 'Lire la fiche'}<ArrowRight class="size-4" aria-hidden="true" />
							</p>
						</a>
					</li>
				{/each}
			</ul>
		{:else}
			<EtatVide
				icone={Leaf}
				titre="Pas encore de fiche publiée"
				texte="Posez votre question à votre frangine : elle vous oriente vers les bons produits et, si besoin, vers un professionnel de santé."
				messageWhatsApp="Bonjour la Frangine, j'ai une question sur les produits bien-être."
			/>
		{/if}
	{/if}
</div>

<script lang="ts">
	import MessageCircle from '@lucide/svelte/icons/message-circle';
	import EnTetePage from '$lib/components/ui/EnTetePage.svelte';
	import Bouton from '$lib/components/ui/Bouton.svelte';
	import AvertissementBienEtre from '$lib/components/boutique/AvertissementBienEtre.svelte';
	import GrilleProduits from '$lib/components/boutique/GrilleProduits.svelte';
	import BandeauDistributeur from '$lib/components/boutique/BandeauDistributeur.svelte';
	import ModuleIndisponible from '$lib/components/boutique/ModuleIndisponible.svelte';
	import { lienWhatsApp } from '$lib/format';

	let { data, form } = $props();
	const fiche = $derived(data.fiche);
</script>

<svelte:head>
	<title>{fiche ? `${fiche.libelle} — fiche bien-être` : 'Fiches bien-être'} — {data.parametres.nom_site}</title>
	<meta name="robots" content="noindex" />
</svelte:head>

{#if !data.actif || !fiche}
	<EnTetePage titre="Fiches bien-être" fil={[{ href: '/boutique', label: 'Boutique' }, { href: '/bien-etre', label: 'Fiches bien-être' }]} />
	<div class="conteneur py-8"><ModuleIndisponible /></div>
{:else}
	<EnTetePage
		titre={fiche.libelle}
		surtitre="Fiche bien-être"
		fil={[{ href: '/boutique', label: 'Boutique' }, { href: '/bien-etre', label: 'Fiches bien-être' }]}
	/>

	<div class="conteneur space-y-8 py-8">
		<AvertissementBienEtre />

		{#if fiche.description}
			<section class="carte max-w-3xl p-6">
				<h2 class="text-xl font-bold">Repères</h2>
				<p class="mt-3 whitespace-pre-line">{fiche.description}</p>
			</section>
		{/if}

		<section aria-labelledby="titre-produits" class="space-y-4">
			<h2 id="titre-produits" class="text-2xl font-bold">Produits conseillés et conseils d'utilisation</h2>
			{#if fiche.produits.length}
				<p class="text-[15px] text-ardoise">
					Choisissez les quantités, puis ajoutez-les au panier en une fois. Suivez le conseil d'utilisation et demandez
					l'avis de votre médecin si vous suivez un traitement.
				</p>
				<GrilleProduits
					produits={fiche.produits.map((x) => ({ produit: x.produit, conseil: x.conseil_utilisation || undefined }))}
					distributeur={fiche.distributeur}
					{form}
					colonnes="grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
				/>
			{:else}
				<div class="carte space-y-3 p-6">
					<p>Aucun produit n'est associé à cette fiche pour le moment.</p>
					{#if data.parametres.whatsapp}
						<Bouton
							href={lienWhatsApp(data.parametres.whatsapp, `Bonjour la Frangine, j'ai une question au sujet de la fiche « ${fiche.libelle} ».`)}
							variante="whatsapp"
							target="_blank"
							rel="noopener"
						>
							<MessageCircle class="size-5" aria-hidden="true" />Poser ma question sur WhatsApp
						</Bouton>
					{/if}
				</div>
			{/if}
		</section>

		{#if !fiche.distributeur}<BandeauDistributeur />{/if}
	</div>
{/if}

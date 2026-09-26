<script lang="ts">
	/**
	 * Prix d'un produit selon le statut du lecteur (ADR-0007 S5a) : un distributeur paie le prix
	 * distributeur, les autres le prix public ; le prix distributeur est toujours montré aux autres
	 * comme levier d'adhésion (« devenez distributeur »).
	 */
	import { fcfa } from '$lib/format';

	let {
		prix,
		prixPublic,
		prixDistributeur,
		distributeur = false,
		grand = false
	}: { prix: number; prixPublic: number; prixDistributeur: number; distributeur?: boolean; grand?: boolean } = $props();

	const economie = $derived(prixPublic > 0 && prixDistributeur > 0 ? prixPublic - prixDistributeur : 0);
</script>

{#if prix > 0}
	<div class="space-y-0.5">
		<p class="montant font-display font-extrabold text-laterite-700 {grand ? 'text-3xl' : 'text-lg'}">
			<span class="sr-only">{distributeur ? 'Votre prix distributeur' : 'Prix'} : </span>{fcfa(prix)}
		</p>
		{#if distributeur && economie > 0}
			<p class="text-sm text-ardoise">
				Prix public <s class="montant">{fcfa(prixPublic)}</s> · <span class="font-semibold text-foret-700">prix distributeur</span>
			</p>
		{:else if !distributeur && economie > 0}
			<p class="text-sm text-ardoise">
				Prix distributeur : <span class="montant font-semibold text-foret-700">{fcfa(prixDistributeur)}</span>
				— <a href="/devenir-distributeur" class="lien">devenez distributeur</a>
			</p>
		{/if}
	</div>
{:else}
	<p class="font-semibold text-ardoise {grand ? 'text-xl' : ''}">Prix sur demande</p>
{/if}

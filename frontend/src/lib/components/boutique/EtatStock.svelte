<script lang="ts">
	/** Disponibilité d'un produit (stock legacy `quantitepdt`). */
	let { stock }: { stock: number } = $props();
</script>

{#if stock <= 0}
	<p class="text-sm font-semibold text-alerte">Rupture de stock</p>
{:else if stock <= 3}
	<p class="text-sm font-semibold text-laterite-700">Plus que {stock} en stock</p>
{:else}
	<p class="text-sm font-semibold text-foret-700">En stock ({stock})</p>
{/if}

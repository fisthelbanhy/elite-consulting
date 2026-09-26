<script lang="ts">
	/** Page explicative quand les fiches bien-être sont désactivées depuis la gestion (ADR-0009). */
	import Leaf from '@lucide/svelte/icons/leaf';
	import Bouton from '$lib/components/ui/Bouton.svelte';
</script>

<div class="carte mx-auto max-w-2xl space-y-4 p-8 text-center">
	<Leaf class="mx-auto size-12 text-foret-600" aria-hidden="true" />
	<h2 class="text-2xl font-bold">Les fiches bien-être sont en cours de révision</h2>
	<p class="text-ardoise">
		Nous revoyons ces contenus avec des professionnels pour vous donner des informations fiables. En attendant, la
		boutique reste ouverte et votre frangine répond à vos questions.
	</p>
	<div class="flex flex-wrap justify-center gap-3">
		<Bouton href="/boutique">Voir la boutique</Bouton>
		<Bouton href="/contact" variante="secondaire">Écrire à votre frangine</Bouton>
	</div>
</div>

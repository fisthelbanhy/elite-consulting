<script lang="ts">
	/**
	 * Marqueur visible d'une information légale encore inconnue (pages légales).
	 * À retirer dès que l'information est fournie : `grep -r "ACompleter" src/routes`.
	 */
	let { quoi }: { quoi: string } = $props();
</script>

<mark class="rounded bg-soleil-300 px-1.5 py-0.5 font-semibold text-encre not-italic">[À compléter : {quoi}]</mark>

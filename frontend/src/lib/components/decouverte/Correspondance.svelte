<script lang="ts">
	/** « Correspondance la frangine » : lecture seule pour le membre (F-S1-22). */
	import MessageCircleHeart from '@lucide/svelte/icons/message-circle-heart';

	let { texte }: { texte: string } = $props();
</script>

<section class="rounded-2xl bg-foret-50 p-5 ring-1 ring-foret-100" aria-labelledby="titre-correspondance">
	<h2 id="titre-correspondance" class="flex items-center gap-2 text-lg font-bold text-foret-700">
		<MessageCircleHeart class="size-5" aria-hidden="true" />Le mot de votre conseillère
	</h2>
	<p class="mt-2 whitespace-pre-line text-encre">{texte}</p>
</section>

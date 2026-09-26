<script lang="ts">
	/** Encart pour les visiteurs : les offres financières sont réservées aux membres (F-S7-02). */
	import { page } from '$app/state';
	import Lock from '@lucide/svelte/icons/lock';
	import Bouton from '$lib/components/ui/Bouton.svelte';

	let { texte = 'Créez votre compte gratuit en 1 minute : un conseiller vous accompagne ensuite, sans engagement.' }: { texte?: string } =
		$props();
	const suite = $derived(encodeURIComponent(page.url.pathname + page.url.search));
</script>

<section class="carte flex flex-col items-center gap-4 px-6 py-10 text-center" aria-labelledby="acces-reserve">
	<span class="grid size-16 place-items-center rounded-full bg-sable text-fleuve-600"><Lock class="size-8" aria-hidden="true" /></span>
	<h2 id="acces-reserve" class="text-xl font-bold">Veuillez vous connecter pour y avoir accès.</h2>
	<p class="max-w-md text-ardoise">{texte}</p>
	<div class="flex flex-wrap justify-center gap-3">
		<Bouton href="/inscription?suite={suite}">Créer mon compte gratuit</Bouton>
		<Bouton href="/connexion?suite={suite}" variante="secondaire">J'ai déjà un compte</Bouton>
	</div>
</section>

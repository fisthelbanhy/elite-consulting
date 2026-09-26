<script lang="ts">
	/** Explication de la Likelemba (tontine rotative) : le cercle, les tours, les reçus. */
	import Users from '@lucide/svelte/icons/users';
	import Coins from '@lucide/svelte/icons/coins';
	import RefreshCw from '@lucide/svelte/icons/refresh-cw';
	import Receipt from '@lucide/svelte/icons/receipt';

	let { titre = 'Comment marche une Likelemba ?' }: { titre?: string } = $props();
	const etapes = [
		{ icone: Users, titre: 'On forme le cercle', texte: 'Un responsable, des membres qui se font confiance, une caution et des témoins pour chacun.' },
		{ icone: Coins, titre: 'Chacun cotise', texte: 'Le même montant à chaque échéance : semaine, quinzaine ou mois.' },
		{ icone: RefreshCw, titre: 'À tour de rôle', texte: 'À chaque tour, un membre reçoit toute la cagnotte, dans l’ordre d’entrée.' },
		{ icone: Receipt, titre: 'Tout est tracé', texte: 'Chaque cotisation reçoit un reçu numéroté, visible par le groupe. Fini les cahiers perdus.' }
	];
</script>

<section aria-labelledby="titre-likelemba-fonctionnement">
	<h2 id="titre-likelemba-fonctionnement" class="text-2xl font-bold">{titre}</h2>
	<ol class="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
		{#each etapes as e, i (e.titre)}
			<li class="carte relative p-5">
				<span class="absolute top-4 right-4 font-display text-3xl font-extrabold text-sable" aria-hidden="true">{i + 1}</span>
				<span class="grid size-12 place-items-center rounded-full bg-foret-50 text-foret-700 ring-4 ring-foret-100" aria-hidden="true">
					<e.icone class="size-6" />
				</span>
				<h3 class="mt-3 text-lg font-bold">{e.titre}</h3>
				<p class="mt-1 text-[15px] text-ardoise">{e.texte}</p>
			</li>
		{/each}
	</ol>
</section>

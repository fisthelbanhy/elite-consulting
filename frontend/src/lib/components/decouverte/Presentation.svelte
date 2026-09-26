<script lang="ts">
	/** Présentation de la Découverte de soi pour un visiteur (aucune fiche n'est montrée). */
	import ArrowRight from '@lucide/svelte/icons/arrow-right';
	import CircleCheck from '@lucide/svelte/icons/circle-check';
	import Lock from '@lucide/svelte/icons/lock';
	import Bouton from '$lib/components/ui/Bouton.svelte';
	import { ETAPES_FICHE } from './questions';

	const suite = encodeURIComponent('/decouverte-de-soi');
</script>

<div class="grid gap-8 lg:grid-cols-[1.2fr_1fr]">
	<section class="space-y-5" aria-labelledby="titre-pourquoi">
		<h2 id="titre-pourquoi" class="text-2xl font-bold">Mieux se connaître pour mieux entreprendre</h2>
		<p class="text-lg text-ardoise">
			Avant de chercher de l'argent ou des clients, il faut savoir sur quoi s'appuyer : vos talents, votre entourage, votre
			motivation, vos moyens. La Découverte de soi est un bilan de 26 questions, lu par votre conseillère, qui vous répond sur
			votre fiche.
		</p>
		<ul class="space-y-3">
			<li class="flex gap-3"><CircleCheck class="mt-0.5 size-5 shrink-0 text-foret-600" aria-hidden="true" />6 étapes courtes, à votre rythme : vous pouvez vous arrêter et reprendre plus tard.</li>
			<li class="flex gap-3"><CircleCheck class="mt-0.5 size-5 shrink-0 text-foret-600" aria-hidden="true" />Une vraie conseillère lit vos réponses et vous écrit.</li>
			<li class="flex gap-3"><Lock class="mt-0.5 size-5 shrink-0 text-foret-600" aria-hidden="true" />Confidentiel : seuls vous et la frangine voyez votre fiche.</li>
		</ul>
		<div class="flex flex-col gap-3 pt-2 sm:flex-row">
			<Bouton href="/diagnostic" taille="lg">Commencer par le diagnostic gratuit <ArrowRight class="size-5" aria-hidden="true" /></Bouton>
			<Bouton href="/inscription?suite={suite}" variante="secondaire" taille="lg">Créer mon compte</Bouton>
		</div>
		<p class="text-[15px] text-ardoise">Déjà membre ? <a href="/connexion?suite={suite}" class="lien">Connectez-vous</a> pour remplir votre fiche.</p>
	</section>

	<section class="carte p-6" aria-labelledby="titre-etapes-fiche">
		<h2 id="titre-etapes-fiche" class="text-lg font-bold">Les 6 étapes du bilan</h2>
		<ol class="mt-4 space-y-3">
			{#each ETAPES_FICHE as e, i (e.titre)}
				<li class="flex gap-3">
					<span class="grid size-8 shrink-0 place-items-center rounded-full bg-fleuve-50 font-display font-bold text-fleuve-700" aria-hidden="true">{i + 1}</span>
					<span><span class="block font-semibold">{e.titre}</span><span class="block text-[15px] text-ardoise">{e.intro}</span></span>
				</li>
			{/each}
		</ol>
	</section>
</div>

<script lang="ts">
	import RotateCcw from '@lucide/svelte/icons/rotate-ccw';
	import Pencil from '@lucide/svelte/icons/pencil';
	import Restitution from '$lib/components/diagnostic/Restitution.svelte';
	import PlanAction from '$lib/components/diagnostic/PlanAction.svelte';
	import Alerte from '$lib/components/ui/Alerte.svelte';

	let { data, form } = $props();
	const r = $derived(data.restitution);
</script>

<svelte:head>
	<title>Votre résultat : {r.profil.titre} — Diagnostic — {data.parametres.nom_site}</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<div class="conteneur max-w-4xl space-y-8 py-8 sm:py-12">
	<header>
		<p class="text-sm font-semibold tracking-wide text-laterite-600 uppercase">Diagnostic terminé</p>
		<h1 class="mt-1 text-[clamp(1.75rem,6vw,2.5rem)] leading-tight font-bold">Merci ! Voici ce que vos réponses nous disent.</h1>
	</header>

	{#if data.erreur}
		<Alerte type="erreur" titre="L'envoi à votre conseillère n'a pas abouti.">Votre compte est bien créé. Touchez « Recevoir mon plan d'action » pour réessayer.</Alerte>
	{/if}

	<Restitution restitution={r} />

	<PlanAction connecte={!!data.membre} whatsapp={data.parametres.whatsapp} resume={r.resume} {form} />

	<details class="carte p-5">
		<summary class="cursor-pointer font-semibold text-fleuve-800">Revoir mes réponses</summary>
		<dl class="mt-4 divide-y divide-fleuve-900/5">
			{#each r.reponses as rep (rep.question)}
				<div class="grid gap-1 py-3 sm:grid-cols-2"><dt class="text-ardoise">{rep.question}</dt><dd class="font-semibold">{rep.reponse}</dd></div>
			{/each}
		</dl>
		<div class="mt-4 flex flex-wrap gap-3">
			<a href="/diagnostic?etape=1" class="inline-flex min-h-12 items-center gap-2 rounded-xl px-3 font-semibold text-fleuve-700 hover:bg-fleuve-50">
				<Pencil class="size-4" aria-hidden="true" />Modifier mes réponses
			</a>
			<form method="POST" action="?/recommencer">
				<button type="submit" class="inline-flex min-h-12 items-center gap-2 rounded-xl px-3 font-semibold text-fleuve-700 hover:bg-fleuve-50">
					<RotateCcw class="size-4" aria-hidden="true" />Tout recommencer
				</button>
			</form>
		</div>
	</details>
</div>

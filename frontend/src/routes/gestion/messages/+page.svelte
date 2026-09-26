<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import Search from '@lucide/svelte/icons/search';
	import MessagesSquare from '@lucide/svelte/icons/messages-square';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';
	import Avatar from '$lib/components/ui/Avatar.svelte';
	import Bouton from '$lib/components/ui/Bouton.svelte';
	import Pagination from '$lib/components/ui/Pagination.svelte';
	import EtatVide from '$lib/components/ui/EtatVide.svelte';
	import Presence from '$lib/components/messages/Presence.svelte';
	import { relatif, tronquer } from '$lib/format';

	let { data } = $props();
	const f = $derived(data.filtres);
	const nonLus = $derived(data.liste.items.reduce((n, i) => n + i.non_lus, 0));

	// La liste se met à jour seule : les nouveaux messages remontent en tête (F-TRV-52)
	$effect(() => {
		const minuterie = setInterval(() => {
			if (document.visibilityState === 'visible') invalidateAll();
		}, 30_000);
		return () => clearInterval(minuterie);
	});
</script>

<svelte:head>
	<title>Messagerie — Gestion — {data.parametres.nom_site}</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<div class="conteneur max-w-4xl space-y-6 py-6">
	<header>
		<p class="text-sm font-semibold tracking-wide text-laterite-600 uppercase">Gestion</p>
		<h1 class="text-3xl font-bold">Messagerie des membres</h1>
		<p class="mt-1 text-ardoise">
			Les conversations privées entre les membres et « la frangine ». Toutes les réponses de l'équipe apparaissent dans le même fil.
		</p>
	</header>

	<form method="GET" class="carte grid gap-3 p-4 sm:grid-cols-[1fr_auto] sm:items-end" data-sveltekit-keepfocus>
		<div>
			<label for="q" class="mb-1.5 block text-[15px] font-semibold">Rechercher un membre</label>
			<div class="relative">
				<Search class="pointer-events-none absolute top-1/2 left-3 size-5 -translate-y-1/2 text-ardoise" aria-hidden="true" />
				<input id="q" name="q" type="search" value={f.q} placeholder="Nom, pseudonyme, téléphone…" class="pl-10" />
			</div>
		</div>
		<Bouton type="submit" variante="fleuve">Rechercher</Bouton>
		<label class="flex items-center gap-3 text-[15px] sm:col-span-2">
			<input type="checkbox" name="tous" value="1" checked={f.tous} />
			Inclure les membres sans conversation (pour leur écrire en premier)
		</label>
	</form>

	<p class="text-ardoise" aria-live="polite">
		{data.liste.total} conversation{data.liste.total > 1 ? 's' : ''}{#if nonLus}
			· <strong class="text-laterite-700">{nonLus} message{nonLus > 1 ? 's' : ''} non lu{nonLus > 1 ? 's' : ''}</strong>{/if}
	</p>

	{#if data.liste.items.length}
		<ul class="carte divide-y divide-fleuve-900/5 overflow-hidden">
			{#each data.liste.items as fil (fil.membre.id)}
				<li>
					<a href="/gestion/messages/{fil.membre.id}" class="flex items-center gap-4 p-4 hover:bg-creme {fil.non_lus ? 'bg-soleil-100/40' : ''}">
						<Avatar src={fil.membre.photo_url} nom={fil.membre.nom} />
						<div class="min-w-0 flex-1">
							<div class="flex flex-wrap items-center gap-x-3 gap-y-1">
								<p class="font-semibold text-fleuve-800">{fil.membre.nom}</p>
								{#if fil.membre.pseudonyme && fil.membre.pseudonyme !== fil.membre.nom}
									<span class="text-sm text-ardoise">{fil.membre.pseudonyme}</span>
								{/if}
								{#if fil.membre.en_ligne}<Presence enLigne={true} />{/if}
							</div>
							{#if fil.dernier_message}
								<p class="mt-0.5 truncate text-[15px] {fil.non_lus ? 'font-semibold text-encre' : 'text-ardoise'}">
									{fil.dernier_message.de_la_frangine ? 'Vous : ' : ''}{tronquer(fil.dernier_message.texte, 90)}
								</p>
								<p class="text-sm text-ardoise">{relatif(fil.dernier_message.date_message)} · {fil.total} message{fil.total > 1 ? 's' : ''}</p>
							{:else}
								<p class="mt-0.5 text-[15px] text-ardoise">Aucun message pour l'instant : écrivez-lui en premier.</p>
							{/if}
						</div>
						{#if fil.non_lus}
							<span class="grid min-w-7 place-items-center rounded-full bg-laterite-600 px-2 py-0.5 text-sm font-bold text-white">
								{fil.non_lus}<span class="sr-only"> non lu{fil.non_lus > 1 ? 's' : ''}</span>
							</span>
						{/if}
						<ChevronRight class="size-5 shrink-0 text-ardoise" aria-hidden="true" />
					</a>
				</li>
			{/each}
		</ul>
		<Pagination total={data.liste.total} page={data.liste.page} taille={data.liste.taille} />
	{:else}
		<EtatVide
			icone={MessagesSquare}
			titre={f.q ? 'Aucun membre ne correspond à votre recherche' : 'Aucune conversation pour le moment'}
			texte={f.q && !f.tous
				? 'Cochez « Inclure les membres sans conversation » pour écrire à un membre qui ne vous a jamais écrit.'
				: 'Les messages envoyés par les membres depuis leur espace apparaîtront ici.'}
		/>
	{/if}
</div>

<script lang="ts">
	import Search from '@lucide/svelte/icons/search';
	import Lightbulb from '@lucide/svelte/icons/lightbulb';
	import Formulaire from '$lib/components/ui/Formulaire.svelte';
	import Bouton from '$lib/components/ui/Bouton.svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
	import BadgeEtat from '$lib/components/ui/BadgeEtat.svelte';
	import Pagination from '$lib/components/ui/Pagination.svelte';
	import EtatVide from '$lib/components/ui/EtatVide.svelte';
	import { dateHeure, libelle, tronquer } from '$lib/format';
	import { ETATS_SUGGESTION } from '$lib/types/contact';

	let { data, form } = $props();
	const f = $derived(data.filtres);
	const modules = $derived(data.enums?.Module ?? []);
</script>

<svelte:head>
	<title>Suggestions — Gestion — {data.parametres.nom_site}</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<div class="conteneur space-y-6 py-6">
	<header>
		<p class="text-sm font-semibold tracking-wide text-laterite-600 uppercase">Gestion</p>
		<h1 class="text-3xl font-bold">Boîte à idées</h1>
		<p class="mt-1 text-ardoise">
			{data.compteurs.total} suggestion{data.compteurs.total > 1 ? 's' : ''}{#if data.compteurs.a_lire}, dont
				<a href="/gestion/suggestions?etat=1" class="lien">{data.compteurs.a_lire} à lire</a>{/if}. Les suggestions sont anonymes.
		</p>
	</header>

	<form method="GET" class="carte grid gap-3 p-4 md:grid-cols-[1fr_14rem_12rem_auto] md:items-end" data-sveltekit-keepfocus>
		<div>
			<label for="q" class="mb-1.5 block text-[15px] font-semibold">Texte</label>
			<div class="relative">
				<Search class="pointer-events-none absolute top-1/2 left-3 size-5 -translate-y-1/2 text-ardoise" aria-hidden="true" />
				<input id="q" name="q" type="search" value={f.q} class="pl-10" />
			</div>
		</div>
		<div>
			<label for="module" class="mb-1.5 block text-[15px] font-semibold">Module</label>
			<select id="module" name="module">
				<option value="">Tous</option>
				{#each modules as m (m.value)}<option value={m.value} selected={String(m.value) === f.module}>{m.label}</option>{/each}
			</select>
		</div>
		<div>
			<label for="etat" class="mb-1.5 block text-[15px] font-semibold">État</label>
			<select id="etat" name="etat">
				<option value="">À lire et prises en compte</option>
				{#each Object.entries(ETATS_SUGGESTION) as [v, l] (v)}<option value={v} selected={v === f.etat}>{l}</option>{/each}
			</select>
		</div>
		<Bouton type="submit" variante="fleuve">Filtrer</Bouton>
	</form>

	<p class="text-ardoise" aria-live="polite">{data.liste.total} résultat{data.liste.total > 1 ? 's' : ''}</p>

	{#if data.liste.items.length}
		<ul class="space-y-3">
			{#each data.liste.items as s (s.id)}
				<li class="carte grid gap-4 p-4 md:grid-cols-[1fr_17rem] {s.etat === 1 ? 'ring-soleil-300' : ''}">
					<div class="min-w-0 space-y-2">
						<div class="flex flex-wrap items-center gap-2 text-sm">
							<time datetime={s.date} class="text-ardoise">{dateHeure(s.date)}</time>
							<Badge ton="fleuve">{libelle(data.enums, 'Module', s.module) || `Module ${s.module}`}</Badge>
							<BadgeEtat etat={s.etat} libelles={ETATS_SUGGESTION} />
						</div>
						{#if s.texte.length > 150}
							<details>
								<summary class="cursor-pointer">{tronquer(s.texte, 150)} <span class="lien text-sm">Lire tout</span></summary>
								<p class="mt-2 break-words whitespace-pre-line">{s.texte}</p>
							</details>
						{:else}
							<p class="break-words whitespace-pre-line">{s.texte}</p>
						{/if}
					</div>
					<Formulaire action="?/etat" {form} cle="etat-{s.id}">
						{#snippet children({ envoi })}
							<input type="hidden" name="id" value={s.id} />
							<label for="etat-{s.id}" class="mb-1.5 block text-sm font-semibold">Changer l'état</label>
							<div class="flex gap-2">
								<select id="etat-{s.id}" name="etat" class="flex-1">
									{#each Object.entries(ETATS_SUGGESTION) as [v, l] (v)}<option value={v} selected={Number(v) === s.etat}>{l}</option>{/each}
								</select>
								<Bouton type="submit" variante="fleuve" chargement={envoi}>OK</Bouton>
							</div>
						{/snippet}
					</Formulaire>
				</li>
			{/each}
		</ul>
		<Pagination total={data.liste.total} page={data.liste.page} taille={data.liste.taille} />
	{:else}
		<EtatVide
			icone={Lightbulb}
			titre="Aucune suggestion ici"
			texte="Les idées déposées par les membres depuis la page « Suggérer une idée » apparaîtront ici."
		/>
	{/if}
</div>

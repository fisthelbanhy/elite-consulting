<script lang="ts">
	import Search from '@lucide/svelte/icons/search';
	import Inbox from '@lucide/svelte/icons/inbox';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';
	import Bouton from '$lib/components/ui/Bouton.svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
	import BadgeEtat from '$lib/components/ui/BadgeEtat.svelte';
	import Pagination from '$lib/components/ui/Pagination.svelte';
	import EtatVide from '$lib/components/ui/EtatVide.svelte';
	import { dateHeure, tronquer } from '$lib/format';
	import { ETATS_CONTACT } from '$lib/types/contact';

	let { data } = $props();
	const f = $derived(data.filtres);
	const filtre = $derived(!!(f.q || f.membre_id || f.etat));
</script>

<svelte:head>
	<title>Messages de contact — Gestion — {data.parametres.nom_site}</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<div class="conteneur space-y-6 py-6">
	<header class="flex flex-wrap items-end justify-between gap-3">
		<div>
			<p class="text-sm font-semibold tracking-wide text-laterite-600 uppercase">Gestion</p>
			<h1 class="text-3xl font-bold">Messages de contact</h1>
			<p class="mt-1 text-ardoise">Les messages envoyés par le formulaire de contact, par des visiteurs ou des membres.</p>
		</div>
		{#if data.compteurs.a_traiter}
			<a href="/gestion/contacts?etat=1" class="rounded-full bg-soleil-100 px-4 py-2 font-semibold hover:bg-soleil-300">
				{data.compteurs.a_traiter} à traiter
			</a>
		{/if}
	</header>

	<form method="GET" class="carte grid gap-3 p-4 md:grid-cols-[1fr_14rem_12rem_auto] md:items-end" data-sveltekit-keepfocus>
		<div>
			<label for="q" class="mb-1.5 block text-[15px] font-semibold">Texte</label>
			<div class="relative">
				<Search class="pointer-events-none absolute top-1/2 left-3 size-5 -translate-y-1/2 text-ardoise" aria-hidden="true" />
				<input id="q" name="q" type="search" value={f.q} placeholder="Objet, message, nom, e-mail…" class="pl-10" />
			</div>
		</div>
		<div>
			<label for="membre_id" class="mb-1.5 block text-[15px] font-semibold">Membre</label>
			<select id="membre_id" name="membre_id">
				<option value="">Tous les expéditeurs</option>
				{#each data.expediteurs as e (e.value)}<option value={e.value} selected={String(e.value) === f.membre_id}>{e.label}</option>{/each}
			</select>
		</div>
		<div>
			<label for="etat" class="mb-1.5 block text-[15px] font-semibold">État</label>
			<select id="etat" name="etat">
				<option value="">À traiter et traités</option>
				{#each Object.entries(ETATS_CONTACT) as [v, l] (v)}<option value={v} selected={v === f.etat}>{l}</option>{/each}
			</select>
		</div>
		<Bouton type="submit" variante="fleuve">Filtrer</Bouton>
	</form>

	<p class="text-ardoise" aria-live="polite">{data.liste.total} message{data.liste.total > 1 ? 's' : ''}</p>

	{#if data.liste.items.length}
		<ul class="carte divide-y divide-fleuve-900/5 overflow-hidden">
			{#each data.liste.items as c (c.id)}
				<li>
					<a href="/gestion/contacts/{c.id}" class="flex items-center gap-4 p-4 hover:bg-creme {c.etat === 1 ? 'bg-soleil-100/40' : ''}">
						<div class="min-w-0 flex-1">
							<div class="flex flex-wrap items-center gap-2">
								<p class="font-semibold text-fleuve-800">{c.objet}</p>
								<BadgeEtat etat={c.etat} libelles={ETATS_CONTACT} />
								{#if c.repondu}<Badge ton="foret">Répondu</Badge>{/if}
							</div>
							<p class="mt-0.5 text-[15px] text-ardoise">{tronquer(c.texte, 140)}</p>
							<p class="mt-1 text-sm text-ardoise">
								<span class="font-semibold text-encre">{c.nom}</span>
								{#if c.membre && c.membre.type_compte !== 1}· membre {c.membre.pseudonyme}{:else if !c.membre_id}· visiteur{/if}
								· <time datetime={c.date_envoi}>{dateHeure(c.date_envoi)}</time>
							</p>
						</div>
						<ChevronRight class="size-5 shrink-0 text-ardoise" aria-hidden="true" />
					</a>
				</li>
			{/each}
		</ul>
		<Pagination total={data.liste.total} page={data.liste.page} taille={data.liste.taille} />
	{:else}
		<EtatVide
			icone={Inbox}
			titre={filtre ? 'Aucun message ne correspond à ces critères' : 'Aucun message pour le moment'}
			texte="Les messages envoyés depuis la page Contact apparaîtront ici."
		/>
	{/if}
</div>

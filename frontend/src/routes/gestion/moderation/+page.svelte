<script lang="ts">
	/**
	 * File transverse des fiches en attente (état « Non traité ») de tous les modules. La décision
	 * (publier, clôturer, supprimer) se prend sur la fiche, dans son panneau de modération.
	 */
	import ShieldCheck from '@lucide/svelte/icons/shield-check';
	import ArrowUpRight from '@lucide/svelte/icons/arrow-up-right';
	import EnTeteGestion from '$lib/components/gestion/EnTeteGestion.svelte';
	import Onglets from '$lib/components/ui/Onglets.svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
	import Pagination from '$lib/components/ui/Pagination.svelte';
	import EtatVide from '$lib/components/ui/EtatVide.svelte';
	import Alerte from '$lib/components/ui/Alerte.svelte';
	import { dateCourte, relatif } from '$lib/format';

	let { data } = $props();
	const file = $derived(data.file);
	const total = $derived(file.modules.reduce((s, m) => s + m.total, 0));
	const onglets = $derived([
		{ href: '/gestion/moderation', label: 'Tout', compteur: total, actif: !data.filtres.module },
		...file.modules.filter((m) => m.total > 0 || m.cle === data.filtres.module).map((m) => ({
			href: `/gestion/moderation?module=${m.cle}`,
			label: m.libelle,
			compteur: m.total,
			actif: data.filtres.module === m.cle
		}))
	]);
</script>

<svelte:head>
	<title>Modération — Gestion — {data.parametres.nom_site}</title>
</svelte:head>

<EnTeteGestion titre="Modération" sousTitre="Fiches publiées par les membres en attente de relecture." fil={[{ href: '/gestion/moderation', label: 'Modération' }]}>
	{#snippet bas()}
		<div class="mt-4"><Onglets onglets={onglets} label="Modules" /></div>
	{/snippet}
</EnTeteGestion>

<div class="mx-auto max-w-7xl space-y-5 px-4 py-6 sm:px-6">
	{#if !data.gestionnaire.droit_activation}
		<Alerte type="attention" titre="Consultation seule">Publier, clôturer ou supprimer une fiche nécessite le droit Activation.</Alerte>
	{/if}

	{#if file.items.length}
		<ul class="carte divide-y divide-fleuve-900/5">
			{#each file.items as e (`${e.module}-${e.id}`)}
				<li class="flex flex-col gap-2 p-4 sm:flex-row sm:items-center">
					<div class="min-w-0 flex-1">
						<div class="flex flex-wrap items-center gap-2">
							<Badge ton="fleuve">{e.module_libelle}</Badge>
							{#if e.reference}<span class="text-sm text-ardoise">{e.reference}</span>{/if}
						</div>
						<a href={e.lien} class="mt-1 block font-semibold text-fleuve-800 hover:underline">{e.titre}</a>
						<p class="text-sm text-ardoise">
							{#if e.auteur_id}Par <a href="/gestion/membres/{e.auteur_id}" class="lien">{e.auteur_pseudonyme ?? 'un membre'}</a>{:else}Sans auteur{/if}
							{#if e.date} · <time datetime={e.date} title={dateCourte(e.date)}>{relatif(e.date)}</time>{/if}
						</p>
					</div>
					<a
						href={e.lien}
						class="inline-flex min-h-11 shrink-0 items-center gap-1.5 self-start rounded-xl px-4 font-semibold text-fleuve-700 ring-1 ring-fleuve-200 ring-inset hover:bg-fleuve-50 sm:self-center"
					>
						Relire<span class="sr-only"> {e.titre}</span><ArrowUpRight class="size-4" aria-hidden="true" />
					</a>
				</li>
			{/each}
		</ul>
		<Pagination total={file.total} page={file.page} taille={file.taille} />
	{:else}
		<EtatVide icone={ShieldCheck} titre="Rien à relire" texte="Toutes les fiches de ce module sont traitées. Beau travail !" />
	{/if}
</div>

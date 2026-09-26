<script lang="ts">
	import Plus from '@lucide/svelte/icons/plus';
	import Search from '@lucide/svelte/icons/search';
	import FolderOpen from '@lucide/svelte/icons/folder-open';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';
	import EnTetePage from '$lib/components/ui/EnTetePage.svelte';
	import Onglets from '$lib/components/ui/Onglets.svelte';
	import Bouton from '$lib/components/ui/Bouton.svelte';
	import BadgeEtat from '$lib/components/ui/BadgeEtat.svelte';
	import Jauge from '$lib/components/ui/Jauge.svelte';
	import Pagination from '$lib/components/ui/Pagination.svelte';
	import EtatVide from '$lib/components/ui/EtatVide.svelte';
	import Alerte from '$lib/components/ui/Alerte.svelte';
	import AccesReserve from '$lib/components/tresorerie/AccesReserve.svelte';
	import PlanQuestionnaire from '$lib/components/accompagnement/PlanQuestionnaire.svelte';
	import { dateCourte, tronquer } from '$lib/format';
	import { ETATS_DOSSIER } from '$lib/types/accompagnement';

	let { data } = $props();
	const q = $derived(data.questionnaire);
	const gestion = $derived(!!data.membre?.est_gestionnaire);
	const f = $derived(data.filtres);
</script>

<svelte:head>
	<title>{q.libelle} : dossier accompagné — {data.parametres.nom_site}</title>
	<meta name="description" content={tronquer(`${q.accroche} ${q.description}`, 155)} />
</svelte:head>

<EnTetePage
	titre={q.libelle}
	sousTitre={q.description}
	surtitre="Accompagnement"
	fil={[{ href: '/accompagnement', label: 'Accompagnement' }, { href: `/accompagnement/${q.slug}`, label: q.libelle }]}
>
	{#if data.membre}<Bouton href="/accompagnement/{q.slug}/nouveau"><Plus class="size-5" aria-hidden="true" />Nouveau dossier</Bouton>{/if}
	{#snippet bas()}
		<div class="mt-6">
			<Onglets
				label="Types d'accompagnement"
				onglets={[
					{ href: '/accompagnement/business-plan', label: 'Business plan' },
					{ href: '/accompagnement/projet-agricole', label: 'Projet agricole' },
					{ href: '/accompagnement/restructuration-credit', label: 'Restructuration de crédit' },
					{ href: '/accompagnement/credit-immobilier', label: 'Crédit immobilier' }
				]}
			/>
		</div>
	{/snippet}
</EnTetePage>

<div class="conteneur grid gap-8 py-8 lg:grid-cols-[1fr_22rem]">
	<div class="space-y-6">
		{#if data.supprime}<Alerte type="succes" titre="Le dossier a été supprimé." />{/if}
		{#if !data.dossiers}
			<AccesReserve texte="Créez votre compte gratuit pour démarrer votre dossier : vos réponses restent confidentielles, un conseiller vous accompagne." />
		{:else}
			{#if gestion}
				<form method="GET" class="carte grid gap-3 p-4 sm:grid-cols-[1fr_auto_auto] sm:items-end" data-sveltekit-keepfocus>
					<div>
						<label for="q" class="mb-1.5 block text-[15px] font-semibold">Rechercher</label>
						<div class="relative">
							<Search class="pointer-events-none absolute top-1/2 left-3 size-5 -translate-y-1/2 text-ardoise" aria-hidden="true" />
							<input id="q" name="q" type="search" value={f.q} placeholder="Objet, référence…" class="pl-10" />
						</div>
					</div>
					<div>
						<label for="etat" class="mb-1.5 block text-[15px] font-semibold">État</label>
						<select id="etat" name="etat">
							<option value="">Tous</option>
							{#each Object.entries(ETATS_DOSSIER) as [v, l] (v)}<option value={v} selected={v === f.etat}>{l}</option>{/each}
						</select>
					</div>
					<Bouton type="submit" variante="fleuve">Filtrer</Bouton>
				</form>
			{/if}

			{#if data.dossiers.items.length}
				<h2 class="text-xl font-bold">{gestion ? `Dossiers des membres (${data.dossiers.total})` : 'Mes dossiers'}</h2>
				<ul class="space-y-3">
					{#each data.dossiers.items as d (d.id)}
						<li>
							<a href="/accompagnement/{q.slug}/{d.id}" class="carte flex items-center gap-4 p-5 transition-shadow hover:shadow-levee">
								<div class="min-w-0 flex-1 space-y-2">
									<div class="flex flex-wrap items-center gap-2">
										<span class="text-xs font-semibold text-ardoise">{d.reference} · {dateCourte(d.date_creation)}</span>
										<BadgeEtat etat={d.etat} libelles={ETATS_DOSSIER} />
										{#if gestion && d.membre}<span class="text-sm text-ardoise">· {d.membre.pseudonyme}</span>{/if}
									</div>
									<p class="font-display text-lg font-bold text-fleuve-800">{tronquer(d.objet, 100)}</p>
									<div class="flex items-center gap-3">
										<div class="flex-1"><Jauge valeur={d.nombre_repondues} max={d.nombre_questions} label="Progression du dossier" /></div>
										<span class="text-sm text-ardoise">{d.nombre_repondues}/{d.nombre_questions}</span>
									</div>
								</div>
								<ChevronRight class="size-5 shrink-0 text-ardoise" aria-hidden="true" />
							</a>
						</li>
					{/each}
				</ul>
				<Pagination total={data.dossiers.total} page={data.dossiers.page} taille={data.dossiers.taille} />
			{:else}
				<EtatVide
					icone={FolderOpen}
					titre={f.q || f.etat ? 'Aucun dossier ne correspond' : 'Démarrez votre dossier'}
					texte="Commencez par l’objet du dossier, puis répondez à votre rythme : un conseiller vous aide à compléter."
					messageWhatsApp="Bonjour la Frangine, je voudrais être accompagné·e pour mon dossier « {q.libelle} »."
				>
					<Bouton href="/accompagnement/{q.slug}/nouveau">Démarrer mon dossier</Bouton>
				</EtatVide>
			{/if}
		{/if}
	</div>

	<aside class="carte h-fit space-y-4 p-6">
		<h2 class="text-lg font-bold">Ce que contient le dossier</h2>
		<p class="text-sm text-ardoise">{q.nombre_questions} questions en {q.sections.length} parties. {q.pour_qui}</p>
		<PlanQuestionnaire questionnaire={q} details />
	</aside>
</div>

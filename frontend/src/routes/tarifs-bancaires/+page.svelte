<script lang="ts">
	import Landmark from '@lucide/svelte/icons/landmark';
	import Settings from '@lucide/svelte/icons/settings';
	import PenLine from '@lucide/svelte/icons/pen-line';
	import Sparkles from '@lucide/svelte/icons/sparkles';
	import Scale from '@lucide/svelte/icons/scale';
	import EnTetePage from '$lib/components/ui/EnTetePage.svelte';
	import Bouton from '$lib/components/ui/Bouton.svelte';
	import Alerte from '$lib/components/ui/Alerte.svelte';
	import EtatVide from '$lib/components/ui/EtatVide.svelte';
	import Formulaire from '$lib/components/ui/Formulaire.svelte';
	import AccesReserve from '$lib/components/tresorerie/AccesReserve.svelte';
	import TableauComparatif from '$lib/components/tarifs-bancaires/TableauComparatif.svelte';
	import GrilleBanque from '$lib/components/tarifs-bancaires/GrilleBanque.svelte';
	import GestionReferentiel from '$lib/components/tarifs-bancaires/GestionReferentiel.svelte';

	let { data, form } = $props();
	const c = $derived(data.comparatif);
	const tous = $derived(data.tous);
	const gerees = $derived(tous ? tous.banques.filter((b) => tous.banques_gerees.includes(b.id)) : []);
	const banqueSaisie = $derived(gerees.find((b) => b.id === data.saisie) ?? null);
	const retour = $derived(form as { cle?: string; message?: string; succes?: string } | null);
	const typesAvecOperations = $derived(tous?.types.filter((t) => t.operations.length) ?? []);
</script>

<svelte:head>
	<title>Tarifs bancaires au Congo : comparez les frais des banques — {data.parametres.nom_site}</title>
	<meta
		name="description"
		content="Virements, chèques, tenue de compte, opérations internationales : comparez les tarifs des banques de Brazzaville et Pointe-Noire, opération par opération."
	/>
</svelte:head>

<EnTetePage
	titre="Tarifs bancaires"
	sousTitre="Les frais des banques, opération par opération, dans un seul tableau."
	surtitre="Financer & épargner"
	fil={[{ href: '/financer', label: 'Financer & épargner' }, { href: '/tarifs-bancaires', label: 'Tarifs bancaires' }]}
>
	{#if tous?.peut_gerer_referentiel}
		<Bouton href={data.gestion ? '/tarifs-bancaires' : '/tarifs-bancaires?gestion=1'} variante="secondaire"><Settings class="size-5" aria-hidden="true" />{data.gestion ? 'Voir le comparatif' : 'Gérer le référentiel'}</Bouton>
	{/if}
</EnTetePage>

<div class="conteneur space-y-8 py-8">
	{#if !c || !tous}
		<ul class="grid gap-4 md:grid-cols-3">
			<li class="carte p-6"><Scale class="size-7 text-fleuve-600" aria-hidden="true" /><h2 class="mt-3 text-lg font-bold">Comparez avant de choisir</h2><p class="mt-1 text-[15px] text-ardoise">Tenue de compte, virements, chèques : voyez tout de suite quelle banque vous coûte le moins.</p></li>
			<li class="carte p-6"><Landmark class="size-7 text-fleuve-600" aria-hidden="true" /><h2 class="mt-3 text-lg font-bold">Toutes les banques</h2><p class="mt-1 text-[15px] text-ardoise">Les principales banques du Congo, côte à côte, sur les mêmes opérations.</p></li>
			<li class="carte p-6"><Sparkles class="size-7 text-fleuve-600" aria-hidden="true" /><h2 class="mt-3 text-lg font-bold">Un conseil en plus</h2><p class="mt-1 text-[15px] text-ardoise">Un doute ? Un conseiller vous aide à choisir la banque adaptée à votre activité.</p></li>
		</ul>
		<AccesReserve texte="Le comparatif des tarifs est réservé aux membres : créez votre compte gratuit pour y accéder." />
	{:else}
		{#if retour?.cle === 'referentiel' && retour.succes}<Alerte type="succes" titre={retour.succes} />{/if}
		{#if retour?.cle === 'referentiel' && retour.message && !retour.succes}<Alerte type="erreur" titre={retour.message} />{/if}

		{#if tous.referentiel_vide}
			<EtatVide
				icone={Landmark}
				titre="Le comparatif est en préparation"
				texte="Nos conseillers collectent les tarifs des banques. Laissez-nous votre numéro : on vous prévient dès qu’il est en ligne."
				messageWhatsApp="Bonjour la Frangine, prévenez-moi quand le comparatif des tarifs bancaires est disponible."
			>
				{#if tous.peut_gerer_referentiel}
					<Formulaire action="?/initialiser" confirmer="Créer les 9 types et 25 opérations proposés par l'ancien site ?">
						{#snippet children({ envoi })}
							<Bouton type="submit" chargement={envoi}>Initialiser le référentiel (9 types, 25 opérations)</Bouton>
						{/snippet}
					</Formulaire>
				{/if}
			</EtatVide>
		{/if}

		{#if data.gestion && tous.peut_gerer_referentiel}
			<section aria-labelledby="titre-referentiel" class="space-y-4">
				<h2 id="titre-referentiel" class="text-2xl font-bold">Référentiel des opérations</h2>
				<GestionReferentiel types={tous.types} {form} />
			</section>
		{:else if !tous.referentiel_vide}
			<form method="GET" class="carte space-y-4 p-4" data-sveltekit-keepfocus>
				<div class="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
					<div>
						<label for="type_id" class="mb-1.5 block text-[15px] font-semibold">Type d'opération</label>
						<select id="type_id" name="type_id">
							<option value="">Tous les types</option>
							{#each typesAvecOperations as t (t.id)}<option value={t.id} selected={String(t.id) === data.filtres.type_id}>{t.libelle}</option>{/each}
						</select>
					</div>
					<Bouton type="submit" variante="fleuve">Comparer</Bouton>
				</div>
				<fieldset>
					<legend class="mb-1.5 text-[15px] font-semibold">Banques à comparer <span class="font-normal text-ardoise">(toutes si aucune n’est cochée)</span></legend>
					<div class="flex flex-wrap gap-2">
						{#each tous.banques as b (b.id)}
							<label class="flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border border-fleuve-100 bg-white px-3 has-checked:border-fleuve-700 has-checked:bg-fleuve-50">
								<input type="checkbox" name="banque_id" value={b.id} checked={data.filtres.banque_id.includes(String(b.id))} />
								<span class="text-[15px] font-semibold">{b.sigle || b.nom}</span>
							</label>
						{/each}
					</div>
				</fieldset>
			</form>

			{#if c.types.some((t) => t.operations.length) && c.banques.length}
				<TableauComparatif comparatif={c} />
				<p class="text-sm text-ardoise">
					{c.nombre_tarifs} tarif{c.nombre_tarifs > 1 ? 's' : ''} renseigné{c.nombre_tarifs > 1 ? 's' : ''}. Tarifs indicatifs communiqués par les banques ou relevés par nos conseillers : vérifiez auprès de votre agence avant de signer.
				</p>
			{:else}
				<Alerte type="info" titre="Aucune opération ne correspond à ces filtres." />
			{/if}
		{/if}

		{#if gerees.length}
			<section aria-labelledby="titre-saisie" class="space-y-4">
				<h2 id="titre-saisie" class="flex items-center gap-2 text-2xl font-bold"><PenLine class="size-6" aria-hidden="true" />Saisir les tarifs d’une banque</h2>
				<form method="GET" class="flex flex-wrap items-end gap-3">
					{#if data.gestion}<input type="hidden" name="gestion" value="1" />{/if}
					<div class="min-w-60 flex-1">
						<label for="saisie" class="mb-1.5 block text-[15px] font-semibold">Banque</label>
						<select id="saisie" name="saisie">
							{#each gerees as b (b.id)}<option value={b.id} selected={b.id === data.saisie}>{b.nom}</option>{/each}
						</select>
					</div>
					<Bouton type="submit" variante="secondaire">Ouvrir la grille</Bouton>
				</form>
				{#if banqueSaisie && data.grille}
					<GrilleBanque comparatif={data.grille} banque={banqueSaisie} {form} />
				{/if}
			</section>
		{/if}
	{/if}
</div>

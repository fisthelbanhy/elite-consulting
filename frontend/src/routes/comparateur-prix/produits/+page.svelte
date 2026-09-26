<script lang="ts">
	import Search from '@lucide/svelte/icons/search';
	import EnTetePage from '$lib/components/ui/EnTetePage.svelte';
	import Bouton from '$lib/components/ui/Bouton.svelte';
	import Formulaire from '$lib/components/ui/Formulaire.svelte';
	import Saisie from '$lib/components/ui/Saisie.svelte';
	import Alerte from '$lib/components/ui/Alerte.svelte';
	import BadgeEtat from '$lib/components/ui/BadgeEtat.svelte';
	import { champ } from '$lib/forms';

	let { data, form } = $props();
	const etats = [
		{ value: 1, label: 'En attente' },
		{ value: 2, label: 'Publié' },
		{ value: 3, label: 'Retiré' }
	];
</script>

<svelte:head>
	<title>Catalogue des produits du comparateur — {data.parametres.nom_site}</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<EnTetePage
	titre="Catalogue des produits"
	sousTitre="Les produits proposés dans le comparateur de prix. Un produit retiré disparaît du comparateur avec ses lignes."
	surtitre="Gestion"
	fil={[{ href: '/comparateur-prix', label: 'Comparateur de prix' }]}
/>

<div class="conteneur max-w-4xl space-y-6 py-8">
	{#if !data.peutModifier}
		<Alerte type="info" titre="Consultation seulement.">La création et la modification des produits nécessitent le droit d'activation des fiches.</Alerte>
	{:else}
		<Formulaire action="?/creer" {form} cle="creer" reinitialiser class="carte p-6">
			{#snippet children({ envoi })}
				<div class="flex flex-col gap-3 sm:flex-row sm:items-end">
					<Saisie label="Nouveau produit" requis maxlength={200} class="flex-1" {...champ(form, 'nom', '', 'creer')} />
					<Bouton type="submit" chargement={envoi}>Ajouter</Bouton>
				</div>
			{/snippet}
		</Formulaire>
	{/if}

	<form method="GET" class="flex flex-col gap-3 sm:flex-row sm:items-end">
		<div class="flex-1">
			<label for="q" class="mb-1.5 block text-[15px] font-semibold">Rechercher un produit</label>
			<div class="relative">
				<Search class="pointer-events-none absolute top-1/2 left-3 size-5 -translate-y-1/2 text-ardoise" aria-hidden="true" />
				<input id="q" name="q" type="search" value={data.q} class="pl-10" />
			</div>
		</div>
		<Bouton type="submit" variante="fleuve">Rechercher</Bouton>
	</form>

	<p class="text-ardoise">{data.produits.length} produit{data.produits.length > 1 ? 's' : ''}</p>
	<ul class="space-y-3">
		{#each data.produits as p (p.id)}
			<li class="carte p-4">
				{#if data.peutModifier}
					<Formulaire action="?/modifier" {form} cle="produit-{p.id}">
						{#snippet children({ envoi })}
							<input type="hidden" name="id" value={p.id} />
							<div class="grid gap-3 sm:grid-cols-[1fr_11rem_auto] sm:items-end">
								<Saisie label="Nom du produit" id="nom-{p.id}" maxlength={200} {...champ(form, 'nom', p.nom, `produit-${p.id}`)} />
								<div>
									<label for="etat-{p.id}" class="mb-1.5 block text-[15px] font-semibold">État</label>
									<select id="etat-{p.id}" name="etat">
										{#each etats as e (e.value)}<option value={e.value} selected={e.value === p.etat}>{e.label}</option>{/each}
									</select>
								</div>
								<Bouton type="submit" variante="fleuve" chargement={envoi}>Enregistrer</Bouton>
							</div>
							<p class="mt-2 text-sm text-ardoise">{p.offres} offre{p.offres > 1 ? 's' : ''} · {p.demandes} demande{p.demandes > 1 ? 's' : ''} publiées</p>
						{/snippet}
					</Formulaire>
				{:else}
					<div class="flex items-center justify-between gap-3">
						<span class="font-semibold">{p.nom}</span>
						<BadgeEtat etat={p.etat} libelles={{ 1: 'En attente', 2: 'Publié', 3: 'Retiré' }} />
					</div>
				{/if}
			</li>
		{/each}
	</ul>
</div>

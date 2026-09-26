<script lang="ts">
	import Pencil from '@lucide/svelte/icons/pencil';
	import Phone from '@lucide/svelte/icons/phone';
	import Mail from '@lucide/svelte/icons/mail';
	import MapPin from '@lucide/svelte/icons/map-pin';
	import EnTetePage from '$lib/components/ui/EnTetePage.svelte';
	import Bouton from '$lib/components/ui/Bouton.svelte';
	import Alerte from '$lib/components/ui/Alerte.svelte';
	import LogoEntreprise from '$lib/components/entreprises/LogoEntreprise.svelte';
	import AccesReserve from '$lib/components/comparateur/AccesReserve.svelte';
	import FormulaireLigne from '$lib/components/comparateur/FormulaireLigne.svelte';
	import LignesFiche from '$lib/components/comparateur/LignesFiche.svelte';
	import { libelle, telephone } from '$lib/format';

	let { data, form } = $props();
	const fiche = $derived(data.fiche);
	const e = $derived(fiche?.entreprise);
	const base = $derived(e ? `/comparateur-prix/ma-fiche?entreprise=${e.id}` : '/comparateur-prix/ma-fiche');
</script>

<svelte:head>
	<title>Ma fiche de prix{e ? ` — ${e.nom}` : ''} — {data.parametres.nom_site}</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<EnTetePage
	titre="Ma fiche de prix"
	sousTitre={e ? `Ce que ${e.nom} vend et achète, visible par les autres entreprises du comparateur.` : undefined}
	fil={[{ href: '/comparateur-prix', label: 'Comparateur de prix' }]}
>
	<Bouton href="/comparateur-prix" variante="secondaire">Voir le comparateur</Bouton>
</EnTetePage>

<div class="conteneur space-y-6 py-8">
	{#if !data.acces.acces}
		<AccesReserve acces={data.acces} />
	{:else if data.erreur || !fiche || !e}
		<Alerte type="attention" titre={data.erreur ?? 'Fiche indisponible.'}>
			<p class="mt-2">La fiche de prix est celle d'une entreprise de l'annuaire.</p>
			<p class="mt-3"><Bouton href="/entreprises/nouvelle" taille="sm">Inscrire mon entreprise</Bouton></p>
		</Alerte>
	{:else}
		{#if fiche.entreprises.length > 1}
			<form method="GET" class="carte flex flex-col gap-3 p-4 sm:flex-row sm:items-end">
				<div class="flex-1">
					<label for="entreprise" class="mb-1.5 block text-[15px] font-semibold">Entreprise</label>
					<select id="entreprise" name="entreprise" onchange={(ev) => ev.currentTarget.form?.requestSubmit()}>
						{#each fiche.entreprises as x (x.id)}<option value={x.id} selected={x.id === e.id}>{x.nom}</option>{/each}
					</select>
				</div>
				<Bouton type="submit" variante="fleuve">Afficher</Bouton>
			</form>
		{/if}

		<!-- F-S6-18 : en-tête de la fiche (l'entreprise, plus le membre) -->
		<section class="carte flex flex-col gap-5 p-6 sm:flex-row sm:items-start">
			<LogoEntreprise src={e.logo_url} nom={e.nom} taille="lg" />
			<div class="min-w-0 flex-1 space-y-2">
				<h2 class="text-xl font-bold">
					{e.nom}{#if libelle(data.enums, 'FormeJuridique', e.forme_juridique)}<span class="font-sans text-base font-semibold text-ardoise"> ({libelle(data.enums, 'FormeJuridique', e.forme_juridique)})</span>{/if}
				</h2>
				<p class="text-sm text-ardoise">Référence {e.reference}{fiche.sigle ? ` · compte ${fiche.sigle}` : ''}</p>
				<ul class="space-y-1.5 text-[15px]">
					{#if e.adresse || e.ville}<li class="flex items-start gap-2"><MapPin class="mt-0.5 size-4 shrink-0 text-ardoise" aria-hidden="true" />{[e.adresse, e.ville?.nom].filter(Boolean).join(', ')}</li>{/if}
					{#if e.telephone}<li class="flex items-center gap-2"><Phone class="size-4 text-ardoise" aria-hidden="true" />{telephone(e.telephone)}</li>{/if}
					{#if e.email}<li class="flex items-center gap-2 break-all"><Mail class="size-4 shrink-0 text-ardoise" aria-hidden="true" />{e.email}</li>{/if}
				</ul>
				{#if !e.telephone && !e.email}
					<p class="text-sm font-semibold text-laterite-700">Ajoutez un téléphone ou un e-mail : sans eux, les autres entreprises ne peuvent pas vous contacter.</p>
				{/if}
			</div>
			<Bouton href="/entreprises/{e.id}/modifier" variante="fantome" taille="sm"><Pencil class="size-4" aria-hidden="true" />Modifier ces informations</Bouton>
		</section>

		{#if data.modifie}<Alerte type="succes" titre="Modification effectuée." />{/if}

		<FormulaireLigne
			{form}
			produits={data.produits}
			unites={data.enums.UniteMesure ?? []}
			entrepriseId={e.id}
			ligne={data.ligne}
			annuler={base}
		/>

		<div class="grid gap-6 lg:grid-cols-2">
			<LignesFiche
				titre="Mes offres"
				description="Ce que je vends"
				lignes={fiche.offres}
				lienModifier={(id) => `${base}&modifier=${id}#formulaire-ligne`}
				vide="Aucune offre pour l'instant : ajoutez les produits que vous vendez."
			/>
			<LignesFiche
				titre="Mes demandes"
				description="Ce que j'achète"
				lignes={fiche.demandes}
				lienModifier={(id) => `${base}&modifier=${id}#formulaire-ligne`}
				vide="Aucune demande pour l'instant : ajoutez les produits que vous cherchez."
			/>
		</div>
	{/if}
</div>

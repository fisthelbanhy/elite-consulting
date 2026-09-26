<script lang="ts">
	import ArrowLeft from '@lucide/svelte/icons/arrow-left';
	import ExternalLink from '@lucide/svelte/icons/external-link';
	import Alerte from '$lib/components/ui/Alerte.svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
	import BadgeEtat from '$lib/components/ui/BadgeEtat.svelte';
	import PanneauModeration from '$lib/components/ui/PanneauModeration.svelte';
	import MediaPublicite from '$lib/components/publicites/MediaPublicite.svelte';
	import FormulairePublicite from '$lib/components/publicites/FormulairePublicite.svelte';
	import { dateCourte, dateHeure, entier, tronquer } from '$lib/format';
	import { ETATS_PUBLICITE } from '$lib/types/publicites';

	let { data, form } = $props();
	const pub = $derived(data.pub);
	// Retour de l'action ?/enregistrer uniquement (les actions de modération ont la clé « moderation »)
	const retourFormulaire = $derived(form && (form as { cle?: string }).cle !== 'moderation' ? form : null);
</script>

<svelte:head>
	<title>{pub.reference} — Publicités — Gestion — {data.parametres.nom_site}</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<div class="conteneur space-y-6 py-6">
	<a href="/gestion/publicites" class="inline-flex min-h-11 items-center gap-2 font-semibold text-fleuve-700 hover:underline">
		<ArrowLeft class="size-5" aria-hidden="true" />Toutes les publicités
	</a>

	<header class="flex flex-wrap items-center gap-3">
		<h1 class="text-3xl font-bold">{pub.reference}</h1>
		<BadgeEtat etat={pub.etat} libelles={ETATS_PUBLICITE} />
		{#if pub.en_diffusion}<Badge ton="foret">En diffusion</Badge>{/if}
	</header>

	{#if data.enregistre}<Alerte type="succes" titre="Enregistrement effectué." />{/if}
	{#if data.modifie}<Alerte type="succes" titre="Modification effectuée." />{/if}
	{#if data.fichierRefuse}
		<Alerte type="attention" titre="Publicité enregistrée, mais le fichier a été refusé.">{data.fichierRefuse} Joignez un autre fichier ci-dessous.</Alerte>
	{/if}

	<div class="grid gap-6 lg:grid-cols-[1fr_22rem]">
		<FormulairePublicite form={retourFormulaire} choix={data.choix} initial={pub} action="?/enregistrer" libelleBouton="Enregistrer les modifications" />

		<aside class="space-y-5">
			<section class="carte space-y-3 p-5" aria-labelledby="titre-apercu">
				<h2 id="titre-apercu" class="text-lg font-bold">Aperçu</h2>
				<MediaPublicite {pub} taille={pub.genre === 'image' ? 'vignette' : 'grand'} />
				<p class="text-[15px]">{tronquer(pub.texte_affiche, 200)}</p>
				<a href="/publicites/{pub.id}" class="lien inline-flex items-center gap-1 text-[15px]" target="_blank" rel="noopener">
					Voir la page publique<ExternalLink class="size-4" aria-hidden="true" /><span class="sr-only"> (nouvel onglet)</span>
				</a>
			</section>

			<section class="carte p-5" aria-labelledby="titre-stats">
				<h2 id="titre-stats" class="mb-3 text-lg font-bold">Diffusion</h2>
				<dl class="grid grid-cols-2 gap-3 text-[15px]">
					<div><dt class="text-ardoise">Insertion</dt><dd class="font-semibold">{dateCourte(pub.date_creation)}</dd></div>
					<div><dt class="text-ardoise">Période</dt><dd class="font-semibold">{dateCourte(pub.date_debut)} → {dateCourte(pub.date_fin)}</dd></div>
					<div><dt class="text-ardoise">Vues</dt><dd class="montant font-semibold">{entier(pub.nombre_vues)}</dd></div>
					<div><dt class="text-ardoise">Dernière vue</dt><dd class="font-semibold">{pub.date_derniere_vue ? dateHeure(pub.date_derniere_vue) : '—'}</dd></div>
				</dl>
			</section>

			<PanneauModeration
				etat={pub.etat}
				peutModerer={pub.peut_moderer}
				peutModifier={pub.peut_moderer}
				{form}
				etats={Object.entries(ETATS_PUBLICITE).map(([v, l]) => ({ value: Number(v), label: l }))}
			/>
			{#if !pub.peut_moderer}
				<p class="text-sm text-ardoise">La mise en ligne et la suppression demandent le droit « Activation ».</p>
			{/if}
		</aside>
	</div>
</div>

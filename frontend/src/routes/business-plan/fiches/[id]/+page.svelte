<script lang="ts">
	import EnTetePage from '$lib/components/ui/EnTetePage.svelte';
	import PanneauModeration from '$lib/components/ui/PanneauModeration.svelte';
	import Avatar from '$lib/components/ui/Avatar.svelte';
	import Jauge from '$lib/components/ui/Jauge.svelte';
	import { ETAPES_BP, LIBELLES } from '$lib/components/business-plan/questions';
	import { dateHeure, libelle } from '$lib/format';

	let { data, form } = $props();
	const bp = $derived(data.plan);
</script>

<svelte:head>
	<title>Business plan {bp.reference} — {data.parametres.nom_site}</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<EnTetePage
	titre={bp.type_activite || 'Business plan'}
	surtitre="Business plan {bp.reference}"
	fil={[{ href: '/business-plan/fiches', label: 'Business plans' }]}
/>

<div class="conteneur grid gap-8 py-8 lg:grid-cols-[1fr_20rem]">
	<div class="space-y-6">
		{#each ETAPES_BP as e (e.titre)}
			<section class="carte p-6">
				<h2 class="text-xl font-bold">{e.titre}</h2>
				<dl class="mt-4 space-y-4">
					{#each e.champs as c (c)}
						<div>
							<dt class="text-sm font-semibold text-ardoise">{LIBELLES[c]}</dt>
							{#if c === 'niveau_realisation'}
								<dd class="mt-1"><Jauge valeur={bp.niveau_realisation} max={100} label="{bp.niveau_realisation} % réalisé" /></dd>
							{:else}
								<dd class="mt-1 whitespace-pre-line">{bp[c] || '—'}</dd>
							{/if}
						</div>
					{/each}
				</dl>
			</section>
		{/each}
	</div>

	<aside class="space-y-6">
		{#if bp.membre}
			<section class="carte flex items-center gap-4 p-5">
				<Avatar src={bp.membre.photo_url} nom={bp.membre.nom} taille="lg" />
				<div>
					<p class="font-semibold">{bp.membre.nom}</p>
					<p class="text-sm text-ardoise">{bp.membre.pseudonyme}{#if bp.membre.sexe !== 3} · {libelle(data.enums, 'Sexe', bp.membre.sexe)}{/if}</p>
					<a href="/gestion/membres/{bp.membre.id}" class="lien text-sm">Fiche du membre</a>
				</div>
			</section>
		{/if}
		<p class="text-sm text-ardoise">Créé le {dateHeure(bp.date_creation)}</p>
		<PanneauModeration
			etat={bp.etat}
			peutModerer={bp.peut_moderer}
			{form}
			etats={[
				{ value: 1, label: 'Brouillon (non traité)' },
				{ value: 2, label: 'Envoyé (autorisé)' },
				{ value: 3, label: 'Supprimé' },
				{ value: 4, label: 'Clôturé' }
			]}
		/>
	</aside>
</div>

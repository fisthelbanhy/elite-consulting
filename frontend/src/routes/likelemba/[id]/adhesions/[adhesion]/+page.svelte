<script lang="ts">
	import Wallet from '@lucide/svelte/icons/wallet';
	import EnTetePage from '$lib/components/ui/EnTetePage.svelte';
	import Bouton from '$lib/components/ui/Bouton.svelte';
	import Alerte from '$lib/components/ui/Alerte.svelte';
	import Avatar from '$lib/components/ui/Avatar.svelte';
	import PanneauModeration from '$lib/components/ui/PanneauModeration.svelte';
	import FormulaireAdhesion from '$lib/components/likelemba/FormulaireAdhesion.svelte';
	import TableauCotisations from '$lib/components/likelemba/TableauCotisations.svelte';
	import { date, fcfa } from '$lib/format';

	let { data, form } = $props();
	const a = $derived(data.adhesion);
	const gerer = $derived(a.peut_modifier && a.membre?.id !== data.membre?.id);
</script>

<svelte:head>
	<title>Adhésion {a.code} — likelemba {a.groupe.code} — {data.parametres.nom_site}</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<EnTetePage
	titre="Adhésion {a.code}"
	sousTitre="Likelemba {a.groupe.code} · {a.membre?.pseudonyme ?? 'Membre'}"
	fil={[{ href: '/likelemba', label: 'Likelemba' }, { href: `/likelemba/${a.groupe.id}`, label: a.groupe.code }]}
>
	{#if a.peut_cotiser}
		<Bouton href="/likelemba/{a.groupe.id}/cotiser?adhesion={a.id}"><Wallet class="size-5" aria-hidden="true" />Cotiser {fcfa(a.groupe.montant_cotisation)}</Bouton>
	{/if}
</EnTetePage>

<div class="conteneur grid gap-8 py-8 lg:grid-cols-[1fr_20rem]">
	<div class="space-y-6">
		{#if data.modifie}<Alerte type="succes" titre="Modification effectuée." />{/if}
		{#if a.etat === 1}<Alerte type="attention" titre="Adhésion en attente de confirmation par la frangine." />{/if}

		<section class="carte p-6" aria-labelledby="titre-historique">
			<h2 id="titre-historique" class="mb-3 text-xl font-bold">Les paiements antérieurs du membre</h2>
			<TableauCotisations cotisations={a.cotisations} total={a.total_cotisations} enums={data.enums} afficherAdherent={false} validation={false} />
		</section>

		{#if a.peut_modifier}
			<h2 class="text-xl font-bold">Caution et témoins</h2>
			<FormulaireAdhesion {form} initial={a} {gerer} retour="/likelemba/{a.groupe.id}" libelleBouton="Enregistrer les modifications" />
		{/if}
	</div>

	<aside class="space-y-6">
		<section class="carte space-y-3 p-5">
			<p class="flex items-center gap-3"><Avatar src={a.membre?.photo_url} nom={a.membre?.pseudonyme} /><span class="font-semibold">{a.membre?.pseudonyme ?? 'Membre'}</span></p>
			<dl class="space-y-2 text-[15px]">
				<div class="flex justify-between gap-3"><dt class="text-ardoise">Code adhérent</dt><dd class="font-semibold">{a.code || '—'}</dd></div>
				<div class="flex justify-between gap-3"><dt class="text-ardoise">Ordre d'entrée</dt><dd class="font-semibold">{a.ordre ?? '—'}</dd></div>
				<div class="flex justify-between gap-3"><dt class="text-ardoise">Entré le</dt><dd>{date(a.date_entree)}</dd></div>
				<div class="flex justify-between gap-3"><dt class="text-ardoise">Total cotisé</dt><dd class="montant font-semibold text-foret-700">{fcfa(a.total_cotisations)}</dd></div>
			</dl>
		</section>

		<PanneauModeration
			etat={a.etat}
			peutModerer={a.peut_moderer}
			{form}
			etats={[
				{ value: 1, label: 'En attente' },
				{ value: 2, label: 'Active' },
				{ value: 3, label: 'Retirée' },
				{ value: 4, label: 'Clôturée' }
			]}
		/>
	</aside>
</div>

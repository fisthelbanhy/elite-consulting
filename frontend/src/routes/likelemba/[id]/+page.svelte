<script lang="ts">
	import { page } from '$app/state';
	import Share2 from '@lucide/svelte/icons/share-2';
	import UserPlus from '@lucide/svelte/icons/user-plus';
	import Wallet from '@lucide/svelte/icons/wallet';
	import Lock from '@lucide/svelte/icons/lock';
	import EnTetePage from '$lib/components/ui/EnTetePage.svelte';
	import Bouton from '$lib/components/ui/Bouton.svelte';
	import Alerte from '$lib/components/ui/Alerte.svelte';
	import Avatar from '$lib/components/ui/Avatar.svelte';
	import PanneauModeration from '$lib/components/ui/PanneauModeration.svelte';
	import ListeAdherents from '$lib/components/likelemba/ListeAdherents.svelte';
	import Calendrier from '$lib/components/likelemba/Calendrier.svelte';
	import TableauCotisations from '$lib/components/likelemba/TableauCotisations.svelte';
	import { date, fcfa, libelle, lienPartageWhatsApp } from '$lib/format';
	import type { AdhesionResume } from '$lib/types/likelemba';

	let { data, form } = $props();
	const g = $derived(data.groupe);
	const periodicite = $derived(libelle(data.enums, 'Periodicite', g.periodicite).toLowerCase());
	const partage = $derived(lienPartageWhatsApp(`Rejoignez le likelemba ${g.code} (${fcfa(g.montant_cotisation)}, ${periodicite}) sur La Frangine : ${page.url.href}`));
	const lienPour = (a: AdhesionResume) => g.peut_gerer || !!data.membre?.est_gestionnaire || a.id === g.mon_adhesion_id;
	const retourValider = $derived(form?.cle === 'valider' ? form : null);
</script>

<svelte:head>
	<title>Likelemba {g.code} — {data.parametres.nom_site}</title>
	<meta name="description" content="Likelemba {g.code} : cotisation de {fcfa(g.montant_cotisation)} ({periodicite}), {g.nombre_adherents} membres. Rejoignez le cercle sur La Frangine." />
</svelte:head>

<EnTetePage
	titre="Likelemba {g.code}"
	sousTitre="{fcfa(g.montant_cotisation)} par personne, {periodicite}"
	surtitre="Likelemba"
	fil={[{ href: '/likelemba', label: 'Likelemba' }, { href: `/likelemba/${g.id}`, label: g.code }]}
>
	<Bouton href={partage} variante="secondaire" target="_blank" rel="noopener"><Share2 class="size-5" aria-hidden="true" />Partager</Bouton>
	{#if g.mon_adhesion_id}
		<Bouton href="/likelemba/{g.id}/cotiser?adhesion={g.mon_adhesion_id}"><Wallet class="size-5" aria-hidden="true" />Payer ma cotisation</Bouton>
	{:else if g.peut_adherer}
		<Bouton href="/likelemba/{g.id}/adherer"><UserPlus class="size-5" aria-hidden="true" />Rejoindre</Bouton>
	{:else if !data.membre}
		<Bouton href="/connexion?suite={page.url.pathname}">Se connecter pour rejoindre</Bouton>
	{/if}
</EnTetePage>

<div class="conteneur grid gap-8 py-8 lg:grid-cols-[1fr_22rem]">
	<div class="space-y-6">
		{#if data.enregistre}<Alerte type="succes" titre="Le likelemba {g.code} est créé.">Le responsable a été prévenu. Inscrivez maintenant les membres.</Alerte>{/if}
		{#if data.modifie}<Alerte type="succes" titre="Modification effectuée." />{/if}
		{#if data.adhere}<Alerte type="succes" titre="Adhésion enregistrée : code {data.adhere}.">Conservez ce code, il figure sur vos reçus.</Alerte>{/if}

		<section class="carte grid grid-cols-2 gap-4 p-6 sm:grid-cols-4" aria-label="Chiffres du groupe">
			<div><p class="text-sm text-ardoise">Cotisation</p><p class="montant font-display text-xl font-bold text-fleuve-800">{fcfa(g.montant_cotisation)}</p></div>
			<div><p class="text-sm text-ardoise">Cagnotte par tour</p><p class="montant font-display text-xl font-bold text-foret-700">{fcfa(g.cagnotte)}</p></div>
			<div><p class="text-sm text-ardoise">Membres actifs</p><p class="font-display text-xl font-bold text-fleuve-800">{g.nombre_adherents}</p></div>
			<div><p class="text-sm text-ardoise">Début</p><p class="font-display text-xl font-bold text-fleuve-800">{g.date_debut ? date(g.date_debut) : '—'}</p></div>
		</section>

		<section class="carte p-6" aria-labelledby="titre-membres">
			<div class="flex flex-wrap items-center justify-between gap-3">
				<h2 id="titre-membres" class="text-xl font-bold">Membres ({g.adhesions.length})</h2>
				{#if g.peut_gerer}
					<Bouton href="/likelemba/{g.id}/adherer" variante="secondaire" taille="sm"><UserPlus class="size-4" aria-hidden="true" />Inscrire un membre</Bouton>
				{/if}
			</div>
			{#if g.adhesions.length}
				<ListeAdherents adhesions={g.adhesions} groupeId={g.id} {lienPour} />
			{:else}
				<p class="mt-3 text-ardoise">Aucun membre pour l'instant : soyez le premier à rejoindre le cercle.</p>
			{/if}
		</section>

		<section class="carte p-6" aria-labelledby="titre-calendrier">
			<h2 id="titre-calendrier" class="mb-3 text-xl font-bold">Calendrier des tours</h2>
			<Calendrier calendrier={g.calendrier} cagnotte={g.cagnotte} />
		</section>

		<section class="carte p-6" aria-labelledby="titre-historique">
			<h2 id="titre-historique" class="mb-3 text-xl font-bold">Historique des cotisations</h2>
			{#if g.cotisations}
				{#if retourValider?.succes}<Alerte type="succes" titre={retourValider.succes} class="mb-4" />{:else if retourValider?.message}<Alerte type="erreur" titre={retourValider.message} class="mb-4" />{/if}
				<TableauCotisations cotisations={g.cotisations} total={g.total_cotisations ?? 0} enums={data.enums} />
			{:else}
				<p class="flex items-center gap-2 text-ardoise"><Lock class="size-4" aria-hidden="true" />Visible uniquement par les membres du groupe, son responsable et la frangine.</p>
			{/if}
		</section>
	</div>

	<aside class="space-y-6">
		<section class="carte space-y-3 p-5" aria-labelledby="titre-responsable">
			<h2 id="titre-responsable" class="text-lg font-bold">Responsable</h2>
			{#if g.responsable}
				<p class="flex items-center gap-3"><Avatar src={g.responsable.photo_url} nom={g.responsable.pseudonyme} /><span class="font-semibold">{g.responsable.pseudonyme}</span></p>
			{:else}
				<p class="text-ardoise">La frangine</p>
			{/if}
			{#if g.observation}<p class="text-[15px] whitespace-pre-line">{g.observation}</p>{/if}
			<p class="text-sm text-ardoise">{g.compteur_entrees} entrée{g.compteur_entrees > 1 ? 's' : ''} depuis la création.</p>
		</section>

		{#if g.peut_adherer}
			<section class="carte space-y-3 p-5">
				<h2 class="text-lg font-bold">Rejoindre ce cercle</h2>
				<p class="text-[15px] text-ardoise">Indiquez une caution et jusqu'à trois témoins : c'est la confiance du groupe. Votre code d'adhérent vous est donné tout de suite.</p>
				<Bouton href="/likelemba/{g.id}/adherer" variante="fleuve" pleineLargeur>Rejoindre le likelemba</Bouton>
			</section>
		{/if}

		<PanneauModeration etat={g.etat} peutModerer={g.peut_moderer} peutModifier={g.peut_modifier} lienModifier="/likelemba/{g.id}/modifier" {form} />
	</aside>
</div>

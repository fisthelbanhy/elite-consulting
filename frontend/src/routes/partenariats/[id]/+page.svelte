<script lang="ts">
	import { page } from '$app/state';
	import Share2 from '@lucide/svelte/icons/share-2';
	import Users from '@lucide/svelte/icons/users';
	import EnTetePage from '$lib/components/ui/EnTetePage.svelte';
	import Bouton from '$lib/components/ui/Bouton.svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
	import Alerte from '$lib/components/ui/Alerte.svelte';
	import Formulaire from '$lib/components/ui/Formulaire.svelte';
	import Zone from '$lib/components/ui/Zone.svelte';
	import PanneauModeration from '$lib/components/ui/PanneauModeration.svelte';
	import ListeInterets from '$lib/components/partenariats/ListeInterets.svelte';
	import { champ } from '$lib/forms';
	import { date, lienPartageWhatsApp, tronquer } from '$lib/format';

	let { data, form } = $props();
	const p = $derived(data.fiche);
	const estAuteur = $derived(!!data.membre && p.auteur?.id === data.membre.id);
	const peutSeManifester = $derived(!estAuteur && !data.membre?.est_gestionnaire);
	const blocs = $derived(
		[
			{ titre: "J'ai (actif)", texte: p.actif, ton: 'text-foret-700' },
			{ titre: 'Description', texte: p.description, ton: 'text-fleuve-700' },
			{ titre: 'Je cherche', texte: p.recherche, ton: 'text-laterite-700' },
			{ titre: 'Objectif', texte: p.objectif, ton: 'text-fleuve-700' }
		].filter((b) => b.texte)
	);
</script>

<svelte:head>
	<title>{p.actif} — partenariat & troc ({p.reference}) — {data.parametres.nom_site}</title>
	<meta name="description" content={tronquer(`J'ai : ${p.actif}. Je cherche : ${p.recherche}. ${p.objectif}`, 155)} />
</svelte:head>

<EnTetePage titre={p.actif} surtitre="Partenariat & troc" fil={[{ href: '/partenariats', label: 'Partenariat & troc' }]}>
	<Bouton href={lienPartageWhatsApp(`Partenariat : ${p.actif} — ${page.url.href}`)} variante="secondaire" target="_blank" rel="noopener">
		<Share2 class="size-5" aria-hidden="true" />Partager
	</Bouton>
</EnTetePage>

<div class="conteneur grid gap-8 py-8 lg:grid-cols-[1fr_22rem]">
	<div class="space-y-6">
		{#if data.enregistre}<Alerte type="succes" titre="Votre recherche de partenariat & troc a bien été enregistrée.">Référence {p.reference}.</Alerte>{/if}

		<section class="carte space-y-5 p-6">
			<div class="flex flex-wrap items-center gap-2 text-sm text-ardoise">
				<Badge ton="foret">{p.reference}</Badge>
				<span>Publiée le {date(p.date_creation)}{#if p.auteur} par <strong class="text-encre">{p.auteur.pseudonyme}</strong>{/if}</span>
				<span class="flex items-center gap-1"><Users class="size-4" aria-hidden="true" />{p.nombre_interets} intéressé{p.nombre_interets > 1 ? 's' : ''}</span>
			</div>
			<dl class="space-y-4">
				{#each blocs as b (b.titre)}
					<div>
						<dt class="text-xs font-bold tracking-wide uppercase {b.ton}">{b.titre}</dt>
						<dd class="mt-1 whitespace-pre-line">{b.texte}</dd>
					</div>
				{/each}
			</dl>
		</section>

		{#if p.interets}<ListeInterets interets={p.interets} reference={p.reference} />{/if}
	</div>

	<aside class="space-y-6">
		{#if peutSeManifester}
			<section class="carte p-5">
				<h2 class="text-lg font-bold">Cette proposition vous intéresse ?</h2>
				{#if !data.membre}
					<p class="mt-2 text-[15px] text-ardoise">Créez votre compte gratuit pour vous manifester : l'auteur reçoit votre message par La Frangine.</p>
					<div class="mt-4 space-y-2">
						<Bouton href="/inscription?suite={page.url.pathname}" pleineLargeur>Je suis intéressé·e</Bouton>
						<Bouton href="/connexion?suite={page.url.pathname}" variante="fantome" pleineLargeur>J'ai déjà un compte</Bouton>
					</div>
				{:else if p.mon_interet || (form?.cle === 'interet' && form?.succes)}
					<Alerte type="succes" titre={form?.cle === 'interet' && form?.succes ? form.succes : 'Vous vous êtes déjà manifesté·e.'} class="mt-3">L'auteur de la proposition a été prévenu.</Alerte>
				{:else}
					<Formulaire action="?/interet" {form} cle="interet" class="mt-3">
						{#snippet children({ envoi })}
							<Zone label="Votre intéressement" lignes={4} requis placeholder="Ce que vous proposez, vos disponibilités…" aide="5 caractères minimum." {...champ(form, 'message', '', 'interet')} />
							<Bouton type="submit" pleineLargeur chargement={envoi} class="mt-4">Enregistrer mon intéressement</Bouton>
						{/snippet}
					</Formulaire>
				{/if}
			</section>
		{/if}

		<PanneauModeration etat={p.etat} peutModerer={p.peut_moderer} peutModifier={p.peut_modifier} lienModifier="/partenariats/{p.id}/modifier" {form} />
	</aside>
</div>

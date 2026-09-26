<script lang="ts">
	/** Tableau de bord du gestionnaire (correctif F-TRV-06 : le legacy lui affichait une page vide). */
	import UserPlus from '@lucide/svelte/icons/user-plus';
	import Wallet from '@lucide/svelte/icons/wallet';
	import ShieldCheck from '@lucide/svelte/icons/shield-check';
	import KeyRound from '@lucide/svelte/icons/key-round';
	import MessagesSquare from '@lucide/svelte/icons/messages-square';
	import Inbox from '@lucide/svelte/icons/inbox';
	import Lightbulb from '@lucide/svelte/icons/lightbulb';
	import ShoppingBasket from '@lucide/svelte/icons/shopping-basket';
	import Users from '@lucide/svelte/icons/users';
	import Eye from '@lucide/svelte/icons/eye';
	import EnTeteGestion from '$lib/components/gestion/EnTeteGestion.svelte';
	import CarteStat from '$lib/components/gestion/CarteStat.svelte';
	import GraphiqueVisites from '$lib/components/gestion/GraphiqueVisites.svelte';
	import Avatar from '$lib/components/ui/Avatar.svelte';
	import BadgeEtat from '$lib/components/ui/BadgeEtat.svelte';
	import { entier, fcfa, libelle, relatif } from '$lib/format';

	let { data } = $props();
	const t = $derived(data.tableau);
	const modules = $derived(t.modules_en_attente.filter((m) => m.total > 0));
</script>

<svelte:head>
	<title>Tableau de bord — Gestion — {data.parametres.nom_site}</title>
</svelte:head>

<EnTeteGestion titre="Mbote {data.gestionnaire.pseudonyme || data.gestionnaire.nom} !" sousTitre="Voici ce qui attend la frangine aujourd'hui." />

<div class="mx-auto max-w-7xl space-y-8 px-4 py-6 sm:px-6">
	<section aria-labelledby="titre-a-traiter">
		<h2 id="titre-a-traiter" class="mb-3 text-lg font-bold">À traiter</h2>
		<div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
			<CarteStat libelle="Nouveaux membres à valider" valeur={t.nouveaux_membres} href="/gestion/membres?etat=1" icone={UserPlus} action />
			<CarteStat
				libelle="Paiements à confirmer"
				valeur={t.paiements_en_attente}
				detail={t.paiements_en_attente ? fcfa(t.montant_en_attente) : undefined}
				href="/gestion/paiements?etat=2"
				icone={Wallet}
				action
			/>
			<CarteStat libelle="Fiches en attente de modération" valeur={t.fiches_en_attente} href="/gestion/moderation" icone={ShieldCheck} action />
			<CarteStat libelle="Mots de passe oubliés" valeur={t.reinitialisations_en_attente} href="/gestion/reinitialisations" icone={KeyRound} action />
			<CarteStat libelle="Messages non lus" valeur={t.messages_non_lus} href="/gestion/messages" icone={MessagesSquare} action />
			<CarteStat libelle="Contacts à traiter" valeur={t.contacts_a_traiter} href="/gestion/contacts" icone={Inbox} action />
			<CarteStat libelle="Suggestions à lire" valeur={t.suggestions_a_lire} href="/gestion/suggestions" icone={Lightbulb} action />
			<CarteStat libelle="Courses en attente" valeur={t.courses_en_attente} href="/courses" icone={ShoppingBasket} />
		</div>
	</section>

	<div class="grid gap-6 xl:grid-cols-[minmax(0,1fr)_24rem]">
		<section class="carte p-5" aria-labelledby="titre-audience">
			<div class="flex flex-wrap items-baseline justify-between gap-2">
				<h2 id="titre-audience" class="text-lg font-bold">Fréquentation</h2>
				<a href="/gestion/journaux" class="lien text-sm">Voir les journaux</a>
			</div>
			<dl class="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
				{#each [['Visites · 7 j', t.visites_7j], ['Visites · 30 j', t.visites_30j], ['Connexions · 7 j', t.connexions_7j], ['Connexions · 30 j', t.connexions_30j]] as [l, v] (l)}
					<div class="rounded-xl bg-creme p-3">
						<dt class="text-sm text-ardoise">{l}</dt>
						<dd class="montant font-display text-xl font-bold">{entier(Number(v))}</dd>
					</div>
				{/each}
			</dl>
			<div class="mt-4"><GraphiqueVisites serie={t.serie} /></div>
			<p class="mt-3 flex items-center gap-2 text-sm text-ardoise">
				<Users class="size-4" aria-hidden="true" />{entier(t.membres)} membres ·
				<Eye class="size-4" aria-hidden="true" />{t.membres_en_ligne} en ligne en ce moment
			</p>
		</section>

		<div class="space-y-6">
			<section class="carte p-5" aria-labelledby="titre-moderation">
				<h2 id="titre-moderation" class="text-lg font-bold">Fiches en attente par module</h2>
				{#if modules.length}
					<ul class="mt-3 divide-y divide-fleuve-900/5">
						{#each modules as m (m.cle)}
							<li>
								<a href="/gestion/moderation?module={m.cle}" class="flex min-h-11 items-center justify-between gap-2 py-2 hover:text-fleuve-700">
									<span>{m.libelle}</span>
									<span class="rounded-full bg-soleil-100 px-2.5 py-0.5 text-sm font-bold">{m.total}</span>
								</a>
							</li>
						{/each}
					</ul>
				{:else}
					<p class="mt-2 text-ardoise">Rien en attente : toutes les fiches sont traitées.</p>
				{/if}
			</section>

			<section class="carte p-5" aria-labelledby="titre-inscrits">
				<div class="flex items-baseline justify-between gap-2">
					<h2 id="titre-inscrits" class="text-lg font-bold">Derniers inscrits</h2>
					<a href="/gestion/membres?tri=recents" class="lien text-sm">Tous</a>
				</div>
				<ul class="mt-3 divide-y divide-fleuve-900/5">
					{#each t.derniers_inscrits as m (m.id)}
						<li>
							<a href="/gestion/membres/{m.id}" class="flex items-center gap-3 py-2.5 hover:bg-creme">
								<Avatar src={m.photo_url} nom={m.pseudonyme || m.nom} taille="sm" />
								<span class="min-w-0 flex-1">
									<span class="block truncate font-semibold">{m.nom}</span>
									<span class="block truncate text-sm text-ardoise">
										{libelle(data.enums, 'CategorieMembre', m.categorie)}{m.ville ? ` · ${m.ville.nom}` : ''} · {relatif(m.date_creation)}
									</span>
								</span>
								<BadgeEtat etat={m.etat} libelles={{ 1: 'À valider', 2: 'Validé', 3: 'Supprimé' }} />
							</a>
						</li>
					{:else}
						<li class="py-2 text-ardoise">Aucun inscrit pour l'instant.</li>
					{/each}
				</ul>
			</section>
		</div>
	</div>
</div>

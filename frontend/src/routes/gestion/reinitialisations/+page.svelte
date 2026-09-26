<script lang="ts">
	/**
	 * Mots de passe oubliés : la frangine rappelle le membre, vérifie son identité, puis lui
	 * transmet un lien à usage unique. Personne ne voit jamais le mot de passe (ADR-0005 §3).
	 */
	import { enhance } from '$app/forms';
	import KeyRound from '@lucide/svelte/icons/key-round';
	import Phone from '@lucide/svelte/icons/phone';
	import EnTeteGestion from '$lib/components/gestion/EnTeteGestion.svelte';
	import LienUnique from '$lib/components/gestion/LienUnique.svelte';
	import Onglets from '$lib/components/ui/Onglets.svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
	import Alerte from '$lib/components/ui/Alerte.svelte';
	import Pagination from '$lib/components/ui/Pagination.svelte';
	import EtatVide from '$lib/components/ui/EtatVide.svelte';
	import { dateHeure, lienTel, relatif, telephone } from '$lib/format';
	import type { StatutReinitialisation } from '$lib/types/gestion';

	let { data, form } = $props();
	const statuts: Record<StatutReinitialisation, { lib: string; ton: 'soleil' | 'fleuve' | 'foret' | 'neutre' | 'alerte' }> = {
		en_attente: { lib: 'À traiter', ton: 'soleil' },
		prise_en_charge: { lib: 'Prise en charge', ton: 'fleuve' },
		ignoree: { lib: 'Classée sans suite', ton: 'neutre' },
		lien_actif: { lib: 'Lien envoyé', ton: 'fleuve' },
		utilise: { lib: 'Mot de passe changé', ton: 'foret' },
		expire: { lib: 'Lien expiré', ton: 'alerte' }
	};
	const actif = $derived(data.gestionnaire.droit_activation);
</script>

<svelte:head>
	<title>Mots de passe oubliés — Gestion — {data.parametres.nom_site}</title>
</svelte:head>

<EnTeteGestion titre="Mots de passe oubliés" sousTitre="Demandes des membres sans e-mail : rappelez-les avant d'envoyer un lien." fil={[{ href: '/gestion/reinitialisations', label: 'Mots de passe oubliés' }]}>
	{#snippet bas()}
		<div class="mt-4">
			<Onglets
				label="Statut"
				onglets={[
					{ href: '/gestion/reinitialisations', label: 'À traiter', actif: data.statut === 'attente' },
					{ href: '/gestion/reinitialisations?statut=toutes', label: 'Historique', actif: data.statut === 'toutes' }
				]}
			/>
		</div>
	{/snippet}
</EnTeteGestion>

<div class="mx-auto max-w-5xl space-y-5 px-4 py-6 sm:px-6">
	{#if form?.cle === 'reinit'}
		{#if form.lien}
			<LienUnique lien={form.lien} />
		{:else if form.succes}
			<Alerte type="succes" titre={form.succes} />
		{:else if form.message}
			<Alerte type="erreur" titre={form.message} />
		{/if}
	{/if}

	{#if data.liste.items.length}
		<ul class="carte divide-y divide-fleuve-900/5">
			{#each data.liste.items as r (r.id)}
				{@const s = statuts[r.statut]}
				<li class="flex flex-col gap-3 p-4 md:flex-row md:items-center">
					<div class="min-w-0 flex-1">
						<div class="flex flex-wrap items-center gap-2">
							<a href="/gestion/membres/{r.membre.id}" class="font-semibold text-fleuve-700 hover:underline">{r.membre.nom}</a>
							<span class="text-sm text-ardoise">({r.membre.pseudonyme})</span>
							<Badge ton={s.ton}>{s.lib}</Badge>
							{#if r.canal === 'email'}<Badge>Par e-mail</Badge>{/if}
						</div>
						<p class="text-sm text-ardoise">
							Demandé {relatif(r.date_creation)} ({dateHeure(r.date_creation)})
							{#if r.traitee_par} · par {r.traitee_par}{/if}
							{#if r.date_utilisation && r.statut === 'utilise'} · utilisé le {dateHeure(r.date_utilisation)}{/if}
						</p>
					</div>
					{#if r.statut === 'en_attente'}
						<div class="flex flex-wrap gap-2">
							{#if r.membre.telephone}
								<a href={lienTel(r.membre.telephone)} class="inline-flex min-h-11 items-center gap-1.5 rounded-xl px-3 font-semibold text-fleuve-700 ring-1 ring-fleuve-200 ring-inset hover:bg-fleuve-50">
									<Phone class="size-4" aria-hidden="true" />{telephone(r.membre.telephone)}
								</a>
							{/if}
							{#if actif}
								<form method="POST" action="?/traiter" use:enhance>
									<input type="hidden" name="id" value={r.id} />
									<button class="inline-flex min-h-11 items-center gap-1.5 rounded-xl bg-fleuve-700 px-3 font-semibold text-white hover:bg-fleuve-800">
										<KeyRound class="size-4" aria-hidden="true" />Créer le lien
									</button>
								</form>
								<form method="POST" action="?/ignorer" use:enhance={({ cancel }) => { if (!confirm('Classer cette demande sans suite ?')) cancel(); }}>
									<input type="hidden" name="id" value={r.id} />
									<button class="inline-flex min-h-11 items-center rounded-xl px-3 font-semibold text-ardoise hover:bg-sable">Classer</button>
								</form>
							{/if}
						</div>
					{/if}
				</li>
			{/each}
		</ul>
		<Pagination total={data.liste.total} page={data.liste.page} taille={data.liste.taille} />
	{:else}
		<EtatVide icone={KeyRound} titre={data.statut === 'attente' ? 'Aucune demande en attente' : 'Aucun historique'} texte="Les demandes « mot de passe oublié » des membres sans e-mail apparaîtront ici." />
	{/if}
</div>

<script lang="ts">
	import Users from '@lucide/svelte/icons/users';
	import EnTetePage from '$lib/components/ui/EnTetePage.svelte';
	import Bouton from '$lib/components/ui/Bouton.svelte';
	import Pagination from '$lib/components/ui/Pagination.svelte';
	import EtatVide from '$lib/components/ui/EtatVide.svelte';
	import StatutSouscription from '$lib/components/distributeur/StatutSouscription.svelte';
	import { dateCourte, fcfa, lienTel, lienWhatsApp, telephone } from '$lib/format';

	let { data } = $props();
	const f = $derived(data.filtres);
	const l = $derived(data.liste);
	const modes: Record<number, string> = { 0: '—', 1: 'Fonds propres', 2: 'Crédit' };
</script>

<svelte:head>
	<title>Suivi des souscriptions distributeur — {data.parametres.nom_site}</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<EnTetePage
	titre="Suivi des souscriptions distributeur"
	sousTitre="Les demandes à crédit envoyées attendent votre appel ; les souscriptions en fonds propres passent par la caisse."
	fil={[{ href: '/devenir-distributeur', label: 'Devenir distributeur' }, { href: '/devenir-distributeur/suivi', label: 'Suivi' }]}
>
	<Bouton href="/devenir-distributeur/suivi?mode=2&envoyees=1&etat=1" variante="secondaire">Crédits à traiter</Bouton>
</EnTetePage>

<div class="conteneur space-y-6 py-8">
	<form method="GET" class="carte grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-[1fr_auto_auto_auto_auto] lg:items-end">
		<div>
			<label for="q" class="mb-1.5 block text-[15px] font-semibold">Référence ou membre</label>
			<input id="q" name="q" type="search" value={f.q} />
		</div>
		<div>
			<label for="etat" class="mb-1.5 block text-[15px] font-semibold">État</label>
			<select id="etat" name="etat">
				<option value="">Tous (sauf supprimées)</option>
				<option value="1" selected={f.etat === '1'}>Non traitée</option>
				<option value="2" selected={f.etat === '2'}>Validée</option>
				<option value="3" selected={f.etat === '3'}>Supprimée</option>
			</select>
		</div>
		<div>
			<label for="mode" class="mb-1.5 block text-[15px] font-semibold">Mode</label>
			<select id="mode" name="mode">
				<option value="">Tous</option>
				<option value="1" selected={f.mode === '1'}>Fonds propres</option>
				<option value="2" selected={f.mode === '2'}>Crédit</option>
			</select>
		</div>
		<label class="flex min-h-12 items-center gap-2 font-semibold">
			<input type="checkbox" name="envoyees" value="1" checked={!!f.envoyees} />Envoyées seulement
		</label>
		<Bouton type="submit" variante="fleuve">Filtrer</Bouton>
	</form>

	{#if l.items.length}
		<p class="text-ardoise" aria-live="polite">{l.total} souscription{l.total > 1 ? 's' : ''}</p>
		<ul class="space-y-3">
			{#each l.items as s (s.id)}
				<li class="carte flex flex-wrap items-center justify-between gap-4 p-4">
					<div class="min-w-0 space-y-1">
						<p class="flex flex-wrap items-center gap-2">
							<a href="/devenir-distributeur/suivi/{s.id}" class="font-bold text-fleuve-800 hover:underline">{s.reference || `Souscription ${s.id}`}</a>
							<StatutSouscription souscription={s} />
						</p>
						{#if s.membre}
							<p class="text-[15px]"><span class="font-semibold">{s.membre.nom}</span> <span class="text-ardoise">· {s.membre.pseudonyme}</span></p>
						{/if}
						<p class="text-sm text-ardoise">Créée le {dateCourte(s.date_creation)} · {modes[s.mode_souscription] ?? '—'} · kit <span class="montant">{fcfa(s.montant)}</span></p>
					</div>
					{#if s.membre?.telephone}
						<div class="flex flex-wrap gap-2">
							<Bouton href={lienTel(s.membre.telephone)} variante="secondaire" taille="sm">{telephone(s.membre.telephone)}</Bouton>
							<Bouton
								href={lienWhatsApp(s.membre.telephone, `Bonjour ${s.membre.pseudonyme}, c'est votre frangine au sujet de votre souscription distributeur ${s.reference}.`)}
								variante="whatsapp"
								taille="sm"
								target="_blank"
								rel="noopener">WhatsApp</Bouton
							>
						</div>
					{/if}
				</li>
			{/each}
		</ul>
		<Pagination total={l.total} page={l.page} taille={l.taille} />
	{:else}
		<EtatVide icone={Users} titre="Aucune souscription" texte="Aucune souscription ne correspond à ces critères." />
	{/if}
</div>

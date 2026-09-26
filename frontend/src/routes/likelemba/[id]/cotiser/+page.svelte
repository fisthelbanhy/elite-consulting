<script lang="ts">
	import Wallet from '@lucide/svelte/icons/wallet';
	import ShieldAlert from '@lucide/svelte/icons/shield-alert';
	import EnTetePage from '$lib/components/ui/EnTetePage.svelte';
	import Bouton from '$lib/components/ui/Bouton.svelte';
	import Alerte from '$lib/components/ui/Alerte.svelte';
	import ListeAdherents from '$lib/components/likelemba/ListeAdherents.svelte';
	import TableauCotisations from '$lib/components/likelemba/TableauCotisations.svelte';
	import { fcfa, libelle } from '$lib/format';

	let { data } = $props();
	const g = $derived(data.groupe);
	const a = $derived(data.adhesion);
	const pourAutrui = $derived(!!a && a.id !== g.mon_adhesion_id);
	const actifs = $derived(g.adhesions.filter((x) => x.etat === 2));
</script>

<svelte:head>
	<title>Cotisation — likelemba {g.code} — {data.parametres.nom_site}</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<EnTetePage
	titre={a ? (pourAutrui ? `Cotisation de ${a.membre?.pseudonyme ?? 'l’adhérent'}` : 'Ma cotisation') : 'Encaisser une cotisation'}
	sousTitre="Likelemba {g.code} · {fcfa(g.montant_cotisation)}, {libelle(data.enums, 'Periodicite', g.periodicite).toLowerCase()}"
	fil={[{ href: '/likelemba', label: 'Likelemba' }, { href: `/likelemba/${g.id}`, label: g.code }]}
/>

<div class="conteneur grid max-w-5xl gap-8 py-8 lg:grid-cols-[1fr_20rem]">
	<div class="space-y-6">
		{#if data.paye}
			<Alerte type="succes" titre="Cotisation enregistrée : votre reçu est dans l'historique ci-dessous.">
				Il sera marqué « Validée » dès que notre caisse aura confirmé le paiement.
			</Alerte>
		{/if}

		{#if a}
			<section class="carte p-6" aria-labelledby="titre-anterieurs">
				<h2 id="titre-anterieurs" class="mb-1 text-xl font-bold">Les paiements antérieurs</h2>
				<p class="mb-4 text-sm text-ardoise">Adhérent {a.code} · {a.membre?.pseudonyme}</p>
				<TableauCotisations cotisations={a.cotisations} total={a.total_cotisations} enums={data.enums} afficherAdherent={false} validation={false} />
			</section>
		{:else}
			<section class="carte p-6" aria-labelledby="titre-choix">
				<h2 id="titre-choix" class="text-xl font-bold">Pour quel adhérent encaissez-vous ?</h2>
				<p class="mt-1 text-sm text-ardoise">La cotisation sera rattachée à son adhésion ; vous figurerez comme caissier.</p>
				{#if actifs.length}
					<ul class="mt-3 divide-y divide-fleuve-900/5">
						{#each actifs as x (x.id)}
							<li>
								<a href="?adhesion={x.id}" class="flex items-center justify-between gap-3 py-3 font-semibold text-fleuve-700 hover:underline">
									<span>{x.membre?.pseudonyme ?? 'Membre'} <span class="font-normal text-ardoise">· {x.code}</span></span>
									<Wallet class="size-5" aria-hidden="true" />
								</a>
							</li>
						{/each}
					</ul>
				{:else}
					<p class="mt-3 text-ardoise">Aucun adhérent actif.</p>
				{/if}
				{#if g.adhesions.length > actifs.length}
					<details class="mt-4"><summary class="cursor-pointer text-sm text-ardoise">Adhésions en attente ou retirées</summary><ListeAdherents adhesions={g.adhesions.filter((x) => x.etat !== 2)} groupeId={g.id} lienPour={() => true} /></details>
				{/if}
			</section>
		{/if}
	</div>

	<aside class="space-y-4">
		{#if a}
			<section class="carte space-y-4 p-5">
				<p class="text-sm text-ardoise">Montant de la cotisation</p>
				<p class="montant font-display text-3xl font-extrabold text-laterite-600">{fcfa(g.montant_cotisation)}</p>
				{#if a.peut_cotiser}
					<Bouton href="/paiement/5?objet={a.id}" pleineLargeur taille="lg"><Wallet class="size-5" aria-hidden="true" />Payer {fcfa(g.montant_cotisation)}</Bouton>
					<p class="text-sm text-ardoise">Mobile Money, espèces ou Charden Farell. Un reçu numéroté est délivré immédiatement.</p>
				{:else}
					<Alerte type="attention" titre="Cotisation pas encore possible.">L'adhésion ou le groupe est en attente de confirmation par la frangine.</Alerte>
				{/if}
			</section>
		{/if}
		<div class="flex gap-3 rounded-xl bg-soleil-100 p-4 text-[15px]">
			<ShieldAlert class="mt-0.5 size-5 shrink-0 text-laterite-700" aria-hidden="true" />
			<p><strong>Ne remettez jamais d'argent sans reçu.</strong> Chaque cotisation porte un numéro unique visible par tout le groupe.</p>
		</div>
	</aside>
</div>

<script lang="ts">
	import EnTetePage from '$lib/components/ui/EnTetePage.svelte';
	import PanneauModeration from '$lib/components/ui/PanneauModeration.svelte';
	import StatutSouscription from '$lib/components/distributeur/StatutSouscription.svelte';
	import { DISPONIBILITES, PRESTATIONS } from '$lib/components/distributeur/contenus';
	import { dateCourte, fcfa, lienTel, lienWhatsApp, telephone } from '$lib/format';

	let { data, form } = $props();
	const s = $derived(data.souscription);
	const modes: Record<number, string> = { 0: 'Non choisi', 1: 'Fonds propres', 2: 'Crédit' };
	const paiements: Record<number, string> = { 1: 'Rejeté (non payé)', 2: 'Déclaré, à confirmer par la caisse', 3: 'Confirmé' };
	const disponibilite = $derived(DISPONIBILITES.find((d) => d.value === s.disponibilite_hebdo)?.label ?? 'Non renseignée');
</script>

<svelte:head>
	<title>Souscription {s.reference} — {data.parametres.nom_site}</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<EnTetePage
	titre="Souscription {s.reference}"
	surtitre="Suivi distributeur"
	fil={[{ href: '/devenir-distributeur/suivi', label: 'Suivi des souscriptions' }]}
/>

<div class="conteneur grid gap-8 py-8 lg:grid-cols-[1fr_20rem]">
	<div class="space-y-6">
		<section class="carte space-y-3 p-6">
			<div class="flex flex-wrap items-center gap-2"><StatutSouscription souscription={s} /></div>
			<dl class="grid gap-x-8 gap-y-2 text-[15px] sm:grid-cols-2">
				<div><dt class="text-ardoise">Créée le</dt><dd class="font-semibold">{dateCourte(s.date_creation)}</dd></div>
				<div><dt class="text-ardoise">Mode</dt><dd class="font-semibold">{modes[s.mode_souscription] ?? '—'}</dd></div>
				<div><dt class="text-ardoise">Kit</dt><dd class="montant font-semibold">{fcfa(s.montant)}</dd></div>
				<div><dt class="text-ardoise">Paiement</dt><dd class="font-semibold">{s.etat_paiement ? paiements[s.etat_paiement] : 'Aucun'}</dd></div>
				<div><dt class="text-ardoise">Disponibilité</dt><dd class="font-semibold">{disponibilite}</dd></div>
				<div><dt class="text-ardoise">Rendez-vous prévus le 1er mois</dt><dd class="font-semibold">{s.nombre_rdv}</dd></div>
			</dl>
		</section>

		{#each [['Objectifs', s.objectifs], ['Son histoire', s.mon_histoire]] as [t, v] (t)}
			{#if v}<section class="carte p-6"><h2 class="text-xl font-bold">{t}</h2><p class="mt-2 whitespace-pre-line">{v}</p></section>{/if}
		{/each}

		<section class="carte p-6">
			<h2 class="text-xl font-bold">Kit de démarrage</h2>
			{#if s.kit.length}
				<ul class="mt-3 divide-y divide-fleuve-900/5 text-[15px]">
					{#each s.kit as l (l.produit_id)}
						<li class="flex justify-between gap-3 py-2"><span>{l.quantite} × {l.nom} <span class="text-ardoise">({fcfa(l.prix_unitaire)})</span></span><span class="montant font-semibold">{fcfa(l.montant)}</span></li>
					{/each}
				</ul>
			{:else}<p class="mt-2 text-ardoise">Aucun produit choisi.</p>{/if}
		</section>

		<section class="carte p-6">
			<h2 class="text-xl font-bold">Liste de noms ({s.prospects.length})</h2>
			{#if s.date_limite_complement}<p class="text-sm text-ardoise">À compléter avant le {dateCourte(s.date_limite_complement)}</p>{/if}
			{#if s.prospects.length}
				<ul class="mt-3 divide-y divide-fleuve-900/5 text-[15px]">
					{#each s.prospects as p (p.id)}
						<li class="py-2"><span class="font-semibold">{p.nom_prenom}</span>{#if p.telephone} · {telephone(p.telephone)}{/if}{#if p.email} · {p.email}{/if}{#if p.commentaire}<span class="block text-ardoise">{p.commentaire}</span>{/if}</li>
					{/each}
				</ul>
			{/if}
		</section>

		<section class="carte p-6">
			<h2 class="text-xl font-bold">Formations et intéressés</h2>
			<ul class="mt-3 space-y-1 text-[15px]">
				{#each PRESTATIONS as p (p.value)}
					{@const f = s.formations.find((x) => x.prestation === p.value)}
					<li><span class="font-semibold">{p.label}</span> : {f && (f.date || f.lieu) ? `${f.date ? dateCourte(f.date) : ''} ${f.heure} ${f.lieu}` : 'non planifiée'}</li>
				{/each}
			</ul>
			{#if s.filleuls.length}
				<ul class="mt-4 space-y-1 text-[15px]">
					{#each s.filleuls as f, i (i)}
						<li><span class="font-semibold">{f.nom || 'Sans nom'}</span>{#if f.montant} · <span class="montant">{fcfa(f.montant)}</span>{/if}{#if f.date_presentation} · présenté le {dateCourte(f.date_presentation)}{/if}{#if f.email} · {f.email}{/if}</li>
					{/each}
				</ul>
			{/if}
		</section>
	</div>

	<aside class="space-y-6">
		{#if s.membre}
			<section class="carte space-y-2 p-5">
				<h2 class="text-lg font-bold">Souscripteur</h2>
				<p class="font-semibold">{s.membre.nom} <span class="font-normal text-ardoise">· {s.membre.pseudonyme}</span></p>
				{#if s.membre.telephone}
					<p><a href={lienTel(s.membre.telephone)} class="lien">{telephone(s.membre.telephone)}</a> · <a href={lienWhatsApp(s.membre.telephone)} target="_blank" rel="noopener" class="font-semibold text-foret-700">WhatsApp</a></p>
				{/if}
				{#if s.membre.email}<p><a href="mailto:{s.membre.email}" class="lien">{s.membre.email}</a></p>{/if}
			</section>
		{/if}
		<PanneauModeration
			etat={s.etat}
			peutModerer={s.peut_moderer}
			{form}
			etats={[
				{ value: 1, label: 'Non traitée' },
				{ value: 2, label: 'Validée (distributeur)' },
				{ value: 3, label: 'Supprimée' },
				{ value: 4, label: 'Clôturée' }
			]}
		/>
		{#if s.peut_moderer && s.mode_souscription === 2 && s.etat === 1}
			<p class="text-sm text-ardoise">Valider une souscription à crédit fait du membre un distributeur ; il en est informé par la messagerie.</p>
		{/if}
	</aside>
</div>

<script lang="ts">
	import Plus from '@lucide/svelte/icons/plus';
	import CreditCard from '@lucide/svelte/icons/credit-card';
	import SlidersHorizontal from '@lucide/svelte/icons/sliders-horizontal';
	import EnTetePage from '$lib/components/ui/EnTetePage.svelte';
	import Bouton from '$lib/components/ui/Bouton.svelte';
	import Alerte from '$lib/components/ui/Alerte.svelte';
	import Pagination from '$lib/components/ui/Pagination.svelte';
	import EtatVide from '$lib/components/ui/EtatVide.svelte';
	import OngletsEpargne from '$lib/components/epargne/OngletsEpargne.svelte';
	import AvertissementEpargne from '$lib/components/epargne/AvertissementEpargne.svelte';
	import TableauPointages from '$lib/components/epargne/TableauPointages.svelte';
	import { dateHeure, fcfa } from '$lib/format';

	let { data } = $props();
	const l = $derived(data.liste);
	const f = $derived(data.filtres);
	const filtre = $derived(Object.entries(f).some(([k, v]) => k !== 'page' && !!v));
</script>

<svelte:head>
	<title>Carte de pointage — {data.parametres.nom_site}</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<EnTetePage
	titre="Carte de pointage"
	sousTitre={l.est_operateur ? (l.est_gestionnaire ? `${l.total} opération${l.total > 1 ? 's' : ''}` : 'Les opérations que vous avez saisies en caisse.') : 'Vos versements et retraits, opération par opération.'}
	surtitre="Épargne solidaire"
	fil={[{ href: '/epargne', label: 'Épargne solidaire' }, { href: '/epargne/carte-pointage', label: 'Carte de pointage' }]}
>
	{#if l.est_operateur}<Bouton href="/epargne/carte-pointage/nouvelle"><Plus class="size-5" aria-hidden="true" />Nouvelle opération</Bouton>{/if}
	{#snippet bas()}<OngletsEpargne actif="pointage" />{/snippet}
</EnTetePage>

<div class="conteneur space-y-6 py-8">
	{#if data.effectue}<Alerte type="succes" titre="Pointage effectué : référence {data.effectue}.">Le titulaire a été prévenu par message.</Alerte>{/if}

	<section class="carte flex flex-wrap items-center gap-4 p-5" aria-label="Mon solde">
		<span class="grid size-12 place-items-center rounded-full bg-foret-50 text-foret-700" aria-hidden="true"><CreditCard class="size-6" /></span>
		<div class="flex-1">
			<p class="text-sm text-ardoise">{l.est_operateur && !l.est_gestionnaire ? 'Solde de votre caisse' : 'Solde de votre carte'}</p>
			<p class="montant font-display text-3xl font-extrabold text-fleuve-800">{fcfa(l.mon_solde)}</p>
			{#if l.date_dernier_pointage}<p class="text-sm text-ardoise">Dernière opération : {dateHeure(l.date_dernier_pointage)}</p>{/if}
		</div>
		{#if !l.est_operateur}<p class="max-w-xs text-sm text-ardoise">Retrait possible jusqu'à 97 % du solde, auprès d'un agent de caisse, avec votre code PIN.</p>{/if}
	</section>

	<form method="GET" class="carte p-4" data-sveltekit-keepfocus>
		<div class="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
			<div><label for="du" class="mb-1.5 block text-[15px] font-semibold">Du</label><input id="du" name="du" type="date" value={f.du} /></div>
			<div><label for="au" class="mb-1.5 block text-[15px] font-semibold">Au (inclus)</label><input id="au" name="au" type="date" value={f.au} /></div>
			<Bouton type="submit" variante="fleuve">Filtrer</Bouton>
		</div>
		<details class="mt-3" open={!!(f.operateur_id || f.membre_id || f.type_operation || f.montant_min || f.montant_max || f.type_caisse)}>
			<summary class="inline-flex min-h-11 cursor-pointer items-center gap-2 font-semibold text-fleuve-700"><SlidersHorizontal class="size-4" aria-hidden="true" />Plus de filtres</summary>
			<div class="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
				{#if l.est_gestionnaire}
					<div>
						<label for="operateur_id" class="mb-1.5 block text-[15px] font-semibold">Caisse</label>
						<select id="operateur_id" name="operateur_id">
							<option value="">Toutes les caisses</option>
							{#each data.titulaires as t (t.id)}<option value={t.id} selected={String(t.id) === f.operateur_id}>{t.nom}</option>{/each}
						</select>
					</div>
				{/if}
				{#if l.est_operateur}
					<div>
						<label for="membre_id" class="mb-1.5 block text-[15px] font-semibold">Membre</label>
						<select id="membre_id" name="membre_id">
							<option value="">Tous les membres</option>
							{#each data.titulaires as t (t.id)}<option value={t.id} selected={String(t.id) === f.membre_id}>{t.nom}</option>{/each}
						</select>
					</div>
				{/if}
				<div>
					<label for="type_operation" class="mb-1.5 block text-[15px] font-semibold">Opération</label>
					<select id="type_operation" name="type_operation">
						<option value="">Toutes</option>
						<option value="1" selected={f.type_operation === '1'}>Versements</option>
						<option value="2" selected={f.type_operation === '2'}>Retraits</option>
					</select>
				</div>
				<div><label for="montant_min" class="mb-1.5 block text-[15px] font-semibold">Montant min.</label><input id="montant_min" name="montant_min" type="number" inputmode="numeric" min="0" value={f.montant_min} /></div>
				<div><label for="montant_max" class="mb-1.5 block text-[15px] font-semibold">Montant max.</label><input id="montant_max" name="montant_max" type="number" inputmode="numeric" min="0" value={f.montant_max} /></div>
				{#if l.est_gestionnaire}
					<div>
						<label for="type_caisse" class="mb-1.5 block text-[15px] font-semibold">Type</label>
						<select id="type_caisse" name="type_caisse">
							<option value="">Opérations et encaisses</option>
							<option value="1" selected={f.type_caisse === '1'}>Opérations des agents</option>
							<option value="2" selected={f.type_caisse === '2'}>Encaisses (gestionnaire)</option>
						</select>
					</div>
				{/if}
			</div>
		</details>
	</form>

	{#if l.items.length}
		<TableauPointages liste={l} />
		<Pagination total={l.total} page={l.page} taille={l.taille} />
	{:else}
		<EtatVide
			icone={CreditCard}
			titre={filtre ? 'Aucune opération ne correspond à ces critères' : 'Aucune opération pour le moment'}
			texte="La carte de pointage vous permet d'épargner un peu chaque jour auprès d'un agent de caisse agréé. Demandez votre code PIN à la frangine."
			messageWhatsApp="Bonjour la Frangine, je voudrais ouvrir ma carte de pointage."
		/>
	{/if}

	<AvertissementEpargne />
</div>

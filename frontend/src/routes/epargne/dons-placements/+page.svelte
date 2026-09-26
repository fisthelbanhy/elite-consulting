<script lang="ts">
	import Plus from '@lucide/svelte/icons/plus';
	import HandHeart from '@lucide/svelte/icons/hand-heart';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';
	import EnTetePage from '$lib/components/ui/EnTetePage.svelte';
	import Bouton from '$lib/components/ui/Bouton.svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
	import BadgeEtat from '$lib/components/ui/BadgeEtat.svelte';
	import Pagination from '$lib/components/ui/Pagination.svelte';
	import EtatVide from '$lib/components/ui/EtatVide.svelte';
	import OngletsEpargne from '$lib/components/epargne/OngletsEpargne.svelte';
	import AvertissementEpargne from '$lib/components/epargne/AvertissementEpargne.svelte';
	import { dateCourte, fcfa, tronquer } from '$lib/format';

	let { data } = $props();
	const f = $derived(data.filtres);
	const l = $derived(data.liste);
	const filtre = $derived(!!(f.du || f.type_fond || f.montant_min || f.confirme || f.q));
</script>

<svelte:head>
	<title>Dons & placements — {data.parametres.nom_site}</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<EnTetePage
	titre="Dons & placements"
	sousTitre={data.membre?.est_gestionnaire ? 'Toutes les souscriptions des membres.' : 'Vos souscriptions, et celles faites à votre nom.'}
	surtitre="Épargne solidaire"
	fil={[{ href: '/epargne', label: 'Épargne solidaire' }, { href: '/epargne/dons-placements', label: 'Dons & placements' }]}
>
	<Bouton href="/epargne/dons-placements/nouveau"><Plus class="size-5" aria-hidden="true" />Nouveau don ou placement</Bouton>
	{#snippet bas()}<OngletsEpargne actif="dons" />{/snippet}
</EnTetePage>

<div class="conteneur space-y-6 py-8">
	<form method="GET" class="carte grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_1fr_1.5fr_auto] lg:items-end" data-sveltekit-keepfocus>
		<div>
			<label for="du" class="mb-1.5 block text-[15px] font-semibold">Depuis le</label>
			<input id="du" name="du" type="date" value={f.du} />
		</div>
		<div>
			<label for="type_fond" class="mb-1.5 block text-[15px] font-semibold">Type</label>
			<select id="type_fond" name="type_fond">
				<option value="">Tous</option>
				<option value="1" selected={f.type_fond === '1'}>Don</option>
				<option value="2" selected={f.type_fond === '2'}>Placement</option>
			</select>
		</div>
		<div>
			<label for="montant_min" class="mb-1.5 block text-[15px] font-semibold">Montant minimum</label>
			<input id="montant_min" name="montant_min" type="number" inputmode="numeric" min="0" value={f.montant_min} />
		</div>
		<div>
			<label for="confirme" class="mb-1.5 block text-[15px] font-semibold">Paiement</label>
			<select id="confirme" name="confirme">
				<option value="">Tous</option>
				<option value="1" selected={f.confirme === '1'}>Payé</option>
				<option value="2" selected={f.confirme === '2'}>Non payé</option>
			</select>
		</div>
		<div>
			<label for="q" class="mb-1.5 block text-[15px] font-semibold">Mots de la motivation</label>
			<input id="q" name="q" type="search" value={f.q} />
		</div>
		<Bouton type="submit" variante="fleuve">Filtrer</Bouton>
	</form>

	{#if l.items.length}
		<p class="text-ardoise" aria-live="polite">{l.total} souscription{l.total > 1 ? 's' : ''}</p>
		<ul class="carte divide-y divide-fleuve-900/5 px-4 sm:px-6">
			{#each l.items as x (x.id)}
				<li>
					<a href="/epargne/dons-placements/{x.id}" class="flex items-center gap-3 py-4 hover:bg-fleuve-50/60">
						<div class="min-w-0 flex-1 space-y-1">
							<p class="flex flex-wrap items-center gap-2">
								<span class="font-semibold text-fleuve-800">{x.reference}</span>
								<Badge ton={x.type_fond === 2 ? 'fleuve' : 'laterite'}>{x.type_fond === 2 ? `Placement ${x.duree_mois} mois` : 'Don'}</Badge>
								<Badge ton={x.confirme === 1 ? 'foret' : 'soleil'}>{x.confirme === 1 ? 'Payé' : 'À payer'}</Badge>
								{#if x.etat !== 2}<BadgeEtat etat={x.etat} />{/if}
							</p>
							<p class="text-sm text-ardoise">
								{dateCourte(x.date_souscription)} · au nom de <span class="font-semibold text-encre">{x.souscripteur_nom || '—'}</span>{#if x.rapporteur_nom} · par {x.rapporteur_nom}{/if}
							</p>
							{#if x.motivation}<p class="text-sm text-ardoise">{tronquer(x.motivation, 90)}</p>{/if}
						</div>
						<p class="montant font-semibold">{fcfa(x.montant)}</p>
						<ChevronRight class="size-5 shrink-0 text-ardoise" aria-hidden="true" />
					</a>
				</li>
			{/each}
		</ul>
		<Pagination total={l.total} page={l.page} taille={l.taille} />
	{:else}
		<EtatVide
			icone={HandHeart}
			titre={filtre ? 'Aucune souscription ne correspond à ces critères' : "Vous n'avez encore fait ni don ni placement"}
			texte="Un don, même modeste, ou un placement pour vous ou un proche : chaque souscription reçoit une référence et un suivi."
		>
			<Bouton href="/epargne/dons-placements/nouveau">Faire un don ou un placement</Bouton>
		</EtatVide>
	{/if}

	<AvertissementEpargne pin={false} />
</div>

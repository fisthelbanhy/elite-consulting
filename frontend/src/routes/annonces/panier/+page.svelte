<script lang="ts">
	import Package from '@lucide/svelte/icons/package';
	import ShoppingCart from '@lucide/svelte/icons/shopping-cart';
	import Trash2 from '@lucide/svelte/icons/trash-2';
	import Alerte from '$lib/components/ui/Alerte.svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
	import Bouton from '$lib/components/ui/Bouton.svelte';
	import EnTetePage from '$lib/components/ui/EnTetePage.svelte';
	import EtatVide from '$lib/components/ui/EtatVide.svelte';
	import Formulaire from '$lib/components/ui/Formulaire.svelte';
	import { dateCourte, fcfa, libelle } from '$lib/format';

	let { data, form } = $props();
	const p = $derived(data.panier);
	const gestion = $derived(!!data.membre?.est_gestionnaire);
	const retour = $derived(form?.cle === 'panier' ? form : null);
</script>

<svelte:head>
	<title>{gestion ? 'Paniers en cours' : 'Mon panier'} — {data.parametres.nom_site}</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<EnTetePage
	titre={gestion ? 'Paniers en cours des membres' : 'Mon panier'}
	sousTitre={gestion ? 'Articles des petites annonces ajoutés et pas encore payés.' : 'Articles des petites annonces, au prix fixé lors de leur ajout.'}
	fil={[{ href: '/annonces', label: 'Petites annonces' }]}
/>

<div class="conteneur grid gap-8 py-8 lg:grid-cols-[1fr_20rem]">
	<div class="min-w-0 space-y-4">
		{#if data.paye}
			<Alerte type="succes" titre="Paiement enregistré, merci !">
				Notre caisse le vérifie puis la frangine organise la remise de vos articles avec le vendeur.
			</Alerte>
		{/if}
		{#if retour?.succes}<Alerte type="succes" titre={retour.succes} />{:else if retour?.message}<Alerte type="erreur" titre={retour.message} champs={retour.champs} />{/if}
		{#if p.message}<Alerte type="attention" titre="Stock insuffisant">{p.message}</Alerte>{/if}

		{#if p.lignes.length}
			<ul class="space-y-3" aria-label="Articles du panier">
				{#each p.lignes as l (l.id)}
					<li class="carte flex gap-4 p-4 {l.stock_insuffisant ? 'ring-2 ring-alerte/40' : ''}">
						{#if l.article?.photo_url}
							<img src={l.article.photo_url} alt="" class="size-20 shrink-0 rounded-lg object-cover" loading="lazy" />
						{:else}
							<span class="pagne grid size-20 shrink-0 place-items-center rounded-lg bg-sable text-fleuve-300" aria-hidden="true"><Package class="size-8" /></span>
						{/if}
						<div class="min-w-0 flex-1">
							<div class="flex flex-wrap items-start justify-between gap-2">
								<div>
									{#if l.article}<a href="/annonces/{l.article.id}" class="font-semibold text-fleuve-800 hover:underline">{l.article.libelle}</a>{:else}<span class="font-semibold">Article retiré</span>{/if}
									<p class="text-sm text-ardoise">
										{fcfa(l.prix_unitaire)} l'unité · ajouté le {dateCourte(l.date_ajout)}
										{#if l.membre}· <strong>{l.membre.pseudonyme}</strong> ({l.membre.nom}){/if}
									</p>
								</div>
								<p class="montant font-display text-lg font-bold text-laterite-700">{fcfa(l.montant)}</p>
							</div>
							<p class="mt-1 text-sm">
								Quantité demandée <strong>{l.quantite}</strong> / en stock
								<strong class={l.stock_insuffisant ? 'text-alerte' : ''}>{l.article?.quantite ?? 0}</strong>
								{#if l.stock_insuffisant}<Badge ton="alerte" class="ml-1">Stock insuffisant</Badge>{/if}
							</p>
							<div class="mt-2 flex flex-wrap items-end gap-2">
								<Formulaire action="?/quantite" class="flex items-end gap-2">
									{#snippet children({ envoi })}
										<input type="hidden" name="ligne" value={l.id} />
										<label class="text-sm">
											<span class="sr-only">Nouvelle quantité pour {l.article?.libelle}</span>
											<input name="quantite" type="number" inputmode="numeric" min="1" value={l.quantite} class="w-24 py-2" />
										</label>
										<Bouton type="submit" variante="secondaire" taille="sm" chargement={envoi}>Modifier</Bouton>
									{/snippet}
								</Formulaire>
								<Formulaire action="?/retirer" confirmer="Retirer cet article du panier ?">
									{#snippet children({ envoi })}
										<input type="hidden" name="ligne" value={l.id} />
										<Bouton type="submit" variante="danger" taille="sm" chargement={envoi}><Trash2 class="size-4" aria-hidden="true" />Retirer</Bouton>
									{/snippet}
								</Formulaire>
							</div>
						</div>
					</li>
				{/each}
			</ul>
		{:else}
			<EtatVide icone={ShoppingCart} titre={gestion ? 'Aucun panier en cours' : 'Votre panier est vide'} texte="Parcourez les petites annonces et ajoutez les articles qui vous plaisent.">
				<Bouton href="/annonces?type=1">Voir les articles à vendre</Bouton>
			</EtatVide>
		{/if}

		{#if p.achats.length}
			<section class="carte mt-6 p-5">
				<h2 class="text-lg font-bold">Mes derniers achats</h2>
				<ul class="mt-3 divide-y divide-fleuve-900/5 text-[15px]">
					{#each p.achats as x (x.id)}
						<li class="flex flex-wrap items-center justify-between gap-2 py-2">
							<span>{#if x.article_id}<a href="/annonces/{x.article_id}" class="lien">{x.libelle}</a>{:else}{x.libelle}{/if} × {x.quantite}</span>
							<span class="flex items-center gap-2 text-sm">
								<span class="montant font-semibold">{fcfa(x.montant)}</span>
								<span class="text-ardoise">{dateCourte(x.date_paiement)}</span>
								{#if x.etat_paiement}<Badge ton={x.etat_paiement === 3 ? 'foret' : 'soleil'}>{libelle(data.enums, 'EtatPaiement', x.etat_paiement)}</Badge>{/if}
							</span>
						</li>
					{/each}
				</ul>
			</section>
		{/if}
	</div>

	{#if p.lignes.length}
		<aside>
			<section class="carte sticky top-4 space-y-3 p-5" aria-label="Total du panier">
				<div class="flex justify-between text-[15px]"><span class="text-ardoise">Articles</span><strong>{p.total_quantite}</strong></div>
				<div class="flex items-baseline justify-between border-t border-fleuve-900/5 pt-3">
					<span class="font-semibold">Total</span>
					<span class="montant font-display text-2xl font-extrabold text-laterite-700">{fcfa(p.total_montant)}</span>
				</div>
				{#if p.peut_payer}
					<Bouton href="/paiement/2" pleineLargeur taille="lg">Payer {fcfa(p.total_montant)}</Bouton>
					<p class="text-sm text-ardoise">Mobile Money, espèces ou Charden Farell. Le paiement est vérifié par notre caisse.</p>
				{:else if gestion}
					<p class="text-sm text-ardoise">Le paiement est effectué par chaque membre depuis son panier.</p>
				{:else}
					<p class="text-sm font-semibold text-alerte">Ajustez les quantités signalées pour pouvoir payer.</p>
				{/if}
			</section>
		</aside>
	{/if}
</div>

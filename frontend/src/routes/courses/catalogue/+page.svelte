<script lang="ts">
	import Package from '@lucide/svelte/icons/package';
	import Plus from '@lucide/svelte/icons/plus';
	import Store from '@lucide/svelte/icons/store';
	import Alerte from '$lib/components/ui/Alerte.svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
	import BadgeEtat from '$lib/components/ui/BadgeEtat.svelte';
	import Bouton from '$lib/components/ui/Bouton.svelte';
	import EnTetePage from '$lib/components/ui/EnTetePage.svelte';
	import EtatVide from '$lib/components/ui/EtatVide.svelte';
	import Pagination from '$lib/components/ui/Pagination.svelte';
	import { fcfa } from '$lib/format';

	let { data } = $props();
	const f = $derived(data.filtres);
</script>

<svelte:head>
	<title>{data.gestion ? 'Catalogues des boutiques' : 'Mon catalogue'} — {data.parametres.nom_site}</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<EnTetePage
	titre={data.gestion ? 'Catalogues des boutiques partenaires' : 'Vos articles'}
	sousTitre="Les articles proposés aux clients du service de courses."
	fil={[{ href: '/courses', label: 'Courses & livraison' }]}
>
	{#if data.liste}<Bouton href="/courses/catalogue/nouveau"><Plus class="size-5" aria-hidden="true" />Ajouter un article</Bouton>{/if}
</EnTetePage>

<div class="conteneur space-y-6 py-8">
	{#if data.enregistre}<Alerte type="succes" titre="Enregistrement effectué." />{/if}
	{#if data.supprime}<Alerte type="succes" titre="L'article a été retiré du catalogue." />{/if}

	{#if !data.liste}
		<EtatVide
			icone={Store}
			titre="Réservé aux boutiques partenaires"
			texte="Vous tenez une boutique ? Devenez partenaire : vos articles seront proposés aux clients du service de courses."
			messageWhatsApp="Bonjour la Frangine, je tiens une boutique et je souhaite devenir partenaire du service de courses."
		>
			<Bouton href="/contact" variante="secondaire">Nous contacter</Bouton>
		</EtatVide>
	{:else}
		<form method="GET" class="carte grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-[1fr_auto_auto_auto_auto] lg:items-end" data-sveltekit-keepfocus data-sveltekit-noscroll>
			<div>
				<label for="c-q" class="mb-1.5 block text-[15px] font-semibold">Rechercher</label>
				<input id="c-q" name="q" type="search" value={f.q} placeholder="Code, nom, marque, description…" />
			</div>
			{#if data.gestion}
				<div>
					<label for="c-boutique" class="mb-1.5 block text-[15px] font-semibold">Boutique</label>
					<select id="c-boutique" name="boutique_id">
						<option value="">Toutes</option>
						{#each data.boutiques as b (b.id)}<option value={b.id} selected={String(b.id) === f.boutique_id}>{b.pseudonyme}</option>{/each}
					</select>
				</div>
			{/if}
			<div>
				<label for="c-dispo" class="mb-1.5 block text-[15px] font-semibold">Disponibilité</label>
				<select id="c-dispo" name="disponible">
					<option value="">Toutes</option>
					<option value="1" selected={f.disponible === '1'}>Disponible</option>
					<option value="2" selected={f.disponible === '2'}>Indisponible</option>
				</select>
			</div>
			<fieldset>
				<legend class="mb-1.5 text-[15px] font-semibold">Prix (FCFA)</legend>
				<div class="grid grid-cols-2 gap-2">
					<label><span class="sr-only">Prix minimum</span><input name="prix_min" type="number" inputmode="numeric" min="0" placeholder="Min." value={f.prix_min} class="lg:w-28" /></label>
					<label><span class="sr-only">Prix maximum</span><input name="prix_max" type="number" inputmode="numeric" min="0" placeholder="Max." value={f.prix_max} class="lg:w-28" /></label>
				</div>
			</fieldset>
			<Bouton type="submit" variante="fleuve">Filtrer</Bouton>
		</form>

		{#if data.liste.items.length}
			<p class="text-ardoise" aria-live="polite">{data.liste.total} article{data.liste.total > 1 ? 's' : ''}</p>
			<ul class="carte divide-y divide-fleuve-900/5">
				{#each data.liste.items as a (a.id)}
					<li>
						<a href="/courses/catalogue/{a.id}" class="flex items-center gap-4 p-4 hover:bg-fleuve-50">
							{#if a.photo_url}
								<img src={a.photo_url} alt="" loading="lazy" class="size-14 shrink-0 rounded-lg object-cover" />
							{:else}
								<span class="pagne grid size-14 shrink-0 place-items-center rounded-lg bg-sable text-fleuve-300" aria-hidden="true"><Package class="size-6" /></span>
							{/if}
							<span class="min-w-0 flex-1">
								<span class="block font-semibold text-fleuve-800">{a.nom}</span>
								<span class="block text-sm text-ardoise">{[data.gestion ? a.boutique?.pseudonyme : '', a.marque, a.code].filter(Boolean).join(' · ')}</span>
							</span>
							<span class="flex flex-col items-end gap-1">
								<span class="montant font-semibold text-laterite-700">{fcfa(a.prix)}</span>
								<span class="flex gap-1">
									<Badge ton={a.disponible === 1 ? 'foret' : 'neutre'}>{a.disponible === 1 ? 'Disponible' : 'Indisponible'}</Badge>
									{#if a.etat !== 2}<BadgeEtat etat={a.etat} />{/if}
								</span>
							</span>
						</a>
					</li>
				{/each}
			</ul>
			<Pagination total={data.liste.total} page={data.liste.page} taille={data.liste.taille} />
		{:else}
			<EtatVide icone={Package} titre="Aucun article dans le catalogue" texte="Ajoutez vos articles : ils seront proposés aux clients qui commandent une course chez vous.">
				<Bouton href="/courses/catalogue/nouveau">Ajouter un article</Bouton>
			</EtatVide>
		{/if}
	{/if}
</div>

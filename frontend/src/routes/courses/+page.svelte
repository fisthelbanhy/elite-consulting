<script lang="ts">
	import Plus from '@lucide/svelte/icons/plus';
	import ShoppingBasket from '@lucide/svelte/icons/shopping-basket';
	import Store from '@lucide/svelte/icons/store';
	import Alerte from '$lib/components/ui/Alerte.svelte';
	import Bouton from '$lib/components/ui/Bouton.svelte';
	import EnTetePage from '$lib/components/ui/EnTetePage.svelte';
	import EtatVide from '$lib/components/ui/EtatVide.svelte';
	import Onglets from '$lib/components/ui/Onglets.svelte';
	import Pagination from '$lib/components/ui/Pagination.svelte';
	import CarteCourse from '$lib/components/courses/CarteCourse.svelte';
	import FiltresCourses from '$lib/components/courses/FiltresCourses.svelte';
	import PresentationCourses from '$lib/components/courses/PresentationCourses.svelte';
	import TableauGeneral from '$lib/components/courses/TableauGeneral.svelte';

	let { data } = $props();
	const m = $derived(data.membre);
	const gestion = $derived(!!m?.est_gestionnaire);
	const boutique = $derived(!!m && m.categorie === 2 && m.type_partenaire === 2);
	const f = $derived(data.filtres);
	const filtre = $derived(Object.entries(f).some(([k, v]) => v && k !== 'role'));
</script>

<svelte:head>
	<title>Courses et livraison à Brazzaville — {data.parametres.nom_site}</title>
	<meta
		name="description"
		content="Faites faire vos courses et livrer chez vous à Brazzaville : envoyez votre liste avec un prix maxi par article, on achète au marché ou chez une boutique partenaire et on vous livre."
	/>
</svelte:head>

<EnTetePage
	titre={m ? (gestion ? 'Toutes les courses' : 'Mes courses') : 'Courses & livraison'}
	sousTitre="On fait vos achats, on vous livre. Vous fixez le prix maxi de chaque article."
	surtitre="Opportunités"
	fil={[{ href: '/opportunites', label: 'Opportunités' }, { href: '/courses', label: 'Courses & livraison' }]}
>
	{#if boutique || gestion}
		<Bouton href="/courses/catalogue" variante="secondaire"><Store class="size-5" aria-hidden="true" />{gestion ? 'Catalogues des boutiques' : 'Mon catalogue'}</Bouton>
	{/if}
	<Bouton href="/courses/nouvelle"><Plus class="size-5" aria-hidden="true" />Commander une course</Bouton>
	{#snippet bas()}
		{#if boutique}
			<div class="mt-6">
				<Onglets
					onglets={[
						{ href: '/courses', label: 'Tout', actif: !f.role },
						{ href: '/courses?role=client', label: 'Mes commandes', actif: f.role === 'client' },
						{ href: '/courses?role=boutique', label: 'Commandes reçues', actif: f.role === 'boutique' }
					]}
				/>
			</div>
		{/if}
	{/snippet}
</EnTetePage>

<div class="conteneur space-y-8 py-8">
	{#if data.supprime}<Alerte type="succes" titre="La course a été supprimée." />{/if}

	{#if !data.liste}
		<PresentationCourses boutiques={data.boutiques} />
		<div class="carte pagne flex flex-col items-center gap-4 p-8 text-center">
			<h2 class="text-2xl font-bold">Prêt·e à passer commande ?</h2>
			<p class="max-w-lg text-ardoise">Créez votre compte gratuit en une minute, puis envoyez votre liste de courses.</p>
			<div class="flex flex-wrap justify-center gap-3">
				<Bouton href="/inscription?suite=/courses/nouvelle" variante="fleuve">Créer mon compte</Bouton>
				<Bouton href="/connexion?suite=/courses/nouvelle" variante="secondaire">J'ai déjà un compte</Bouton>
			</div>
		</div>
	{:else}
		<FiltresCourses filtres={f} vue={data.vue} {boutique} {gestion} />
		{#if data.liste.items.length}
			<p class="text-ardoise" aria-live="polite">{data.liste.total} course{data.liste.total > 1 ? 's' : ''}</p>
			{#if data.vue === 'general' && (gestion || boutique)}
				<TableauGeneral courses={data.liste.items} />
			{:else}
				<ul class="grid gap-4 md:grid-cols-2">
					{#each data.liste.items as c (c.id)}
						<li><CarteCourse course={c} {gestion} moi={m?.id} /></li>
					{/each}
				</ul>
			{/if}
			<Pagination total={data.liste.total} page={data.liste.page} taille={data.liste.taille} />
		{:else}
			<EtatVide
				icone={ShoppingBasket}
				titre={filtre ? 'Aucune course ne correspond à ces critères' : f.role === 'boutique' ? 'Aucune commande reçue pour le moment' : "Vous n'avez pas encore commandé de course"}
				texte="Envoyez votre liste : on achète au meilleur prix, sans dépasser votre prix maxi, et on vous livre."
				messageWhatsApp="Bonjour la Frangine, j'aimerais faire faire mes courses : comment ça se passe ?"
			>
				<Bouton href="/courses/nouvelle">Commander une course</Bouton>
			</EtatVide>
		{/if}
		<PresentationCourses boutiques={data.boutiques} compact />
	{/if}
</div>

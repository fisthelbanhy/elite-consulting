<script lang="ts">
	import { page } from '$app/state';
	import Lightbulb from '@lucide/svelte/icons/lightbulb';
	import EyeOff from '@lucide/svelte/icons/eye-off';
	import Users from '@lucide/svelte/icons/users';
	import EnTetePage from '$lib/components/ui/EnTetePage.svelte';
	import Formulaire from '$lib/components/ui/Formulaire.svelte';
	import Liste from '$lib/components/ui/Liste.svelte';
	import Zone from '$lib/components/ui/Zone.svelte';
	import Bouton from '$lib/components/ui/Bouton.svelte';
	import { champ } from '$lib/forms';

	let { data, form } = $props();
	const modules = $derived(data.enums?.Module ?? []);
</script>

<svelte:head>
	<title>Suggérer une idée — {data.parametres.nom_site}</title>
	<meta
		name="description"
		content="Une idée pour améliorer La Frangine ? Proposez-la en deux minutes : chaque suggestion est lue par l'équipe."
	/>
</svelte:head>

<EnTetePage
	titre="Une idée pour améliorer {data.parametres.nom_site} ?"
	surtitre="Boîte à idées"
	sousTitre="Ce site est fait pour vous : dites-nous ce qui vous manque, ce qui vous gêne, ce qui vous aiderait à avancer."
	fil={[{ href: '/suggestion', label: 'Suggérer une idée' }]}
/>

<div class="conteneur grid gap-8 py-8 lg:grid-cols-[1fr_20rem]">
	<section class="carte p-5 sm:p-8" aria-labelledby="titre-suggestion">
		<h2 id="titre-suggestion" class="mb-6 flex items-center gap-2 text-2xl font-bold">
			<Lightbulb class="size-6 text-soleil-400" aria-hidden="true" />Votre suggestion
		</h2>
		{#if data.membre}
			<Formulaire {form} reinitialiser>
				{#snippet children({ envoi })}
					<div class="space-y-5">
						<Liste
							label="Quelle partie du site est concernée ?"
							requis
							options={modules}
							{...champ(form, 'module', data.module)}
						/>
						<Zone
							label="Votre idée"
							requis
							lignes={6}
							minlength={10}
							maxlength={3000}
							placeholder="Ex. Ce serait bien de pouvoir payer ma cotisation Likelemba avec Airtel Money…"
							{...champ(form, 'texte')}
						/>
						<Bouton type="submit" taille="lg" chargement={envoi}>Envoyer mon idée</Bouton>
					</div>
				{/snippet}
			</Formulaire>
		{:else}
			<div class="space-y-4">
				<p>
					La boîte à idées est réservée aux membres, pour éviter les messages automatiques. L'inscription est gratuite et prend une
					minute.
				</p>
				<div class="flex flex-wrap gap-3">
					<Bouton href="/connexion?suite={encodeURIComponent(page.url.pathname + page.url.search)}">Me connecter</Bouton>
					<Bouton href="/inscription?suite={encodeURIComponent(page.url.pathname)}" variante="secondaire">Créer mon compte</Bouton>
				</div>
				<p class="text-[15px] text-ardoise">Pas envie de créer un compte ? <a href="/contact?objet=Suggestion" class="lien">Écrivez-nous par le formulaire de contact</a>.</p>
			</div>
		{/if}
	</section>

	<aside class="space-y-4">
		<div class="carte flex gap-3 p-5">
			<EyeOff class="mt-0.5 size-5 shrink-0 text-foret-600" aria-hidden="true" />
			<p class="text-[15px]"><strong>Anonyme.</strong> Votre nom n'est pas enregistré avec votre suggestion : dites-nous tout franchement.</p>
		</div>
		<div class="carte flex gap-3 p-5">
			<Users class="mt-0.5 size-5 shrink-0 text-fleuve-600" aria-hidden="true" />
			<p class="text-[15px]">
				<strong>Lue par l'équipe.</strong> Chaque idée est étudiée. Si vous attendez une réponse personnelle, passez plutôt par
				<a href="/contact" class="lien">le formulaire de contact</a>.
			</p>
		</div>
	</aside>
</div>

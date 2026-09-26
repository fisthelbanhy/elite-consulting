<script lang="ts">
	import Eye from '@lucide/svelte/icons/eye';
	import EyeOff from '@lucide/svelte/icons/eye-off';
	import Formulaire from '$lib/components/ui/Formulaire.svelte';
	import Saisie from '$lib/components/ui/Saisie.svelte';
	import Bouton from '$lib/components/ui/Bouton.svelte';
	import Logo from '$lib/components/Logo.svelte';
	import { champ } from '$lib/forms';
	import { lienWhatsApp } from '$lib/format';

	let { data, form } = $props();
	let voir = $state(false);
</script>

<svelte:head>
	<title>Se connecter — {data.parametres.nom_site}</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<div class="conteneur grid min-h-[70vh] place-items-center py-10">
	<div class="w-full max-w-md">
		<div class="mb-6 text-center">
			<Logo compact />
			<h1 class="mt-4 text-3xl font-bold">Content de vous revoir</h1>
			<p class="mt-2 text-ardoise">Connectez-vous pour retrouver votre espace, vos annonces et vos échanges avec la frangine.</p>
		</div>

		<div class="carte p-6 sm:p-8">
			<Formulaire {form}>
				{#snippet children({ envoi })}
					<input type="hidden" name="suite" value={data.suite} />
					<div class="space-y-5">
						<Saisie
							label="Téléphone, identifiant ou e-mail"
							autocomplete="username"
							inputmode="email"
							requis
							{...champ(form, 'identifiant')}
						/>
						<Saisie
							label="Mot de passe"
							type={voir ? 'text' : 'password'}
							autocomplete="current-password"
							requis
							name="mot_de_passe"
							erreur={form?.champs?.mot_de_passe}
						>
							{#snippet apres()}
								<div class="flex items-center justify-between pt-1">
									<button type="button" class="inline-flex items-center gap-1.5 text-sm font-medium text-fleuve-700" onclick={() => (voir = !voir)}>
										{#if voir}<EyeOff class="size-4" aria-hidden="true" /> Masquer{:else}<Eye class="size-4" aria-hidden="true" /> Afficher{/if}
									</button>
									<a href="/mot-de-passe-oublie" class="text-sm font-medium text-fleuve-700 underline underline-offset-4">Mot de passe oublié ?</a>
								</div>
							{/snippet}
						</Saisie>
						<Bouton type="submit" pleineLargeur chargement={envoi}>Se connecter</Bouton>
					</div>
				{/snippet}
			</Formulaire>
		</div>

		<p class="mt-6 text-center text-ardoise">
			Pas encore membre ?
			<a href="/inscription{data.suite ? `?suite=${encodeURIComponent(data.suite)}` : ''}" class="lien">Créer mon compte gratuitement</a>
		</p>
		{#if data.parametres.whatsapp}
			<p class="mt-2 text-center text-sm text-ardoise">
				Un souci pour vous connecter ?
				<a href={lienWhatsApp(data.parametres.whatsapp, "Bonjour la Frangine, je n'arrive pas à me connecter.")} target="_blank" rel="noopener" class="font-semibold text-foret-700 underline underline-offset-4">Écrivez-nous sur WhatsApp</a>
			</p>
		{/if}
	</div>
</div>

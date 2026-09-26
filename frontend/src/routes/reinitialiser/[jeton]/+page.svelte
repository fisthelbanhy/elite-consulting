<script lang="ts">
	import Formulaire from '$lib/components/ui/Formulaire.svelte';
	import Saisie from '$lib/components/ui/Saisie.svelte';
	import Bouton from '$lib/components/ui/Bouton.svelte';
	import Alerte from '$lib/components/ui/Alerte.svelte';

	let { data, form } = $props();
	let voir = $state(false);
</script>

<svelte:head>
	<title>Nouveau mot de passe — {data.parametres.nom_site}</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<div class="conteneur grid min-h-[60vh] place-items-center py-10">
	<div class="w-full max-w-md">
		<h1 class="text-3xl font-bold">Choisir un nouveau mot de passe</h1>
		{#if form?.succes}
			<Alerte type="succes" titre={form.succes} class="mt-6" />
			<div class="mt-6"><Bouton href="/connexion">Se connecter</Bouton></div>
		{:else}
			<div class="carte mt-6 p-6 sm:p-8">
				<Formulaire {form}>
					{#snippet children({ envoi })}
						<div class="space-y-5">
							<Saisie
								label="Nouveau mot de passe"
								type={voir ? 'text' : 'password'}
								name="nouveau"
								autocomplete="new-password"
								minlength={8}
								aide="8 caractères minimum."
								requis
								erreur={form?.champs?.nouveau}
							>
								{#snippet apres()}
									<button type="button" class="pt-1 text-sm font-medium text-fleuve-700" onclick={() => (voir = !voir)}>{voir ? 'Masquer' : 'Afficher'}</button>
								{/snippet}
							</Saisie>
							<Bouton type="submit" pleineLargeur chargement={envoi}>Enregistrer</Bouton>
						</div>
					{/snippet}
				</Formulaire>
			</div>
		{/if}
	</div>
</div>

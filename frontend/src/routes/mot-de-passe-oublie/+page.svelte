<script lang="ts">
	import Formulaire from '$lib/components/ui/Formulaire.svelte';
	import Saisie from '$lib/components/ui/Saisie.svelte';
	import Choix from '$lib/components/ui/Choix.svelte';
	import Bouton from '$lib/components/ui/Bouton.svelte';
	import Alerte from '$lib/components/ui/Alerte.svelte';
	import { champ, valeur } from '$lib/forms';
	import { lienWhatsApp } from '$lib/format';

	let { data, form } = $props();
	let categorie = $state(String(valeur(form, 'categorie', '1')));
</script>

<svelte:head>
	<title>Mot de passe oublié — {data.parametres.nom_site}</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<div class="conteneur grid min-h-[70vh] place-items-center py-10">
	<div class="w-full max-w-lg">
		<h1 class="text-3xl font-bold">Mot de passe oublié</h1>
		<p class="mt-2 text-ardoise">
			Pour protéger votre compte, confirmez qui vous êtes. Nous vous envoyons un lien de réinitialisation par e-mail ;
			sans e-mail enregistré, une conseillère vous rappelle au numéro indiqué. Votre mot de passe n'est jamais affiché.
		</p>

		{#if form?.succes}
			<Alerte type="succes" titre="Demande enregistrée" class="mt-6">{form.succes}</Alerte>
			<p class="mt-6"><a href="/connexion" class="lien">Retour à la connexion</a></p>
		{:else}
			<div class="carte mt-6 p-6 sm:p-8">
				<Formulaire {form}>
					{#snippet children({ envoi })}
						<div class="space-y-5">
							<Choix
								legende="Votre compte est celui"
								name="categorie"
								bind:value={categorie}
								options={[
									{ value: '1', label: "D'un particulier" },
									{ value: '2', label: "D'une entreprise" }
								]}
							/>
							<Saisie label={categorie === '2' ? "Nom de l'entreprise" : 'Nom et prénom'} requis {...champ(form, 'nom')} />
							<Saisie label={categorie === '2' ? 'Sigle' : 'Pseudonyme'} requis {...champ(form, 'pseudonyme')} />
							<Saisie label="Téléphone" type="tel" inputmode="tel" prefixe="+242" requis {...champ(form, 'telephone')} />
							<Bouton type="submit" pleineLargeur chargement={envoi}>Retrouver mon compte</Bouton>
						</div>
					{/snippet}
				</Formulaire>
			</div>
			{#if data.parametres.whatsapp}
				<p class="mt-4 text-center text-sm text-ardoise">
					Plus rapide :
					<a href={lienWhatsApp(data.parametres.whatsapp, "Bonjour la Frangine, j'ai oublié mon mot de passe.")} target="_blank" rel="noopener" class="font-semibold text-foret-700 underline underline-offset-4">écrivez-nous sur WhatsApp</a>
				</p>
			{/if}
		{/if}
	</div>
</div>

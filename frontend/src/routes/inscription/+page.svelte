<script lang="ts">
	import { onMount } from 'svelte';
	import Eye from '@lucide/svelte/icons/eye';
	import EyeOff from '@lucide/svelte/icons/eye-off';
	import Check from '@lucide/svelte/icons/check';
	import ShieldCheck from '@lucide/svelte/icons/shield-check';
	import Formulaire from '$lib/components/ui/Formulaire.svelte';
	import Saisie from '$lib/components/ui/Saisie.svelte';
	import Liste from '$lib/components/ui/Liste.svelte';
	import Choix from '$lib/components/ui/Choix.svelte';
	import Case from '$lib/components/ui/Case.svelte';
	import Bouton from '$lib/components/ui/Bouton.svelte';
	import { champ, valeur } from '$lib/forms';

	let { data, form } = $props();

	let categorie = $state(String(valeur(form, 'categorie', data.categorie)));
	let voir = $state(false);
	let debut = $state(0);
	onMount(() => (debut = Date.now()));

	const avantages = [
		'Un diagnostic et un plan d’action avec une vraie conseillère',
		'Votre Likelemba organisée : membres, cotisations, reçus',
		'Publiez vos annonces, offres d’emploi et projets',
		'Recevez les marchés et opportunités de votre secteur'
	];
</script>

<svelte:head>
	<title>Créer mon compte — {data.parametres.nom_site}</title>
	<meta name="description" content="Rejoignez La Frangine gratuitement : conseil, Likelemba, financement et opportunités pour entreprendre au Congo." />
</svelte:head>

<div class="conteneur grid gap-10 py-10 lg:grid-cols-[1fr_28rem] lg:py-16">
	<section class="order-2 lg:order-1 lg:pt-6">
		<p class="text-sm font-semibold tracking-wide text-laterite-600 uppercase">Gratuit · 1 minute</p>
		<h1 class="mt-2 text-[clamp(2rem,6vw,3rem)] leading-tight font-extrabold">Rejoignez la famille</h1>
		<p class="mt-4 max-w-lg text-lg text-ardoise">
			Un compte suffit pour tout faire sur La Frangine. On ne vous demande que l'essentiel ; le reste, vous le
			complétez quand vous en avez besoin.
		</p>
		<ul class="mt-8 space-y-4">
			{#each avantages as a (a)}
				<li class="flex items-start gap-3">
					<span class="mt-0.5 grid size-7 shrink-0 place-items-center rounded-full bg-foret-50 text-foret-700"><Check class="size-4" aria-hidden="true" /></span>
					<span class="text-[17px]">{a}</span>
				</li>
			{/each}
		</ul>
		<div class="mt-10 flex items-start gap-3 rounded-2xl bg-white p-5 ring-1 ring-fleuve-900/5">
			<ShieldCheck class="mt-0.5 size-6 shrink-0 text-foret-600" aria-hidden="true" />
			<p class="text-[15px] text-ardoise">
				<strong class="text-encre">Vos informations restent confidentielles.</strong> Votre téléphone n'est jamais affiché
				publiquement et La Frangine ne vous demandera <strong class="text-encre">jamais</strong> votre code Mobile Money.
			</p>
		</div>
	</section>

	<section class="order-1 lg:order-2">
		<div class="carte p-6 sm:p-8">
			<h2 class="mb-6 text-2xl font-bold">Créer mon compte</h2>
			<Formulaire {form}>
				{#snippet children({ envoi })}
					<input type="hidden" name="suite" value={data.suite} />
					<input type="hidden" name="debut_saisie" value={debut || ''} />
					<!-- Champ piège anti-robot (ADR-0005) : invisible pour les humains -->
					<div class="absolute -left-[9999px]" aria-hidden="true">
						<label>Site web <input type="text" name="site_web" tabindex="-1" autocomplete="off" /></label>
					</div>

					<div class="space-y-5">
						<Choix
							legende="Vous êtes"
							name="categorie"
							bind:value={categorie}
							requis
							options={[
								{ value: '1', label: 'Un particulier', description: 'Commerçant·e, porteur de projet, salarié·e…' },
								{ value: '2', label: 'Une entreprise', description: 'Société, association, boutique, banque' }
							]}
							erreur={form?.champs?.categorie}
						/>
						<Saisie
							label={categorie === '2' ? "Nom de l'entreprise ou de l'association" : 'Nom et prénom'}
							autocomplete={categorie === '2' ? 'organization' : 'name'}
							requis
							{...champ(form, 'nom')}
						/>
						<Saisie
							label="Téléphone"
							type="tel"
							inputmode="tel"
							autocomplete="tel-national"
							prefixe="+242"
							placeholder="06 123 45 67"
							aide="Il vous servira à vous connecter. Il n'est jamais affiché publiquement."
							requis
							{...champ(form, 'telephone')}
						/>
						<Liste label="Ville" requis options={data.villes.map((v) => ({ value: v.id, label: v.nom }))} {...champ(form, 'ville_id')} />
						<Saisie
							label="Mot de passe"
							type={voir ? 'text' : 'password'}
							autocomplete="new-password"
							minlength={8}
							aide="8 caractères minimum."
							requis
							name="mot_de_passe"
							erreur={form?.champs?.mot_de_passe ?? form?.champs?.confirmation}
						>
							{#snippet apres()}
								<button type="button" class="inline-flex items-center gap-1.5 pt-1 text-sm font-medium text-fleuve-700" onclick={() => (voir = !voir)}>
									{#if voir}<EyeOff class="size-4" aria-hidden="true" /> Masquer{:else}<Eye class="size-4" aria-hidden="true" /> Afficher le mot de passe{/if}
								</button>
							{/snippet}
						</Saisie>
						<Saisie label="E-mail (facultatif)" type="email" autocomplete="email" aide="Utile pour récupérer votre compte." {...champ(form, 'email')} />

						<details class="rounded-xl bg-creme p-4" open={!!(form?.champs?.identifiant || form?.champs?.pseudonyme)}>
							<summary class="cursor-pointer font-semibold text-fleuve-700">Plus d'options (identifiant, nom public)</summary>
							<div class="mt-4 space-y-5">
								<Saisie label="Identifiant de connexion" aide="Facultatif : par défaut, votre numéro de téléphone." autocomplete="username" {...champ(form, 'identifiant')} />
								<Saisie
									label={categorie === '2' ? 'Sigle affiché publiquement' : 'Nom affiché publiquement (pseudonyme)'}
									aide={categorie === '2' ? '3 caractères minimum. Par défaut : les initiales.' : '6 caractères minimum. Par défaut : « Prénom N. »'}
									{...champ(form, 'pseudonyme')}
								/>
							</div>
						</details>

						<Case name="accepte_conditions" required erreur={form?.champs?.accepte_conditions} checked={!!valeur(form, 'accepte_conditions', false)}>
							J'accepte les <a href="/conditions" class="lien" target="_blank">conditions d'utilisation</a> et la
							<a href="/confidentialite" class="lien" target="_blank">politique de confidentialité</a>.
						</Case>

						<Bouton type="submit" pleineLargeur taille="lg" chargement={envoi}>Créer mon compte</Bouton>
					</div>
				{/snippet}
			</Formulaire>
		</div>
		<p class="mt-6 text-center text-ardoise">
			Déjà membre ?
			<a href="/connexion{data.suite ? `?suite=${encodeURIComponent(data.suite)}` : ''}" class="lien">Se connecter</a>
		</p>
	</section>
</div>

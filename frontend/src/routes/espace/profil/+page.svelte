<script lang="ts">
	/** Mon profil (F-TRV-25 à F-TRV-30) : coordonnées, photo, mot de passe, identifiant, code de pointage. */
	import Lock from '@lucide/svelte/icons/lock';
	import EnTetePage from '$lib/components/ui/EnTetePage.svelte';
	import Formulaire from '$lib/components/ui/Formulaire.svelte';
	import Saisie from '$lib/components/ui/Saisie.svelte';
	import Fichier from '$lib/components/ui/Fichier.svelte';
	import Bouton from '$lib/components/ui/Bouton.svelte';
	import Jauge from '$lib/components/ui/Jauge.svelte';
	import OngletsEspace from '$lib/components/espace/OngletsEspace.svelte';
	import FormulaireProfil from '$lib/components/espace/FormulaireProfil.svelte';
	import { champ } from '$lib/forms';
	import { dateHeure, fcfa, libelle } from '$lib/format';

	let { data, form } = $props();
	// Le layout garantit la connexion
	const m = $derived(data.membre!);
	const erreur = (nom: string, cle: string) => (form?.cle === cle ? (form?.champs as Record<string, string> | undefined)?.[nom] : undefined);
</script>

<svelte:head>
	<title>Mon profil — {data.parametres.nom_site}</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<EnTetePage titre="Mon profil" sousTitre="Complétez-le à votre rythme : chaque information est utile au bon moment." surtitre="Mon espace">
	{#snippet bas()}<OngletsEspace messages={data.compteurs?.messages_non_lus ?? 0} />{/snippet}
</EnTetePage>

<div class="conteneur grid gap-8 py-8 lg:grid-cols-[minmax(0,1fr)_22rem]">
	<div class="space-y-8">
		<section class="carte p-6" aria-labelledby="titre-coordonnees">
			<div class="mb-5 flex flex-wrap items-end justify-between gap-3">
				<h2 id="titre-coordonnees" class="text-xl font-bold">Mes informations</h2>
				<div class="w-48"><p class="mb-1 text-sm text-ardoise">Profil complet à {m.profil_complet} %</p><Jauge valeur={m.profil_complet} max={100} label="Complétion du profil" /></div>
			</div>
			<FormulaireProfil {form} membre={m} villes={data.villes} secteurs={data.secteurs} enums={data.enums} />
		</section>

		<section class="carte p-6" aria-labelledby="titre-securite">
			<h2 id="titre-securite" class="flex items-center gap-2 text-xl font-bold"><Lock class="size-5 text-fleuve-600" aria-hidden="true" />Connexion et sécurité</h2>
			<div class="mt-5 grid gap-8 md:grid-cols-2">
				<Formulaire action="?/motDePasse" {form} cle="mdp" reinitialiser>
					{#snippet children({ envoi })}
						<h3 class="mb-3 font-bold">Changer mon mot de passe</h3>
						<div class="space-y-4">
							<Saisie label="Mot de passe actuel" type="password" name="actuel" autocomplete="current-password" requis erreur={erreur('actuel', 'mdp')} />
							<Saisie label="Nouveau mot de passe" type="password" name="nouveau" autocomplete="new-password" minlength={8} aide="8 caractères minimum." requis erreur={erreur('nouveau', 'mdp')} />
							<Saisie label="Confirmez le nouveau mot de passe" type="password" name="confirmation" id="mdp-confirmation" autocomplete="new-password" requis erreur={erreur('confirmation', 'mdp')} />
							<Bouton type="submit" variante="fleuve" chargement={envoi}>Changer mon mot de passe</Bouton>
						</div>
					{/snippet}
				</Formulaire>
				<Formulaire action="?/identifiant" {form} cle="identifiant">
					{#snippet children({ envoi })}
						<h3 class="mb-3 font-bold">Mon identifiant de connexion</h3>
						<p class="mb-3 text-sm text-ardoise">Vous pouvez aussi vous connecter avec votre téléphone ou votre e-mail.</p>
						<div class="space-y-4">
							<Saisie label="Identifiant" autocomplete="username" requis {...champ(form, 'identifiant', m.identifiant, 'identifiant')} />
							<Saisie label="Mot de passe (pour confirmer)" type="password" name="mot_de_passe" id="identifiant-mot-de-passe" autocomplete="current-password" requis erreur={erreur('mot_de_passe', 'identifiant')} />
							<Bouton type="submit" variante="secondaire" chargement={envoi}>Changer d'identifiant</Bouton>
						</div>
					{/snippet}
				</Formulaire>
			</div>
		</section>
	</div>

	<aside class="space-y-6">
		<section class="carte p-5" aria-labelledby="titre-photo">
			<h2 id="titre-photo" class="mb-3 text-lg font-bold">Ma photo</h2>
			<Formulaire action="?/photo" {form} cle="photo" fichiers>
				{#snippet children({ envoi })}
					<Fichier label="Photo de profil" name="photo" actuel={m.photo_url} aide="Un visage souriant inspire confiance." erreur={erreur('photo', 'photo')} />
					<Bouton type="submit" variante="secondaire" class="mt-3" chargement={envoi}>Enregistrer la photo</Bouton>
				{/snippet}
			</Formulaire>
		</section>

		<section class="carte p-5" aria-labelledby="titre-compte">
			<h2 id="titre-compte" class="mb-3 text-lg font-bold">Mon compte</h2>
			<dl class="space-y-2 text-[15px]">
				<div><dt class="text-sm text-ardoise">Code membre</dt><dd class="font-semibold">{m.code_membre || '—'}</dd></div>
				<div><dt class="text-sm text-ardoise">Type de compte</dt><dd class="font-semibold">{libelle(data.enums, 'TypeMembre', m.type_compte)} · {libelle(data.enums, 'CategorieMembre', m.categorie)}</dd></div>
			</dl>
			<p class="mt-3 text-sm text-ardoise">Pour changer de personnalité (particulier ou entreprise), écrivez à la frangine.</p>
		</section>

		{#if m.point_caisse_actif}
			<section class="carte p-5" aria-labelledby="titre-pointage">
				<h2 id="titre-pointage" class="mb-3 text-lg font-bold">Ma carte de pointage</h2>
				<dl class="grid grid-cols-2 gap-2 text-[15px]">
					<div><dt class="text-sm text-ardoise">Solde</dt><dd class="montant font-semibold">{fcfa(m.solde_point_caisse)}</dd></div>
					<div><dt class="text-sm text-ardoise">Dernier pointage</dt><dd class="font-semibold">{dateHeure(m.date_dernier_pointage)}</dd></div>
				</dl>
				<Formulaire action="?/codePointage" {form} cle="code" reinitialiser class="mt-4">
					{#snippet children({ envoi })}
						<h3 class="mb-2 font-bold">Changer mon code (4 chiffres)</h3>
						<div class="space-y-3">
							<Saisie label="Nouveau code" type="password" name="code" inputmode="numeric" maxlength={4} pattern={'[0-9]{4}'} autocomplete="off" requis erreur={erreur('code', 'code')} />
							<Saisie label="Confirmez le code" type="password" name="confirmation" id="code-confirmation" inputmode="numeric" maxlength={4} autocomplete="off" requis erreur={erreur('confirmation', 'code')} />
							<Saisie label="Mot de passe" type="password" name="mot_de_passe" id="code-mot-de-passe" autocomplete="current-password" requis erreur={erreur('mot_de_passe', 'code')} />
							<Bouton type="submit" variante="secondaire" chargement={envoi}>Changer mon code</Bouton>
						</div>
						<p class="mt-2 text-sm text-ardoise">La Frangine ne vous demandera jamais ce code.</p>
					{/snippet}
				</Formulaire>
			</section>
		{/if}
	</aside>
</div>

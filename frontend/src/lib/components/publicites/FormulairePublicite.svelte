<script lang="ts">
	/** Création / modification d'une publicité (gestion, F-ADM-34 à F-ADM-36). */
	import TriangleAlert from '@lucide/svelte/icons/triangle-alert';
	import Formulaire from '$lib/components/ui/Formulaire.svelte';
	import Saisie from '$lib/components/ui/Saisie.svelte';
	import Zone from '$lib/components/ui/Zone.svelte';
	import Liste from '$lib/components/ui/Liste.svelte';
	import Choix from '$lib/components/ui/Choix.svelte';
	import Fichier from '$lib/components/ui/Fichier.svelte';
	import Bouton from '$lib/components/ui/Bouton.svelte';
	import { champ, valeur } from '$lib/forms';
	import { ETATS_PUBLICITE, GENRE_PAR_TYPE, type ChoixPublicite, type PubliciteDetail } from '$lib/types/publicites';

	let {
		form,
		choix,
		initial = null,
		action = '',
		choisirEtat = false,
		libelleBouton = 'Enregistrer'
	}: {
		form: Record<string, unknown> | null | undefined;
		choix: ChoixPublicite;
		initial?: PubliciteDetail | null;
		action?: string;
		/** Gestionnaire avec droit Activation, à la création : peut choisir l'état initial (F-ADM-35). */
		choisirEtat?: boolean;
		libelleBouton?: string;
	} = $props();

	type Retour = { valeurs?: Record<string, unknown>; champs?: Record<string, string>; message?: string; succes?: string };
	const f = $derived(form as Retour | null);
	// État local initialisé une fois (les valeurs saisies priment après une erreur)
	// svelte-ignore state_referenced_locally
	let type = $state(String(valeur(f, 'type_fichier', initial?.type_fichier || '')));
	// svelte-ignore state_referenced_locally
	let debut = $state(String(valeur(f, 'date_debut', initial?.date_debut ?? '')));

	const accept = $derived(type === '2' ? 'audio/mpeg,.mp3' : type === '3' ? 'video/mp4,.mp4' : 'image/jpeg,image/png,image/webp');
	const discordance = $derived(!!initial?.fichier_url && !!initial.genre && !!type && GENRE_PAR_TYPE[Number(type)] !== initial.genre);
</script>

<Formulaire {action} form={f} fichiers>
	{#snippet children({ envoi })}
		<div class="space-y-6">
			<fieldset class="carte space-y-5 p-5 sm:p-6">
				<legend class="sr-only">Annonceur</legend>
				<h2 class="text-xl font-bold">Annonceur</h2>
				<div class="grid gap-5 sm:grid-cols-2">
					<Liste label="Demandeur" requis options={choix.membres} aide="Le membre ou le gestionnaire qui demande la publicité." {...champ(f, 'demandeur_id', initial?.demandeur?.id)} />
					<Liste
						label="Entreprise"
						requis
						options={choix.entreprises}
						aide="Absente de la liste ? Créez d'abord sa fiche dans l'annuaire des entreprises."
						{...champ(f, 'entreprise_id', initial?.entreprise?.id)}
					/>
				</div>
			</fieldset>

			<fieldset class="carte space-y-5 p-5 sm:p-6">
				<legend class="sr-only">Contenu</legend>
				<h2 class="text-xl font-bold">Contenu</h2>
				<Zone label="Texte de la publicité" requis lignes={5} minlength={6} maxlength={4000} aide="Affiché sous le visuel. Les sauts de ligne sont conservés." {...champ(f, 'texte', initial?.texte)} />
				<Saisie label="Lien (facultatif)" type="url" inputmode="url" placeholder="https://www.monentreprise.cg" aide="Site ou page de l'annonceur, ouvert dans un nouvel onglet." {...champ(f, 'lien', initial?.lien)} />
				<div class="grid gap-5 sm:grid-cols-2">
					<Saisie label="Début de diffusion" type="date" requis bind:value={debut} name="date_debut" erreur={f?.champs?.date_debut} />
					<Saisie label="Fin de diffusion" type="date" requis min={debut || undefined} {...champ(f, 'date_fin', initial?.date_fin)} />
				</div>
			</fieldset>

			<fieldset class="carte space-y-5 p-5 sm:p-6">
				<legend class="sr-only">Fichier</legend>
				<h2 class="text-xl font-bold">Visuel ou son</h2>
				<Choix
					legende="Format"
					name="type_fichier"
					bind:value={type}
					requis
					colonnes={3}
					erreur={f?.champs?.type_fichier}
					options={[
						{ value: '1', label: 'Image', description: 'JPG, PNG ou WebP' },
						{ value: '2', label: 'Son', description: 'MP3' },
						{ value: '3', label: 'Vidéo', description: 'MP4' }
					]}
				/>
				{#if discordance}
					<p class="flex items-start gap-2 rounded-xl bg-soleil-100 p-3 text-[15px]">
						<TriangleAlert class="mt-0.5 size-5 shrink-0 text-laterite-700" aria-hidden="true" />
						Le fichier actuel ne correspond pas au format choisi : joignez un nouveau fichier.
					</p>
				{/if}
				<Fichier
					label="Fichier"
					name="fichier"
					{accept}
					image={type !== '2' && type !== '3'}
					actuel={initial?.genre === 'image' ? initial.fichier_url : null}
					aide="4 Mo maximum. Le fichier doit correspondre au format choisi."
					erreur={f?.champs?.fichier}
				/>
				{#if initial?.fichier_url && initial.genre !== 'image'}
					<p class="text-sm text-ardoise">Fichier actuel : <a href={initial.fichier_url} class="lien" target="_blank" rel="noopener">écouter ou voir</a> (conservé si vous n'en joignez pas d'autre).</p>
				{/if}
			</fieldset>

			{#if choisirEtat}
				<fieldset class="carte p-5 sm:p-6">
					<legend class="sr-only">Publication</legend>
					<Liste
						label="État à la création"
						vide={null}
						options={Object.entries(ETATS_PUBLICITE).map(([v, l]) => ({ value: Number(v), label: l }))}
						{...champ(f, 'etat', 1)}
					/>
				</fieldset>
			{:else if !initial}
				<p class="text-[15px] text-ardoise">La publicité sera créée « En attente » : un gestionnaire ayant le droit Activation la mettra en ligne.</p>
			{/if}

			<div class="flex flex-wrap gap-3">
				<Bouton type="submit" taille="lg" chargement={envoi}>{libelleBouton}</Bouton>
				<Bouton href={initial ? `/gestion/publicites/${initial.id}` : '/gestion/publicites'} variante="fantome" taille="lg">Annuler</Bouton>
			</div>
		</div>
	{/snippet}
</Formulaire>

<script lang="ts">
	/** Création / modification d'un bien immobilier (F-S3-21 à F-S3-25). */
	import { page } from '$app/state';
	import Lock from '@lucide/svelte/icons/lock';
	import Bouton from '$lib/components/ui/Bouton.svelte';
	import Choix from '$lib/components/ui/Choix.svelte';
	import Fichier from '$lib/components/ui/Fichier.svelte';
	import Formulaire from '$lib/components/ui/Formulaire.svelte';
	import Liste from '$lib/components/ui/Liste.svelte';
	import Saisie from '$lib/components/ui/Saisie.svelte';
	import Zone from '$lib/components/ui/Zone.svelte';
	import { champ, valeur } from '$lib/forms';
	import type { Enums, Ville } from '$lib/types';
	import type { BienDetail } from '$lib/types/immobilier';

	type Retour = { cle?: string; message?: string; champs?: Record<string, string>; valeurs?: Record<string, unknown> } | null | undefined;

	let {
		form,
		villes,
		initial,
		typeInitial = '1',
		libelleBouton = 'Publier mon annonce'
	}: { form: Retour; villes: Ville[]; initial?: BienDetail | null; typeInitial?: string; libelleBouton?: string } = $props();

	let type = $state(String(valeur(form, 'offre_ou_recherche', initial?.offre_ou_recherche ?? typeInitial)));
	let transaction = $state(String(valeur(form, 'type_transaction', initial?.type_transaction ?? '')));
	let situation = $state(String(valeur(form, 'situation', initial?.situation ?? 1)));
	const recherche = $derived(type === '2');
	const typesBien = $derived(((page.data.enums as Enums | undefined)?.TypeBien ?? []).filter((o) => o.value !== 0));
	const groupes = $derived(villes.filter((v) => v.quartiers.length).map((v) => ({ label: v.nom, options: v.quartiers.map((q) => ({ value: q.id, label: q.nom })) })));
</script>

<Formulaire {form} fichiers>
	{#snippet children({ envoi })}
		<div class="space-y-8">
			<fieldset class="carte space-y-6 p-6">
				<legend class="sr-only">Votre annonce</legend>
				<Choix
					legende="Vous publiez"
					name="offre_ou_recherche"
					bind:value={type}
					requis
					erreur={form?.champs?.offre_ou_recherche}
					options={[
						{ value: '1', label: 'Une offre', description: 'Je loue ou je vends un bien' },
						{ value: '2', label: 'Une recherche', description: 'Je cherche un bien à louer ou à acheter' }
					]}
				/>
				<Choix
					legende="Transaction"
					name="type_transaction"
					bind:value={transaction}
					requis
					erreur={form?.champs?.type_transaction}
					options={[
						{ value: '1', label: 'Location' },
						{ value: '2', label: recherche ? 'Achat' : 'Vente' }
					]}
				/>
				<div class="grid gap-5 sm:grid-cols-2">
					<Liste label="Type de bien" requis options={typesBien} {...champ(form, 'type_bien', initial?.type_bien || '')} />
					<Liste label="Quartier" vide="Choisir le quartier…" {groupes} aide="Ville et quartier sont affichés sur l'annonce." {...champ(form, 'quartier_id', initial?.quartier_id)} />
				</div>
				<Saisie
					label="Adresse précise"
					aide="Ex. 63 rue Primera, Poto-Poto. Visible uniquement par vous et la frangine."
					autocomplete="street-address"
					{...champ(form, 'localisation', initial?.localisation)}
				>
					{#snippet apres()}<p class="flex items-center gap-1 text-sm text-foret-700"><Lock class="size-3.5" aria-hidden="true" />Jamais affichée publiquement</p>{/snippet}
				</Saisie>
			</fieldset>

			<fieldset class="carte space-y-6 p-6">
				<legend class="sr-only">Caractéristiques</legend>
				<h2 class="text-xl font-bold">{recherche ? 'Ce que vous cherchez' : 'Caractéristiques du bien'}</h2>
				<div class="grid gap-5 sm:grid-cols-3">
					<Saisie label={recherche ? 'Surface souhaitée' : 'Surface'} type="number" inputmode="numeric" min="1" max="100000" suffixe="m²" requis {...champ(form, 'surface_m2', initial?.surface_m2 || '')} />
					<Saisie label="Nombre de pièces" type="number" inputmode="numeric" min="0" max="100" {...champ(form, 'nombre_pieces', initial?.nombre_pieces ?? 0)} />
					<Saisie label="Nombre de chambres" type="number" inputmode="numeric" min="0" max="100" {...champ(form, 'nombre_chambres', initial?.nombre_chambres ?? 0)} />
				</div>
				<div class="grid gap-5 sm:grid-cols-2">
					<Saisie
						label={recherche ? 'Budget' : 'Prix'}
						type="number"
						inputmode="numeric"
						min="0"
						suffixe="FCFA"
						aide={recherche ? 'Laissez 0 si le budget est à discuter.' : 'Laissez 0 pour « prix à débattre ».'}
						{...champ(form, 'prix', initial?.prix ?? '')}
					/>
					<Choix
						legende="Situation"
						name="situation"
						bind:value={situation}
						requis
						erreur={form?.champs?.situation}
						options={[
							{ value: '1', label: 'Disponible' },
							{ value: '2', label: 'Occupé' }
						]}
					/>
				</div>
				<Zone
					label="Description"
					lignes={5}
					aide="Atouts du bien, état, accès, eau et électricité, conditions (caution, avance)…"
					{...champ(form, 'description', initial?.description)}
				/>
				<Fichier label="Photo du bien" name="photo" actuel={initial?.photo_url} erreur={form?.champs?.photo} aide="Une photo lumineuse multiplie les contacts." />
			</fieldset>

			<div class="flex flex-wrap gap-3">
				<Bouton type="submit" taille="lg" chargement={envoi}>{libelleBouton}</Bouton>
				<Bouton href={initial ? `/immobilier/${initial.id}` : '/immobilier'} variante="fantome" taille="lg">Annuler</Bouton>
			</div>
		</div>
	{/snippet}
</Formulaire>

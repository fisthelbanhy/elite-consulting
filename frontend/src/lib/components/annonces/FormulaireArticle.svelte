<script lang="ts">
	/** Création / modification d'une petite annonce (F-S3-37 à F-S3-40). */
	import Bouton from '$lib/components/ui/Bouton.svelte';
	import Choix from '$lib/components/ui/Choix.svelte';
	import Fichier from '$lib/components/ui/Fichier.svelte';
	import Formulaire from '$lib/components/ui/Formulaire.svelte';
	import Liste from '$lib/components/ui/Liste.svelte';
	import Saisie from '$lib/components/ui/Saisie.svelte';
	import Zone from '$lib/components/ui/Zone.svelte';
	import { champ, valeur } from '$lib/forms';
	import type { ArticleDetail } from '$lib/types/annonces';

	type Retour = { cle?: string; message?: string; champs?: Record<string, string>; valeurs?: Record<string, unknown> } | null | undefined;

	let {
		form,
		familles,
		initial,
		typeInitial = '1',
		libelleBouton = 'Publier mon annonce'
	}: {
		form: Retour;
		familles: { id: number; libelle: string }[];
		initial?: ArticleDetail | null;
		typeInitial?: string;
		libelleBouton?: string;
	} = $props();

	let type = $state(String(valeur(form, 'offre_ou_recherche', initial?.offre_ou_recherche ?? typeInitial)));
	let etatArticle = $state(String(valeur(form, 'neuf_ou_occasion', initial?.neuf_ou_occasion || '')));
	const recherche = $derived(type === '2');
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
						{ value: '1', label: 'Une offre', description: 'Je vends un article, payable via la frangine' },
						{ value: '2', label: 'Une recherche', description: 'Je cherche un article, les vendeurs me répondent' }
					]}
				/>
				<Saisie
					label={recherche ? 'Article recherché' : "Nom de l'article"}
					requis
					minlength={5}
					maxlength={200}
					placeholder="Ex. Réfrigérateur Samsung 250 L"
					{...champ(form, 'libelle', initial?.libelle)}
				/>
				<div class="grid gap-5 sm:grid-cols-2">
					<Liste label="Famille" requis options={familles.map((x) => ({ value: x.id, label: x.libelle }))} {...champ(form, 'famille_id', initial?.famille_id)} />
					<Choix
						legende="État de l'article"
						name="neuf_ou_occasion"
						bind:value={etatArticle}
						requis
						erreur={form?.champs?.neuf_ou_occasion}
						options={[
							{ value: '1', label: 'Neuf' },
							{ value: '2', label: 'Occasion' }
						]}
					/>
				</div>
				<div class="grid gap-5 sm:grid-cols-2">
					<Saisie
						label={recherche ? 'Budget' : 'Prix unitaire'}
						type="number"
						inputmode="numeric"
						min="0"
						suffixe="FCFA"
						aide={recherche ? 'Laissez 0 si le budget est à discuter.' : "Prix payé par l'acheteur via la frangine."}
						{...champ(form, 'prix', initial?.prix ?? '')}
					/>
					<Saisie
						label={recherche ? 'Quantité recherchée' : 'Quantité disponible'}
						type="number"
						inputmode="numeric"
						min="0"
						aide={recherche ? '' : 'Le stock diminue à chaque achat payé.'}
						{...champ(form, 'quantite', initial?.quantite ?? 1)}
					/>
				</div>
				<Zone label="Description" lignes={4} aide="Marque, taille, couleur, état, lieu de retrait…" {...champ(form, 'description', initial?.description)} />
				<Fichier label="Photo de l'article" name="photo" actuel={initial?.photo_url} erreur={form?.champs?.photo} aide="Une photo nette, sur fond clair, fait vendre plus vite." />
			</fieldset>

			<div class="flex flex-wrap gap-3">
				<Bouton type="submit" taille="lg" chargement={envoi}>{libelleBouton}</Bouton>
				<Bouton href={initial ? `/annonces/${initial.id}` : '/annonces'} variante="fantome" taille="lg">Annuler</Bouton>
			</div>
		</div>
	{/snippet}
</Formulaire>

<script lang="ts">
	/** Article du catalogue d'une boutique partenaire (F-S3-72 à F-S3-74). */
	import Bouton from '$lib/components/ui/Bouton.svelte';
	import Choix from '$lib/components/ui/Choix.svelte';
	import Fichier from '$lib/components/ui/Fichier.svelte';
	import Formulaire from '$lib/components/ui/Formulaire.svelte';
	import Liste from '$lib/components/ui/Liste.svelte';
	import Saisie from '$lib/components/ui/Saisie.svelte';
	import Zone from '$lib/components/ui/Zone.svelte';
	import { champ, valeur } from '$lib/forms';
	import type { ArticleCatalogueDetail, Boutique } from '$lib/types/courses';

	type Retour = { cle?: string; message?: string; champs?: Record<string, string>; valeurs?: Record<string, unknown> } | null | undefined;

	let {
		form,
		initial = null,
		boutiques = [],
		libelleBouton = "Ajouter l'article"
	}: { form: Retour; initial?: ArticleCatalogueDetail | null; boutiques?: Boutique[]; libelleBouton?: string } = $props();

	let disponible = $state(String(valeur(form, 'disponible', initial?.disponible ?? 1)));
</script>

<Formulaire {form} fichiers>
	{#snippet children({ envoi })}
		<div class="carte space-y-6 p-6">
			{#if boutiques.length && !initial}
				<Liste label="Boutique" requis options={boutiques.map((b) => ({ value: b.id, label: `${b.pseudonyme} — ${b.nom}` }))} {...champ(form, 'boutique_id')} />
			{/if}
			<Saisie label="Nom de l'article" requis minlength={3} maxlength={200} placeholder="Ex. Riz parfumé 25 kg" {...champ(form, 'nom', initial?.nom)} />
			<div class="grid gap-5 sm:grid-cols-3">
				<Saisie label="Prix de vente" type="number" inputmode="numeric" min="1" suffixe="FCFA" requis {...champ(form, 'prix', initial?.prix ?? '')} />
				<Saisie label="Marque" maxlength={30} {...champ(form, 'marque', initial?.marque)} />
				<Saisie label="Code article" maxlength={15} aide="Votre référence interne." {...champ(form, 'code', initial?.code)} />
			</div>
			<Choix
				legende="Disponibilité"
				name="disponible"
				bind:value={disponible}
				options={[
					{ value: '1', label: 'Disponible', description: 'Proposé aux clients des courses' },
					{ value: '2', label: 'Indisponible', description: 'Temporairement en rupture' }
				]}
			/>
			<Zone label="Description" lignes={3} {...champ(form, 'description', initial?.description)} />
			<Fichier label="Photo de l'article" name="photo" actuel={initial?.photo_url} erreur={form?.champs?.photo} />
			<div class="flex flex-wrap gap-3">
				<Bouton type="submit" taille="lg" chargement={envoi}>{libelleBouton}</Bouton>
				<Bouton href="/courses/catalogue" variante="fantome" taille="lg">Annuler</Bouton>
			</div>
		</div>
	{/snippet}
</Formulaire>

<script lang="ts">
	/** Formulaire de création / modification d'une recherche de partenariat & troc (F-S5-48/49). */
	import Formulaire from '$lib/components/ui/Formulaire.svelte';
	import Saisie from '$lib/components/ui/Saisie.svelte';
	import Zone from '$lib/components/ui/Zone.svelte';
	import Bouton from '$lib/components/ui/Bouton.svelte';
	import { champ } from '$lib/forms';
	import type { PartenariatDetail } from '$lib/types/partenariats';

	type Retour = { valeurs?: Record<string, unknown>; champs?: Record<string, string> } | null | undefined;
	let {
		form,
		initial,
		libelleBouton = 'Publier ma recherche'
	}: { form: Retour; initial?: PartenariatDetail | null; libelleBouton?: string } = $props();
</script>

<Formulaire {form}>
	{#snippet children({ envoi })}
		<div class="space-y-6">
			<fieldset class="carte space-y-5 p-6">
				<legend class="sr-only">Votre proposition</legend>
				<Saisie
					label="J'ai (votre actif)"
					requis
					maxlength="120"
					aide="Ce que vous mettez dans l'échange : un terrain, un local, du matériel, un savoir-faire, un réseau… (5 caractères minimum)"
					{...champ(form, 'actif', initial?.actif)}
				/>
				<Zone label="Description" lignes={4} aide="Précisez : état, quantité, lieu, disponibilité." {...champ(form, 'description', initial?.description)} />
				<Zone label="Je cherche" lignes={3} aide="Le partenaire, le bien ou le service que vous souhaitez en échange." {...champ(form, 'recherche', initial?.recherche)} />
				<Zone label="Objectif" lignes={3} aide="Ce que vous voulez réaliser ensemble." {...champ(form, 'objectif', initial?.objectif)} />
			</fieldset>
			<p class="text-sm text-ardoise">
				Votre proposition est publiée immédiatement sous votre pseudonyme. Vos coordonnées restent privées : les membres
				intéressés vous écrivent par La Frangine.
			</p>
			<div class="flex flex-wrap gap-3">
				<Bouton type="submit" taille="lg" chargement={envoi}>{libelleBouton}</Bouton>
				<Bouton href={initial ? `/partenariats/${initial.id}` : '/partenariats'} variante="fantome" taille="lg">Annuler</Bouton>
			</div>
		</div>
	{/snippet}
</Formulaire>

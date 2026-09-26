<script lang="ts">
	/** Création / modification d'un sujet (F-S1-10, F-S1-13) : confidentialité, objet, texte. */
	import Formulaire from '$lib/components/ui/Formulaire.svelte';
	import Saisie from '$lib/components/ui/Saisie.svelte';
	import Zone from '$lib/components/ui/Zone.svelte';
	import Choix from '$lib/components/ui/Choix.svelte';
	import Bouton from '$lib/components/ui/Bouton.svelte';
	import { champ, valeur } from '$lib/forms';
	import type { SujetDetail } from '$lib/types/questions';

	type Retour = { valeurs?: Record<string, unknown>; champs?: Record<string, string>; message?: string } | null | undefined;

	let {
		form,
		initial,
		confidentialiteInitiale = '2',
		libelleBouton = 'Publier ma question',
		annuler = '/questions'
	}: {
		form: Retour;
		initial?: SujetDetail | null;
		confidentialiteInitiale?: string;
		libelleBouton?: string;
		annuler?: string;
	} = $props();

	const confidentialite = $derived(String(valeur(form, 'confidentialite', initial?.confidentialite ?? confidentialiteInitiale)));
</script>

<Formulaire {form}>
	{#snippet children({ envoi })}
		<div class="space-y-6">
			<div class="carte space-y-6 p-6">
				<Choix
					legende="Qui peut lire votre question ?"
					name="confidentialite"
					value={confidentialite}
					requis
					erreur={form?.champs?.confidentialite}
					options={[
						{ value: '2', label: 'Public', description: 'Tous les visiteurs la lisent ; les membres peuvent répondre.' },
						{ value: '1', label: 'Privé', description: 'Seule la frangine la lit et vous répond. Personne d’autre ne la voit.' }
					]}
				/>
				<Saisie
					label="Objet"
					requis
					maxlength={120}
					aide="Votre question en une phrase (5 caractères minimum)."
					placeholder="Ex. Quels papiers pour ouvrir un compte d’entreprise ?"
					{...champ(form, 'objet', initial?.objet)}
				/>
				<Zone
					label="Votre message"
					requis
					lignes={7}
					aide="Donnez le contexte : votre activité, votre ville, ce que vous avez déjà essayé (20 caractères minimum)."
					{...champ(form, 'texte', initial?.texte)}
				/>
			</div>
			<p class="text-sm text-ardoise">
				Soyez bienveillant·e. Ne publiez jamais votre numéro de téléphone, votre code Mobile Money ni vos papiers dans un sujet public.
			</p>
			<div class="flex flex-wrap gap-3">
				<Bouton type="submit" taille="lg" chargement={envoi}>{libelleBouton}</Bouton>
				<Bouton href={annuler} variante="fantome" taille="lg">Annuler</Bouton>
			</div>
		</div>
	{/snippet}
</Formulaire>

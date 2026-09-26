<script lang="ts">
	/**
	 * Une réponse du fil. L'auteur (ou un gestionnaire habilité) la corrige ou la supprime ;
	 * le gestionnaire habilité change son état. Actions `?/modifierReponse`, `?/etatReponse`,
	 * `?/supprimerReponse` avec le champ caché `rid`.
	 */
	import Pencil from '@lucide/svelte/icons/pencil';
	import Trash2 from '@lucide/svelte/icons/trash-2';
	import Avatar from '$lib/components/ui/Avatar.svelte';
	import BadgeEtat from '$lib/components/ui/BadgeEtat.svelte';
	import Formulaire from '$lib/components/ui/Formulaire.svelte';
	import Zone from '$lib/components/ui/Zone.svelte';
	import Bouton from '$lib/components/ui/Bouton.svelte';
	import { champ } from '$lib/forms';
	import { dateHeure } from '$lib/format';
	import type { Reponse } from '$lib/types/questions';

	type Retour = { cle?: string; message?: string; champs?: Record<string, string>; succes?: string; valeurs?: Record<string, unknown> };

	let {
		reponse: r,
		peutModerer = false,
		form
	}: { reponse: Reponse; peutModerer?: boolean; form?: Retour | null } = $props();

	const cle = $derived(`reponse-${r.id}`);
	const ouvert = $derived(form?.cle === cle && !!form?.message && !form?.succes);
</script>

<article class="py-5" id="reponse-{r.id}" aria-labelledby="auteur-reponse-{r.id}">
	<header class="flex flex-wrap items-center gap-3">
		<Avatar src={r.auteur?.photo_url} nom={r.auteur?.pseudonyme} taille="sm" />
		<p id="auteur-reponse-{r.id}" class="font-semibold">
			{r.auteur?.pseudonyme ?? 'Membre'}
			{#if r.de_la_frangine}<span class="ml-1 rounded-full bg-foret-50 px-2 py-0.5 text-xs font-semibold text-foret-700">La frangine</span>{/if}
			{#if r.auteur_nom}<span class="font-normal text-ardoise">· {r.auteur_nom}</span>{/if}
		</p>
		<time class="text-sm text-ardoise" datetime={r.date_creation ?? undefined}>{dateHeure(r.date_creation)}</time>
		{#if r.etat !== 2}<BadgeEtat etat={r.etat} libelles={{ 1: 'Masquée', 3: 'Supprimée', 4: 'Clôturée' }} />{/if}
	</header>
	<p class="mt-2 pl-11 whitespace-pre-line">{r.texte}</p>

	{#if r.peut_modifier || peutModerer}
		<div class="mt-3 flex flex-wrap items-start gap-2 pl-11">
			{#if r.peut_modifier}
				<details class="group w-full sm:w-auto" open={ouvert}>
					<summary class="inline-flex min-h-10 cursor-pointer list-none items-center gap-1.5 rounded-xl px-3 text-[15px] font-semibold text-fleuve-700 hover:bg-fleuve-50">
						<Pencil class="size-4" aria-hidden="true" />Corriger
					</summary>
					<Formulaire action="?/modifierReponse" {form} {cle} class="mt-2 w-full sm:min-w-[28rem]">
						{#snippet children({ envoi })}
							<input type="hidden" name="rid" value={r.id} />
							<Zone label="Votre réponse" id="texte-reponse-{r.id}" lignes={3} requis {...champ(form, 'texte', r.texte, cle)} />
							<Bouton type="submit" variante="fleuve" taille="sm" class="mt-2" chargement={envoi}>Enregistrer</Bouton>
						{/snippet}
					</Formulaire>
				</details>
				<Formulaire action="?/supprimerReponse" confirmer="Supprimer cette réponse ?">
					{#snippet children({ envoi })}
						<input type="hidden" name="rid" value={r.id} />
						<Bouton type="submit" variante="danger" taille="sm" chargement={envoi}><Trash2 class="size-4" aria-hidden="true" />Supprimer</Bouton>
					{/snippet}
				</Formulaire>
			{/if}
			{#if peutModerer}
				<Formulaire action="?/etatReponse" {form} cle="etat-{cle}" class="flex flex-wrap items-center gap-2">
					{#snippet children({ envoi })}
						<input type="hidden" name="rid" value={r.id} />
						<label for="etat-reponse-{r.id}" class="sr-only">État de la réponse</label>
						<select id="etat-reponse-{r.id}" name="etat" class="min-h-10 w-auto py-1.5 text-[15px]">
							<option value="2" selected={r.etat === 2}>Publiée</option>
							<option value="1" selected={r.etat === 1}>Masquée (non traitée)</option>
						</select>
						<Bouton type="submit" variante="secondaire" taille="sm" chargement={envoi}>OK</Bouton>
					{/snippet}
				</Formulaire>
			{/if}
		</div>
	{/if}
</article>

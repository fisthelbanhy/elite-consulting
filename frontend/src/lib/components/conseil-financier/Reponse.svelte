<script lang="ts">
	/** Une réponse du fil ; son auteur ou un gestionnaire habilité peut la modifier ou la retirer. */
	import Pencil from '@lucide/svelte/icons/pencil';
	import Trash2 from '@lucide/svelte/icons/trash-2';
	import BadgeCheck from '@lucide/svelte/icons/badge-check';
	import Avatar from '$lib/components/ui/Avatar.svelte';
	import Formulaire from '$lib/components/ui/Formulaire.svelte';
	import Zone from '$lib/components/ui/Zone.svelte';
	import Bouton from '$lib/components/ui/Bouton.svelte';
	import { champ } from '$lib/forms';
	import { dateHeure } from '$lib/format';
	import type { Reponse } from '$lib/types/conseil-financier';

	let { reponse: r, form }: { reponse: Reponse; form?: Record<string, unknown> | null } = $props();
	const cle = $derived(`reponse-${r.id}`);
	const f = $derived(form as { cle?: string; valeurs?: Record<string, unknown>; champs?: Record<string, string> } | null);
</script>

<article class="flex gap-3 {r.de_la_frangine ? 'rounded-2xl bg-foret-50 p-4 ring-1 ring-foret-100' : 'py-1'}">
	<Avatar src={r.auteur?.photo_url} nom={r.auteur?.pseudonyme} taille="sm" />
	<div class="min-w-0 flex-1">
		<p class="flex flex-wrap items-center gap-x-2 text-sm">
			<strong class="text-fleuve-800">{r.de_la_frangine ? 'La frangine' : (r.auteur?.pseudonyme ?? 'Membre')}</strong>
			{#if r.de_la_frangine}<span class="inline-flex items-center gap-1 font-semibold text-foret-700"><BadgeCheck class="size-4" aria-hidden="true" />Conseiller</span>{/if}
			<time class="text-ardoise" datetime={r.date_creation ?? undefined}>{dateHeure(r.date_creation)}</time>
		</p>
		<p class="mt-1 whitespace-pre-line">{r.texte}</p>
		{#if r.peut_modifier}
			<details class="mt-2">
				<summary class="inline-flex min-h-10 cursor-pointer items-center gap-1 text-sm font-semibold text-fleuve-700"><Pencil class="size-4" aria-hidden="true" />Modifier</summary>
				<Formulaire action="?/modifierReponse" {form} {cle} class="mt-2">
					{#snippet children({ envoi })}
						<input type="hidden" name="reponse_id" value={r.id} />
						<Zone label="Votre réponse" lignes={3} id="reponse-texte-{r.id}" {...champ(f, 'texte', r.texte, cle)} />
						<div class="mt-2 flex gap-2"><Bouton type="submit" taille="sm" variante="fleuve" chargement={envoi}>Enregistrer</Bouton></div>
					{/snippet}
				</Formulaire>
				<Formulaire action="?/supprimerReponse" confirmer="Retirer cette réponse ?" class="mt-2">
					{#snippet children({ envoi })}
						<input type="hidden" name="reponse_id" value={r.id} />
						<Bouton type="submit" taille="sm" variante="danger" chargement={envoi}><Trash2 class="size-4" aria-hidden="true" />Retirer</Bouton>
					{/snippet}
				</Formulaire>
			</details>
		{/if}
	</div>
</article>

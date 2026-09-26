<script lang="ts">
	/** Historique des cotisations (F-S4-40, F-S4-44) : reçu, date, adhérent, montant, état ; « Valider »
	 * pour le responsable ou la frangine quand le reçu manque ou attend sa validation. */
	import BadgeCheck from '@lucide/svelte/icons/badge-check';
	import Badge from '$lib/components/ui/Badge.svelte';
	import Formulaire from '$lib/components/ui/Formulaire.svelte';
	import Bouton from '$lib/components/ui/Bouton.svelte';
	import { dateCourte, fcfa, libelle } from '$lib/format';
	import type { Enums } from '$lib/types';
	import { ETATS_COTISATION, type Cotisation } from '$lib/types/likelemba';

	let {
		cotisations,
		total,
		enums,
		afficherAdherent = true,
		validation = true
	}: { cotisations: Cotisation[]; total: number; enums: Enums; afficherAdherent?: boolean; validation?: boolean } = $props();

	const tons = { 1: 'soleil', 2: 'foret', 3: 'alerte', 4: 'neutre' } as const;
</script>

{#if cotisations.length}
	<ul class="divide-y divide-fleuve-900/5">
		{#each cotisations as c (c.id)}
			<li class="flex flex-wrap items-center gap-x-4 gap-y-2 py-3">
				<div class="min-w-0 flex-1">
					<p class="flex flex-wrap items-center gap-2">
						<span class="font-semibold {c.etat === 3 ? 'text-ardoise line-through' : 'text-fleuve-800'}">{c.recu_valide ? `Reçu ${c.numero_recu}` : 'Reçu à activer'}</span>
						<Badge ton={tons[c.etat as 1 | 2 | 3 | 4] ?? 'neutre'}>{ETATS_COTISATION[c.etat] ?? '—'}</Badge>
					</p>
					<p class="text-sm text-ardoise">
						{dateCourte(c.date_paiement)}
						{#if afficherAdherent}· {c.adherent} ({c.code_adherent}){/if}
						{#if c.mode_paiement}· {libelle(enums, 'ModePaiement', c.mode_paiement)}{/if}
						{#if c.nom_caissier}· encaissé par {c.nom_caissier}{/if}
					</p>
					{#if c.observation}<p class="text-sm text-ardoise italic">{c.observation}</p>{/if}
				</div>
				<p class="montant font-semibold">{fcfa(c.montant)}</p>
				{#if validation && c.peut_valider}
					<Formulaire action="?/valider">
						{#snippet children({ envoi })}
							<input type="hidden" name="cotisation" value={c.id} />
							<Bouton type="submit" variante="secondaire" taille="sm" chargement={envoi}><BadgeCheck class="size-4" aria-hidden="true" />Valider</Bouton>
						{/snippet}
					</Formulaire>
				{/if}
			</li>
		{/each}
	</ul>
	<p class="mt-3 flex justify-between border-t border-fleuve-900/10 pt-3 font-bold">
		<span>Total cotisé</span><span class="montant text-foret-700">{fcfa(total)}</span>
	</p>
{:else}
	<p class="text-ardoise">Aucune cotisation enregistrée pour l'instant.</p>
{/if}

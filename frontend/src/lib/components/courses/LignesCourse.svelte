<script lang="ts">
	/**
	 * Grille des articles à acheter en saisie libre (F-S3-57) : nom, « prix maxi à ne pas dépasser »,
	 * quantité, observation. Lignes ajoutées à la demande (25 au maximum). Une ligne incomplète est
	 * signalée par le serveur (`ligne_{n}`).
	 */
	import Plus from '@lucide/svelte/icons/plus';
	import X from '@lucide/svelte/icons/x';
	import { fcfa } from '$lib/format';
	import type { LigneSaisie } from '$lib/types/courses';

	let { lignes = $bindable(), erreurs = {} }: { lignes: LigneSaisie[]; erreurs?: Record<string, string> } = $props();
	const MAX = 25;

	const montant = (l: LigneSaisie) => (Number(l.prix_plafond) || 0) * (Number(l.quantite) || 0);
	function ajouter() {
		if (lignes.length < MAX) lignes.push({ nom_article: '', prix_plafond: '', quantite: 1, observation: '' });
	}
	function retirer(i: number) {
		lignes.splice(i, 1);
		if (!lignes.length) ajouter();
	}
</script>

<ol class="space-y-3">
	{#each lignes as l, i (i)}
		{@const erreur = erreurs[`ligne_${i + 1}`]}
		<li id="champ-ligne_{i + 1}" class="rounded-xl border bg-white p-3 {erreur ? 'border-alerte' : 'border-fleuve-100'}">
			<div class="mb-2 flex items-center justify-between">
				<span class="text-sm font-semibold text-ardoise">Article {i + 1}</span>
				{#if lignes.length > 1}
					<button type="button" onclick={() => retirer(i)} class="inline-flex min-h-10 items-center gap-1 rounded-lg px-2 text-sm text-ardoise hover:bg-sable">
						<X class="size-4" aria-hidden="true" />Retirer<span class="sr-only"> l'article {i + 1}</span>
					</button>
				{/if}
			</div>
			<div class="grid gap-3 sm:grid-cols-[1fr_9rem_6rem]">
				<label class="block">
					<span class="mb-1 block text-sm font-semibold">Article</span>
					<input name="ligne_nom" bind:value={l.nom_article} maxlength="200" placeholder="Ex. Sac de riz 25 kg" aria-invalid={erreur ? 'true' : undefined} />
				</label>
				<label class="block">
					<span class="mb-1 block text-sm font-semibold">Prix maxi (FCFA)</span>
					<input name="ligne_prix" type="number" inputmode="numeric" min="0" bind:value={l.prix_plafond} aria-invalid={erreur ? 'true' : undefined} />
				</label>
				<label class="block">
					<span class="mb-1 block text-sm font-semibold">Quantité</span>
					<input name="ligne_quantite" type="number" inputmode="numeric" min="0" bind:value={l.quantite} aria-invalid={erreur ? 'true' : undefined} />
				</label>
			</div>
			<label class="mt-3 block">
				<span class="mb-1 block text-sm font-semibold">Précision <span class="font-normal text-ardoise">(facultatif)</span></span>
				<input name="ligne_observation" bind:value={l.observation} maxlength="250" placeholder="Marque, taille, couleur…" />
			</label>
			<div class="mt-2 flex flex-wrap justify-between gap-2 text-sm">
				{#if erreur}<p class="font-medium text-alerte">{erreur}</p>{:else}<span></span>{/if}
				{#if montant(l)}<p class="montant text-ardoise">Montant : <strong class="text-encre">{fcfa(montant(l))}</strong></p>{/if}
			</div>
		</li>
	{/each}
</ol>
{#if lignes.length < MAX}
	<button
		type="button"
		onclick={ajouter}
		class="mt-3 inline-flex min-h-12 items-center gap-2 rounded-xl px-4 font-semibold text-fleuve-700 ring-1 ring-fleuve-200 ring-inset hover:bg-fleuve-50"
	>
		<Plus class="size-5" aria-hidden="true" />Ajouter un article
	</button>
{/if}
<p class="mt-2 text-sm text-ardoise">Le prix indiqué est le <strong>prix maxi à ne pas dépasser</strong> : on n'achète pas au-delà sans votre accord.</p>

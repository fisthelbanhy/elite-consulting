<script lang="ts">
	/**
	 * 1re étape facultative (F-S3-52, ADR-0007 S3c) : choisir une boutique partenaire pour commander
	 * dans son catalogue. Formulaire GET : fonctionne sans JavaScript, soumis au changement sinon.
	 */
	import Store from '@lucide/svelte/icons/store';
	import Bouton from '$lib/components/ui/Bouton.svelte';
	import type { Boutique } from '$lib/types/courses';

	let { boutiques, boutique }: { boutiques: Boutique[]; boutique: Boutique | null } = $props();
</script>

{#if boutiques.length}
	<form method="GET" class="carte p-5" data-sveltekit-keepfocus data-sveltekit-noscroll>
		<label for="choix-boutique" class="flex items-center gap-2 text-lg font-bold text-fleuve-700">
			<Store class="size-5" aria-hidden="true" />Acheter chez une boutique partenaire ?
		</label>
		<p class="mt-1 text-[15px] text-ardoise">Facultatif : choisissez une boutique pour commander dans son catalogue, à ses prix.</p>
		<div class="mt-3 flex flex-wrap gap-2">
			<select id="choix-boutique" name="boutique" class="min-w-0 flex-1" onchange={(e) => e.currentTarget.form?.requestSubmit()}>
				<option value="">Non, j'indique moi-même le lieu d'achat</option>
				{#each boutiques as b (b.id)}
					<option value={b.id} selected={b.id === boutique?.id}>{b.pseudonyme}{b.nombre_articles ? ` — ${b.nombre_articles} article${b.nombre_articles > 1 ? 's' : ''}` : ''}</option>
				{/each}
			</select>
			<Bouton type="submit" variante="secondaire">Choisir</Bouton>
		</div>
		{#if boutique}
			<p class="mt-2 text-sm text-ardoise">{boutique.nom}{boutique.adresse ? ` — ${boutique.adresse}` : ''}</p>
		{/if}
	</form>
{/if}

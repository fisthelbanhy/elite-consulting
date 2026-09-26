<script lang="ts">
	/**
	 * Liste ordonnée des produits conseillés d'une fiche bien-être, sans limite à 5 (F-ADM-23).
	 * Sans JavaScript, les lignes existantes et trois lignes vides restent utilisables.
	 */
	import ArrowUp from '@lucide/svelte/icons/arrow-up';
	import ArrowDown from '@lucide/svelte/icons/arrow-down';
	import Trash2 from '@lucide/svelte/icons/trash-2';
	import Plus from '@lucide/svelte/icons/plus';

	type Ligne = { cle: number; produit_id: string; posologie: string };
	let {
		initiales,
		produits,
		erreurs = {}
	}: {
		initiales: { produit_id: number | string; posologie: string }[];
		produits: { id: number; nom: string; reference: string; etat: number }[];
		erreurs?: Record<string, string>;
	} = $props();

	let n = 0;
	const nouvelle = (produit_id = '', posologie = ''): Ligne => ({ cle: n++, produit_id, posologie });
	// svelte-ignore state_referenced_locally
	let lignes = $state<Ligne[]>([...initiales.map((l) => nouvelle(String(l.produit_id), l.posologie)), nouvelle(), nouvelle(), nouvelle()]);

	function deplacer(i: number, sens: -1 | 1) {
		const j = i + sens;
		if (j < 0 || j >= lignes.length) return;
		[lignes[i], lignes[j]] = [lignes[j], lignes[i]];
	}
</script>

<fieldset class="space-y-3">
	<legend class="text-lg font-bold">Produits conseillés</legend>
	<p class="text-sm text-ardoise">Dans l'ordre d'affichage sur la page publique. Laissez une ligne vide pour l'ignorer.</p>
	<ol class="space-y-3">
		{#each lignes as l, i (l.cle)}
			{@const erreur = erreurs[`produits.${i}.produit_id`]}
			<li class="rounded-xl border border-fleuve-100 bg-white p-3">
				<div class="flex items-start gap-2">
					<span class="mt-3 w-6 shrink-0 text-center font-display font-bold text-fleuve-600" aria-hidden="true">{i + 1}</span>
					<div class="min-w-0 flex-1 space-y-2">
						<label class="sr-only" for="produit-{l.cle}">Produit n° {i + 1}</label>
						<select id="produit-{l.cle}" name="produit_id" bind:value={l.produit_id} aria-invalid={erreur ? 'true' : undefined}>
							<option value="">— Aucun produit —</option>
							{#each produits as p (p.id)}
								<option value={String(p.id)}>{p.nom}{p.reference ? ` (${p.reference})` : ''}{p.etat === 3 ? ' — supprimé' : ''}</option>
							{/each}
						</select>
						{#if erreur}<p class="text-sm font-medium text-alerte">{erreur}</p>{/if}
						<label class="sr-only" for="conseil-{l.cle}">Conseil d'utilisation du produit n° {i + 1}</label>
						<textarea id="conseil-{l.cle}" name="posologie" rows="2" bind:value={l.posologie} placeholder="Conseil d'utilisation (ex. 1 bouchon matin et soir)"></textarea>
					</div>
					<div class="flex shrink-0 flex-col gap-1">
						<button type="button" class="grid size-9 place-items-center rounded-lg text-fleuve-700 hover:bg-fleuve-50 disabled:opacity-30" disabled={i === 0} onclick={() => deplacer(i, -1)}>
							<ArrowUp class="size-4" aria-hidden="true" /><span class="sr-only">Monter le produit n° {i + 1}</span>
						</button>
						<button type="button" class="grid size-9 place-items-center rounded-lg text-fleuve-700 hover:bg-fleuve-50 disabled:opacity-30" disabled={i === lignes.length - 1} onclick={() => deplacer(i, 1)}>
							<ArrowDown class="size-4" aria-hidden="true" /><span class="sr-only">Descendre le produit n° {i + 1}</span>
						</button>
						<button type="button" class="grid size-9 place-items-center rounded-lg text-alerte hover:bg-alerte-50" onclick={() => lignes.splice(i, 1)}>
							<Trash2 class="size-4" aria-hidden="true" /><span class="sr-only">Retirer le produit n° {i + 1}</span>
						</button>
					</div>
				</div>
			</li>
		{/each}
	</ol>
	<button type="button" class="inline-flex min-h-11 items-center gap-1.5 rounded-xl px-3 font-semibold text-fleuve-700 hover:bg-fleuve-50" onclick={() => lignes.push(nouvelle())}>
		<Plus class="size-4" aria-hidden="true" />Ajouter un produit
	</button>
</fieldset>

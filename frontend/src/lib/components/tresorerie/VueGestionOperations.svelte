<script lang="ts">
	/**
	 * Vue gestionnaire des opérations bancaires (S7-11, F-S7-34) : filtres utilisables séparément
	 * (période, banque, type, fourchette de montant, état), présentation Débit / Crédit aux
	 * intitulés corrigés et totaux par devise.
	 */
	import { page } from '$app/state';
	import ArrowUpRight from '@lucide/svelte/icons/arrow-up-right';
	import ArrowDownLeft from '@lucide/svelte/icons/arrow-down-left';
	import Bouton from '$lib/components/ui/Bouton.svelte';
	import BadgeEtat from '$lib/components/ui/BadgeEtat.svelte';
	import { dateCourte, entier, libelle } from '$lib/format';
	import { ETATS_TRESORERIE, type BanqueCourte, type OperationResume, type SyntheseLigne } from '$lib/types/tresorerie';

	let {
		operations,
		synthese,
		banques,
		filtres
	}: {
		operations: OperationResume[];
		synthese: SyntheseLigne[];
		banques: BanqueCourte[];
		filtres: Record<string, string>;
	} = $props();

	const enums = $derived(page.data.enums ?? {});
	const devise = (d: number) => libelle(enums, 'Devise', d) || 'FCFA';
	const colonnes = $derived([
		{ sens: 'debit', titre: 'Débit', sousTitre: 'Transfert · Virement émis · Retrait', icone: ArrowUpRight, ton: 'text-laterite-700' },
		{ sens: 'credit', titre: 'Crédit', sousTitre: 'Rapatriement · Virement reçu · Versement', icone: ArrowDownLeft, ton: 'text-foret-700' }
	] as const);
</script>

<form method="GET" class="carte mb-6 grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4" data-sveltekit-keepfocus>
	<div><label for="g-date-min" class="mb-1.5 block text-[15px] font-semibold">Du</label><input id="g-date-min" type="date" name="date_min" value={filtres.date_min} /></div>
	<div><label for="g-date-max" class="mb-1.5 block text-[15px] font-semibold">Au</label><input id="g-date-max" type="date" name="date_max" value={filtres.date_max} /></div>
	<div>
		<label for="g-banque" class="mb-1.5 block text-[15px] font-semibold">Banque</label>
		<select id="g-banque" name="banque_id">
			<option value="">Toutes</option>
			{#each banques as b (b.id)}<option value={b.id} selected={String(b.id) === filtres.banque_id}>{b.nom}</option>{/each}
		</select>
	</div>
	<div>
		<label for="g-type" class="mb-1.5 block text-[15px] font-semibold">Opération</label>
		<select id="g-type" name="type_operation">
			<option value="">Toutes</option>
			{#each enums.TypeOperationBanque ?? [] as o (o.value)}<option value={o.value} selected={String(o.value) === filtres.type_operation}>{o.label}</option>{/each}
		</select>
	</div>
	<div><label for="g-min" class="mb-1.5 block text-[15px] font-semibold">Montant minimum</label><input id="g-min" name="montant_min" inputmode="numeric" type="text" value={filtres.montant_min} /></div>
	<div><label for="g-max" class="mb-1.5 block text-[15px] font-semibold">Montant maximum</label><input id="g-max" name="montant_max" inputmode="numeric" type="text" value={filtres.montant_max} /></div>
	<div>
		<label for="g-etat" class="mb-1.5 block text-[15px] font-semibold">État</label>
		<select id="g-etat" name="etat">
			<option value="">Tous (hors annulés)</option>
			{#each Object.entries(ETATS_TRESORERIE) as [v, l] (v)}<option value={v} selected={v === filtres.etat}>{l}</option>{/each}
		</select>
	</div>
	<div class="flex items-end gap-2">
		<Bouton type="submit" variante="fleuve" pleineLargeur>Filtrer</Bouton>
		<Bouton href="/tresorerie/operations" variante="fantome">Effacer</Bouton>
	</div>
</form>

{#if synthese.length}
	<div class="mb-6 flex flex-wrap gap-3" aria-label="Totaux par devise">
		{#each synthese as s (s.sens + s.devise)}
			<p class="carte px-4 py-3 text-[15px]">
				<span class="text-ardoise">{s.sens === 'debit' ? 'Débit' : 'Crédit'} ({s.nombre})</span>
				<strong class="montant ml-2 {s.sens === 'debit' ? 'text-laterite-700' : 'text-foret-700'}">{entier(s.total)} {devise(s.devise)}</strong>
			</p>
		{/each}
	</div>
{/if}

<div class="grid gap-6 lg:grid-cols-2">
	{#each colonnes as col (col.sens)}
		{@const liste = operations.filter((o) => o.sens === col.sens)}
		<section class="carte p-5" aria-labelledby="col-{col.sens}">
			<h2 id="col-{col.sens}" class="flex items-center gap-2 text-lg font-bold {col.ton}"><col.icone class="size-5" aria-hidden="true" />{col.titre}</h2>
			<p class="text-sm text-ardoise">{col.sousTitre}</p>
			<ul class="mt-3 divide-y divide-fleuve-900/5">
				{#each liste as o (o.id)}
					<li>
						<a href="/tresorerie/operations/{o.id}" class="flex items-start justify-between gap-3 py-3 hover:bg-creme">
							<span class="min-w-0">
								<span class="block truncate font-semibold text-fleuve-800">{col.sens === 'debit' ? o.nom_banque_emettrice : o.nom_banque_beneficiaire || o.nom_banque_emettrice}</span>
								<span class="block text-sm text-ardoise">
									{libelle(enums, 'TypeOperationBanque', o.type_operation)} · {dateCourte(o.date_operation)} · {col.sens === 'debit' ? o.membre?.pseudonyme ?? '' : o.beneficiaire}
								</span>
								<span class="text-xs text-ardoise">{o.reference}</span>
							</span>
							<span class="shrink-0 text-right">
								<span class="montant block font-bold">{entier(o.montant)} {devise(o.devise)}</span>
								{#if o.etat !== 2}<BadgeEtat etat={o.etat} libelles={ETATS_TRESORERIE} />{/if}
							</span>
						</a>
					</li>
				{:else}
					<li class="py-3 text-ardoise">Aucune opération.</li>
				{/each}
			</ul>
		</section>
	{/each}
</div>

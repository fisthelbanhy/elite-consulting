<script lang="ts">
	/** Liste d'engagements d'apport (F-S4-25) : référence, type, dates, promis, versé, reste, état. */
	import ChevronRight from '@lucide/svelte/icons/chevron-right';
	import Clock from '@lucide/svelte/icons/clock';
	import Badge from '$lib/components/ui/Badge.svelte';
	import { dateCourte, fcfa, libelle } from '$lib/format';
	import type { Enums } from '$lib/types';
	import { ETATS_APPORT, type ApportResume } from '$lib/types/projets';

	let {
		apports,
		enums,
		afficherProjet = true
	}: { apports: ApportResume[]; enums: Enums; afficherProjet?: boolean } = $props();

	const tons = { 1: 'soleil', 2: 'foret', 3: 'alerte', 4: 'neutre' } as const;
</script>

<ul class="divide-y divide-fleuve-900/5">
	{#each apports as a (a.id)}
		<li>
			<a href="/projets/apports/{a.id}" class="flex items-center gap-3 py-4 hover:bg-fleuve-50/60 sm:px-2">
				<div class="min-w-0 flex-1 space-y-1">
					<div class="flex flex-wrap items-center gap-2">
						<span class="font-semibold text-fleuve-800">{a.reference}</span>
						<Badge ton={tons[a.etat as 1 | 2 | 3 | 4] ?? 'neutre'}>{ETATS_APPORT[a.etat] ?? '—'}</Badge>
						<Badge>{libelle(enums, 'TypeApportFond', a.type_apport)}</Badge>
						{#if a.en_attente}
							<span class="flex items-center gap-1 text-xs text-ardoise"><Clock class="size-3.5" aria-hidden="true" />{fcfa(a.en_attente)} en vérification</span>
						{/if}
					</div>
					{#if afficherProjet}<p class="text-[15px]">{a.appel_fond.nom_projet} <span class="text-sm text-ardoise">({a.appel_fond.reference})</span></p>{/if}
					{#if a.creancier}<p class="text-sm text-ardoise">Par {a.creancier.pseudonyme} · {a.creancier.nom}</p>{/if}
					<dl class="flex flex-wrap gap-x-5 gap-y-1 text-sm">
						<div class="flex gap-1"><dt class="text-ardoise">Le</dt><dd>{dateCourte(a.date_engagement)}</dd></div>
						<div class="flex gap-1"><dt class="text-ardoise">Promis</dt><dd class="montant font-semibold">{fcfa(a.montant_promis)}</dd></div>
						<div class="flex gap-1"><dt class="text-ardoise">Versé</dt><dd class="montant font-semibold text-foret-700">{fcfa(a.montant_verse)}</dd></div>
						{#if a.etat !== 3}<div class="flex gap-1"><dt class="text-ardoise">Reste</dt><dd class="montant">{fcfa(a.reste_a_verser)}</dd></div>{/if}
						{#if a.echeance_mois}<div class="flex gap-1"><dt class="text-ardoise">Échéance</dt><dd>{a.echeance_mois} mois</dd></div>{/if}
					</dl>
				</div>
				<ChevronRight class="size-5 shrink-0 text-ardoise" aria-hidden="true" />
			</a>
		</li>
	{/each}
</ul>

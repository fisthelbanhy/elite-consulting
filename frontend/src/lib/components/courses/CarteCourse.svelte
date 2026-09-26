<script lang="ts">
	/** Carte « synthèse » d'une course (F-S3-50) : référence, client, dates, montant, paiement, état. */
	import CalendarClock from '@lucide/svelte/icons/calendar-clock';
	import ShoppingBasket from '@lucide/svelte/icons/shopping-basket';
	import Store from '@lucide/svelte/icons/store';
	import Badge from '$lib/components/ui/Badge.svelte';
	import BadgeEtat from '$lib/components/ui/BadgeEtat.svelte';
	import { dateCourte, dateHeure, fcfa, tronquer } from '$lib/format';
	import type { CourseResume } from '$lib/types/courses';
	import BadgeEtatCourse from './BadgeEtatCourse.svelte';

	let { course: c, gestion = false, moi }: { course: CourseResume; gestion?: boolean; moi?: number } = $props();
	const recue = $derived(moi !== undefined && c.boutique?.id === moi && c.client?.id !== moi);
</script>

<a href="/courses/{c.id}" class="carte flex h-full flex-col gap-3 p-5 transition-shadow hover:shadow-levee">
	<div class="flex flex-wrap items-center gap-2">
		<span class="font-display text-lg font-bold text-fleuve-800">{c.reference}</span>
		<BadgeEtatCourse etat={c.etat_course} />
		<Badge ton={c.paye === 1 ? 'foret' : 'neutre'}>{c.paye === 1 ? 'Payée' : 'À payer'}</Badge>
		{#if recue}<Badge ton="fleuve">Commande reçue</Badge>{/if}
		{#if gestion && c.etat !== 2}<BadgeEtat etat={c.etat} />{/if}
	</div>
	<p class="flex items-start gap-2 text-[15px]"><ShoppingBasket class="mt-0.5 size-4 shrink-0 text-ardoise" aria-hidden="true" />{tronquer(c.lieu_achat, 80)}</p>
	{#if c.boutique}<p class="flex items-center gap-2 text-[15px]"><Store class="size-4 text-ardoise" aria-hidden="true" />{c.boutique.pseudonyme}</p>{/if}
	<dl class="grid grid-cols-2 gap-2 text-sm sm:grid-cols-3">
		<div><dt class="text-ardoise">Commandée le</dt><dd class="font-semibold">{dateCourte(c.date_creation)}</dd></div>
		<div><dt class="text-ardoise">Achats le</dt><dd class="font-semibold">{dateCourte(c.date_achat)}</dd></div>
		<div class="col-span-2 sm:col-span-1">
			<dt class="flex items-center gap-1 text-ardoise"><CalendarClock class="size-3.5" aria-hidden="true" />Livraison</dt>
			<dd class="font-semibold">{dateHeure(c.date_livraison)}</dd>
		</div>
	</dl>
	<div class="mt-auto flex flex-wrap items-end justify-between gap-2 border-t border-fleuve-900/5 pt-3">
		<span class="text-sm text-ardoise">
			{#if gestion || recue}Client : <strong class="text-encre">{c.client?.pseudonyme ?? '—'}</strong> · {/if}{c.lignes.length} article{c.lignes.length > 1 ? 's' : ''}
		</span>
		<span class="montant font-display text-lg font-extrabold text-laterite-700">{fcfa(c.net_a_payer)}</span>
	</div>
</a>

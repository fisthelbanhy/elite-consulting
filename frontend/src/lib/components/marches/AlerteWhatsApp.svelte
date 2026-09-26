<script lang="ts">
	/** CTA de conversion (analyse de marché §2.5, §4.5) : recevoir les nouveaux marchés sur WhatsApp.
	 * Message pré-rempli avec le secteur / la ville à préciser, pour la conseillère. */
	import { page } from '$app/state';
	import BellRing from '@lucide/svelte/icons/bell-ring';
	import MessageCircle from '@lucide/svelte/icons/message-circle';
	import { lienWhatsApp } from '$lib/format';

	let { compact = false }: { compact?: boolean } = $props();
	const wa = $derived(page.data.parametres?.whatsapp as string | undefined);
	const lien = $derived(
		lienWhatsApp(
			wa,
			"Bonjour la Frangine, je souhaite recevoir les nouveaux marchés et appels d'offres sur WhatsApp. Mon secteur : … Ma ville : …"
		)
	);
</script>

{#if wa}
	<section class="overflow-hidden rounded-carte bg-fleuve-800 text-white {compact ? 'p-5' : 'p-6 sm:p-8'}">
		<div class="flex flex-col gap-4 {compact ? '' : 'sm:flex-row sm:items-center sm:justify-between'}">
			<div class="flex gap-4">
				<span class="grid size-12 shrink-0 place-items-center rounded-xl bg-white/10 text-soleil-300"><BellRing class="size-6" aria-hidden="true" /></span>
				<div>
					<h2 class="text-lg font-bold text-white">Ne ratez plus un appel d'offres</h2>
					<p class="text-[15px] text-fleuve-100">
						Dites-nous votre secteur et votre ville : votre frangine vous envoie les nouveaux marchés, et vous aide à monter le dossier.
					</p>
				</div>
			</div>
			<a
				href={lien}
				target="_blank"
				rel="noopener"
				class="inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-xl bg-white px-5 font-semibold text-foret-700 hover:bg-foret-50"
			>
				<MessageCircle class="size-5" aria-hidden="true" />Recevoir les nouveaux marchés sur WhatsApp
			</a>
		</div>
	</section>
{/if}

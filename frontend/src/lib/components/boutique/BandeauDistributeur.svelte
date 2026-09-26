<script lang="ts">
	/** Appel à l'adhésion distributeur (conversion, ADR-0007 S5a) : masqué pour un distributeur. */
	import Sparkles from '@lucide/svelte/icons/sparkles';
	import ArrowRight from '@lucide/svelte/icons/arrow-right';

	let { compact = false }: { compact?: boolean } = $props();
</script>

<aside class="pagne overflow-hidden rounded-carte bg-fleuve-800 text-white" aria-label="Devenir distributeur">
	<div class="flex flex-col gap-4 bg-fleuve-800/90 p-5 sm:p-6 {compact ? '' : 'md:flex-row md:items-center md:justify-between'}">
		<div class="flex gap-3">
			<Sparkles class="mt-1 size-6 shrink-0 text-soleil-300" aria-hidden="true" />
			<div>
				<p class="font-display text-lg font-bold text-white">Payez le prix distributeur, gagnez un revenu</p>
				<p class="mt-1 text-[15px] text-fleuve-100">
					En devenant distributeur, vous achetez vos produits au prix distributeur et vous pouvez les revendre
					avec une marge. Votre frangine vous accompagne pas à pas.
				</p>
			</div>
		</div>
		<a
			href="/devenir-distributeur"
			class="inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-xl bg-white px-5 font-semibold text-fleuve-800 hover:bg-fleuve-50"
		>
			Découvrir l'opportunité<ArrowRight class="size-5" aria-hidden="true" />
		</a>
	</div>
</aside>

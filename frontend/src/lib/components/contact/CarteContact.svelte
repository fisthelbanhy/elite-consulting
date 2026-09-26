<script lang="ts">
	/** Un message de contact envoyé par le membre et la réponse éventuelle (lecture seule, F-TRV-39). */
	import ChevronDown from '@lucide/svelte/icons/chevron-down';
	import Badge from '$lib/components/ui/Badge.svelte';
	import { dateHeure } from '$lib/format';
	import type { ContactMessage } from '$lib/types/contact';

	let { message: c, ouvert = false }: { message: ContactMessage; ouvert?: boolean } = $props();
</script>

<details class="group carte overflow-hidden" open={ouvert}>
	<summary class="flex min-h-12 cursor-pointer list-none items-center gap-3 p-4 hover:bg-creme [&::-webkit-details-marker]:hidden">
		<div class="min-w-0 flex-1">
			<p class="truncate font-semibold text-fleuve-800">{c.objet}</p>
			<p class="text-sm text-ardoise">Envoyé le {dateHeure(c.date_envoi)}</p>
		</div>
		{#if c.repondu}<Badge ton="foret">Répondu</Badge>{:else}<Badge ton="soleil">En attente de réponse</Badge>{/if}
		<ChevronDown class="size-5 shrink-0 text-ardoise transition-transform group-open:rotate-180" aria-hidden="true" />
	</summary>
	<div class="space-y-4 border-t border-fleuve-900/5 p-4">
		<div>
			<h3 class="text-sm font-semibold tracking-wide text-ardoise uppercase">Votre message</h3>
			<p class="mt-1 break-words whitespace-pre-line">{c.texte}</p>
		</div>
		{#if c.repondu}
			<div class="rounded-xl bg-foret-50 p-4 ring-1 ring-foret-100">
				<h3 class="text-sm font-semibold tracking-wide text-foret-700 uppercase">
					Réponse de votre frangine{#if c.date_reponse}<span class="font-normal normal-case"> · {dateHeure(c.date_reponse)}</span>{/if}
				</h3>
				<p class="mt-1 break-words whitespace-pre-line">{c.reponse}</p>
			</div>
		{:else}
			<p class="text-[15px] text-ardoise">Votre message est bien arrivé. La réponse s'affichera ici{c.email ? ' et vous sera aussi envoyée par e-mail' : ''}.</p>
		{/if}
	</div>
</details>

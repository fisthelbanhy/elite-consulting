<script lang="ts">
	/**
	 * Lien de réinitialisation / d'activation à usage unique, affiché une seule fois : copie en un
	 * geste et envoi WhatsApp pré-rempli au numéro du membre (ADR-0005 §3).
	 */
	import { page } from '$app/state';
	import Copy from '@lucide/svelte/icons/copy';
	import Check from '@lucide/svelte/icons/check';
	import MessageCircle from '@lucide/svelte/icons/message-circle';
	import KeyRound from '@lucide/svelte/icons/key-round';
	import { dateHeure, lienWhatsApp, lienPartageWhatsApp, telephone } from '$lib/format';
	import type { LienReinitialisation } from '$lib/types/gestion';

	let { lien, titre = 'Lien à transmettre' }: { lien: LienReinitialisation; titre?: string } = $props();

	// Le lien est reconstruit sur l'origine réelle du site (l'API ne connaît que son URL configurée)
	const url = $derived(`${page.url.origin}${lien.chemin}`);
	const texte = $derived(lien.message_whatsapp.replace(lien.lien, url));
	let copie = $state(false);

	async function copier() {
		try {
			await navigator.clipboard.writeText(url);
			copie = true;
			setTimeout(() => (copie = false), 2500);
		} catch {
			copie = false;
		}
	}
</script>

<section class="rounded-xl bg-foret-50 p-4 ring-1 ring-foret-100" aria-live="polite">
	<h3 class="flex items-center gap-2 font-bold text-foret-700"><KeyRound class="size-5" aria-hidden="true" />{titre}</h3>
	<p class="mt-1 text-sm text-encre">
		Pour <strong>{lien.membre.pseudonyme}</strong> ({lien.membre.nom}). Valable jusqu'au {dateHeure(lien.expire)}, une seule fois.
		<strong>Ce lien ne sera plus affiché</strong> : transmettez-le maintenant.
	</p>
	<label class="mt-3 block text-sm font-semibold" for="lien-unique-{lien.membre.id}">Lien</label>
	<div class="mt-1 flex gap-2">
		<input id="lien-unique-{lien.membre.id}" type="text" readonly value={url} class="font-mono text-sm" onfocus={(e) => e.currentTarget.select()} />
		<button type="button" onclick={copier} class="inline-flex min-h-12 shrink-0 items-center gap-1.5 rounded-xl bg-white px-4 font-semibold text-fleuve-700 ring-1 ring-fleuve-200 ring-inset hover:bg-fleuve-50">
			{#if copie}<Check class="size-4" aria-hidden="true" />Copié{:else}<Copy class="size-4" aria-hidden="true" />Copier{/if}
		</button>
	</div>
	<div class="mt-3 flex flex-wrap gap-2">
		<a
			href={lien.telephone ? lienWhatsApp(lien.telephone, texte) : lienPartageWhatsApp(texte)}
			target="_blank"
			rel="noopener"
			class="inline-flex min-h-12 items-center gap-2 rounded-xl bg-foret-600 px-4 font-semibold text-white hover:bg-foret-700"
		>
			<MessageCircle class="size-5" aria-hidden="true" />Envoyer par WhatsApp{lien.telephone ? ` au ${telephone(lien.telephone)}` : ''}
		</a>
	</div>
</section>

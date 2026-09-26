<script lang="ts">
	/**
	 * Zone de saisie de la messagerie : « Envoyer » (action `?/envoyer`) et « Actualiser »
	 * (F-TRV-48), plus une actualisation automatique discrète tant que l'onglet est visible.
	 * Ctrl + Entrée (ou Cmd + Entrée) envoie le message.
	 */
	import { page } from '$app/state';
	import { invalidateAll } from '$app/navigation';
	import Send from '@lucide/svelte/icons/send';
	import RefreshCw from '@lucide/svelte/icons/refresh-cw';
	import Formulaire from '$lib/components/ui/Formulaire.svelte';
	import Zone from '$lib/components/ui/Zone.svelte';
	import Bouton from '$lib/components/ui/Bouton.svelte';
	import { champ } from '$lib/forms';

	let {
		form,
		label = 'Votre message',
		placeholder = 'Écrivez ici…',
		libelleEnvoyer = 'Envoyer',
		auto = 30
	}: {
		form: Record<string, unknown> | null | undefined;
		label?: string;
		placeholder?: string;
		libelleEnvoyer?: string;
		/** Actualisation automatique en secondes (0 pour la désactiver). */
		auto?: number;
	} = $props();

	type Retour = { cle?: string; message?: string; champs?: Record<string, string>; succes?: string; valeurs?: Record<string, unknown> } | null;
	const f = $derived(form as Retour);
	let actualisation = $state(false);

	async function actualiser(e?: Event) {
		e?.preventDefault();
		actualisation = true;
		try {
			await invalidateAll();
		} finally {
			actualisation = false;
		}
	}

	function raccourci(e: KeyboardEvent) {
		if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
			e.preventDefault();
			(e.currentTarget as HTMLTextAreaElement).form?.requestSubmit();
		}
	}

	$effect(() => {
		if (!auto) return;
		const minuterie = setInterval(() => {
			if (document.visibilityState === 'visible' && !actualisation) actualiser();
		}, auto * 1000);
		return () => clearInterval(minuterie);
	});
</script>

<Formulaire action="?/envoyer" form={f} cle="message" reinitialiser>
	{#snippet children({ envoi })}
		<Zone
			{label}
			lignes={3}
			maxlength={2000}
			requis
			{placeholder}
			onkeydown={raccourci}
			aide="Ctrl + Entrée pour envoyer depuis un ordinateur."
			{...champ(f, 'texte', '', 'message')}
		/>
		<div class="mt-3 flex flex-wrap items-center gap-2">
			<Bouton type="submit" chargement={envoi}><Send class="size-5" aria-hidden="true" />{libelleEnvoyer}</Bouton>
			<Bouton href={page.url.pathname} variante="secondaire" onclick={actualiser} aria-busy={actualisation || undefined}>
				<RefreshCw class="size-5 {actualisation ? 'animate-spin' : ''}" aria-hidden="true" />Actualiser
			</Bouton>
			{#if auto}<p class="text-sm text-ardoise">Actualisation automatique toutes les {auto} secondes.</p>{/if}
		</div>
	{/snippet}
</Formulaire>

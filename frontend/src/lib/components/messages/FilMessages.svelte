<script lang="ts">
	/**
	 * Conversation membre ↔ la frangine (F-TRV-48) : séparateur à chaque changement de jour,
	 * bulles différenciées, heure en petit, badge « Nouveau » sur les messages reçus non lus.
	 * `perspective` : qui lit le fil (« membre » ou « frangine » pour un gestionnaire) ; ses propres
	 * messages sont à droite.
	 */
	import type { Snippet } from 'svelte';
	import { tick } from 'svelte';
	import { date } from '$lib/format';
	import type { MessageFil } from '$lib/types/messages';

	let {
		messages,
		perspective,
		nomMembre = 'Le membre',
		vide
	}: {
		messages: MessageFil[];
		perspective: 'membre' | 'frangine';
		nomMembre?: string;
		vide?: Snippet;
	} = $props();

	let zone = $state<HTMLDivElement>();

	function jour(iso: string): string {
		const d = new Date(iso);
		const auj = new Date();
		const hier = new Date();
		hier.setDate(auj.getDate() - 1);
		if (d.toDateString() === auj.toDateString()) return "Aujourd'hui";
		if (d.toDateString() === hier.toDateString()) return 'Hier';
		return date(iso);
	}

	function heure(iso: string): string {
		return new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
	}

	const groupes = $derived.by(() => {
		const sortie: { jour: string; messages: MessageFil[] }[] = [];
		for (const m of messages) {
			const j = jour(m.date_message);
			const dernier = sortie.at(-1);
			if (dernier && dernier.jour === j) dernier.messages.push(m);
			else sortie.push({ jour: j, messages: [m] });
		}
		return sortie;
	});

	/** Un message est « à moi » s'il a été écrit par la personne qui lit le fil. */
	const estAMoi = (m: MessageFil) => (perspective === 'frangine' ? m.de_la_frangine : !m.de_la_frangine);

	// Défile jusqu'au dernier message à l'ouverture et à chaque nouveau message
	$effect(() => {
		void messages.length;
		tick().then(() => {
			if (zone) zone.scrollTop = zone.scrollHeight;
		});
	});
</script>

{#if messages.length}
	<!-- Zone défilante : focusable pour être parcourue au clavier (WCAG 2.1.1) -->
	<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
	<div
		bind:this={zone}
		class="max-h-[65vh] min-h-64 space-y-6 overflow-y-auto rounded-carte bg-sable/60 p-3 sm:p-5"
		role="log"
		aria-label="Conversation"
		aria-live="polite"
		tabindex="0"
	>
		{#each groupes as g (g.jour)}
			<section aria-label={g.jour} class="space-y-3">
				<p class="flex justify-center">
					<span class="rounded-full bg-white px-3 py-1 text-xs font-semibold text-ardoise shadow-douce">{g.jour}</span>
				</p>
				<ul class="space-y-3">
					{#each g.messages as m (m.id)}
						{@const moi = estAMoi(m)}
						<li class="flex {moi ? 'justify-end' : 'justify-start'}">
							<div
								class="max-w-[85%] rounded-2xl px-4 py-2.5 shadow-douce sm:max-w-[75%] {moi
									? 'rounded-br-md bg-fleuve-700 text-white'
									: 'rounded-bl-md bg-white text-encre ring-1 ring-fleuve-900/5'}"
							>
								<p class="text-xs font-semibold {moi ? 'text-fleuve-100' : 'text-fleuve-700'}">
									{#if m.de_la_frangine}
										{perspective === 'frangine' ? (m.auteur ? `${m.auteur.pseudonyme} (la frangine)` : 'La frangine') : 'Votre frangine'}
									{:else}
										{perspective === 'membre' ? 'Vous' : nomMembre}
									{/if}
									{#if !moi && !m.lu}
										<span class="ml-1 rounded-full bg-soleil-300 px-2 py-0.5 text-[11px] font-bold text-encre">Nouveau</span>
									{/if}
								</p>
								<p class="mt-0.5 break-words whitespace-pre-line">{m.texte}</p>
								<p class="mt-1 text-right text-[12px] {moi ? 'text-fleuve-100' : 'text-ardoise'}">
									<time datetime={m.date_message}>{heure(m.date_message)}</time>
								</p>
							</div>
						</li>
					{/each}
				</ul>
			</section>
		{/each}
	</div>
{:else}
	{@render vide?.()}
{/if}

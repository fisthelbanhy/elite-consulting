<script lang="ts">
	/**
	 * Fil « Écrire à la frangine » d'une rubrique (E-TRV-11, F-S7-37 à F-S7-40).
	 * Membre : ses messages (à droite) et les réponses de la frangine (à gauche).
	 * Gestionnaire : liste des conversations, fil d'un membre et réponse adressée à CE membre.
	 * Données : `chargerDialogue()` ; action : `?/dialogue` (`actionDialogue`).
	 */
	import { page } from '$app/state';
	import MessagesSquare from '@lucide/svelte/icons/messages-square';
	import Send from '@lucide/svelte/icons/send';
	import Search from '@lucide/svelte/icons/search';
	import Lock from '@lucide/svelte/icons/lock';
	import CornerDownRight from '@lucide/svelte/icons/corner-down-right';
	import Formulaire from '$lib/components/ui/Formulaire.svelte';
	import Zone from '$lib/components/ui/Zone.svelte';
	import Bouton from '$lib/components/ui/Bouton.svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
	import Alerte from '$lib/components/ui/Alerte.svelte';
	import { champ } from '$lib/forms';
	import { dateHeure, relatif, tronquer } from '$lib/format';
	import type { DonneesDialogue } from '$lib/types/dialogues';

	let {
		dialogue,
		form,
		sujet = 'cette rubrique'
	}: {
		dialogue: DonneesDialogue | null;
		form?: Record<string, unknown> | null;
		/** Complète « Une question sur … ? » */
		sujet?: string;
	} = $props();

	const f = $derived(form as { cle?: string; valeurs?: Record<string, unknown>; champs?: Record<string, string>; succes?: string } | null);

	function lien(params: Record<string, string | number | null>, ancre = 'dialogue') {
		const u = new URL(page.url);
		for (const [k, v] of Object.entries(params)) {
			if (v === null || v === '') u.searchParams.delete(k);
			else u.searchParams.set(k, String(v));
		}
		u.searchParams.delete('page');
		return `${u.pathname}${u.search}#${ancre}`;
	}

	const interlocuteur = $derived(
		dialogue?.fil ? (dialogue.conversations.find((c) => c.membre.id === dialogue.fil)?.membre ?? null) : null
	);
	const autresParams = $derived([...page.url.searchParams].filter(([k]) => k !== 'dq' && k !== 'page'));
</script>

<section id="dialogue" class="carte scroll-mt-24 p-5 sm:p-6" aria-labelledby="titre-dialogue">
	<div class="flex items-start gap-3">
		<span class="grid size-11 shrink-0 place-items-center rounded-full bg-foret-50 text-foret-700">
			<MessagesSquare class="size-6" aria-hidden="true" />
		</span>
		<div>
			<h2 id="titre-dialogue" class="text-xl font-bold">Écrire à la frangine</h2>
			<p class="text-[15px] text-ardoise">
				Une question sur {sujet} ? Un conseiller vous répond ici, en général sous 24 h ouvrées. Vos échanges restent privés.
			</p>
		</div>
	</div>

	{#if !dialogue}
		<p class="mt-4 flex items-center gap-2 text-ardoise">
			<Lock class="size-4" aria-hidden="true" /><a href="/connexion?suite={encodeURIComponent(page.url.pathname)}" class="lien">Connectez-vous</a> pour écrire à la frangine.
		</p>
	{:else}
		<div class="mt-5 grid gap-5 {dialogue.gestionnaire ? 'lg:grid-cols-[17rem_1fr]' : ''}">
			{#if dialogue.gestionnaire}
				<nav aria-label="Conversations" class="space-y-2">
					<p class="text-sm font-semibold text-ardoise">Conversations ({dialogue.conversations.length})</p>
					<a
						href={lien({ fil: null })}
						aria-current={!dialogue.fil ? 'true' : undefined}
						class="block rounded-xl px-3 py-2.5 text-[15px] font-semibold {!dialogue.fil ? 'bg-fleuve-50 text-fleuve-800' : 'text-fleuve-700 hover:bg-fleuve-50'}"
						>Tous les messages</a
					>
					<ul class="max-h-96 space-y-1 overflow-y-auto">
						{#each dialogue.conversations as c (c.membre.id)}
							<li>
								<a
									href={lien({ fil: c.membre.id })}
									aria-current={dialogue.fil === c.membre.id ? 'true' : undefined}
									class="block rounded-xl px-3 py-2.5 {dialogue.fil === c.membre.id ? 'bg-fleuve-50' : 'hover:bg-fleuve-50'}"
								>
									<span class="flex items-center justify-between gap-2">
										<span class="truncate font-semibold text-fleuve-800">{c.membre.pseudonyme}</span>
										{#if c.en_attente}<Badge ton="laterite">À répondre</Badge>{/if}
									</span>
									<span class="block truncate text-sm text-ardoise">{tronquer(c.dernier_message, 60)}</span>
									<span class="block text-xs text-ardoise">{relatif(c.date_dernier)}</span>
								</a>
							</li>
						{:else}
							<li class="px-3 text-sm text-ardoise">Aucune conversation dans cette rubrique.</li>
						{/each}
					</ul>
				</nav>
			{/if}

			<div class="min-w-0 space-y-4">
				<form method="GET" class="flex gap-2" data-sveltekit-keepfocus data-sveltekit-noscroll>
					{#each autresParams as [k, v] (k)}<input type="hidden" name={k} value={v} />{/each}
					<label for="dq-{dialogue.type}" class="sr-only">Rechercher dans les messages</label>
					<div class="relative flex-1">
						<Search class="pointer-events-none absolute top-1/2 left-3 size-5 -translate-y-1/2 text-ardoise" aria-hidden="true" />
						<input id="dq-{dialogue.type}" name="dq" type="search" value={dialogue.recherche} placeholder="Rechercher un message" class="pl-10" />
					</div>
					<Bouton type="submit" variante="secondaire">OK</Bouton>
				</form>

				{#if dialogue.messages.items.length}
					{#if dialogue.messages.total > dialogue.messages.items.length}
						<p class="text-center text-sm text-ardoise">Les {dialogue.messages.items.length} messages les plus récents sont affichés.</p>
					{/if}
					<ol class="space-y-3" aria-label="Messages">
						{#each dialogue.messages.items as m (m.id)}
							{@const aDroite = m.de_moi}
							<li class="flex {aDroite ? 'justify-end' : 'justify-start'}">
								<div
									class="max-w-[85%] rounded-2xl px-4 py-3 {aDroite
										? 'rounded-br-md bg-fleuve-700 text-white'
										: m.de_la_frangine
											? 'rounded-bl-md bg-foret-50 text-encre ring-1 ring-foret-100'
											: 'rounded-bl-md bg-sable text-encre'}"
								>
									<p class="mb-1 text-xs font-semibold {aDroite ? 'text-fleuve-100' : 'text-ardoise'}">
										{#if dialogue.gestionnaire}
											{m.auteur?.pseudonyme ?? 'Membre'}{#if m.destinataire}&nbsp;→ {m.destinataire.pseudonyme}{:else}&nbsp;→ la frangine{/if}
										{:else}
											{m.de_moi ? 'Vous' : 'La frangine'}
										{/if}
									</p>
									<p class="whitespace-pre-line">{m.texte}</p>
									<p class="mt-1 flex items-center justify-between gap-3 text-xs {aDroite ? 'text-fleuve-100' : 'text-ardoise'}">
										<time datetime={m.date_message ?? undefined}>{dateHeure(m.date_message)}</time>
										{#if dialogue.gestionnaire && m.a_la_frangine && m.auteur && dialogue.fil !== m.auteur.id}
											<a href={lien({ fil: m.auteur.id }, 'dialogue-reponse')} class="inline-flex items-center gap-1 font-semibold underline">
												<CornerDownRight class="size-3.5" aria-hidden="true" />Répondre
											</a>
										{/if}
									</p>
								</div>
							</li>
						{/each}
					</ol>
				{:else}
					<p class="rounded-xl bg-creme p-4 text-center text-ardoise">
						{dialogue.recherche ? 'Aucun message ne correspond à votre recherche.' : 'Aucun message pour l’instant. Posez votre question : on vous répond ici.'}
					</p>
				{/if}

				<div id="dialogue-reponse" class="scroll-mt-24">
					{#if dialogue.gestionnaire && !interlocuteur}
						<Alerte type="info" titre="Choisissez une conversation pour répondre.">La réponse sera adressée au membre concerné, et lui seul la verra.</Alerte>
					{:else}
						<Formulaire action="?/dialogue" {form} cle="dialogue" reinitialiser>
							{#snippet children({ envoi })}
								<input type="hidden" name="type_dialogue" value={dialogue.type} />
								{#if interlocuteur}<input type="hidden" name="destinataire_id" value={interlocuteur.id} />{/if}
								<Zone
									label={interlocuteur ? `Votre réponse à ${interlocuteur.pseudonyme}` : 'Votre message'}
									lignes={3}
									requis
									minlength={2}
									maxlength={2000}
									{...champ(f?.succes ? null : f, 'texte', '', 'dialogue')}
								/>
								<div class="mt-3 flex justify-end">
									<Bouton type="submit" variante="fleuve" chargement={envoi}><Send class="size-4" aria-hidden="true" />Envoyer</Bouton>
								</div>
							{/snippet}
						</Formulaire>
					{/if}
				</div>
			</div>
		</div>
	{/if}
</section>

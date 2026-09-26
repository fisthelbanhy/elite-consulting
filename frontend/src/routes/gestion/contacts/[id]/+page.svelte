<script lang="ts">
	import ArrowLeft from '@lucide/svelte/icons/arrow-left';
	import Mail from '@lucide/svelte/icons/mail';
	import Phone from '@lucide/svelte/icons/phone';
	import MessageCircle from '@lucide/svelte/icons/message-circle';
	import MessagesSquare from '@lucide/svelte/icons/messages-square';
	import Send from '@lucide/svelte/icons/send';
	import Formulaire from '$lib/components/ui/Formulaire.svelte';
	import Zone from '$lib/components/ui/Zone.svelte';
	import Bouton from '$lib/components/ui/Bouton.svelte';
	import BadgeEtat from '$lib/components/ui/BadgeEtat.svelte';
	import { champ } from '$lib/forms';
	import { dateHeure, lienTel, lienWhatsApp, telephone } from '$lib/format';
	import { ETATS_CONTACT } from '$lib/types/contact';

	let { data, form } = $props();
	const c = $derived(data.contact);
	const estMembre = $derived(!!c.membre && c.membre.type_compte !== 1);
</script>

<svelte:head>
	<title>{c.objet} — Messages de contact — {data.parametres.nom_site}</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<div class="conteneur max-w-5xl space-y-6 py-6">
	<a href="/gestion/contacts" class="inline-flex min-h-11 items-center gap-2 font-semibold text-fleuve-700 hover:underline">
		<ArrowLeft class="size-5" aria-hidden="true" />Tous les messages
	</a>

	<div class="grid gap-6 lg:grid-cols-[1fr_20rem]">
		<div class="min-w-0 space-y-6">
			<article class="carte space-y-4 p-5 sm:p-6">
				<div class="flex flex-wrap items-center gap-2">
					<BadgeEtat etat={c.etat} libelles={ETATS_CONTACT} />
					<span class="text-sm text-ardoise">Reçu le <time datetime={c.date_envoi}>{dateHeure(c.date_envoi)}</time></span>
				</div>
				<h1 class="text-2xl font-bold break-words">{c.objet}</h1>
				<p class="break-words whitespace-pre-line">{c.texte}</p>
			</article>

			<section class="carte space-y-4 p-5 sm:p-6" aria-labelledby="titre-reponse">
				<h2 id="titre-reponse" class="text-xl font-bold">Réponse</h2>
				{#if c.repondu}
					<div class="rounded-xl bg-foret-50 p-4 ring-1 ring-foret-100">
						<p class="text-sm font-semibold text-foret-700">Réponse envoyée{#if c.date_reponse} le {dateHeure(c.date_reponse)}{/if}</p>
						<p class="mt-1 break-words whitespace-pre-line">{c.reponse}</p>
					</div>
				{/if}
				<Formulaire action="?/repondre" {form} cle="reponse" reinitialiser>
					{#snippet children({ envoi })}
						<Zone
							label={c.repondu ? 'Compléter ou corriger la réponse' : 'Votre réponse'}
							requis
							lignes={7}
							maxlength={5000}
							aide={c.email
								? `Elle est enregistrée, puis envoyée par e-mail à ${c.email}. Pas besoin de formule d'appel : « Bonjour ${c.nom} » est ajouté automatiquement.`
								: estMembre
									? "Pas d'e-mail : le membre la lira dans son espace et en est prévenu dans sa messagerie."
									: "Pas d'e-mail : la réponse est seulement enregistrée. Pensez à rappeler l'expéditeur."}
							{...champ(form, 'reponse', '', 'reponse')}
						/>
						<Bouton type="submit" class="mt-4" chargement={envoi}>
							<Send class="size-5" aria-hidden="true" />{c.email ? 'Enregistrer et envoyer par e-mail' : 'Enregistrer la réponse'}
						</Bouton>
					{/snippet}
				</Formulaire>
			</section>
		</div>

		<aside class="space-y-5">
			<section class="carte space-y-3 p-5" aria-labelledby="titre-expediteur">
				<h2 id="titre-expediteur" class="text-lg font-bold">Expéditeur</h2>
				<p class="font-semibold">{c.nom}</p>
				<p class="text-sm text-ardoise">{estMembre ? `Membre ${c.membre?.pseudonyme}` : 'Visiteur (sans compte)'}</p>
				<ul class="space-y-2 text-[15px]">
					{#if c.email}
						<li class="flex items-center gap-2"><Mail class="size-4 shrink-0 text-fleuve-600" aria-hidden="true" /><a href="mailto:{c.email}" class="lien break-all">{c.email}</a></li>
					{/if}
					{#if c.telephone}
						<li class="flex items-center gap-2"><Phone class="size-4 shrink-0 text-fleuve-600" aria-hidden="true" /><a href={lienTel(c.telephone)} class="lien">{telephone(c.telephone)}</a></li>
						<li class="flex items-center gap-2">
							<MessageCircle class="size-4 shrink-0 text-foret-600" aria-hidden="true" />
							<a href={lienWhatsApp(c.telephone, `Bonjour ${c.nom}, c'est La Frangine au sujet de votre message « ${c.objet} ».`)} target="_blank" rel="noopener" class="font-semibold text-foret-700">Répondre sur WhatsApp</a>
						</li>
					{/if}
				</ul>
				{#if estMembre && c.membre}
					<Bouton href="/gestion/messages/{c.membre.id}" variante="secondaire" pleineLargeur taille="sm">
						<MessagesSquare class="size-4" aria-hidden="true" />Sa messagerie privée
					</Bouton>
				{/if}
			</section>

			<section class="carte p-5" aria-labelledby="titre-suivi">
				<h2 id="titre-suivi" class="mb-3 text-lg font-bold">Suivi</h2>
				<Formulaire action="?/etat" {form} cle="etat">
					{#snippet children({ envoi })}
						<label for="etat" class="mb-1.5 block text-[15px] font-semibold">État du message</label>
						<div class="flex gap-2">
							<select id="etat" name="etat" class="flex-1">
								{#each Object.entries(ETATS_CONTACT) as [v, l] (v)}<option value={v} selected={Number(v) === c.etat}>{l}</option>{/each}
							</select>
							<Bouton type="submit" variante="fleuve" chargement={envoi}>OK</Bouton>
						</div>
					{/snippet}
				</Formulaire>
			</section>
		</aside>
	</div>
</div>

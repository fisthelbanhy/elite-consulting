<script lang="ts">
	import { onMount } from 'svelte';
	import MessageCircle from '@lucide/svelte/icons/message-circle';
	import Phone from '@lucide/svelte/icons/phone';
	import Mail from '@lucide/svelte/icons/mail';
	import MapPin from '@lucide/svelte/icons/map-pin';
	import MessagesSquare from '@lucide/svelte/icons/messages-square';
	import ShieldAlert from '@lucide/svelte/icons/shield-alert';
	import Send from '@lucide/svelte/icons/send';
	import EnTetePage from '$lib/components/ui/EnTetePage.svelte';
	import Formulaire from '$lib/components/ui/Formulaire.svelte';
	import Saisie from '$lib/components/ui/Saisie.svelte';
	import Zone from '$lib/components/ui/Zone.svelte';
	import Bouton from '$lib/components/ui/Bouton.svelte';
	import Alerte from '$lib/components/ui/Alerte.svelte';
	import Pagination from '$lib/components/ui/Pagination.svelte';
	import CarteContact from '$lib/components/contact/CarteContact.svelte';
	import { champ } from '$lib/forms';
	import { lienTel, lienWhatsApp, telephone } from '$lib/format';

	let { data, form } = $props();
	const membre = $derived(data.membre);
	const p = $derived(data.parametres);

	let debut = $state(0);
	onMount(() => (debut = Date.now()));
</script>

<svelte:head>
	<title>Contact — {p.nom_site}</title>
	<meta
		name="description"
		content="Écrivez à La Frangine, à Brazzaville : une question sur la Likelemba, un projet, un partenariat ou un souci sur le site ? Une vraie personne vous répond."
	/>
</svelte:head>

<EnTetePage
	titre="Écrire à votre frangine"
	surtitre="Contact"
	sousTitre="Une question, une idée de partenariat, un souci sur le site ? Écrivez-nous : une vraie personne vous lit et vous répond."
	fil={[{ href: '/contact', label: 'Contact' }]}
/>

<div class="conteneur grid gap-8 py-8 lg:grid-cols-[1fr_21rem]">
	<div class="min-w-0 space-y-10">
		{#if membre?.est_gestionnaire}
			<Alerte type="info" titre="Vous êtes gestionnaire.">
				Les messages reçus se traitent dans <a href="/gestion/contacts" class="lien">Gestion › Messages de contact</a>.
			</Alerte>
		{/if}

		<section class="carte p-5 sm:p-8" aria-labelledby="titre-formulaire">
			<h2 id="titre-formulaire" class="mb-6 text-2xl font-bold">Votre message</h2>
			<Formulaire {form} reinitialiser>
				{#snippet children({ envoi })}
					<input type="hidden" name="debut_saisie" value={debut || ''} />
					<!-- Champ piège anti-robot (ADR-0005) : invisible pour les humains -->
					<div class="absolute -left-[9999px]" aria-hidden="true">
						<label>Site web <input type="text" name="site_web" tabindex="-1" autocomplete="off" /></label>
					</div>

					<div class="space-y-5">
						{#if membre}
							<div class="grid gap-5 sm:grid-cols-2">
								<Saisie label="Nom et prénom" name="nom" value={membre.nom} readonly aide="Repris de votre profil." />
								{#if membre.email}
									<Saisie label="E-mail" name="email" type="email" value={membre.email} readonly aide="La réponse partira à cette adresse." />
								{:else}
									<Saisie
										label="E-mail (facultatif)"
										type="email"
										autocomplete="email"
										aide="Sans e-mail, retrouvez la réponse ici, dans « Mes messages »."
										{...champ(form, 'email')}
									/>
								{/if}
							</div>
							<Saisie
								label="Téléphone pour vous rappeler (facultatif)"
								type="tel"
								inputmode="tel"
								prefixe="+242"
								autocomplete="tel-national"
								{...champ(form, 'telephone', membre.telephone)}
							/>
						{:else}
							<div class="grid gap-5 sm:grid-cols-2">
								<Saisie label="Nom et prénom" requis autocomplete="name" minlength={5} maxlength={120} {...champ(form, 'nom')} />
								<Saisie
									label="E-mail"
									type="email"
									requis
									autocomplete="email"
									aide="Nous vous répondrons à cette adresse."
									{...champ(form, 'email')}
								/>
							</div>
							<Saisie
								label="Téléphone (facultatif)"
								type="tel"
								inputmode="tel"
								prefixe="+242"
								autocomplete="tel-national"
								aide="Pratique si vous préférez qu'on vous rappelle."
								{...champ(form, 'telephone')}
							/>
						{/if}
						<Saisie label="Objet" requis minlength={5} maxlength={120} placeholder="Ex. Question sur la Likelemba" {...champ(form, 'objet', data.objet)} />
						<Zone label="Votre message" requis lignes={6} minlength={10} maxlength={5000} {...champ(form, 'texte')} />

						<div class="flex flex-wrap items-center gap-4">
							<Bouton type="submit" taille="lg" chargement={envoi}><Send class="size-5" aria-hidden="true" />Envoyer mon message</Bouton>
						</div>
						<p class="text-sm text-ardoise">
							Vos coordonnées servent uniquement à vous répondre. <a href="/confidentialite" class="lien">Vos données et vos droits</a>
						</p>
					</div>
				{/snippet}
			</Formulaire>
		</section>

		{#if data.mesMessages}
			<section aria-labelledby="titre-mes-messages" class="space-y-4">
				<div>
					<h2 id="titre-mes-messages" class="text-2xl font-bold">Mes messages</h2>
					<p class="text-ardoise">Les messages que vous nous avez envoyés et nos réponses.</p>
				</div>
				{#if data.mesMessages.items.length}
					<ul class="space-y-3">
						{#each data.mesMessages.items as c, i (c.id)}
							<li><CarteContact message={c} ouvert={i === 0 && data.mesMessages.page === 1} /></li>
						{/each}
					</ul>
					<Pagination total={data.mesMessages.total} page={data.mesMessages.page} taille={data.mesMessages.taille} />
				{:else}
					<p class="carte p-5 text-ardoise">Vous ne nous avez pas encore écrit par ce formulaire.</p>
				{/if}
			</section>
		{/if}
	</div>

	<aside class="space-y-5" aria-label="Autres moyens de nous joindre">
		{#if p.whatsapp}
			<section class="carte space-y-3 p-5">
				<h2 class="text-lg font-bold">Le plus rapide : WhatsApp</h2>
				<p class="text-[15px] text-ardoise">Une conseillère vous répond directement sur votre téléphone.</p>
				<Bouton href={lienWhatsApp(p.whatsapp, "Bonjour la Frangine, j'ai une question.")} variante="whatsapp" target="_blank" rel="noopener" pleineLargeur>
					<MessageCircle class="size-5" aria-hidden="true" />Écrire sur WhatsApp
				</Bouton>
			</section>
		{/if}

		<section class="carte space-y-3 p-5">
			<h2 class="text-lg font-bold">Nos coordonnées</h2>
			<address class="space-y-2.5 text-[15px] not-italic">
				{#if p.telephone_1}
					<p class="flex items-center gap-2"><Phone class="size-4 shrink-0 text-fleuve-600" aria-hidden="true" /><a href={lienTel(p.telephone_1)} class="lien">{telephone(p.telephone_1)}</a></p>
				{/if}
				{#if p.telephone_2}
					<p class="flex items-center gap-2"><Phone class="size-4 shrink-0 text-fleuve-600" aria-hidden="true" /><a href={lienTel(p.telephone_2)} class="lien">{telephone(p.telephone_2)}</a></p>
				{/if}
				{#if p.email}
					<p class="flex items-center gap-2"><Mail class="size-4 shrink-0 text-fleuve-600" aria-hidden="true" /><a href="mailto:{p.email}" class="lien break-all">{p.email}</a></p>
				{/if}
				{#if p.adresse}
					<p class="flex items-start gap-2"><MapPin class="mt-1 size-4 shrink-0 text-fleuve-600" aria-hidden="true" />{p.adresse}</p>
				{/if}
			</address>
		</section>

		{#if membre && !membre.est_gestionnaire}
			<section class="carte space-y-3 p-5">
				<h2 class="flex items-center gap-2 text-lg font-bold"><MessagesSquare class="size-5 text-fleuve-600" aria-hidden="true" />Déjà membre ?</h2>
				<p class="text-[15px] text-ardoise">Pour un suivi personnel, écrivez à votre frangine dans votre messagerie privée.</p>
				<Bouton href="/espace/messages" variante="secondaire" pleineLargeur>Ouvrir ma messagerie</Bouton>
			</section>
		{/if}

		<section class="rounded-carte bg-soleil-100 p-5 text-[15px]">
			<h2 class="flex items-center gap-2 text-lg font-bold"><ShieldAlert class="size-5 text-laterite-700" aria-hidden="true" />Une arnaque ?</h2>
			<p class="mt-2">
				{p.nom_site} ne vous demandera jamais votre code Mobile Money ni de l'argent pour un emploi.
				<a href="/contact?objet={encodeURIComponent('Signalement d’une arnaque')}" class="lien" data-sveltekit-noscroll>Signalez-le-nous</a>.
			</p>
		</section>
	</aside>
</div>

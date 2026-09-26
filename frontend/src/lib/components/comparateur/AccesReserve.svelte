<script lang="ts">
	/** Comparateur réservé aux comptes entreprise (F-S6-14, ADR-0007 S6a) : message legacy exact,
	 * puis l'action qui débloque l'accès selon la situation du visiteur. */
	import { page } from '$app/state';
	import Lock from '@lucide/svelte/icons/lock';
	import CircleCheck from '@lucide/svelte/icons/circle-check';
	import MessageCircle from '@lucide/svelte/icons/message-circle';
	import Bouton from '$lib/components/ui/Bouton.svelte';
	import { lienWhatsApp } from '$lib/format';
	import type { Acces } from '$lib/types/comparateur';

	let { acces }: { acces: Acces } = $props();
	const wa = $derived(page.data.parametres?.whatsapp as string | undefined);
	const suite = encodeURIComponent('/comparateur-prix');
	const avantages = [
		'Comparez les prix pratiqués par les autres entreprises, produit par produit',
		'Publiez ce que vous vendez (offres) et ce que vous achetez (demandes)',
		'Contactez directement fournisseurs et clients, par e-mail ou WhatsApp'
	];
</script>

<section class="carte overflow-hidden">
	<div class="grid gap-8 p-6 sm:p-8 lg:grid-cols-[1.2fr_1fr]">
		<div>
			<p class="inline-flex items-center gap-2 rounded-full bg-soleil-100 px-3 py-1 text-sm font-semibold text-encre">
				<Lock class="size-4" aria-hidden="true" />Réservé aux entreprises
			</p>
			<h2 class="mt-4 text-2xl font-bold">{acces.message ?? 'Il faut avoir un compte entreprise pour y avoir accès.'}</h2>
			{#if acces.motif === 'personne_physique'}
				<p class="mt-3 text-ardoise">
					Votre compte est un compte personnel. Le comparateur est ouvert aux comptes « personne morale » ayant inscrit leur entreprise
					dans l'annuaire : votre frangine peut faire évoluer votre compte.
				</p>
			{:else if acces.motif === 'sans_entreprise'}
				<p class="mt-3 text-ardoise">Il ne vous reste qu'une étape : inscrire votre entreprise dans l'annuaire. C'est gratuit et rapide.</p>
			{:else}
				<p class="mt-3 text-ardoise">Créez gratuitement le compte de votre entreprise, ou connectez-vous s'il existe déjà.</p>
			{/if}
			<div class="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
				{#if acces.motif === 'visiteur'}
					<Bouton href="/inscription?categorie=2&suite={encodeURIComponent('/entreprises/nouvelle')}">Créer mon compte entreprise</Bouton>
					<Bouton href="/connexion?suite={suite}" variante="secondaire">J'ai déjà un compte</Bouton>
				{:else if acces.motif === 'sans_entreprise'}
					<Bouton href="/entreprises/nouvelle">Inscrire mon entreprise</Bouton>
				{:else}
					{#if wa}
						<Bouton
							href={lienWhatsApp(wa, "Bonjour la Frangine, je souhaite passer mon compte en compte entreprise pour accéder au comparateur de prix.")}
							variante="whatsapp"
							target="_blank"
							rel="noopener"
						>
							<MessageCircle class="size-5" aria-hidden="true" />Demander un compte entreprise
						</Bouton>
					{/if}
					<Bouton href="/entreprises" variante="secondaire">Parcourir l'annuaire</Bouton>
				{/if}
			</div>
		</div>
		<div class="rounded-2xl bg-creme p-5">
			<h3 class="text-lg font-bold">Ce que vous y trouvez</h3>
			<ul class="mt-3 space-y-3 text-[15px]">
				{#each avantages as a (a)}
					<li class="flex gap-2"><CircleCheck class="mt-0.5 size-5 shrink-0 text-foret-600" aria-hidden="true" />{a}</li>
				{/each}
			</ul>
		</div>
	</div>
</section>

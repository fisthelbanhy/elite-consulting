<script lang="ts">
	import ArrowLeft from '@lucide/svelte/icons/arrow-left';
	import ArrowRight from '@lucide/svelte/icons/arrow-right';
	import Save from '@lucide/svelte/icons/save';
	import Send from '@lucide/svelte/icons/send';
	import EnTetePage from '$lib/components/ui/EnTetePage.svelte';
	import Formulaire from '$lib/components/ui/Formulaire.svelte';
	import Bouton from '$lib/components/ui/Bouton.svelte';
	import Alerte from '$lib/components/ui/Alerte.svelte';
	import Progression from '$lib/components/distributeur/Progression.svelte';
	import EtapeSimple from '$lib/components/distributeur/EtapeSimple.svelte';
	import EtapeProspects from '$lib/components/distributeur/EtapeProspects.svelte';
	import EtapeFormations from '$lib/components/distributeur/EtapeFormations.svelte';
	import EtapeFilleuls from '$lib/components/distributeur/EtapeFilleuls.svelte';
	import EtapeCommande from '$lib/components/distributeur/EtapeCommande.svelte';
	import EtapeFin from '$lib/components/distributeur/EtapeFin.svelte';
	import { ETAPES } from '$lib/components/distributeur/contenus';
	import { fcfa } from '$lib/format';

	let { data, form } = $props();
	const titre = $derived(data.gestionnaire ? '' : (ETAPES.find((e) => e.numero === data.etape)?.titre ?? ''));
	const s = $derived(data.gestionnaire ? null : data.souscription);
	const verrouillee = $derived(!!s && (s.etat === 2 || s.etat === 4));
</script>

<svelte:head>
	<title>Mon adhésion distributeur — {data.parametres.nom_site}</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<EnTetePage
	titre="Mon adhésion distributeur"
	sousTitre="Dix étapes pour préparer votre activité, à votre rythme : tout est sauvegardé au fur et à mesure."
	fil={[{ href: '/boutique', label: 'Bien-être' }, { href: '/devenir-distributeur', label: 'Devenir distributeur' }]}
/>

<div class="conteneur max-w-4xl space-y-6 py-8">
	{#if data.gestionnaire}
		<Alerte type="info" titre="L'adhésion distributeur est réservée aux membres.">
			En tant que gestionnaire, suivez les souscriptions depuis <a href="/devenir-distributeur/suivi" class="lien">l'écran de suivi</a>.
		</Alerte>
	{:else}
		<Progression etape={data.etape} atteinte={data.atteinte} />

		<section class="carte space-y-6 p-5 sm:p-8" aria-labelledby="titre-etape">
			<h2 id="titre-etape" class="text-2xl font-bold">{titre}</h2>

			{#if data.etape === 10 && s}
				<EtapeFin souscription={s} whatsapp={data.parametres.whatsapp} paye={data.paye} />
				<p><a href="?etape=9" class="lien">Revenir à la commande des produits</a></p>
			{:else if data.etape === 9 && verrouillee && s}
				<Alerte type="succes" titre="Votre souscription est validée : le kit ne peut plus être modifié.">
					Kit de <span class="montant">{fcfa(s.montant)}</span>, référence {s.reference}.
				</Alerte>
				<Bouton href="?etape=10" variante="secondaire">Voir ma souscription</Bouton>
			{:else}
				<Formulaire {form}>
					{#snippet children({ envoi })}
						<input type="hidden" name="etape" value={data.etape} />
						<div class="space-y-6">
							{#if data.etape === 4}
								<EtapeProspects souscription={s} {form} />
							{:else if data.etape === 5}
								<EtapeFormations souscription={s} {form} />
							{:else if data.etape === 8}
								<EtapeFilleuls souscription={s} {form} />
							{:else if data.etape === 9}
								<EtapeCommande souscription={s} kit={data.kit} {form} />
							{:else}
								<EtapeSimple etape={data.etape} souscription={s} {form} />
							{/if}
						</div>

						<!-- Le bouton « avancer » vient en premier dans le DOM : c'est lui que déclenche la touche Entrée -->
						<div class="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-fleuve-900/10 pt-6">
							{#if data.etape === 9}
								<div class="order-2 flex flex-wrap gap-3">
									<Bouton type="submit" name="nav" value="sauvegarder" variante="secondaire" chargement={envoi}>
										<Save class="size-5" aria-hidden="true" />Sauvegarder
									</Bouton>
									<Bouton type="submit" name="nav" value="envoyer" chargement={envoi}>
										<Send class="size-5" aria-hidden="true" />Envoyer ma souscription
									</Bouton>
								</div>
							{:else}
								<Bouton type="submit" name="nav" value="suivant" chargement={envoi} class="order-2">
									Suivant<ArrowRight class="size-5" aria-hidden="true" />
								</Bouton>
							{/if}
							{#if data.etape > 1}
								<Bouton type="submit" name="nav" value="precedent" variante="fantome" disabled={envoi} class="order-1">
									<ArrowLeft class="size-5" aria-hidden="true" />Précédent
								</Bouton>
							{:else}
								<span class="order-1"></span>
							{/if}
						</div>
					{/snippet}
				</Formulaire>
			{/if}
		</section>

		<p class="text-sm text-ardoise">
			Besoin d'aide ? Votre frangine et votre parrain vous accompagnent à chaque étape : <a href="/contact" class="lien">écrivez-nous</a>.
		</p>
	{/if}
</div>

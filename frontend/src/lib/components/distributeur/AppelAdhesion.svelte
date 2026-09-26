<script lang="ts">
	/** Appel à l'action adapté au statut du lecteur (visiteur, membre, adhésion en cours, distributeur). */
	import Bouton from '$lib/components/ui/Bouton.svelte';
	import type { Statut } from '$lib/types/distributeur';

	let { statut, clair = false }: { statut: Statut; clair?: boolean } = $props();
	const s = $derived(statut.souscription);
	const secondaire = $derived(clair ? 'clair' : 'secondaire');
</script>

<div class="flex flex-wrap gap-3">
	{#if !statut.connecte}
		<Bouton href="/inscription?suite=/devenir-distributeur/adhesion" taille="lg">Créer mon compte et commencer</Bouton>
		<Bouton href="/connexion?suite=/devenir-distributeur/adhesion" variante={secondaire} taille="lg">J'ai déjà un compte</Bouton>
	{:else if statut.gestionnaire}
		<Bouton href="/devenir-distributeur/suivi" taille="lg">Suivre les souscriptions</Bouton>
	{:else if statut.distributeur}
		<Bouton href="/boutique" taille="lg">Commander au prix distributeur</Bouton>
		<Bouton href="/devenir-distributeur/adhesion" variante={secondaire} taille="lg">Mon plan d'action</Bouton>
	{:else if s && s.envoyee && s.mode_souscription === 1}
		<Bouton href="/paiement/6?objet={s.id}" taille="lg">Régler mon kit de démarrage</Bouton>
	{:else if s && s.envoyee}
		<Bouton href="/devenir-distributeur/adhesion?etape=10" taille="lg">Suivre ma demande à crédit</Bouton>
	{:else if s}
		<Bouton href="/devenir-distributeur/adhesion" taille="lg">Reprendre mon adhésion (étape {s.etape_courante} sur 10)</Bouton>
	{:else}
		<Bouton href="/devenir-distributeur/adhesion" taille="lg">Commencer mon adhésion</Bouton>
	{/if}
</div>

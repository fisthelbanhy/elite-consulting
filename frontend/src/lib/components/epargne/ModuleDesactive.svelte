<script lang="ts">
	/** Page explicative quand l'épargne solidaire est désactivée (ADR-0009 : pas une erreur). */
	import PauseCircle from '@lucide/svelte/icons/circle-pause';
	import EtatVide from '$lib/components/ui/EtatVide.svelte';
	import Bouton from '$lib/components/ui/Bouton.svelte';

	let { message }: { message: string } = $props();
</script>

<EtatVide
	icone={PauseCircle}
	titre="L'épargne solidaire est en pause"
	texte={message || "Ce service est momentanément désactivé. Vos données sont conservées ; contactez la frangine pour toute question."}
	messageWhatsApp="Bonjour la Frangine, j'ai une question sur mon épargne solidaire."
>
	<Bouton href="/likelemba" variante="fleuve">Découvrir la Likelemba</Bouton>
</EtatVide>

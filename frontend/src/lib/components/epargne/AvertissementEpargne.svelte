<script lang="ts">
	/** Avertissements de l'épargne solidaire (ADR-0009) : fonds non détenus, jamais de PIN communiqué. */
	import ShieldAlert from '@lucide/svelte/icons/shield-alert';

	let { pin = true, class: classe = '' }: { pin?: boolean; class?: string } = $props();
</script>

<div class="flex gap-3 rounded-xl bg-soleil-100 p-4 text-[15px] {classe}" role="note">
	<ShieldAlert class="mt-0.5 size-5 shrink-0 text-laterite-700" aria-hidden="true" />
	<div class="space-y-1">
		<p>
			<strong>La Frangine ne détient pas vos fonds.</strong> Les dons, placements et pointages sont des engagements entre membres :
			La Frangine les enregistre, délivre une référence pour chaque opération et vous prévient à chaque mouvement.
		</p>
		{#if pin}
			<p><strong>Ne communiquez jamais votre code PIN.</strong> Nous ne vous le demanderons jamais, ni par téléphone ni par WhatsApp.</p>
		{/if}
	</div>
</div>

<script lang="ts">
	/** Avertissement réglementaire des appels de fonds (ADR-0009). */
	import ShieldAlert from '@lucide/svelte/icons/shield-alert';

	let { class: classe = '' }: { class?: string } = $props();
</script>

<div class="flex gap-3 rounded-xl bg-soleil-100 p-4 text-[15px] {classe}" role="note">
	<ShieldAlert class="mt-0.5 size-5 shrink-0 text-laterite-700" aria-hidden="true" />
	<p>
		<strong>Les promesses d'apport sont des engagements entre membres.</strong> La Frangine met en relation, suit les
		versements et délivre des références, mais ne garantit ni le projet ni le remboursement. Pour un crédit ou une prise de
		participation, faites-vous conseiller et formalisez l'accord par écrit.
	</p>
</div>

<script lang="ts">
	/** Avertissement obligatoire des fiches bien-être (ADR-0009). */
	import Stethoscope from '@lucide/svelte/icons/stethoscope';
</script>

<div class="flex gap-3 rounded-xl bg-soleil-100 p-4 text-[15px] ring-1 ring-soleil-300" role="note">
	<Stethoscope class="mt-0.5 size-5 shrink-0 text-laterite-700" aria-hidden="true" />
	<p>
		<strong>Informations fournies à titre indicatif, elles ne remplacent pas l'avis d'un professionnel de santé.</strong>
		Les produits présentés ne sont pas des médicaments. En cas de symptômes, de traitement en cours ou de grossesse,
		consultez un médecin ou un pharmacien.
	</p>
</div>

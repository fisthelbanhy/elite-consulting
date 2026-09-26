<script lang="ts">
	import ArrowLeft from '@lucide/svelte/icons/arrow-left';
	import Lock from '@lucide/svelte/icons/lock';
	import MessageCircle from '@lucide/svelte/icons/message-circle';
	import Jauge from '$lib/components/ui/Jauge.svelte';
	import EtapeQuestion from '$lib/components/diagnostic/EtapeQuestion.svelte';
	import { lienWhatsApp } from '$lib/format';

	let { data, form } = $props();
	const wa = $derived(data.parametres.whatsapp);
</script>

<svelte:head>
	<title>{data.etape === 1 ? 'Diagnostic gratuit en 3 minutes' : `Question ${data.etape} sur ${data.total} — Diagnostic gratuit`} — {data.parametres.nom_site}</title>
	{#if data.etape === 1}
		<meta
			name="description"
			content="Diagnostic gratuit pour entreprendre au Congo : 8 questions, 3 minutes, sans créer de compte. Recevez votre profil et vos 3 prochaines étapes, puis le plan d'action de votre conseillère."
		/>
	{:else}
		<meta name="robots" content="noindex" />
	{/if}
</svelte:head>

<div class="bg-white">
	<div class="conteneur max-w-2xl py-6 sm:py-10">
		<div class="mb-6">
			<p class="mb-2 flex items-center justify-between text-[15px] font-semibold text-ardoise">
				<span class="text-laterite-600">Diagnostic gratuit</span>
				<span aria-live="polite">Question {data.etape} sur {data.total}</span>
			</p>
			<Jauge valeur={data.etape - 1} max={data.total} couleur="laterite" label="Progression du diagnostic" />
		</div>

		{#if data.etape === 1}
			<p class="mb-6 rounded-2xl bg-creme p-4 text-[15px] text-ardoise">
				8 questions, 3 minutes, sans créer de compte. À la fin : votre profil et vos 3 prochaines étapes. Touchez simplement la
				réponse qui vous ressemble.
			</p>
		{/if}

		{#key data.question.cle}
			<EtapeQuestion question={data.question} etape={data.etape} reponse={data.reponse} {form} />
		{/key}

		<div class="mt-8 flex flex-wrap items-center justify-between gap-4">
			{#if data.etape > 1}
				<a href="/diagnostic?etape={data.etape - 1}" class="inline-flex min-h-12 items-center gap-2 rounded-xl px-3 font-semibold text-fleuve-700 hover:bg-fleuve-50">
					<ArrowLeft class="size-5" aria-hidden="true" />Question précédente
				</a>
			{:else}
				<span></span>
			{/if}
			{#if data.complet}
				<a href="/diagnostic/resultat" class="lien">Voir mon résultat</a>
			{/if}
		</div>
	</div>
</div>

<div class="conteneur max-w-2xl space-y-4 py-8 text-[15px] text-ardoise">
	<p class="flex items-start gap-2"><Lock class="mt-0.5 size-4 shrink-0 text-foret-600" aria-hidden="true" />Vos réponses restent confidentielles : elles ne sont partagées qu'avec votre conseillère, et seulement si vous le souhaitez.</p>
	{#if wa}
		<p class="flex items-start gap-2">
			<MessageCircle class="mt-0.5 size-4 shrink-0 text-foret-600" aria-hidden="true" />
			<span>Vous préférez en parler ? <a href={lienWhatsApp(wa, "Bonjour la Frangine, je voudrais faire le point sur mon projet avec une conseillère.")} target="_blank" rel="noopener" class="lien">Écrire à une conseillère sur WhatsApp</a></span>
		</p>
	{/if}
</div>

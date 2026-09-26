<script lang="ts">
	/** Contributions reçues sous une fiche : visibles de l'auteur et des gestionnaires (ADR-0007 S2d). */
	import MessageCircle from '@lucide/svelte/icons/message-circle';
	import Phone from '@lucide/svelte/icons/phone';
	import { dateHeure, lienTel, lienWhatsApp, telephone } from '$lib/format';
	import type { InteretRecu } from '$lib/types/immobilier';

	let { interets, titre, reference }: { interets: InteretRecu[]; titre: string; reference: string } = $props();
</script>

<section class="carte p-6">
	<h2 class="text-xl font-bold">{titre} ({interets.length})</h2>
	{#if interets.length}
		<ul class="mt-4 divide-y divide-fleuve-900/5">
			{#each interets as i (i.id)}
				<li class="py-4">
					<div class="flex flex-wrap items-center justify-between gap-2">
						<p class="font-semibold">{i.membre?.pseudonyme ?? 'Membre'} <span class="font-normal text-ardoise">· {i.membre?.nom}</span></p>
						<span class="text-sm text-ardoise">{dateHeure(i.date_creation)}</span>
					</div>
					{#if i.message}<p class="mt-1 text-[15px] whitespace-pre-line">{i.message}</p>{/if}
					{#if i.membre?.telephone}
						<p class="mt-2 flex flex-wrap gap-4 text-sm">
							<a href={lienTel(i.membre.telephone)} class="lien inline-flex items-center gap-1"><Phone class="size-4" aria-hidden="true" />{telephone(i.membre.telephone)}</a>
							<a
								href={lienWhatsApp(i.membre.telephone, `Bonjour, je vous contacte au sujet de l'annonce ${reference} sur La Frangine.`)}
								target="_blank"
								rel="noopener"
								class="inline-flex items-center gap-1 font-semibold text-foret-700"><MessageCircle class="size-4" aria-hidden="true" />WhatsApp</a
							>
							{#if i.membre.email}<a href="mailto:{i.membre.email}" class="lien">{i.membre.email}</a>{/if}
						</p>
					{/if}
				</li>
			{/each}
		</ul>
	{:else}
		<p class="mt-2 text-ardoise">Aucune réponse pour l'instant. Partagez votre annonce sur WhatsApp pour gagner en visibilité.</p>
	{/if}
</section>

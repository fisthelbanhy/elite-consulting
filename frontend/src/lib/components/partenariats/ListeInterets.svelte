<script lang="ts">
	/** Intéressements reçus : visibles de l'auteur et des gestionnaires seulement (ADR-0007 S2d). */
	import { dateHeure, lienTel, lienWhatsApp, telephone } from '$lib/format';
	import type { InteretPartenariat } from '$lib/types/partenariats';

	let { interets, reference }: { interets: InteretPartenariat[]; reference: string } = $props();
</script>

<section class="carte p-6" aria-labelledby="titre-interets">
	<h2 id="titre-interets" class="text-xl font-bold">Membres intéressés ({interets.length})</h2>
	{#if interets.length}
		<ul class="mt-4 divide-y divide-fleuve-900/5">
			{#each interets as i (i.id)}
				<li class="py-4">
					<div class="flex flex-wrap items-center justify-between gap-2">
						<p class="font-semibold">{i.membre?.pseudonyme ?? 'Membre'} <span class="font-normal text-ardoise">· {i.membre?.nom}</span></p>
						<span class="text-sm text-ardoise">{dateHeure(i.date_creation)}</span>
					</div>
					<p class="mt-1 text-[15px] whitespace-pre-line">{i.message}</p>
					{#if i.membre}
						<p class="mt-2 flex flex-wrap gap-4 text-sm">
							{#if i.membre.telephone}
								<a href={lienTel(i.membre.telephone)} class="lien">{telephone(i.membre.telephone)}</a>
								<a
									href={lienWhatsApp(i.membre.telephone, `Bonjour, je vous contacte au sujet de ma proposition ${reference} sur La Frangine.`)}
									target="_blank"
									rel="noopener"
									class="font-semibold text-foret-700">WhatsApp</a
								>
							{/if}
							{#if i.membre.email}<a href="mailto:{i.membre.email}" class="lien">{i.membre.email}</a>{/if}
						</p>
					{/if}
				</li>
			{/each}
		</ul>
	{:else}
		<p class="mt-2 text-ardoise">Aucun intéressement pour l'instant. Partagez votre proposition sur WhatsApp pour gagner en visibilité.</p>
	{/if}
</section>

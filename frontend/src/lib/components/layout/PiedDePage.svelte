<script lang="ts">
	import Logo from '$lib/components/Logo.svelte';
	import { PILIERS, liensVisibles } from '$lib/navigation';
	import { lienTel, lienWhatsApp, telephone } from '$lib/format';
	import type { Parametres } from '$lib/types';

	let { parametres }: { parametres: Parametres } = $props();
	const annee = new Date().getFullYear();
</script>

<footer class="mt-16 bg-fleuve-800 pb-24 text-fleuve-100 lg:pb-0">
	<div class="conteneur grid gap-10 py-12 md:grid-cols-2 lg:grid-cols-6">
		<div class="lg:col-span-2">
			<Logo clair />
			<p class="mt-4 max-w-xs text-[15px]">
				La grande sœur de ceux qui se lancent : un conseil humain, votre Likelemba bien organisée et les bonnes
				opportunités au bon moment.
			</p>
			<address class="mt-5 space-y-1.5 text-[15px] not-italic">
				<p>{parametres.adresse}</p>
				{#if parametres.telephone_1}
					<p>
						<a href={lienTel(parametres.telephone_1)} class="hover:text-white">{telephone(parametres.telephone_1)}</a>
						{#if parametres.telephone_2}· <a href={lienTel(parametres.telephone_2)} class="hover:text-white">{telephone(parametres.telephone_2)}</a>{/if}
					</p>
				{/if}
				{#if parametres.email}<p><a href="mailto:{parametres.email}" class="hover:text-white">{parametres.email}</a></p>{/if}
				{#if parametres.whatsapp}
					<p><a href={lienWhatsApp(parametres.whatsapp, 'Bonjour la Frangine !')} target="_blank" rel="noopener" class="font-semibold text-soleil-300 hover:text-white">Écrire sur WhatsApp</a></p>
				{/if}
			</address>
		</div>
		{#each PILIERS as p (p.id)}
			<nav aria-label={p.titre}>
				<h2 class="font-display text-base font-bold text-white">{p.titre}</h2>
				<ul class="mt-3 space-y-2 text-[15px]">
					{#each liensVisibles(p.liens, parametres) as l (l.href)}
						<li><a href={l.href} class="hover:text-white">{l.label}</a></li>
					{/each}
				</ul>
			</nav>
		{/each}
	</div>
	<div class="border-t border-white/10">
		<div class="conteneur flex flex-col gap-3 py-6 text-sm sm:flex-row sm:items-center sm:justify-between">
			<p>© 2016–{annee} {parametres.nom_site}. Une initiative Primera-C, Brazzaville.</p>
			<ul class="flex flex-wrap gap-x-5 gap-y-2">
				<li><a href="/aide" class="hover:text-white">Aide</a></li>
				<li><a href="/contact" class="hover:text-white">Contact</a></li>
				<li><a href="/suggestion" class="hover:text-white">Suggérer une idée</a></li>
				<li><a href="/publicites" class="hover:text-white">Annonceurs</a></li>
				<li><a href="/mentions-legales" class="hover:text-white">Mentions légales</a></li>
				<li><a href="/confidentialite" class="hover:text-white">Confidentialité</a></li>
				<li><a href="/conditions" class="hover:text-white">Conditions d'utilisation</a></li>
			</ul>
		</div>
	</div>
</footer>

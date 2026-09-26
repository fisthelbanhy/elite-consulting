<script lang="ts">
	/**
	 * Caisse : paiements déclarés par les membres, total de la sélection, confirmation ou rejet
	 * (ADR-0006, ADR-0007 S3b). Filtres dans l'URL, jour de fin inclus (correctif du legacy).
	 */
	import { enhance } from '$app/forms';
	import type { SubmitFunction } from '@sveltejs/kit';
	import Check from '@lucide/svelte/icons/check';
	import X from '@lucide/svelte/icons/x';
	import Wallet from '@lucide/svelte/icons/wallet';
	import Lock from '@lucide/svelte/icons/lock';
	import EnTeteGestion from '$lib/components/gestion/EnTeteGestion.svelte';
	import TaillePage from '$lib/components/gestion/TaillePage.svelte';
	import Bouton from '$lib/components/ui/Bouton.svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
	import Alerte from '$lib/components/ui/Alerte.svelte';
	import Pagination from '$lib/components/ui/Pagination.svelte';
	import EtatVide from '$lib/components/ui/EtatVide.svelte';
	import { dateHeure, fcfa, libelle, tronquer } from '$lib/format';

	let { data, form } = $props();
	const f = $derived(data.filtres);
	const opts = (nom: string) => data.enums[nom] ?? [];
	const tons = { 1: 'alerte', 2: 'soleil', 3: 'foret' } as const;
	let enCours = $state<number | null>(null);

	function confirmer(message: string): SubmitFunction {
		return ({ cancel, formData }) => {
			if (!confirm(message)) return cancel();
			enCours = Number(formData.get('id'));
			return async ({ update }) => {
				await update();
				enCours = null;
			};
		};
	}
</script>

<svelte:head>
	<title>Paiements — Gestion — {data.parametres.nom_site}</title>
</svelte:head>

<EnTeteGestion titre="Paiements" sousTitre="Confirmez les paiements après vérification (espèces, Charden Farell, Mobile Money)." fil={[{ href: '/gestion/paiements', label: 'Paiements' }]} />

<div class="mx-auto max-w-7xl space-y-5 px-4 py-6 sm:px-6">
	{#if !data.caisse || !data.liste}
		<EtatVide icone={Lock} titre="Réservé au droit « Caisse »" texte="Demandez à un gestionnaire ayant le droit d'attribution de vous donner le droit Caisse pour confirmer les paiements." />
	{:else}
		{#if form?.message && !form?.succes}<Alerte type="erreur" titre={form.message} />{/if}
		{#if form?.succes}<Alerte type="succes" titre={form.succes} />{/if}

		<form method="GET" class="carte grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8 xl:items-end" data-sveltekit-keepfocus>
			<input type="hidden" name="taille" value={data.taille} />
			<div>
				<label for="etat" class="mb-1 block text-sm font-semibold">État</label>
				<select id="etat" name="etat" class="py-2">
					<option value="">Tous</option>
					{#each opts('EtatPaiement') as o (o.value)}<option value={String(o.value)} selected={f.etat === String(o.value)}>{o.label}</option>{/each}
				</select>
			</div>
			<div>
				<label for="type_objet" class="mb-1 block text-sm font-semibold">Opération</label>
				<select id="type_objet" name="type_objet" class="py-2">
					<option value="">Toutes</option>
					{#each opts('TypeObjetPaye') as o (o.value)}<option value={String(o.value)} selected={f.type_objet === String(o.value)}>{o.label}</option>{/each}
				</select>
			</div>
			<div>
				<label for="mode" class="mb-1 block text-sm font-semibold">Mode</label>
				<select id="mode" name="mode" class="py-2">
					<option value="">Tous</option>
					{#each opts('ModePaiement') as o (o.value)}<option value={String(o.value)} selected={f.mode === String(o.value)}>{o.label}</option>{/each}
				</select>
			</div>
			<div class="xl:col-span-2">
				<label for="membre_id" class="mb-1 block text-sm font-semibold">Membre</label>
				<select id="membre_id" name="membre_id" class="py-2">
					<option value="">Tous</option>
					{#each data.membres as o (o.value)}<option value={String(o.value)} selected={f.membre_id === String(o.value)}>{o.label}</option>{/each}
				</select>
			</div>
			<div>
				<label for="du" class="mb-1 block text-sm font-semibold">Du</label>
				<input id="du" name="du" type="date" value={f.du} class="py-2" />
			</div>
			<div>
				<label for="au" class="mb-1 block text-sm font-semibold">Au</label>
				<input id="au" name="au" type="date" value={f.au} class="py-2" />
			</div>
			<div>
				<label for="montant_max" class="mb-1 block text-sm font-semibold">Montant max.</label>
				<input id="montant_max" name="montant_max" type="number" min="0" value={f.montant_max} class="py-2" />
			</div>
			<div class="sm:col-span-2 lg:col-span-3 xl:col-span-6">
				<label for="q" class="mb-1 block text-sm font-semibold">Remarque (code Charden, n° de transaction…)</label>
				<input id="q" name="q" type="search" value={f.q} class="py-2" />
			</div>
			<div class="flex gap-2 xl:col-span-2">
				<Bouton type="submit" variante="fleuve" taille="sm">Filtrer</Bouton>
				<Bouton href="/gestion/paiements" variante="fantome" taille="sm">Effacer</Bouton>
			</div>
		</form>

		<p class="text-[15px]" aria-live="polite">
			<strong>{data.liste.total}</strong> paiement{data.liste.total > 1 ? 's' : ''} pour un total de <strong class="montant">{fcfa(data.liste.somme)}</strong>
		</p>

		{#if data.liste.items.length}
			<div class="carte overflow-x-auto">
				<table class="w-full text-left text-[15px]">
					<caption class="sr-only">Paiements</caption>
					<thead class="bg-sable/60 text-sm text-ardoise">
						<tr>
							<th scope="col" class="px-3 py-2.5 font-semibold">Date</th>
							<th scope="col" class="px-3 py-2.5 font-semibold">Membre</th>
							<th scope="col" class="px-3 py-2.5 font-semibold">Opération</th>
							<th scope="col" class="px-3 py-2.5 text-right font-semibold">Montant</th>
							<th scope="col" class="hidden px-3 py-2.5 font-semibold md:table-cell">Mode · remarque</th>
							<th scope="col" class="px-3 py-2.5 font-semibold">État</th>
						</tr>
					</thead>
					<tbody>
						{#each data.liste.items as p (p.id)}
							<tr class="border-t border-fleuve-900/5 align-top hover:bg-creme">
								<td class="px-3 py-2.5 whitespace-nowrap">{dateHeure(p.date_paiement)}</td>
								<td class="px-3 py-2.5">
									{#if p.membre}<a href="/gestion/membres/{p.membre.id}" class="font-semibold text-fleuve-700 hover:underline">{p.membre.nom}</a>{:else}—{/if}
								</td>
								<td class="px-3 py-2.5">{libelle(data.enums, 'TypeObjetPaye', p.type_objet)}{p.objet_id ? ` n° ${p.objet_id}` : ''}</td>
								<td class="montant px-3 py-2.5 text-right font-semibold">{fcfa(p.montant)}</td>
								<td class="hidden px-3 py-2.5 md:table-cell">
									{libelle(data.enums, 'ModePaiement', p.mode)}
									{#if p.remarque}<span class="block text-sm text-ardoise" title={p.remarque}>{tronquer(p.remarque, 80)}</span>{/if}
								</td>
								<td class="px-3 py-2.5">
									<Badge ton={tons[p.etat as 1 | 2 | 3] ?? 'neutre'}>{libelle(data.enums, 'EtatPaiement', p.etat)}</Badge>
									{#if p.etat === 2}
										<div class="mt-2 flex flex-wrap gap-1.5">
											<form method="POST" action="?/confirmer" use:enhance={confirmer(`Confirmer le paiement de ${fcfa(p.montant)} ? Vérifiez d'abord sa réception.`)}>
												<input type="hidden" name="id" value={p.id} />
												<button class="inline-flex min-h-9 items-center gap-1 rounded-lg bg-foret-600 px-2.5 text-sm font-semibold text-white hover:bg-foret-700 disabled:opacity-60" disabled={enCours === p.id}>
													<Check class="size-4" aria-hidden="true" />Confirmer
												</button>
											</form>
											<form method="POST" action="?/rejeter" use:enhance={confirmer('Rejeter ce paiement ? Les effets de la commande seront annulés (stock restitué, lignes redevenues impayées).')}>
												<input type="hidden" name="id" value={p.id} />
												<button class="inline-flex min-h-9 items-center gap-1 rounded-lg px-2.5 text-sm font-semibold text-alerte ring-1 ring-alerte/30 hover:bg-alerte-50 disabled:opacity-60" disabled={enCours === p.id}>
													<X class="size-4" aria-hidden="true" />Rejeter
												</button>
											</form>
										</div>
									{:else if p.date_confirmation}
										<span class="mt-1 block text-xs text-ardoise">le {dateHeure(p.date_confirmation)}</span>
									{/if}
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
			<TaillePage taille={data.taille} />
			<Pagination total={data.liste.total} page={data.liste.page} taille={data.liste.taille} />
		{:else}
			<EtatVide icone={Wallet} titre="Aucun paiement ne correspond" texte="Aucun paiement pour ces critères." />
		{/if}
	{/if}
</div>

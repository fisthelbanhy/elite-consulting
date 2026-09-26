<script lang="ts">
	/** Historique des paiements du membre (déclarés, confirmés par la caisse, ou rejetés). */
	import Wallet from '@lucide/svelte/icons/wallet';
	import Info from '@lucide/svelte/icons/info';
	import EnTetePage from '$lib/components/ui/EnTetePage.svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
	import Alerte from '$lib/components/ui/Alerte.svelte';
	import Pagination from '$lib/components/ui/Pagination.svelte';
	import EtatVide from '$lib/components/ui/EtatVide.svelte';
	import OngletsEspace from '$lib/components/espace/OngletsEspace.svelte';
	import { dateHeure, fcfa, libelle, tronquer } from '$lib/format';

	let { data } = $props();
	const liste = $derived(data.paiements);
	const tons = { 1: 'alerte', 2: 'soleil', 3: 'foret' } as const;
	const statut = (etat: number) => (etat === 1 ? 'Non payé (rejeté)' : etat === 2 ? 'En vérification' : 'Confirmé');
</script>

<svelte:head>
	<title>Mes paiements — {data.parametres.nom_site}</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<EnTetePage titre="Mes paiements" sousTitre="Chaque paiement déclaré est vérifié par notre caisse avant d'être confirmé." surtitre="Mon espace">
	{#snippet bas()}<OngletsEspace messages={data.compteurs?.messages_non_lus ?? 0} />{/snippet}
</EnTetePage>

<div class="conteneur max-w-4xl space-y-5 py-8">
	{#if data.paye}
		<Alerte type="succes" titre="Paiement enregistré, merci !">Notre caisse le vérifie et le confirme au plus vite. Vous le retrouvez ci-dessous.</Alerte>
	{/if}

	{#if liste.items.length}
		<ul class="carte divide-y divide-fleuve-900/5">
			{#each liste.items as p (p.id)}
				<li class="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
					<div class="min-w-0">
						<p class="font-semibold">{libelle(data.enums, 'TypeObjetPaye', p.type_objet) || 'Paiement'}{p.objet_id ? ` n° ${p.objet_id}` : ''}</p>
						<p class="text-sm text-ardoise">
							{dateHeure(p.date_paiement)} · {libelle(data.enums, 'ModePaiement', p.mode)}{p.remarque ? ` · ${tronquer(p.remarque, 60)}` : ''}
						</p>
						{#if p.date_confirmation && p.etat === 3}<p class="text-sm text-foret-700">Confirmé le {dateHeure(p.date_confirmation)}</p>{/if}
					</div>
					<div class="flex items-center gap-3">
						<span class="montant text-lg font-bold">{fcfa(p.montant)}</span>
						<Badge ton={tons[p.etat as 1 | 2 | 3] ?? 'neutre'}>{statut(p.etat)}</Badge>
					</div>
				</li>
			{/each}
		</ul>
		<Pagination total={liste.total} page={liste.page} taille={liste.taille} />
		<p class="flex items-start gap-2 text-sm text-ardoise">
			<Info class="mt-0.5 size-4 shrink-0" aria-hidden="true" />
			Un paiement « rejeté » n'a pas été retrouvé par notre caisse : écrivez-nous avec la référence de votre transaction.
			La Frangine ne vous demandera jamais votre code Mobile Money.
		</p>
	{:else}
		<EtatVide icone={Wallet} titre="Aucun paiement pour l'instant" texte="Vos paiements (boutique, courses, Likelemba, souscriptions…) apparaîtront ici." />
	{/if}
</div>

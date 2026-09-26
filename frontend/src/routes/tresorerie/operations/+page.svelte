<script lang="ts">
	import Plus from '@lucide/svelte/icons/plus';
	import ArrowLeftRight from '@lucide/svelte/icons/arrow-left-right';
	import EnTeteTresorerie from '$lib/components/tresorerie/EnTeteTresorerie.svelte';
	import BarreFiltres from '$lib/components/tresorerie/BarreFiltres.svelte';
	import CarteFiche from '$lib/components/tresorerie/CarteFiche.svelte';
	import VueGestionOperations from '$lib/components/tresorerie/VueGestionOperations.svelte';
	import FilDialogue from '$lib/components/dialogues/FilDialogue.svelte';
	import Bouton from '$lib/components/ui/Bouton.svelte';
	import Pagination from '$lib/components/ui/Pagination.svelte';
	import EtatVide from '$lib/components/ui/EtatVide.svelte';
	import Alerte from '$lib/components/ui/Alerte.svelte';
	import { dateCourte, entier, libelle } from '$lib/format';

	let { data, form } = $props();
	const devise = (d: number) => libelle(data.enums, 'Devise', d) || 'FCFA';
</script>

<svelte:head>
	<title>Opérations bancaires — {data.parametres.nom_site}</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<EnTeteTresorerie titre="Opérations bancaires" sousTitre="Programmez vos virements : votre banque reçoit l’ordre par e-mail, vous gardez l’historique." compteurs={data.compteurs}>
	<Bouton href="/tresorerie/operations/nouveau"><Plus class="size-5" aria-hidden="true" />Nouvelle opération</Bouton>
</EnTeteTresorerie>

<div class="conteneur space-y-8 py-8">
	{#if data.supprime}<Alerte type="succes" titre="L’opération est annulée." />{/if}
	<div>
		{#if data.gestion}
			<VueGestionOperations operations={data.liste.items} synthese={data.synthese} banques={data.banques} filtres={data.filtres} />
			<Pagination total={data.liste.total} page={data.liste.page} taille={data.liste.taille} />
		{:else}
			<BarreFiltres q={data.filtres.q} placeholder="Référence, bénéficiaire, banque…" />
			{#if data.liste.items.length}
				<p class="mb-4 text-ardoise" aria-live="polite">{data.liste.total} opération{data.liste.total > 1 ? 's' : ''}</p>
				<ul class="grid gap-4 md:grid-cols-2">
					{#each data.liste.items as o (o.id)}
						<li>
							<CarteFiche
								href="/tresorerie/operations/{o.id}"
								reference={o.reference}
								date={dateCourte(o.date_operation)}
								titre={libelle(data.enums, 'TypeOperationBanque', o.type_operation) || 'Opération'}
								montant="{entier(o.montant)} {devise(o.devise)}"
								etat={o.etat}
								details={[
									['Banque émettrice', o.nom_banque_emettrice],
									['Bénéficiaire', o.beneficiaire],
									['Banque du bénéficiaire', o.nom_banque_beneficiaire]
								]}
							/>
						</li>
					{/each}
				</ul>
				<Pagination total={data.liste.total} page={data.liste.page} taille={data.liste.taille} />
			{:else}
				<EtatVide
					icone={ArrowLeftRight}
					titre={data.filtres.q ? 'Aucune opération ne correspond à votre recherche' : 'Programmez vos virements en une fois'}
					texte="Fournisseurs, salaires, rapatriements : saisissez jusqu’à 15 ordres, votre banque les reçoit directement par e-mail."
					messageWhatsApp="Bonjour la Frangine, je voudrais programmer des virements. Comment faire ?"
				>
					<Bouton href="/tresorerie/operations/nouveau">Programmer une opération</Bouton>
				</EtatVide>
			{/if}
		{/if}
	</div>
	<!-- Le dialogue est aussi accessible au gestionnaire en Opération bancaire (correctif F-S7-40) -->
	<FilDialogue dialogue={data.dialogue} {form} sujet="vos opérations bancaires" />
</div>

<script lang="ts">
	import Banknote from '@lucide/svelte/icons/banknote';
	import Send from '@lucide/svelte/icons/send';
	import Smartphone from '@lucide/svelte/icons/smartphone';
	import ShieldAlert from '@lucide/svelte/icons/shield-alert';
	import EnTetePage from '$lib/components/ui/EnTetePage.svelte';
	import Formulaire from '$lib/components/ui/Formulaire.svelte';
	import Saisie from '$lib/components/ui/Saisie.svelte';
	import Bouton from '$lib/components/ui/Bouton.svelte';
	import { champ, valeur } from '$lib/forms';
	import { fcfa, telephone } from '$lib/format';

	let { data, form } = $props();
	const p = $derived(data.preparation);
	let mode = $state(String(valeur(form, 'mode', '3')));

	const modes = [
		{ value: '3', label: 'Mobile Money', description: 'MTN MoMo ou Airtel Money', icone: Smartphone },
		{ value: '1', label: 'Espèces', description: 'À notre bureau', icone: Banknote },
		{ value: '2', label: 'Charden Farell', description: "Transfert d'argent", icone: Send }
	];
	const libelleRemarque = $derived(
		mode === '3' ? 'Votre numéro et la référence de la transaction' : mode === '2' ? 'Expéditeur, agence et code Charden Farell' : 'Remarque (facultatif)'
	);
</script>

<svelte:head>
	<title>Paiement — {data.parametres.nom_site}</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<EnTetePage titre="Paiement" sousTitre={p.libelle} />

<div class="conteneur grid max-w-4xl gap-8 py-8 lg:grid-cols-[1fr_18rem]">
	<div class="carte p-6 sm:p-8">
		<Formulaire {form}>
			{#snippet children({ envoi })}
				<input type="hidden" name="retour" value={p.retour} />
				<fieldset>
					<legend class="mb-3 text-[15px] font-semibold">Comment payez-vous ?</legend>
					<div class="grid gap-3 sm:grid-cols-3">
						{#each modes as m (m.value)}
							<label class="flex cursor-pointer flex-col items-center gap-2 rounded-xl border border-fleuve-100 bg-white p-4 text-center has-checked:border-fleuve-700 has-checked:bg-fleuve-50 has-checked:ring-1 has-checked:ring-fleuve-700">
								<input type="radio" name="mode" value={m.value} bind:group={mode} class="sr-only" />
								<m.icone class="size-8 text-fleuve-700" aria-hidden="true" />
								<span class="font-semibold">{m.label}</span>
								<span class="text-sm text-ardoise">{m.description}</span>
							</label>
						{/each}
					</div>
				</fieldset>

				<div class="mt-6 rounded-xl bg-creme p-4 text-[15px]">
					<p>{p.consignes[mode]}</p>
					{#if mode === '3' && p.numeros.length}
						<p class="mt-2 font-semibold">Numéros La Frangine : {p.numeros.map(telephone).join(' · ')}</p>
					{/if}
				</div>

				<div class="mt-6 space-y-5">
					{#if p.montant === null}
						<Saisie label="Montant" type="number" inputmode="numeric" min="1" suffixe="FCFA" requis {...champ(form, 'montant')} />
					{/if}
					<Saisie label={libelleRemarque} requis={mode !== '1'} {...champ(form, 'remarque')} />
					<Bouton type="submit" pleineLargeur taille="lg" chargement={envoi}>
						Confirmer le paiement{#if p.montant !== null}&nbsp;de {fcfa(p.montant)}{/if}
					</Bouton>
				</div>
			{/snippet}
		</Formulaire>
	</div>

	<aside class="space-y-4">
		{#if p.montant !== null}
			<div class="carte p-5">
				<p class="text-sm text-ardoise">Montant à régler</p>
				<p class="montant font-display text-3xl font-extrabold text-laterite-600">{fcfa(p.montant)}</p>
			</div>
		{/if}
		<div class="flex gap-3 rounded-xl bg-soleil-100 p-4 text-[15px]">
			<ShieldAlert class="mt-0.5 size-5 shrink-0 text-laterite-700" aria-hidden="true" />
			<p><strong>Ne communiquez jamais votre code PIN.</strong> La Frangine ne vous le demandera jamais. Chaque paiement reçoit une référence et est confirmé par notre caisse.</p>
		</div>
	</aside>
</div>

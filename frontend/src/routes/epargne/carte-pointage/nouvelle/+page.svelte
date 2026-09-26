<script lang="ts">
	import ArrowDownToLine from '@lucide/svelte/icons/arrow-down-to-line';
	import ArrowUpFromLine from '@lucide/svelte/icons/arrow-up-from-line';
	import Search from '@lucide/svelte/icons/search';
	import KeyRound from '@lucide/svelte/icons/key-round';
	import EnTetePage from '$lib/components/ui/EnTetePage.svelte';
	import Bouton from '$lib/components/ui/Bouton.svelte';
	import Alerte from '$lib/components/ui/Alerte.svelte';
	import Avatar from '$lib/components/ui/Avatar.svelte';
	import Formulaire from '$lib/components/ui/Formulaire.svelte';
	import Saisie from '$lib/components/ui/Saisie.svelte';
	import Liste from '$lib/components/ui/Liste.svelte';
	import AvertissementEpargne from '$lib/components/epargne/AvertissementEpargne.svelte';
	import { champ, valeur } from '$lib/forms';
	import { dateHeure, fcfa } from '$lib/format';

	let { data, form } = $props();
	const c = $derived(data.choix);
	const t = $derived(data.titulaire);
	const operation = $derived(String(valeur(form, 'type_operation', c.operation)));
	const retrait = $derived(operation === '2');
	// Indication seulement : la règle des 97 % est recalculée par le serveur sur le solde en base
	const retraitMax = $derived(t ? Math.max(0, Math.ceil((t.solde_point_caisse * 97) / 100) - 1) : 0);
</script>

<svelte:head>
	<title>Nouvelle opération de pointage — {data.parametres.nom_site}</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<EnTetePage
	titre="Nouvelle opération"
	sousTitre="Versement ou retrait sur la carte de pointage d'un membre, validé par son code PIN."
	fil={[{ href: '/epargne', label: 'Épargne solidaire' }, { href: '/epargne/carte-pointage', label: 'Carte de pointage' }]}
/>

<div class="conteneur max-w-3xl space-y-6 py-8">
	<section class="grid grid-cols-2 gap-3 rounded-xl bg-soleil-100 p-4 text-[15px]" aria-label="Contexte de l'opération">
		<div><p class="text-sm text-ardoise">Date</p><p class="font-semibold">{dateHeure(data.maintenant)}</p></div>
		<div><p class="text-sm text-ardoise">Agence</p><p class="font-semibold">{data.membre?.nom}</p></div>
	</section>

	<form method="GET" class="carte space-y-5 p-6">
		<h2 class="text-xl font-bold">1. Opération et membre</h2>
		<fieldset>
			<legend class="mb-2 text-[15px] font-semibold">Opération <span class="text-laterite-600" aria-hidden="true">*</span></legend>
			<div class="grid grid-cols-2 gap-3">
				{#each [{ v: '1', label: 'Versement', icone: ArrowDownToLine }, { v: '2', label: 'Retrait', icone: ArrowUpFromLine }] as o (o.v)}
					<label class="flex min-h-14 cursor-pointer items-center justify-center gap-2 rounded-xl border border-fleuve-100 bg-white p-3 font-semibold has-checked:border-fleuve-700 has-checked:bg-fleuve-50 has-checked:ring-1 has-checked:ring-fleuve-700">
						<input type="radio" name="operation" value={o.v} checked={c.operation === o.v} class="sr-only" />
						<o.icone class="size-5 text-fleuve-700" aria-hidden="true" />{o.label}
					</label>
				{/each}
			</div>
		</fieldset>
		<div class="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
			<div>
				<label for="q" class="mb-1.5 block text-[15px] font-semibold">Rechercher le membre par son nom</label>
				<div class="relative">
					<Search class="pointer-events-none absolute top-1/2 left-3 size-5 -translate-y-1/2 text-ardoise" aria-hidden="true" />
					<input id="q" name="q" type="search" value={c.q} class="pl-10" />
				</div>
			</div>
			<Bouton type="submit" variante="secondaire">Chercher</Bouton>
		</div>
		<div>
			<label for="membre" class="mb-1.5 block text-[15px] font-semibold">{data.membre?.est_gestionnaire ? 'Agent de caisse' : 'Membre'} <span class="text-laterite-600" aria-hidden="true">*</span></label>
			<select id="membre" name="membre">
				<option value="">Choisir…</option>
				{#each data.titulaires as x (x.id)}<option value={x.id} selected={String(x.id) === c.membre}>{x.nom}{x.pseudonyme ? ` (${x.pseudonyme})` : ''}</option>{/each}
			</select>
			{#if !data.titulaires.length}<p class="mt-1 text-sm text-ardoise">Aucun membre ne correspond à cette recherche.</p>{/if}
		</div>
		<Bouton type="submit" variante="fleuve">Afficher le solde</Bouton>
	</form>

	{#if c.membre && !t}
		<Alerte type="erreur" titre="Ce membre ne peut pas être pointé par vous (introuvable, votre propre carte, ou pas agent de caisse)." />
	{/if}

	{#if t}
		<section class="carte space-y-5 p-6" aria-labelledby="titre-etape-2">
			<h2 id="titre-etape-2" class="text-xl font-bold">2. {retrait ? 'Retrait' : operation === '1' ? 'Versement' : 'Montant'} et code PIN</h2>
			<div class="flex items-center gap-4 rounded-xl bg-creme p-4">
				<Avatar src={t.photo_url} nom={t.nom} taille="lg" />
				<div>
					<p class="font-semibold">{t.nom}{#if t.pseudonyme} <span class="font-normal text-ardoise">({t.pseudonyme})</span>{/if}</p>
					<p>Solde : <strong class="montant text-lg">{fcfa(t.solde_point_caisse)}</strong></p>
					<p class="text-sm text-ardoise">Dernière opération : {t.date_dernier_pointage ? dateHeure(t.date_dernier_pointage) : 'aucune'}</p>
				</div>
			</div>
			{#if !t.a_un_code}
				<Alerte type="attention" titre="Ce membre n'a pas encore de code de pointage.">Il doit le demander à la frangine avant toute opération.</Alerte>
			{:else}
				<Formulaire {form}>
					{#snippet children({ envoi })}
						<input type="hidden" name="membre_id" value={t.id} />
						<div class="space-y-5">
							{#if operation === '1' || operation === '2'}
								<input type="hidden" name="type_operation" value={operation} />
							{:else}
								<Liste label="Opération" requis options={[{ value: 1, label: 'Versement' }, { value: 2, label: 'Retrait' }]} {...champ(form, 'type_operation', '')} />
							{/if}
							<Saisie
								label="Montant"
								type="number"
								inputmode="numeric"
								min="1"
								step="1"
								suffixe="FCFA"
								requis
								aide={retrait ? `Retrait possible : jusqu'à ${fcfa(retraitMax)} (moins de 97 % du solde).` : undefined}
								{...champ(form, 'montant')}
							/>
							<Saisie label="Motif (facultatif)" {...champ(form, 'motif')} />
							<Saisie
								label="Code de pointage du titulaire"
								name="code_pin"
								type="password"
								inputmode="numeric"
								autocomplete="off"
								maxlength={4}
								pattern="[0-9]*"
								requis
								aide="Le titulaire saisit lui-même son code à 4 chiffres. Ne le notez jamais."
								erreur={form?.champs?.code_pin}
								value=""
							/>
							<p class="flex items-center gap-2 text-sm text-ardoise"><KeyRound class="size-4" aria-hidden="true" />Après 5 codes erronés, la carte est bloquée 15 minutes et le titulaire est prévenu.</p>
							<Bouton type="submit" pleineLargeur taille="lg" chargement={envoi}>Valider {retrait ? 'le retrait' : 'le versement'}</Bouton>
						</div>
					{/snippet}
				</Formulaire>
			{/if}
		</section>
	{/if}

	<AvertissementEpargne />
</div>

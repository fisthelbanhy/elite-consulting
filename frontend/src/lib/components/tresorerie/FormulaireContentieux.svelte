<script lang="ts">
	/**
	 * Dossier de contentieux / restructuration (S7-13, F-S7-36) : 10 rubriques « montant + détail »
	 * et 4 textes libres, regroupés par thème. Le reste mensuel est un simple repère indicatif.
	 */
	import Formulaire from '$lib/components/ui/Formulaire.svelte';
	import Saisie from '$lib/components/ui/Saisie.svelte';
	import Zone from '$lib/components/ui/Zone.svelte';
	import Bouton from '$lib/components/ui/Bouton.svelte';
	import { champ, valeur } from '$lib/forms';
	import { fcfa } from '$lib/format';
	import type { ContentieuxDetail } from '$lib/types/tresorerie';

	let {
		form,
		initial = null,
		action = '',
		annuler = '/tresorerie/contentieux'
	}: {
		form: Record<string, unknown> | null | undefined;
		initial?: ContentieuxDetail | null;
		action?: string;
		annuler?: string;
	} = $props();

	type Retour = { cle?: string; valeurs?: Record<string, unknown>; champs?: Record<string, string> } | null;
	// Seul le retour de ce formulaire (la page porte aussi le dialogue et le suivi)
	const f = $derived((form as Retour)?.cle === 'fiche' ? (form as Retour) : null);
	type Cle = keyof ContentieuxDetail;
	const init = (k: Cle) => (initial ? initial[k] : '');

	const lire = (k: 'revenus_mensuels' | 'charges_fixes' | 'charges_variables') => String(valeur(f, k, init(k) || '') ?? '');
	let revenus = $state(lire('revenus_mensuels'));
	let fixes = $state(lire('charges_fixes'));
	let variables = $state(lire('charges_variables'));
	const nombre = (s: string) => Number(String(s).replace(/\s/g, '')) || 0;
	const reste = $derived(nombre(revenus) - nombre(fixes) - nombre(variables));

	const sections: { titre: string; aide: string; montants: [Cle, string, boolean?][]; textes?: [Cle, string][] }[] = [
		{
			titre: 'La dette',
			aide: 'Le crédit en difficulté et son échéance actuelle.',
			montants: [['dette_compromise', 'Montant de la dette compromise', true]],
			textes: [['echeance_actuelle', 'Échéance actuelle du crédit']]
		},
		{
			titre: 'Vos revenus',
			aide: 'Ce qui entre réellement, jour après jour.',
			montants: [
				['revenus_journaliers', 'Revenus journaliers'],
				['revenus_hebdomadaires', 'Revenus hebdomadaires']
			]
		},
		{
			titre: 'Vos activités',
			aide: 'Ce qui tourne aujourd’hui et ce qui se prépare.',
			montants: [
				['entrees_activite_en_cours', 'Entrées attendues sur les activités en cours'],
				['entrees_previsionnelles', 'Entrées attendues sur l’activité prévisionnelle'],
				['entrees_totales', 'Entrées attendues au total']
			],
			textes: [
				['activites_en_cours', 'Activités en cours'],
				['activite_previsionnelle', 'Activité prévisionnelle']
			]
		},
		{
			titre: 'Votre capacité de remboursement',
			aide: 'L’échéance que vous pouvez honorer sans vous mettre en danger.',
			montants: [['echeance_supportable', 'Échéance que vous êtes capable de supporter']],
			textes: [['elements_favorables', 'Quels éléments de votre environnement vous confortent dans votre projet ?']]
		}
	];
</script>

{#snippet montantDetail(cle: Cle, label: string, requis = false)}
	<div class="grid gap-3 sm:grid-cols-[15rem_1fr]">
		<Saisie {label} inputmode="numeric" suffixe="FCFA" {requis} autocomplete="off" {...champ(f, cle, init(cle))} />
		<Zone label="Détail" lignes={2} {...champ(f, `${cle}_detail`, init(`${cle}_detail` as Cle))} />
	</div>
{/snippet}

<Formulaire {action} form={f} cle="fiche">
	{#snippet children({ envoi })}
		<div class="space-y-6">
			{#each sections.slice(0, 2) as s (s.titre)}
				<fieldset class="carte space-y-5 p-5 sm:p-6">
					<legend class="sr-only">{s.titre}</legend>
					<div><h2 class="text-lg font-bold">{s.titre}</h2><p class="text-sm text-ardoise">{s.aide}</p></div>
					{#each s.montants as [cle, label, requis] (cle)}{@render montantDetail(cle, label, requis)}{/each}
					{#each s.textes ?? [] as [cle, label] (cle)}<Zone {label} lignes={2} {...champ(f, cle, init(cle))} />{/each}
					{#if s.titre === 'Vos revenus'}
						<div class="grid gap-3 sm:grid-cols-[15rem_1fr]">
							<Saisie label="Revenus mensuels" name="revenus_mensuels" bind:value={revenus} inputmode="numeric" suffixe="FCFA" requis autocomplete="off" erreur={f?.champs?.revenus_mensuels} />
							<Zone label="Détail" lignes={2} {...champ(f, 'revenus_mensuels_detail', init('revenus_mensuels_detail'))} />
						</div>
					{/if}
				</fieldset>
			{/each}

			<fieldset class="carte space-y-5 p-5 sm:p-6">
				<legend class="sr-only">Vos charges mensuelles</legend>
				<div><h2 class="text-lg font-bold">Vos charges mensuelles</h2><p class="text-sm text-ardoise">Loyer, salaires, fournisseurs, transport…</p></div>
				<div class="grid gap-3 sm:grid-cols-[15rem_1fr]">
					<Saisie label="Charges fixes mensuelles" name="charges_fixes" bind:value={fixes} inputmode="numeric" suffixe="FCFA" autocomplete="off" erreur={f?.champs?.charges_fixes} />
					<Zone label="Détail" lignes={2} {...champ(f, 'charges_fixes_detail', init('charges_fixes_detail'))} />
				</div>
				<div class="grid gap-3 sm:grid-cols-[15rem_1fr]">
					<Saisie label="Charges variables mensuelles" name="charges_variables" bind:value={variables} inputmode="numeric" suffixe="FCFA" autocomplete="off" erreur={f?.champs?.charges_variables} />
					<Zone label="Détail" lignes={2} {...champ(f, 'charges_variables_detail', init('charges_variables_detail'))} />
				</div>
				{#if nombre(revenus) > 0}
					<p class="rounded-xl bg-creme p-4 text-[15px]" aria-live="polite">
						Reste mensuel indicatif (revenus − charges) :
						<strong class="montant {reste < 0 ? 'text-alerte' : 'text-foret-700'}">{fcfa(reste)}</strong>.
						C'est ce repère que votre conseiller défendra auprès de la banque.
					</p>
				{/if}
			</fieldset>

			{#each sections.slice(2) as s (s.titre)}
				<fieldset class="carte space-y-5 p-5 sm:p-6">
					<legend class="sr-only">{s.titre}</legend>
					<div><h2 class="text-lg font-bold">{s.titre}</h2><p class="text-sm text-ardoise">{s.aide}</p></div>
					{#each s.textes ?? [] as [cle, label] (cle)}<Zone {label} lignes={2} {...champ(f, cle, init(cle))} />{/each}
					{#each s.montants as [cle, label, requis] (cle)}{@render montantDetail(cle, label, requis)}{/each}
				</fieldset>
			{/each}

			<div class="flex flex-wrap gap-3">
				<Bouton type="submit" taille="lg" chargement={envoi}>{initial ? 'Enregistrer les modifications' : 'Envoyer mon dossier'}</Bouton>
				<Bouton href={annuler} variante="fantome" taille="lg">Annuler</Bouton>
			</div>
		</div>
	{/snippet}
</Formulaire>

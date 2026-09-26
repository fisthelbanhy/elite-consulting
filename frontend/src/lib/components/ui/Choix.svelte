<script lang="ts">
	/** Choix exclusif présenté en tuiles (boutons radio accessibles). */
	type Opt = { value: number | string; label: string; description?: string };

	let {
		legende,
		name,
		value = $bindable(''),
		options,
		erreur,
		requis = false,
		colonnes = 2,
		onchange
	}: {
		legende: string;
		name: string;
		value?: string | number | null;
		options: Opt[];
		erreur?: string;
		requis?: boolean;
		colonnes?: 1 | 2 | 3 | 4;
		onchange?: (v: string) => void;
	} = $props();

	const grilles = { 1: '', 2: 'sm:grid-cols-2', 3: 'sm:grid-cols-3', 4: 'sm:grid-cols-2 lg:grid-cols-4' };
</script>

<fieldset class="space-y-2" aria-invalid={erreur ? 'true' : undefined} id="champ-{name}">
	<legend class="mb-1.5 text-[15px] font-semibold text-encre">
		{legende}{#if requis}<span class="text-laterite-600" aria-hidden="true">&nbsp;*</span>{/if}
	</legend>
	<div class="grid gap-2 {grilles[colonnes]}">
		{#each options as o (o.value)}
			<label
				class="flex min-h-12 cursor-pointer items-start gap-3 rounded-xl border bg-white p-3.5 transition-colors has-checked:border-fleuve-700 has-checked:bg-fleuve-50 has-checked:ring-1 has-checked:ring-fleuve-700 {erreur
					? 'border-alerte'
					: 'border-fleuve-100 hover:border-fleuve-300'}"
			>
				<input
					type="radio"
					{name}
					value={String(o.value)}
					checked={String(value ?? '') === String(o.value)}
					onchange={() => {
						value = String(o.value);
						onchange?.(String(o.value));
					}}
					required={requis}
					class="mt-0.5"
				/>
				<span>
					<span class="block font-semibold text-encre">{o.label}</span>
					{#if o.description}<span class="block text-sm text-ardoise">{o.description}</span>{/if}
				</span>
			</label>
		{/each}
	</div>
	{#if erreur}<p class="text-sm font-medium text-alerte">{erreur}</p>{/if}
</fieldset>

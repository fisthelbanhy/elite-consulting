<script lang="ts">
	/** Liste déroulante ; `groupes` pour des options regroupées (ex. domaines par secteur). */
	type Opt = { value: number | string; label: string };

	let {
		label,
		name,
		value = $bindable(''),
		options = [],
		groupes,
		vide = 'Choisir…',
		erreur,
		aide,
		requis = false,
		id,
		class: classe = '',
		...rest
	}: {
		label: string;
		name: string;
		value?: string | number | null;
		options?: Opt[];
		groupes?: { label: string; options: Opt[] }[];
		vide?: string | null;
		erreur?: string;
		aide?: string;
		requis?: boolean;
		id?: string;
		class?: string;
		[cle: string]: unknown;
	} = $props();

	const ident = $derived(id ?? `champ-${name}`);
	const decrit = $derived([aide ? `${ident}-aide` : '', erreur ? `${ident}-erreur` : ''].filter(Boolean).join(' ') || undefined);
	const courant = $derived(value === null || value === undefined ? '' : String(value));
</script>

<div class="space-y-1.5 {classe}">
	<label for={ident} class="block text-[15px] font-semibold text-encre">
		{label}{#if requis}<span class="text-laterite-600" aria-hidden="true">&nbsp;*</span>{/if}
	</label>
	{#if aide}<p id="{ident}-aide" class="text-sm text-ardoise">{aide}</p>{/if}
	<select
		id={ident}
		{name}
		bind:value
		required={requis}
		aria-invalid={erreur ? 'true' : undefined}
		aria-describedby={decrit}
		{...rest}
	>
		{#if vide !== null}<option value="">{vide}</option>{/if}
		{#if groupes}
			{#each groupes as g (g.label)}
				<optgroup label={g.label}>
					{#each g.options as o (o.value)}
						<option value={String(o.value)} selected={String(o.value) === courant}>{o.label}</option>
					{/each}
				</optgroup>
			{/each}
		{:else}
			{#each options as o (o.value)}
				<option value={String(o.value)} selected={String(o.value) === courant}>{o.label}</option>
			{/each}
		{/if}
	</select>
	{#if erreur}<p id="{ident}-erreur" class="text-sm font-medium text-alerte">{erreur}</p>{/if}
</div>

<script lang="ts">
	let {
		label,
		name,
		value = $bindable(''),
		erreur,
		aide,
		requis = false,
		lignes = 4,
		id,
		class: classe = '',
		...rest
	}: {
		label: string;
		name: string;
		value?: string | number | null;
		erreur?: string;
		aide?: string;
		requis?: boolean;
		lignes?: number;
		id?: string;
		class?: string;
		[cle: string]: unknown;
	} = $props();

	const ident = $derived(id ?? `champ-${name}`);
	const decrit = $derived([aide ? `${ident}-aide` : '', erreur ? `${ident}-erreur` : ''].filter(Boolean).join(' ') || undefined);
</script>

<div class="space-y-1.5 {classe}">
	<label for={ident} class="block text-[15px] font-semibold text-encre">
		{label}{#if requis}<span class="text-laterite-600" aria-hidden="true">&nbsp;*</span>{/if}
	</label>
	{#if aide}<p id="{ident}-aide" class="text-sm text-ardoise">{aide}</p>{/if}
	<textarea
		id={ident}
		{name}
		rows={lignes}
		bind:value
		required={requis}
		aria-invalid={erreur ? 'true' : undefined}
		aria-describedby={decrit}
		{...rest}
	></textarea>
	{#if erreur}<p id="{ident}-erreur" class="text-sm font-medium text-alerte">{erreur}</p>{/if}
</div>

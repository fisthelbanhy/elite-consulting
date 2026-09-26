<script lang="ts">
	/** Champ de saisie accessible : libellé, aide, erreur liée (aria-describedby). */
	import type { Snippet } from 'svelte';

	let {
		label,
		name,
		value = $bindable(''),
		type = 'text',
		erreur,
		aide,
		requis = false,
		suffixe,
		prefixe,
		id,
		class: classe = '',
		apres,
		...rest
	}: {
		label: string;
		name: string;
		value?: string | number | null;
		type?: string;
		erreur?: string;
		aide?: string;
		requis?: boolean;
		suffixe?: string;
		prefixe?: string;
		id?: string;
		class?: string;
		apres?: Snippet;
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
	<div class="relative flex items-stretch">
		{#if prefixe}
			<span class="inline-flex items-center rounded-l-xl border border-r-0 border-fleuve-100 bg-sable px-3 text-sm font-medium text-ardoise">{prefixe}</span>
		{/if}
		<input
			id={ident}
			{name}
			{type}
			bind:value
			required={requis}
			aria-invalid={erreur ? 'true' : undefined}
			aria-describedby={decrit}
			class="{prefixe ? 'rounded-l-none' : ''} {suffixe ? 'rounded-r-none' : ''}"
			{...rest}
		/>
		{#if suffixe}
			<span class="inline-flex items-center rounded-r-xl border border-l-0 border-fleuve-100 bg-sable px-3 text-sm font-medium text-ardoise">{suffixe}</span>
		{/if}
	</div>
	{@render apres?.()}
	{#if erreur}<p id="{ident}-erreur" class="text-sm font-medium text-alerte">{erreur}</p>{/if}
</div>

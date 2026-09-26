<script lang="ts">
	/** Sélection de fichier avec aperçu pour les images. */
	import ImageIcon from '@lucide/svelte/icons/image-plus';
	import FileText from '@lucide/svelte/icons/file-text';

	let {
		label,
		name,
		accept = 'image/*',
		erreur,
		aide,
		actuel,
		image = true
	}: {
		label: string;
		name: string;
		accept?: string;
		erreur?: string;
		aide?: string;
		actuel?: string | null;
		image?: boolean;
	} = $props();

	let apercu = $state<string | null>(null);
	let nomFichier = $state('');

	function choisir(e: Event) {
		const f = (e.currentTarget as HTMLInputElement).files?.[0];
		nomFichier = f?.name ?? '';
		if (apercu) URL.revokeObjectURL(apercu);
		apercu = f && image && f.type.startsWith('image/') ? URL.createObjectURL(f) : null;
	}
	const visuel = $derived(apercu ?? (image ? actuel : null));
</script>

<div class="space-y-1.5">
	<span class="block text-[15px] font-semibold text-encre">{label}</span>
	{#if aide}<p class="text-sm text-ardoise">{aide}</p>{/if}
	<label
		class="flex cursor-pointer items-center gap-4 rounded-xl border border-dashed bg-white p-3 hover:bg-fleuve-50 {erreur
			? 'border-alerte'
			: 'border-fleuve-200'}"
	>
		{#if visuel}
			<img src={visuel} alt="" class="size-16 rounded-lg object-cover" />
		{:else}
			<span class="grid size-16 place-items-center rounded-lg bg-sable text-fleuve-600">
				{#if image}<ImageIcon class="size-7" aria-hidden="true" />{:else}<FileText class="size-7" aria-hidden="true" />{/if}
			</span>
		{/if}
		<span class="min-w-0 flex-1 text-[15px]">
			<span class="block font-semibold text-fleuve-700">{nomFichier ? 'Changer de fichier' : 'Choisir un fichier'}</span>
			<span class="block truncate text-sm text-ardoise">{nomFichier || (actuel ? 'Fichier actuel conservé' : '4 Mo maximum')}</span>
		</span>
		<input type="file" {name} {accept} class="sr-only" onchange={choisir} />
	</label>
	{#if erreur}<p class="text-sm font-medium text-alerte">{erreur}</p>{/if}
</div>

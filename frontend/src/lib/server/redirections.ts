/**
 * Correspondance des anciennes URL du site PHP vers les nouvelles pages (ADR-0008).
 * Ex. `/V04/prog/choix2.php?insc=0&opt=0&ode=2` → `/emplois?type=2`.
 */
const SOUS_ONGLETS: Record<string, [string, Record<string, string>]> = {
	'1': ['vcpm', { '1': '/questions', '2': '/decouverte-de-soi', '3': '/bien-etre', '': '/questions' }],
	'2': ['ode', { '1': '/emplois?type=1', '2': '/emplois?type=2', '': '/emplois' }],
	'3': ['imbart', { '1': '/immobilier', '2': '/annonces', '3': '/courses', '': '/immobilier' }],
	'4': ['pjlk', { '1': '/projets', '2': '/likelemba', '3': '/epargne', '': '/projets' }],
	'5': ['opaf', { '1': '/devenir-distributeur', '2': '/business-plan', '3': '/partenariats', '': '/devenir-distributeur' }],
	'6': ['rere', { '1': '/entreprises', '2': '/comparateur-prix', '3': '/marches', '': '/entreprises' }],
	'7': ['cgb', { '1': '/conseil-financier', '2': '/tresorerie', '3': '/tarifs-bancaires', '': '/conseil-financier' }]
};

const PAGES: Record<string, string> = {
	'pcontact.php': '/contact',
	'pmotpasoublie.php': '/mot-de-passe-oublie',
	'incl-affichpub.php': '/publicites',
	'opportunite.php': '/devenir-distributeur',
	'index.php': '/'
};

export function redirectionLegacy(url: URL): string | null {
	const p = url.pathname.toLowerCase();
	if (!p.endsWith('.php') && !p.startsWith('/v04') && !p.startsWith('/v02')) return null;
	const fichier = p.split('/').pop() ?? '';
	const q = url.searchParams;

	if (q.get('insc') === '1') return '/inscription';
	if (q.get('aide') === '1') return '/aide';
	if (fichier === 'incl-affichpub.php' && /^\d+$/.test(q.get('ipub') ?? '')) return `/publicites/${q.get('ipub')}`;
	if (fichier === 'psugest.php') return '/suggestion';

	// Fiches précises (identifiants legacy conservés, ADR-0003)
	const FICHES: [string, string][] = [
		['ient', '/entreprises/'],
		['imch', '/marches/'],
		['ipjt', '/marches/projets/']
	];
	for (const [param, chemin] of FICHES) {
		const id = q.get(param);
		if (id && /^\d+$/.test(id)) return `${chemin}${id}`;
	}
	if (fichier.startsWith('choix6') && q.get('mept') === '2') return '/marches?onglet=projets';

	const m = fichier.match(/^choix(\d)/);
	if (m) {
		if (m[1] === '0') return '/';
		const regle = SOUS_ONGLETS[m[1]];
		if (regle) {
			const [param, cibles] = regle;
			return cibles[q.get(param) ?? ''] ?? cibles[''];
		}
	}
	return PAGES[fichier] ?? '/';
}

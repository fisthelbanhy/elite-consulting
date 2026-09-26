/** Libellés dérivés d'un bien immobilier (titre lisible, lieu, prix). */
import { fcfa, libelle } from '$lib/format';
import type { Enums } from '$lib/types';
import type { BienResume } from '$lib/types/immobilier';

type Bien = Pick<BienResume, 'offre_ou_recherche' | 'type_transaction' | 'type_bien' | 'quartier' | 'prix'>;

/** « Appartement à louer », « Terrain à vendre », « Recherche : maison à acheter ». */
export function titreBien(enums: Enums | undefined, b: Bien): string {
	const type = libelle(enums, 'TypeBien', b.type_bien) || 'Bien';
	const location = b.type_transaction === 1;
	if (b.offre_ou_recherche === 2) return `Recherche : ${type.toLowerCase()} à ${location ? 'louer' : 'acheter'}`;
	return `${type} ${location ? 'à louer' : 'à vendre'}`;
}

/** « Bacongo, Brazzaville » (ou chaîne vide si le quartier n'est pas renseigné). */
export function lieuBien(b: Pick<BienResume, 'quartier'>): string {
	if (!b.quartier) return '';
	return [b.quartier.nom, b.quartier.ville?.nom].filter(Boolean).join(', ');
}

export function prixBien(b: Pick<BienResume, 'prix' | 'offre_ou_recherche'>): string {
	if (!b.prix) return b.offre_ou_recherche === 2 ? 'Budget à discuter' : 'Prix à débattre';
	return b.offre_ou_recherche === 2 ? `Budget ${fcfa(b.prix)}` : fcfa(b.prix);
}

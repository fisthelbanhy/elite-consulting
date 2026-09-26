export interface BanqueCourte {
	id: number;
	sigle: string;
	nom: string;
}

export interface Tarif {
	id: number;
	banque_id: number;
	tarif: string;
}

export interface OperationTarifee {
	id: number;
	libelle: string;
	type_id: number;
	tarifs: Tarif[];
}

export interface TypeOperation {
	id: number;
	libelle: string;
	operations: OperationTarifee[];
}

export interface Comparatif {
	banques: BanqueCourte[];
	types: TypeOperation[];
	nombre_tarifs: number;
	referentiel_vide: boolean;
	peut_gerer_referentiel: boolean;
	banques_gerees: number[];
}

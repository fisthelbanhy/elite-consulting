import type { MembreMoi } from '$lib/types';

declare global {
	namespace App {
		interface Error {
			message: string;
		}
		interface Locals {
			membre: MembreMoi | null;
			jeton: string | null;
		}
		interface PageState {
			modal?: string;
		}
	}
}

export {};

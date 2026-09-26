import { redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { api } from '$lib/server/api';
import { fermerSession } from '$lib/server/session';

export const load: PageServerLoad = () => redirect(303, '/');

export const actions: Actions = {
	default: async (event) => {
		if (event.locals.jeton) await api(event, '/auth/logout', { method: 'POST' }).catch(() => {});
		fermerSession(event.cookies);
		redirect(303, '/');
	}
};

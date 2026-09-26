import type { Actions, PageServerLoad } from './$types';
import { charger, exigerConnexion, soumettre } from '$lib/server/api';
import { actionsModeration } from '$lib/server/moderation';
import type { Ok } from '$lib/types';
import type { CourseDetail } from '$lib/types/courses';

export const load: PageServerLoad = async (event) => {
	exigerConnexion(event);
	const course = await charger<CourseDetail>(event, `/courses/${event.params.id}`);
	const q = event.url.searchParams;
	return { course, enregistre: q.has('enregistre'), paye: q.has('paye') };
};

export const actions: Actions = {
	...actionsModeration((p) => `/courses/${p.id}`, '/courses'),
	etatCourse: async (event) => {
		const fd = await event.request.formData();
		const etat_course = Number(fd.get('etat_course'));
		const r = await soumettre<Ok>(event, `/courses/${event.params.id}/etat-course`, { body: { etat_course }, cle: 'suivi' });
		if (!r.ok) return r.echec;
		return { cle: 'suivi', succes: r.data.message };
	}
};

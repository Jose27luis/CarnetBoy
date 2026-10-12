export const CHILD_TABS = [
  { slug: 'datos', label: 'Datos y apoderados' },
  { slug: 'vacunas', label: 'Vacunas' },
  { slug: 'crecimiento', label: 'Crecimiento' },
  { slug: 'hemoglobina', label: 'Hemoglobina y hierro' },
  { slug: 'citas', label: 'Citas' },
] as const;

export type ChildTab = (typeof CHILD_TABS)[number]['slug'];

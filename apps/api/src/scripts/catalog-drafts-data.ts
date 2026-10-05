export interface DraftVaccine {
  code: string;
  name: string;
  prevents: string;
}

export interface DraftDose {
  vaccineCode: string;
  doseNumber: number;
  recommendedAgeDays: number;
  maxAgeDays: number;
}

export const SCHEDULE_NORM =
  'NTS N° 196-MINSA/DGIESP-2022, 6.2.1 y Anexo 2. BORRADOR PARA REVISIÓN: hexavalente (RM 709-2025), neumococo PCV20 (RM 474-2025) y RM 218-2024';

export const HEMOGLOBIN_NORM = 'NTS N° 213-MINSA/DGIESP-2024 (RM 251-2024-MINSA), Tablas N° 1 y N° 13';

export const DRAFT_VACCINES: readonly DraftVaccine[] = [
  { code: 'BCG', name: 'BCG', prevents: 'Formas graves de tuberculosis' },
  { code: 'HVB', name: 'Hepatitis B (HvB) del recién nacido', prevents: 'Hepatitis B' },
  { code: 'PENTA', name: 'Pentavalente (DPT-HvB-Hib)', prevents: 'Difteria, tos convulsiva, tétanos, hepatitis B y Haemophilus influenzae tipo b' },
  { code: 'IPV', name: 'Antipolio inactivada inyectable (IPV)', prevents: 'Poliomielitis' },
  { code: 'APO', name: 'Antipolio oral (APO)', prevents: 'Poliomielitis' },
  { code: 'ROTA', name: 'Rotavirus', prevents: 'Diarrea grave por rotavirus' },
  { code: 'NEUMO', name: 'Neumococo', prevents: 'Neumonía, meningitis y otitis por neumococo' },
  { code: 'INFLU-PED', name: 'Influenza pediátrica', prevents: 'Influenza' },
  { code: 'SPR', name: 'Sarampión, paperas y rubéola (SPR)', prevents: 'Sarampión, paperas y rubéola' },
  { code: 'VARICELA', name: 'Varicela', prevents: 'Varicela' },
  { code: 'AMA', name: 'Antiamarílica (AMA)', prevents: 'Fiebre amarilla' },
  { code: 'HVA', name: 'Hepatitis A (HvA)', prevents: 'Hepatitis A' },
  { code: 'DPT', name: 'DPT (refuerzos)', prevents: 'Difteria, tos convulsiva y tétanos' },
];

export const DRAFT_DOSES: readonly DraftDose[] = [
  { vaccineCode: 'BCG', doseNumber: 1, recommendedAgeDays: 0, maxAgeDays: 1825 },
  { vaccineCode: 'HVB', doseNumber: 1, recommendedAgeDays: 0, maxAgeDays: 7 },
  { vaccineCode: 'PENTA', doseNumber: 1, recommendedAgeDays: 60, maxAgeDays: 2555 },
  { vaccineCode: 'IPV', doseNumber: 1, recommendedAgeDays: 60, maxAgeDays: 1460 },
  { vaccineCode: 'ROTA', doseNumber: 1, recommendedAgeDays: 60, maxAgeDays: 243 },
  { vaccineCode: 'NEUMO', doseNumber: 1, recommendedAgeDays: 60, maxAgeDays: 730 },
  { vaccineCode: 'PENTA', doseNumber: 2, recommendedAgeDays: 120, maxAgeDays: 2555 },
  { vaccineCode: 'IPV', doseNumber: 2, recommendedAgeDays: 120, maxAgeDays: 1460 },
  { vaccineCode: 'ROTA', doseNumber: 2, recommendedAgeDays: 120, maxAgeDays: 243 },
  { vaccineCode: 'NEUMO', doseNumber: 2, recommendedAgeDays: 120, maxAgeDays: 730 },
  { vaccineCode: 'PENTA', doseNumber: 3, recommendedAgeDays: 180, maxAgeDays: 2555 },
  { vaccineCode: 'APO', doseNumber: 1, recommendedAgeDays: 180, maxAgeDays: 1825 },
  { vaccineCode: 'INFLU-PED', doseNumber: 1, recommendedAgeDays: 180, maxAgeDays: 364 },
  { vaccineCode: 'INFLU-PED', doseNumber: 2, recommendedAgeDays: 210, maxAgeDays: 364 },
  { vaccineCode: 'NEUMO', doseNumber: 3, recommendedAgeDays: 365, maxAgeDays: 730 },
  { vaccineCode: 'SPR', doseNumber: 1, recommendedAgeDays: 365, maxAgeDays: 1825 },
  { vaccineCode: 'VARICELA', doseNumber: 1, recommendedAgeDays: 365, maxAgeDays: 1825 },
  { vaccineCode: 'INFLU-PED', doseNumber: 3, recommendedAgeDays: 365, maxAgeDays: 729 },
  { vaccineCode: 'AMA', doseNumber: 1, recommendedAgeDays: 456, maxAgeDays: 1825 },
  { vaccineCode: 'HVA', doseNumber: 1, recommendedAgeDays: 456, maxAgeDays: 1825 },
  { vaccineCode: 'DPT', doseNumber: 1, recommendedAgeDays: 547, maxAgeDays: 2555 },
  { vaccineCode: 'APO', doseNumber: 2, recommendedAgeDays: 547, maxAgeDays: 1825 },
  { vaccineCode: 'SPR', doseNumber: 2, recommendedAgeDays: 547, maxAgeDays: 1825 },
  { vaccineCode: 'INFLU-PED', doseNumber: 4, recommendedAgeDays: 730, maxAgeDays: 1094 },
  { vaccineCode: 'INFLU-PED', doseNumber: 5, recommendedAgeDays: 1095, maxAgeDays: 1460 },
  { vaccineCode: 'INFLU-PED', doseNumber: 6, recommendedAgeDays: 1461, maxAgeDays: 1825 },
  { vaccineCode: 'DPT', doseNumber: 2, recommendedAgeDays: 1461, maxAgeDays: 2555 },
  { vaccineCode: 'APO', doseNumber: 3, recommendedAgeDays: 1461, maxAgeDays: 1825 },
];

export const DRAFT_THRESHOLDS = [
  { minAgeMonths: 6, maxAgeMonths: 23, normalFrom: '10.5', mildFrom: '9.5', moderateFrom: '7.0' },
  { minAgeMonths: 24, maxAgeMonths: 59, normalFrom: '11.0', mildFrom: '10.0', moderateFrom: '7.0' },
  { minAgeMonths: 60, maxAgeMonths: 143, normalFrom: '11.5', mildFrom: '11.0', moderateFrom: '8.0' },
] as const;

export const DRAFT_ALTITUDE_ADJUSTMENTS = [
  { minAltitude: 0, maxAltitude: 499, subtract: '0' },
  { minAltitude: 500, maxAltitude: 999, subtract: '0.4' },
  { minAltitude: 1000, maxAltitude: 1499, subtract: '0.8' },
  { minAltitude: 1500, maxAltitude: 1999, subtract: '1.1' },
  { minAltitude: 2000, maxAltitude: 2499, subtract: '1.4' },
  { minAltitude: 2500, maxAltitude: 2999, subtract: '1.8' },
  { minAltitude: 3000, maxAltitude: 3499, subtract: '2.1' },
  { minAltitude: 3500, maxAltitude: 3999, subtract: '2.5' },
  { minAltitude: 4000, maxAltitude: 4499, subtract: '2.9' },
  { minAltitude: 4500, maxAltitude: 4999, subtract: '3.3' },
] as const;

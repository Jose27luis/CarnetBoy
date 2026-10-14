const MONTH_DAYS = 30.4375;

export interface CareMilestone {
  label: string;
  days: number;
}

function months(count: number): number {
  return Math.round(count * MONTH_DAYS);
}

function ageLabel(totalMonths: number): string {
  const years = Math.floor(totalMonths / 12);
  const rest = totalMonths % 12;

  if (years === 0) {
    return `${rest} m`;
  }

  return rest === 0 ? `${years} a` : `${years} a ${rest} m`;
}

const MONTHLY = Array.from({ length: 11 }, (_, index) => index + 1);
const BIMONTHLY = [12, 14, 16, 18, 20, 22];
const QUARTERLY = Array.from({ length: 13 }, (_, index) => 24 + index * 3);

export const CARE_MILESTONES: readonly CareMilestone[] = [
  { label: '2 d', days: 2 },
  { label: '7 d', days: 7 },
  { label: '15 d', days: 15 },
  { label: '21 d', days: 21 },
  ...[...MONTHLY, ...BIMONTHLY, ...QUARTERLY].map((count) => ({ label: ageLabel(count), days: months(count) })),
];

export function nearestMilestone(ageDays: number): number {
  let best = 0;

  CARE_MILESTONES.forEach((milestone, index) => {
    const current = CARE_MILESTONES[best];

    if (current !== undefined && Math.abs(milestone.days - ageDays) < Math.abs(current.days - ageDays)) {
      best = index;
    }
  });

  return best;
}

export function addDaysTo(date: string, days: number): string {
  return new Date(Date.parse(`${date}T00:00:00Z`) + days * 86_400_000).toISOString().slice(0, 10);
}

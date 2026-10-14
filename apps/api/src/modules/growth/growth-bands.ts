import { daysBetween, growthBands, parseCalendarDate } from '@carnet/clinical';
import type { GrowthBands, Sex } from '@carnet/contracts';
import { todayInLima } from '../../common/clinical/record-meta';

const BANDS_MIN_DAYS = 365;
const BANDS_MAX_DAYS = 1856;
const BANDS_MARGIN_DAYS = 90;
const FINE_RANGE_DAYS = 730;

export function bandsFor(sex: Sex, birthDate: string, now: Date): GrowthBands {
  const ageDays = daysBetween(parseCalendarDate(birthDate), todayInLima(now));
  const to = Math.min(BANDS_MAX_DAYS, Math.max(BANDS_MIN_DAYS, ageDays + BANDS_MARGIN_DAYS));
  const step = to <= FINE_RANGE_DAYS ? 7 : 14;

  return {
    weightForAge: growthBands('WEIGHT_FOR_AGE', sex, 0, to, step),
    lengthForAge: growthBands('LENGTH_FOR_AGE', sex, 0, to, step),
    headForAge: growthBands('HEAD_FOR_AGE', sex, 0, to, step),
  };
}

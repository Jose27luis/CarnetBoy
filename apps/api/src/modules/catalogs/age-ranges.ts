export interface AgeRange {
  minAgeMonths: number;
  maxAgeMonths: number;
}

export function rangesOverlap(left: AgeRange, right: AgeRange): boolean {
  return left.minAgeMonths <= right.maxAgeMonths && right.minAgeMonths <= left.maxAgeMonths;
}

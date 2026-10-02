export const ALTITUDE_MIN_METERS = 0;
export const ALTITUDE_MAX_METERS = 5000;
export const IPRESS_CODE_PATTERN = /^\d{8}$/;

export interface Facility {
  id: string;
  ipressCode: string;
  name: string;
  healthNetwork: string;
  altitudeMeters: number;
  active: boolean;
  version: number;
}

export interface FacilityAssignmentItem {
  accountId: string;
  facilityId: string;
  facilityName: string;
  ipressCode: string;
  startedAt: string;
}

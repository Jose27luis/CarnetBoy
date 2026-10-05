import type { Facility, FacilityActivity, FacilityAssignmentItem, StaffAccount } from '@carnet/contracts';
import type { Metadata } from 'next';
import { loadOrFail } from '@/lib/session';
import { FacilitiesBoard, type FacilityView } from './facilities-board';

export const metadata: Metadata = { title: 'Establecimientos' };

export default async function FacilitiesPage(): Promise<React.JSX.Element> {
  const [facilities, assignments, accounts, activity] = await Promise.all([
    loadOrFail<Facility[]>('/v1/admin/facilities'),
    loadOrFail<FacilityAssignmentItem[]>('/v1/admin/facilities/assignments'),
    loadOrFail<StaffAccount[]>('/v1/admin/accounts'),
    loadOrFail<FacilityActivity[]>('/v1/admin/facility-activity'),
  ]);
  const names = new Map(accounts.map((account) => [account.id, account.fullName]));
  const activityByFacility = new Map(activity.map((item) => [item.facilityId, item]));

  const views: FacilityView[] = facilities.map((facility) => ({
    facility,
    digitizers: assignments
      .filter((assignment) => assignment.facilityId === facility.id)
      .map((assignment) => ({ id: assignment.accountId, fullName: names.get(assignment.accountId) ?? 'Digitador' })),
    childrenRegistered: activityByFacility.get(facility.id)?.childrenRegistered ?? 0,
    linksCreated: activityByFacility.get(facility.id)?.linksCreated ?? 0,
  }));

  return <FacilitiesBoard views={views} />;
}

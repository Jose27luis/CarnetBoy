import { Injectable } from '@nestjs/common';
import type { AdminDashboard, AnemiaClass, AppointmentOutcomes, DigitizerDashboard, LabeledCount, MonthlyActivity, WeeklyActivity } from '@carnet/contracts';
import { Prisma } from '@prisma/client';
import { todayInLima } from '../../common/clinical/record-meta';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { toDateColumn } from '../catalogs/calendar-date-column';

const MONTHS = 6;
const WEEKS = 8;
const TOP = 6;
const UPCOMING = 5;

interface CountRow {
  key: string | null;
  count: bigint;
}

function counts(rows: readonly CountRow[]): LabeledCount[] {
  return rows.map((row) => ({ key: row.key ?? 'SIN_DATO', count: Number(row.count) }));
}

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async adminDashboard(now: Date = new Date()): Promise<AdminDashboard> {
    const today = toDateColumn(todayInLima(now));
    const [totals, monthly, nutrition, anemia, appointments, topVaccines, facilities] = await Promise.all([
      this.totals(today),
      this.monthly(),
      this.prisma.$queryRaw<CountRow[]>`
        SELECT status AS key, COUNT(*) AS count FROM (
          SELECT DISTINCT ON (child_id) COALESCE(weight_for_length, weight_for_age) AS status
          FROM growth_checks WHERE is_current ORDER BY child_id, measured_on DESC, recorded_at DESC
        ) latest GROUP BY status ORDER BY count DESC
      `,
      this.prisma.$queryRaw<{ classification: AnemiaClass; count: bigint }[]>`
        SELECT classification, COUNT(*) AS count FROM (
          SELECT DISTINCT ON (child_id) classification
          FROM hemoglobin_tests WHERE is_current ORDER BY child_id, tested_on DESC, recorded_at DESC
        ) latest GROUP BY classification ORDER BY count DESC
      `,
      this.outcomes(today),
      this.prisma.$queryRaw<CountRow[]>`
        SELECT v.name AS key, COUNT(*) AS count FROM administered_doses d JOIN vaccines v ON v.id = d.vaccine_id
        WHERE d.is_current AND d.administered_on >= ${today}::date - INTERVAL '180 days'
        GROUP BY v.name ORDER BY count DESC LIMIT ${TOP}
      `,
      this.prisma.$queryRaw<CountRow[]>`
        SELECT f.name AS key, COUNT(*) AS count FROM (
          SELECT facility_id FROM administered_doses WHERE recorded_at >= NOW() - INTERVAL '30 days'
          UNION ALL SELECT facility_id FROM growth_checks WHERE recorded_at >= NOW() - INTERVAL '30 days'
          UNION ALL SELECT facility_id FROM hemoglobin_tests WHERE recorded_at >= NOW() - INTERVAL '30 days'
          UNION ALL SELECT facility_id FROM iron_supplies WHERE recorded_at >= NOW() - INTERVAL '30 days'
        ) records JOIN facilities f ON f.id = records.facility_id
        GROUP BY f.name ORDER BY count DESC LIMIT ${TOP}
      `,
    ]);

    return {
      totals,
      monthly,
      nutrition: counts(nutrition),
      anemia: anemia.map((row) => ({ classification: row.classification, count: Number(row.count) })),
      appointments,
      topVaccines: counts(topVaccines),
      facilities: counts(facilities),
    };
  }

  async digitizerDashboard(facilityId: string, now: Date = new Date()): Promise<DigitizerDashboard> {
    const today = toDateColumn(todayInLima(now));
    const [todayRows, overdue, month, weekly, upcoming] = await Promise.all([
      this.prisma.appointment.groupBy({ by: ['status'], where: { facilityId, scheduledOn: today }, _count: { _all: true } }),
      this.prisma.appointment.count({ where: { facilityId, status: 'SCHEDULED', scheduledOn: { lt: today } } }),
      this.prisma.$queryRaw<{ registrations: bigint; doses: bigint; growth: bigint; hemoglobin: bigint; iron: bigint }[]>`
        WITH start AS (SELECT date_trunc('month', NOW() AT TIME ZONE 'America/Lima') AT TIME ZONE 'America/Lima' AS at)
        SELECT
          (SELECT COUNT(*) FROM children, start WHERE created_at_facility_id = ${facilityId}::uuid AND created_at >= start.at) AS registrations,
          (SELECT COUNT(*) FROM administered_doses, start WHERE facility_id = ${facilityId}::uuid AND recorded_at >= start.at) AS doses,
          (SELECT COUNT(*) FROM growth_checks, start WHERE facility_id = ${facilityId}::uuid AND recorded_at >= start.at) AS growth,
          (SELECT COUNT(*) FROM hemoglobin_tests, start WHERE facility_id = ${facilityId}::uuid AND recorded_at >= start.at) AS hemoglobin,
          (SELECT COUNT(*) FROM iron_supplies, start WHERE facility_id = ${facilityId}::uuid AND recorded_at >= start.at) AS iron
      `,
      this.prisma.$queryRaw<{ week: Date; records: bigint }[]>`
        WITH weeks AS (
          SELECT generate_series(
            date_trunc('week', NOW() AT TIME ZONE 'America/Lima') - INTERVAL '${Prisma.raw(String(WEEKS - 1))} weeks',
            date_trunc('week', NOW() AT TIME ZONE 'America/Lima'),
            INTERVAL '1 week'
          ) AS week
        ),
        records AS (
          SELECT recorded_at FROM administered_doses WHERE facility_id = ${facilityId}::uuid
          UNION ALL SELECT recorded_at FROM growth_checks WHERE facility_id = ${facilityId}::uuid
          UNION ALL SELECT recorded_at FROM hemoglobin_tests WHERE facility_id = ${facilityId}::uuid
          UNION ALL SELECT recorded_at FROM iron_supplies WHERE facility_id = ${facilityId}::uuid
        )
        SELECT weeks.week, COUNT(records.recorded_at) AS records
        FROM weeks LEFT JOIN records ON date_trunc('week', records.recorded_at AT TIME ZONE 'America/Lima') = weeks.week
        GROUP BY weeks.week ORDER BY weeks.week
      `,
      this.prisma.appointment.findMany({
        where: { facilityId, status: 'SCHEDULED', scheduledOn: { gte: today } },
        orderBy: [{ scheduledOn: 'asc' }, { createdAt: 'asc' }],
        take: UPCOMING,
        include: { child: { select: { givenNames: true, paternalSurname: true } } },
      }),
    ]);
    const byStatus = new Map(todayRows.map((row) => [row.status, row._count._all]));
    const totalsRow = month[0];

    return {
      today: {
        scheduled: (byStatus.get('SCHEDULED') ?? 0) + (byStatus.get('ATTENDED') ?? 0) + (byStatus.get('MISSED') ?? 0),
        attended: byStatus.get('ATTENDED') ?? 0,
        missed: byStatus.get('MISSED') ?? 0,
      },
      overdueAppointments: overdue,
      month: {
        registrations: Number(totalsRow?.registrations ?? 0),
        doses: Number(totalsRow?.doses ?? 0),
        growthChecks: Number(totalsRow?.growth ?? 0),
        hemoglobinTests: Number(totalsRow?.hemoglobin ?? 0),
        ironSupplies: Number(totalsRow?.iron ?? 0),
      },
      weekly: weekly.map((row): WeeklyActivity => ({ week: row.week.toISOString().slice(0, 10), records: Number(row.records) })),
      upcoming: upcoming.map((appointment) => ({
        childId: appointment.childId,
        childName: `${appointment.child.givenNames} ${appointment.child.paternalSurname}`,
        type: appointment.type,
        scheduledOn: appointment.scheduledOn.toISOString().slice(0, 10),
      })),
    };
  }

  private async totals(today: Date): Promise<AdminDashboard['totals']> {
    const [children, activeGuardians, activeDigitizers, activeFacilities, pendingCorrections, upcomingAppointments] = await Promise.all([
      this.prisma.child.count(),
      this.prisma.guardianLink.count({ where: { status: 'ACTIVE' } }),
      this.prisma.account.count({ where: { role: 'DIGITIZER', status: 'ACTIVE' } }),
      this.prisma.facility.count({ where: { active: true } }),
      this.prisma.correctionRequest.count({ where: { status: 'REQUESTED' } }),
      this.prisma.appointment.count({ where: { status: 'SCHEDULED', scheduledOn: { gte: today } } }),
    ]);

    return { children, activeGuardians, activeDigitizers, activeFacilities, pendingCorrections, upcomingAppointments };
  }

  private async monthly(): Promise<MonthlyActivity[]> {
    const rows = await this.prisma.$queryRaw<{ month: Date; registrations: bigint; doses: bigint; growth: bigint; hemoglobin: bigint }[]>`
      WITH months AS (
        SELECT generate_series(
          date_trunc('month', NOW() AT TIME ZONE 'America/Lima') - INTERVAL '${Prisma.raw(String(MONTHS - 1))} months',
          date_trunc('month', NOW() AT TIME ZONE 'America/Lima'),
          INTERVAL '1 month'
        ) AS month
      )
      SELECT months.month,
        (SELECT COUNT(*) FROM children WHERE date_trunc('month', created_at AT TIME ZONE 'America/Lima') = months.month) AS registrations,
        (SELECT COUNT(*) FROM administered_doses WHERE is_current AND date_trunc('month', administered_on) = months.month) AS doses,
        (SELECT COUNT(*) FROM growth_checks WHERE is_current AND date_trunc('month', measured_on) = months.month) AS growth,
        (SELECT COUNT(*) FROM hemoglobin_tests WHERE is_current AND date_trunc('month', tested_on) = months.month) AS hemoglobin
      FROM months ORDER BY months.month
    `;

    return rows.map((row) => ({
      month: row.month.toISOString().slice(0, 7),
      registrations: Number(row.registrations),
      doses: Number(row.doses),
      growthChecks: Number(row.growth),
      hemoglobinTests: Number(row.hemoglobin),
    }));
  }

  private async outcomes(today: Date): Promise<AppointmentOutcomes> {
    const rows = await this.prisma.$queryRaw<{ status: string; count: bigint }[]>`
      SELECT status::text AS status, COUNT(*) AS count FROM appointments
      WHERE scheduled_on BETWEEN ${today}::date - INTERVAL '30 days' AND ${today}::date
      GROUP BY status
    `;
    const byStatus = new Map(rows.map((row) => [row.status, Number(row.count)]));

    return {
      attended: byStatus.get('ATTENDED') ?? 0,
      missed: byStatus.get('MISSED') ?? 0,
      cancelled: byStatus.get('CANCELLED') ?? 0,
      open: byStatus.get('SCHEDULED') ?? 0,
    };
  }
}

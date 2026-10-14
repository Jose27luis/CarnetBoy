import type { AppointmentType } from './catalogs';
import type { AnemiaClass } from './clinical';

export interface MonthlyActivity {
  month: string;
  registrations: number;
  doses: number;
  growthChecks: number;
  hemoglobinTests: number;
}

export interface LabeledCount {
  key: string;
  count: number;
}

export interface AppointmentOutcomes {
  attended: number;
  missed: number;
  cancelled: number;
  open: number;
}

export interface AdminDashboard {
  totals: {
    children: number;
    activeGuardians: number;
    activeDigitizers: number;
    activeFacilities: number;
    pendingCorrections: number;
    upcomingAppointments: number;
  };
  monthly: MonthlyActivity[];
  nutrition: LabeledCount[];
  anemia: { classification: AnemiaClass; count: number }[];
  appointments: AppointmentOutcomes;
  topVaccines: LabeledCount[];
  facilities: LabeledCount[];
}

export interface WeeklyActivity {
  week: string;
  records: number;
}

export interface DashboardAppointment {
  childId: string;
  childName: string;
  type: AppointmentType;
  scheduledOn: string;
}

export interface DigitizerDashboard {
  today: { scheduled: number; attended: number; missed: number };
  overdueAppointments: number;
  month: { registrations: number; doses: number; growthChecks: number; hemoglobinTests: number; ironSupplies: number };
  weekly: WeeklyActivity[];
  upcoming: DashboardAppointment[];
}

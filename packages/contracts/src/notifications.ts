export const NOTIFICATION_KINDS = ['APPOINTMENT_REMINDER', 'DOSE_OVERDUE', 'CARNET_UPDATED'] as const;
export type NotificationKind = (typeof NOTIFICATION_KINDS)[number];

export const NOTIFICATION_CHANNELS = ['EMAIL', 'PUSH'] as const;
export type NotificationChannel = (typeof NOTIFICATION_CHANNELS)[number];

export interface NotificationSettings {
  emailEnabled: boolean;
  pushEnabled: boolean;
  email: string | null;
  registeredEmail: string | null;
  emailConfigured: boolean;
  pushPublicKey: string | null;
  pushDevices: number;
}

export interface PushSubscriptionInput {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

export interface NotificationJob {
  notificationId: string;
}

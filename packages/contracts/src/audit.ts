export interface AuditEventItem {
  id: string;
  occurredAt: string;
  actor: { id: string; fullName: string; email: string | null } | null;
  action: string;
  entity: string;
  entityId: string;
  before: unknown;
  after: unknown;
}

export interface Page<Item> {
  items: Item[];
  nextCursor: string | null;
}

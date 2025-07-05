import { AuditLogModel } from '../models/auditModel';

export async function logAuditEvent({
  job_id,
  action,
  actor,
  details,
}: {
  job_id: string;
  action: string;
  actor?: string;
  details?: string;
}) {
  await AuditLogModel.create({
    job_id,
    action,
    actor,
    details,
    timestamp: new Date(),
  });
}

// Example usage:
// await logAuditEvent({ job_id, action: 'ENCRYPT_PAYLOAD', actor: 'system' });

import { JobModel, JobDocument } from '../models/jobModel';
import { logAuditEvent } from './auditService';
import { encryptPayload, decryptPayload } from '../security/encryption';
import { JobStatus } from '../types/job';
import { v4 as uuidv4 } from 'uuid';
import { processJob } from './jobWorker';
import { sendFailureEmail } from '../utils/emailService';
import { AccountModel } from '../models/accountModel';

// Enqueue a new job
export async function enqueueJob({
  type,
  payload,
  run_at = new Date(),
  actor = 'api',
}: {
  type: string;
  payload: any;
  run_at?: Date;
  actor?: string;
}) {
  // Auto-generate transactionId for transfer jobs if not provided
  if ((type === 'transfer' || type === "reconcile") && !payload.transactionId) {
    payload.transactionId = uuidv4();
  }
  // Encrypt payload
  const encrypted = encryptPayload(JSON.stringify(payload));
  const job : any= await JobModel.create({
    type,
    payload_encrypted: Buffer.from(JSON.stringify(encrypted)),
    status: 'queued',
    run_at : new Date(run_at),
    retry_count: 0,
    created_at: new Date(),
    updated_at: new Date(),
  });
  await logAuditEvent({ job_id: String(job._id), action: 'ENQUEUE', actor });
  return job;
}


// Update job status (with audit log)
export async function updateJobStatus(job: JobDocument, status: JobStatus, details?: string, actor = 'worker') {
  job.status = status;
  job.updated_at = new Date();
  if (status === 'completed') job.completed_at = new Date();
  await job.save();
  await logAuditEvent({ job_id: String(job._id), action: 'STATE_CHANGE', actor, details: `processing -> completed` });

  // Send email if job failed
  if (status === 'failed') {
    let userEmail = '';
    let userDetails = '';
    await logAuditEvent({ job_id: String(job._id), action: 'STATE_CHANGE', actor, details: `processing -> failed` });
    if (job.type === 'transfer') {
      // Get the 'from' account's email and details
      const payload = JSON.parse(decryptPayload(JSON.parse(job.payload_encrypted.toString())));
      const fromAcc = await AccountModel.findOne({ accountId: payload.from });
      if (fromAcc) {
        userEmail = fromAcc.email;
        userDetails = `User: ${fromAcc.name} (Account: ${fromAcc.accountId}, Email: ${fromAcc.email})`;
      }
    }
    const adminEmail : any= process.env.ADMIN_EMAIL;
    const subject = `Job ${job._id} failed`;
    const text = `Job ${job._id} of type ${job.type} has failed due to insufficient funds.\n${userDetails ? userDetails + '\n' : ''}Details: ${details || ''}`;

    if (job.last_error?.includes('insufficient funds')) {
      // Insufficient funds: notify user only
      if (userEmail) await sendFailureEmail([userEmail , adminEmail], subject, text);
    } else {
      // Other failures: notify admin only
      if (adminEmail) await sendFailureEmail(adminEmail, subject, text);
    }
  }
}

// Retry job with exponential backoff
export async function retryJob(job: JobDocument, error: string, maxRetries = 5) {
  job.retry_count += 1;
  job.last_error = error;
  if (job.retry_count > maxRetries) {
    await updateJobStatus(job, 'failed', 'max retries exceeded');

  } else {
    // Exponential backoff: e.g., 2^retry_count minuteas
    const delay = Math.pow(2, job.retry_count) * 1000 * 60;
    job.status = 'queued';
    job.run_at = new Date(Date.now() + delay);
    await job.save();
    await logAuditEvent({ job_id: String(job._id), action: 'RETRY', actor: 'worker', details: `retry_count=${job.retry_count}, delay=${delay}ms` });
  }
}

// Manual replay of failed job
export async function replayJob(jobId: string, actor = 'api') {
  const job = await JobModel.findById(jobId);
  if (!job) throw new Error('Job not found');
  if (job.status !== 'failed') throw new Error('Only failed jobs can be replayed');
  job.status = 'queued';
  job.run_at = new Date();
  await job.save();
  await logAuditEvent({ job_id: String(job._id), action: 'REPLAY', actor });
  // Immediately process the job
  await processJob(job);
}

// Idempotency check: ensure job is not re-processed if completed
export function isJobCompleted(job: JobDocument) {
  return job.status === 'completed';
}

// Decrypt job payload (with audit log)
export function getDecryptedPayload(job: JobDocument, actor = 'worker'): any {
  const encrypted = JSON.parse(job.payload_encrypted.toString());
  logAuditEvent({ job_id: String(job._id), action: 'DECRYPT_PAYLOAD', actor });
  return JSON.parse(decryptPayload(encrypted));
} 
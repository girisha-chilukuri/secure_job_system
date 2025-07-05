import { connectMongo } from '../models/mongo';
import { updateJobStatus, retryJob, isJobCompleted, getDecryptedPayload } from './jobService';
import { JobDocument } from '../models/jobModel';
import { AccountModel } from '../models/accountModel';
import { JobModel } from '../models/jobModel';
import { logAuditEvent } from './auditService';
import { getEnvVarAsNumber } from '../utils/envValidator';

// Load environment variables for worker configuration
const POLL_INTERVAL_MS = getEnvVarAsNumber('WORKER_POLL_INTERVAL');
const BATCH_SIZE = getEnvVarAsNumber('WORKER_BATCH_SIZE');
const JOB_TYPES = ['transfer', 'reconcile']; 
const STUCK_JOB_TIMEOUT_MS = getEnvVarAsNumber('STUCK_JOB_TIMEOUT');

async function processJobByType(type: string, payload: any, job: JobDocument) {
  switch (type) {
    case 'transfer': {
      const { from, to, amount, transactionId } = payload;
      if (!from || !to || !amount || !transactionId) throw new Error('Invalid transfer payload');
      // Atomic debit from source account
      const fromResult = await AccountModel.findOneAndUpdate(
        { accountId: from, balance: { $gte: amount } },
        { $inc: { balance: -amount }, $set: { updated_at: new Date() } },
        { new: true }
      );
      if (!fromResult) throw new Error('Insufficient funds or account not found');
      // Atomic credit to destination account
      const toResult = await AccountModel.findOneAndUpdate(
        { accountId: to },
        { $inc: { balance: amount }, $set: { updated_at: new Date() } },
        { new: true }
      );
      if (!toResult) {
        // Compensate: refund the source account
        await AccountModel.findOneAndUpdate(
          { accountId: from },
          { $inc: { balance: amount }, $set: { updated_at: new Date() } }
        );
        throw new Error('Destination account not found, source refunded');
      }
      break;
    }
    case 'reconcile':
      // TODO: Implement reconcile logic (idempotent)
      break;
    default:
      throw new Error(`Unknown job type: ${type}`);
  }
}

export async function processJob(job: JobDocument) {
  if (isJobCompleted(job)) return; 
  try {
    const payload = getDecryptedPayload(job, 'worker');
    await processJobByType(job.type, payload, job);
    await updateJobStatus(job, 'completed');
    console.log(`Job ${job._id} completed`);
  } catch (err) {
    console.error(`Job ${job._id} failed:`, (err as Error).message);
    await retryJob(job, (err as Error).message);
  }
}

async function pollAndProcessJobs() {
  // Recover stuck jobs
  const now = new Date();
  const stuckJobs = await JobModel.find({
    status: 'processing',
    processing_started_at: { $lte: new Date(now.getTime() - STUCK_JOB_TIMEOUT_MS) }
  });
  for (const job of stuckJobs) {
    job.status = 'queued';
    job.processing_started_at = undefined;
    await job.save();
    
    console.log(`Recovered stuck job ${job._id}`);
  }

  for (const type of JOB_TYPES) {
    // 1. Fetch all eligible jobs for this type
    const jobs = await JobModel.find({
      status: 'queued',
      type,
      run_at: { $lte: new Date() }
    });

    // 2. Split jobs into batches
    for (let i = 0; i < jobs.length; i += BATCH_SIZE) {
      const batch = jobs.slice(i, i + BATCH_SIZE);

      // 3. Atomically claim each job in the batch
      const claimedJobs: JobDocument[] = [];
      for (const job of batch) {
        const claimed = await JobModel.findOneAndUpdate(
          { _id: job._id, status: 'queued' },
          { $set: { status: 'processing', updated_at: new Date(), processing_started_at: new Date() } },
          { new: true }
        );
        if (claimed) claimedJobs.push(claimed);
        await logAuditEvent({ job_id: String(job._id), action: 'STATE_CHANGE', actor : "worker", details: `queued -> processing` });
      }

      // 4. Process all claimed jobs in this batch concurrently
      await Promise.all(claimedJobs.map(processJob));
    }
  }
}

export async function startJobWorker() {
  await connectMongo();
  setInterval(pollAndProcessJobs, POLL_INTERVAL_MS);
  console.log('Job worker started');
}

if (require.main === module) {
  startJobWorker();
} 
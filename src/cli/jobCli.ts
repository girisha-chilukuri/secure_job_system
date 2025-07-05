import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { connectMongo } from '../models/mongo';
import { JobModel } from '../models/jobModel';
import { replayJob } from '../services/jobService';

async function inspectJob(jobId: string) {
  await connectMongo();
  const job = await JobModel.findById(jobId);
  if (!job) {
    console.error('Job not found');
    process.exit(1);
  }
  // Do not print decrypted payload
  console.log({
    id: job._id,
    type: job.type,
    status: job.status,
    created_at: job.created_at,
    updated_at: job.updated_at,
    completed_at: job.completed_at,
    run_at: job.run_at,
    retry_count: job.retry_count,
    last_error: job.last_error,
    rate_limit_key: job.rate_limit_key,
  });
  process.exit(0);
}

async function replayJobCli(jobId: string) {
  await connectMongo();
  try {
    await replayJob(jobId, 'cli');
    console.log('Job replayed');
    process.exit(0);
  } catch (err) {
    console.error('Failed to replay job:', (err as Error).message);
    process.exit(1);
  }
}

yargs(hideBin(process.argv))
  .command('inspect <jobId>', 'Inspect a job', yargs => {
    yargs.positional('jobId', { type: 'string', demandOption: true });
  }, argv => {
    inspectJob(argv.jobId as string);
  })
  .command('replay <jobId>', 'Replay a failed job', yargs => {
    yargs.positional('jobId', { type: 'string', demandOption: true });
  }, argv => {
    replayJobCli(argv.jobId as string);
  })
  .demandCommand(1)
  .help()
  .argv; 
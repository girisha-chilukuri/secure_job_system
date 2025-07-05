import { Request, Response } from 'express';
import { enqueueJob, replayJob } from '../services/jobService';
import { JobModel } from '../models/jobModel';

// POST /jobs
export async function createJob(req: Request, res: Response) {
  try {
    const { type, payload, run_at } = req.body;
    if (!type || !payload) {
      res.status(400).json({ error: 'type and payload are required' });
      return;
    }
    const job = await enqueueJob({ type, payload, run_at, actor: 'api' });
    res.status(201).json({ id: job._id, status: job.status, created_at: job.created_at });
  } catch (err) {
    res.status(500).json({ error: 'Failed to enqueue job', details: (err as Error).message });
  }
}

// GET /jobs/:id
export async function getJob(req: Request, res: Response) {
  try {
    const job = await JobModel.findById(req.params.id);
    if (!job) {
      res.status(404).json({ error: 'Job not found' });
      return
    }
    // Do not return decrypted payload
    res.json({
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
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch job', details: (err as Error).message });
  }
}

// PUT /jobs/:id/replay
export async function replayJobController(req: Request, res: Response) {
  try {
    await replayJob(req.params.id, 'api');
    res.json({ message: 'Job replayed' });
  } catch (err) {
    res.status(400).json({ error: 'Failed to replay job', details: (err as Error).message });
  }
} 
export type JobStatus = 'queued' | 'processing' | 'failed' | 'completed';

export interface Job {
  _id?: string;
  type: string;
  payload_encrypted: Buffer | string;
  status: JobStatus;
  created_at: Date;
  updated_at: Date;
  completed_at?: Date;
  run_at: Date;
  retry_count: number;
  last_error?: string;
  rate_limit_key?: string;
} 
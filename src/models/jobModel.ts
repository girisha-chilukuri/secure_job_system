import mongoose, { Schema, Document } from 'mongoose';
import { JobStatus } from '../types/job';

export interface JobDocument extends Document {
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
  processing_started_at?: Date;
}

const JobSchema = new Schema<JobDocument>({
  type: { type: String, required: true },
  payload_encrypted: { type: Buffer, required: true },
  status: { type: String, enum: ['queued', 'processing', 'failed', 'completed'], required: true },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now },
  completed_at: { type: Date },
  run_at: { type: Date, required: true },
  retry_count: { type: Number, default: 0 },
  last_error: { type: String },
  rate_limit_key: { type: String },
  processing_started_at: { type: Date },
});

export const JobModel = mongoose.model<JobDocument>('Job', JobSchema); 
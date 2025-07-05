import mongoose, { Schema, Document } from 'mongoose';

export interface AuditLogDocument extends Document {
  job_id: string;
  action: string;
  actor?: string;
  timestamp: Date;
  details?: string;
}

const AuditLogSchema = new Schema<AuditLogDocument>({
  job_id: { type: String, required: true },
  action: { type: String, required: true },
  actor: { type: String },
  timestamp: { type: Date, default: Date.now },
  details: { type: String },
});

export const AuditLogModel = mongoose.model<AuditLogDocument>('AuditLog', AuditLogSchema); 
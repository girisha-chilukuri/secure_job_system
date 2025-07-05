export interface AuditLog {
  _id?: string;
  job_id: string;
  action: string;
  actor?: string;
  timestamp: Date;
  details?: string; 
} 
# Secure Job Queue System (Node.js + MongoDB)

## Overview
A robust, auditable, and secure job processing system for fintech operations (e.g., transfers, settlements, balance updates) with:
- Security (encryption at rest, audit logging)
- Idempotency
- Retries with exponential backoff
- Delayed execution
- Concurrency control
- Manual replay and CLI
- MongoDB persistence

---

## Architecture & Job Lifecycle

**Components:**
- **REST API**: Enqueue, inspect, and replay jobs
- **Job Worker**: Polls for jobs, claims and processes them, handles retries and concurrency
- **MongoDB**: Stores jobs, audit logs, and accounts
- **Encryption Module**: Encrypts/decrypts job payloads
- **Audit Log**: Records every state change and sensitive access
- **CLI**: Manual job inspection and replay

**Job Lifecycle:**
1. **Enqueue**: API receives job, encrypts payload, stores as `queued` with `run_at` timestamp
2. **Polling**: Worker polls for jobs where `status: queued` and `run_at <= now`
3. **Claiming**: Worker atomically claims jobs (sets `status: processing`, `processing_started_at`)
4. **Processing**: Worker decrypts payload, runs handler (idempotent)
5. **Completion**: On success, job is marked `completed`; on failure, retried with exponential backoff
6. **Retries**: If max retries exceeded, job is marked `failed` and notifications are sent
7. **Manual Replay**: Failed jobs can be replayed via API/CLI and are processed immediately
8. **Audit**: Every state change and access is logged

---

## Concurrency Strategy
- **Atomic Claiming**: Uses MongoDB's `findOneAndUpdate` to atomically claim jobs for processing, preventing double-processing
- **Batch Processing**: Jobs are processed in batches (configurable size) and each batch is processed concurrently with `Promise.all`
- **Polling**: Worker polls at a configurable interval (e.g., every 3 minutes)
- **Stuck Job Recovery**: Jobs stuck in `processing` for too long are re-queued for retry


---

## Encryption Implementation
- **AES-256-GCM**: All job payloads are encrypted at rest using AES-256-GCM
- **Key Management**: Encryption key is loaded from environment variables
- **Decryption**: Only the worker decrypts payloads for processing; decrypted data is never logged
- **Audit**: Every encrypt/decrypt operation is logged for auditability

---

## Design Trade-offs
- **Why not BullMQ/RabbitMQ?**
  - **Auditability**: MongoDB provides a full audit trail of every job state change and access, which is harder to achieve with Redis-based queues
  - **Encryption at Rest**: Native encryption of job payloads is easier to enforce in MongoDB
  - **Idempotency & Manual Replay**: Custom logic for idempotency, retries, and manual replay is easier to control
  - **No External Broker**: Avoids the operational complexity of running Redis or RabbitMQ for strict audit/compliance needs

---

## Test Scenario: Power Outage Mid-Job & Recovery

**Scenario:**
- A worker claims a job, sets it to `processing`, and starts work
- Before completion, the worker crashes or loses power
- The job is left in `processing` state

**Recovery:**
- On the next poll, the worker checks for jobs stuck in `processing` for more than 5 minutes (configurable)
- These jobs are re-queued for retry
- The job is picked up and processed again (idempotency ensures no duplicate effects)
- All actions are logged in the audit log

**How to Test:**
1. Enqueue a job
2. Start the worker and let it claim the job
3. Kill the worker process before the job completes
4. Restart the worker after >5 minutes
5. The job will be re-queued and retried automatically

---

## Environment Variables
- `MONGO_URI`: MongoDB connection string
- `ENCRYPTION_KEY`: 32-byte key for AES-256-GCM
- `SMTP_USER`, `SMTP_PASS`, `SMTP_SERVICE`: For email notifications
- `ADMIN_EMAIL`: Admin notification email

---

## Running the System
- `npm start` — Start the API server
- `npm run worker` — Start the job worker
- `npm run cli -- inspect <jobId>` — Inspect a job
- `npm run cli -- replay <jobId>` — Manually replay a job

---
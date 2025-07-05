import crypto from 'crypto';

type EncryptionResult = {
  iv: string;
  tag: string;
  data: string;
};

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'changemechangemechangemechangeme'; // 32 chars for AES-256
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // Recommended for GCM

export function encryptPayload(plain: string): EncryptionResult {
  const iv = crypto.randomBytes(IV_LENGTH);
  const key = Buffer.from(ENCRYPTION_KEY, 'utf8');
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(plain, 'utf8', 'base64');
  encrypted += cipher.final('base64');
  const tag = cipher.getAuthTag();
  // TODO: Call audit log for encryption event
  return {
    iv: iv.toString('base64'),
    tag: tag.toString('base64'),
    data: encrypted,
  };
}

export function decryptPayload(enc: EncryptionResult): string {
  const iv = Buffer.from(enc.iv, 'base64');
  const tag = Buffer.from(enc.tag, 'base64');
  const key = Buffer.from(ENCRYPTION_KEY, 'utf8');
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);
  let decrypted = decipher.update(enc.data, 'base64', 'utf8');
  decrypted += decipher.final('utf8');
  // TODO: Call audit log for decryption event
  return decrypted;
} 
import mongoose, { Schema, Document } from 'mongoose';

export interface AccountDocument extends Document {
  accountId: string;
  name: string;
  email: string;
  phone: string;
  balance: number;
  created_at: Date;
  updated_at: Date;
}

const AccountSchema = new Schema<AccountDocument>({
  accountId: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  email: { type: String, required: true },
  phone: { type: String, required: true },
  balance: { type: Number, required: true, default: 0 },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now },
});

export const AccountModel = mongoose.model<AccountDocument>('Account', AccountSchema); 
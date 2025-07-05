import { connectMongo } from '../models/mongo';
import { AccountModel } from '../models/accountModel';

export async function createAccount(accountId: string, name: string, email: string, phone: string, balance: number) {
  await connectMongo();
  const acc = await AccountModel.create({ accountId, name, email, phone, balance });
  console.log('Account created:', acc);
}

export async function updateAccount(accountId: string, balance: number) {
  await connectMongo();
  const acc = await AccountModel.findOneAndUpdate(
    { accountId },
    { balance, updated_at: new Date() },
    { new: true }
  );
  if (!acc) {
    console.log('Account not found');
  } else {
    console.log('Account updated:', acc);
  }
}

// Create 5 sample accounts
async function createSampleAccounts() {
  await createAccount('A1001', 'Alice Smith', 'alice@example.com', '1234567890', 1000);
  await createAccount('A1002', 'Bob Johnson', 'bob@example.com', '2345678901', 1500);
  await createAccount('A1003', 'Charlie Lee', 'charlie@example.com', '3456789012', 2000);
  await createAccount('A1004', 'Diana King', 'diana@example.com', '4567890123', 2500);
  await createAccount('A1005', 'Evan Wright', 'evan@example.com', '5678901234', 3000);
  process.exit(0);
}

// Uncomment to run and add 5 accounts:
createSampleAccounts();

// Example usage (uncomment to run directly):
// createAccount('alice', 'Alice Smith', 'alice@example.com', '1234567890', 1000);
// updateAccount('alice', 2000); 
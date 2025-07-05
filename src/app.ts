import express from 'express';
import dotenv from 'dotenv';
import { connectMongo } from './models/mongo';
import jobRoutes from './routes/jobRoutes';
import { validateEnvironmentVariables, getEnvVarAsNumber } from './utils/envValidator';

// Load environment variables first
dotenv.config();

// Validate all environment variables before proceeding
try {
  validateEnvironmentVariables();
  console.log('✅ Environment variables validated successfully');
} catch (error) {
  console.error('❌ Environment validation failed:');
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}

const app = express();
app.use(express.json());

app.use('/jobs', jobRoutes);

app.use((err: any, req: any, res: any, next: any) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

const PORT = getEnvVarAsNumber('PORT');

connectMongo().then(() => {
  app.listen(PORT, () => {
    console.log(`✅ API server running on port ${PORT}`);
  });
}).catch((error) => {
  console.error('❌ Failed to connect to MongoDB:', error);
  process.exit(1);
});

export default app; 
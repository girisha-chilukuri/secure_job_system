import express from 'express';
import dotenv from 'dotenv';
import { connectMongo } from './models/mongo';
import jobRoutes from './routes/jobRoutes';

dotenv.config();

const app = express();
app.use(express.json());

app.use('/jobs', jobRoutes);

app.use((err: any, req: any, res: any, next: any) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

const PORT = process.env.PORT || 3000;

connectMongo().then(() => {
  app.listen(PORT, () => {
    console.log(`API server running on port ${PORT}`);
  });
});

export default app; 
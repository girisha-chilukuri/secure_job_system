import { Router } from 'express';
import { createJob, getJob, replayJobController } from '../controllers/jobController';

const router = Router();

router.post('/create', createJob);
router.get('/:id', getJob);
router.put('/:id/replay', replayJobController);

export default router; 
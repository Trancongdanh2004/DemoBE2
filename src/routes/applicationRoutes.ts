import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { upload } from '../middlewares/upload';
import { submitApplication } from '../controllers/applicationController';

const router = Router();

// Giới hạn tần suất nộp hồ sơ chặt chẽ hơn: tối đa 20 yêu cầu mỗi 15 phút trên mỗi IP
const submitLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    message: 'Quá nhiều yêu cầu nộp hồ sơ từ IP của bạn. Vui lòng thử lại sau 15 phút.',
  },
});

router.post(
  '/',
  submitLimiter,
  upload.fields([
    { name: 'avatarFile', maxCount: 1 },
    { name: 'bachelorFile', maxCount: 1 },
    { name: 'masterFile', maxCount: 1 },
  ]),
  submitApplication
);

export default router;

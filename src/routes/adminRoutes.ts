import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { authenticateAdmin } from '../middlewares/auth';
import {
  adminLogin,
  getAdminMe,
  getApplications,
  getApplicationById,
  deleteApplication,
  exportApplicationsExcel,
} from '../controllers/adminController';

const router = Router();

// Rate limiter for admin login to prevent brute force
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    message: 'Quá nhiều lần đăng nhập không thành công. Vui lòng thử lại sau 15 phút.',
  },
});

// Public admin routes
router.post('/login', loginLimiter, adminLogin);

// Protected admin routes
router.use(authenticateAdmin);

router.get('/me', getAdminMe);
router.get('/applications/export', exportApplicationsExcel);
router.get('/applications', getApplications);
router.get('/applications/:id', getApplicationById);
router.delete('/applications/:id', deleteApplication);

export default router;

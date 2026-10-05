import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { env } from './config/env';
import prisma from './config/prisma';
import applicationRoutes from './routes/applicationRoutes';
import adminRoutes from './routes/adminRoutes';
import { errorHandler } from './middlewares/errorHandler';

const app = express();

// Security headers
app.use(helmet());

// CORS configuration
const allowedOrigins = [
  env.CLIENT_URL,
  env.CLIENT_URL ? env.CLIENT_URL.replace(/\/$/, '') : '',
  `${env.CLIENT_URL}/`,
  'http://localhost:5173',
  'http://127.0.0.1:5173',
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, server-to-server)
      if (!origin) return callback(null, true);
      if (env.CLIENT_URL === '*' || allowedOrigins.includes(origin) || allowedOrigins.includes(origin.replace(/\/$/, ''))) {
        return callback(null, true);
      }
      return callback(null, true); // Fallback allow to avoid unexpected deployment blocks
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// Body parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    databaseConfigured: Boolean(env.DATABASE_URL),
    cloudinaryConfigured: Boolean(env.CLOUDINARY_CLOUD_NAME),
    orm: 'prisma',
  });
});

// Main Routes
app.use('/api/applications', applicationRoutes);
app.use('/api/admin', adminRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: `Đường dẫn ${req.method} ${req.originalUrl} không tồn tại trên hệ thống.` });
});

// Centralized error handler
app.use(errorHandler);

// Start server
const PORT = env.PORT || 4000;

app.listen(PORT, '0.0.0.0', async () => {
  console.log('==================================================');
  console.log(`🚀 Recruitment Backend API running on port ${PORT}`);
  console.log(`📡 URL: http://localhost:${PORT}/api`);
  console.log(`🌐 Allowed Client URL: ${env.CLIENT_URL}`);
  console.log(`🗄️  Database ORM: Prisma + PostgreSQL (Neon)`);
  console.log('==================================================');

  // Verify DB connection
  if (!env.DATABASE_URL) {
    console.warn('⚠️  DATABASE_URL chưa được thiết lập trong BE/.env.');
    console.warn('👉 Hãy cấu hình Neon DATABASE_URL và chạy `npm run db:push`');
  } else {
    try {
      await prisma.$connect();
      console.log('✅ Kết nối Neon PostgreSQL qua Prisma ORM thành công!');
    } catch (err: any) {
      console.error('❌ Không thể kết nối tới Neon PostgreSQL:', err.message);
    }
  }

  // Check Cloudinary
  if (!env.CLOUDINARY_CLOUD_NAME || !env.CLOUDINARY_API_KEY || !env.CLOUDINARY_API_SECRET) {
    console.warn('⚠️  Cấu hình Cloudinary chưa đầy đủ trong BE/.env.');
  } else {
    console.log(`☁️  Cloudinary Cloud: ${env.CLOUDINARY_CLOUD_NAME} đã cấu hình.`);
  }
});

export default app;

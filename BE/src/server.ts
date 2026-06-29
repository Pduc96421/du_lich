import express, { Application } from 'express';
import { createServer } from 'http';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import cron from 'node-cron';
import { connectDatabase } from './config/database';
import routes from './routes';
import { errorHandler, notFound } from './middleware/errorHandler';
import socketService from './services/socketService';
import bookingService from './services/bookingService';
import tourService from './services/tourService';
import ticketService from './services/ticketService';
// Import models để load tất cả associations
import './models';

// Load env vars (Trigger nodemon reload)
dotenv.config();

// Khởi tạo express app
const app: Application = express();

// Tạo HTTP server
const httpServer = createServer(app);

// Khởi tạo Socket.IO
socketService.initialize(httpServer);

// CORS Configuration
const corsOptions = {
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['Content-Range', 'X-Content-Range'],
  maxAge: 86400, // 24 hours
};

// Middleware
app.use(cors(corsOptions));
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));
app.use(compression());
app.use(cookieParser()); // Parse cookies

// Middleware để parse JSON từ text/plain (cho Postman khi gửi sai Content-Type)
// Tăng giới hạn body lên 50MB (mặc định là 100kb)
app.use(express.json({ 
  type: ['application/json', 'text/plain'],
  limit: '50mb'
}));
app.use(express.urlencoded({ 
  extended: true,
  limit: '50mb'
}));

// Logging middleware
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// API Routes
app.use('/api', routes);

// Error handling
app.use(notFound);
app.use(errorHandler);

// Start server
const PORT = process.env.PORT || 5000;

// Hàm tự động hủy booking expired
const startBookingExpiryChecker = () => {
  // Chạy ngay lập tức lần đầu
  bookingService.cancelExpiredPendingBookings().catch((error) => {
    console.error('❌ Lỗi khi check booking expired:', error);
  });

  // Chạy định kỳ mỗi 1 phút (60000ms)
  // Có thể thay đổi bằng env variable BOOKING_CHECK_INTERVAL_MS
  const checkInterval = Number(process.env.BOOKING_CHECK_INTERVAL_MS) || 60000;
  
  setInterval(() => {
    bookingService.cancelExpiredPendingBookings().catch((error) => {
      console.error('❌ Lỗi khi check booking expired:', error);
    });
  }, checkInterval);

  console.log(`[Trung] Đã khởi động tự động hủy booking expired (mỗi ${checkInterval / 1000} giây)`);
};

// Hàm tự động vô hiệu hóa tours hết hạn
const startTourExpiryChecker = () => {
  // Chạy ngay lập tức lần đầu khi server khởi động
  tourService.deactivateExpiredTours().catch((error) => {
    console.error('❌ Lỗi khi check tour expired:', error);
  });

  // Chạy cron job mỗi ngày lúc 00:00 (nửa đêm)
  // Cron expression: '0 0 * * *' = mỗi ngày lúc 00:00:00
  // Có thể thay đổi bằng env variable TOUR_EXPIRY_CRON hoặc mặc định là '0 0 * * *'
  const cronExpression = process.env.TOUR_EXPIRY_CRON || '0 0 * * *';
  
  cron.schedule(cronExpression, () => {
    console.log('🔄 Đang kiểm tra và vô hiệu hóa tours (2 ngày trước ngày bắt đầu)...');
    tourService.deactivateExpiredTours().catch((error) => {
      console.error('❌ Lỗi khi vô hiệu hóa tours:', error);
    });
  }, {
    scheduled: true,
    timezone: 'Asia/Ho_Chi_Minh', // Timezone Việt Nam
  });

  console.log(`[tuandz] Đã khởi động cron job vô hiệu hóa tours (2 ngày trước start_date, chạy mỗi ngày lúc 00:00)`);
};

// Hàm tự động chuyển trạng thái orders từ confirmed sang completed sau khi qua end_date
const startOrderCompletionChecker = () => {
  // Chạy ngay lập tức lần đầu khi server khởi động
  bookingService.completeExpiredConfirmedOrders().catch((error) => {
    console.error('❌ Lỗi khi check orders cần complete:', error);
  });

  // Chạy cron job mỗi ngày lúc 00:00 (nửa đêm)
  // Cron expression: '0 0 * * *' = mỗi ngày lúc 00:00:00
  // Có thể thay đổi bằng env variable ORDER_COMPLETION_CRON hoặc mặc định là '0 0 * * *'
  const cronExpression = process.env.ORDER_COMPLETION_CRON || '0 0 * * *';
  
  cron.schedule(cronExpression, () => {
    console.log('🔄 Đang kiểm tra và chuyển trạng thái orders từ confirmed sang completed...');
    bookingService.completeExpiredConfirmedOrders()
      .then((result) => {
        if (result.completed > 0) {
          console.log(`✅ ${result.message}`);
        }
      })
      .catch((error) => {
        console.error('❌ Lỗi khi chuyển trạng thái orders:', error);
      });
  }, {
    scheduled: true,
    timezone: 'Asia/Ho_Chi_Minh', // Timezone Việt Nam
  });

  console.log(`[tuandz] Đã khởi động cron job chuyển trạng thái orders sang completed (chạy mỗi ngày lúc 00:00)`);
};

// Hàm tự động hủy vé hết hạn
const startTicketExpiryChecker = () => {
  // Chạy ngay lập tức lần đầu khi server khởi động
  ticketService.cancelExpiredTickets().catch((error) => {
    console.error('❌ Lỗi khi check tickets hết hạn:', error);
  });

  // Chạy cron job mỗi ngày lúc 00:00 (nửa đêm)
  // Cron expression: '0 0 * * *' = mỗi ngày lúc 00:00:00
  // Có thể thay đổi bằng env variable TICKET_EXPIRY_CRON hoặc mặc định là '0 0 * * *'
  const cronExpression = process.env.TICKET_EXPIRY_CRON || '0 0 * * *';
  
  cron.schedule(cronExpression, () => {
    console.log('🔄 Đang kiểm tra và hủy vé hết hạn...');
    ticketService.cancelExpiredTickets()
      .then((result) => {
        if (result.cancelled > 0) {
          console.log(`✅ ${result.message}`);
        }
      })
      .catch((error) => {
        console.error('❌ Lỗi khi hủy vé hết hạn:', error);
      });
  }, {
    scheduled: true,
    timezone: 'Asia/Ho_Chi_Minh', // Timezone Việt Nam
  });

  console.log(`[tuandz] Đã khởi động cron job hủy vé hết hạn (chạy mỗi ngày lúc 00:00)`);
};

const startServer = async () => {
  try {
    // Kết nối database
    await connectDatabase();

    httpServer.listen(PORT, () => {
      console.log(`🚀 Server đang chạy trên port ${PORT}`);
      console.log(`📝 Môi trường: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🔌 Socket.IO đã sẵn sàng`);
      
      // Khởi động tự động hủy booking expired
      startBookingExpiryChecker();
      
      // Khởi động cron job vô hiệu hóa tours hết hạn
      startTourExpiryChecker();
      
      // Khởi động cron job chuyển trạng thái orders sang completed
      startOrderCompletionChecker();
      
      // Khởi động cron job hủy vé hết hạn
      startTicketExpiryChecker();
    });
  } catch (error) {
    console.error('❌ Không thể khởi động server:', error);
    process.exit(1);
  }
};

startServer();

export { app, httpServer };


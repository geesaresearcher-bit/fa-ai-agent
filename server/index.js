import 'dotenv/config';
import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import session from 'express-session';
import MongoStore from 'connect-mongo';
import { connectDb } from './lib/db.js';
import authRoutes from './routes/auth.js';
import chatRoutes from './routes/chat.js';
import taskRoutes from './routes/tasks.js';
import webhookRoutes from './routes/webhooks.js';
import conversationsRoutes from './routes/conversations.js';

import './worker.js';

const app = express();
app.use(cors({
  origin: process.env.FRONTEND_URL,
  credentials: true
}));
app.use(cookieParser());
app.use(bodyParser.json({ limit: '2mb' }));

// Connect to database with error handling
try {
  await connectDb();
  console.log('Database connected successfully');
} catch (error) {
  console.error('Database connection failed:', error);
  console.log('Server will start without database connection');
}

app.use(session({
  name: 'sid',
  secret: process.env.SESSION_SECRET || 'dev_session_secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production', // enable in production with HTTPS
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days (session lifetime)
  },
  store: MongoStore.create({
    mongoUrl: process.env.MONGODB_URI,
    dbName: process.env.DB_NAME || 'fa_agent',
    collectionName: 'sessions',
    stringify: false
  })
}));

// Session debugging middleware
app.use((req, res, next) => {
  if (req.path.includes('/auth/me')) {
    console.log('Session middleware:', {
      sessionId: req.sessionID,
      userId: req.session?.userId,
      cookies: req.headers.cookie
    });
  }
  next();
});

app.use('/auth', authRoutes);
app.use('/chat', chatRoutes);
app.use('/tasks', taskRoutes);
app.use('/webhook', webhookRoutes);
app.use('/conversations', conversationsRoutes);

app.get('/', (req, res) => res.send('Financial Advisor AI Agent Backend'));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    port: process.env.PORT
  });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log('Server listening on', PORT));

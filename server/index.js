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
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Cookie'],
  exposedHeaders: ['Set-Cookie']
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
    sameSite: 'none', // Allow cross-site cookies
    secure: process.env.NODE_ENV === 'production', // enable in production with HTTPS
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days (session lifetime)
    domain: undefined, // Don't restrict domain
    path: '/' // Ensure cookie is available for all paths
  },
  store: MongoStore.create({
    mongoUrl: process.env.MONGODB_URI,
    dbName: process.env.DB_NAME || 'fa_agent',
    collectionName: 'sessions',
    stringify: false,
    touchAfter: 24 * 3600 // lazy session update
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

// Cookie test endpoint
app.get('/test-cookie', (req, res) => {
  console.log('Cookie test:', {
    sessionId: req.sessionID,
    userId: req.session?.userId,
    cookies: req.headers.cookie,
    origin: req.headers.origin,
    referer: req.headers.referer
  });
  
  res.cookie('test-cookie', 'test-value', {
    httpOnly: true,
    sameSite: 'none',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 24 * 60 * 60 * 1000 // 1 day
  });
  
  res.json({
    sessionId: req.sessionID,
    userId: req.session?.userId,
    cookies: req.headers.cookie,
    message: 'Test cookie set'
  });
});

// Session debug endpoint
app.get('/debug-session', (req, res) => {
  console.log('Session debug:', {
    sessionId: req.sessionID,
    userId: req.session?.userId,
    session: req.session,
    cookies: req.headers.cookie,
    origin: req.headers.origin,
    referer: req.headers.referer
  });
  
  res.json({
    sessionId: req.sessionID,
    userId: req.session?.userId,
    session: req.session,
    cookies: req.headers.cookie,
    origin: req.headers.origin,
    referer: req.headers.referer
  });
});

// Test cookie setting endpoint
app.get('/set-test-session', (req, res) => {
  req.session.testUserId = 'test-user-123';
  req.session.testData = { message: 'Test session data' };
  
  console.log('Setting test session:', {
    sessionId: req.sessionID,
    userId: req.session.testUserId
  });
  
  // Set cookie manually
  res.cookie('sid', req.sessionID, {
    httpOnly: true,
    sameSite: 'none',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: '/'
  });
  
  req.session.save((err) => {
    if (err) {
      console.error('Test session save error:', err);
      res.json({ error: 'Session save failed', details: err.message });
    } else {
      console.log('Test session saved successfully');
      res.json({ 
        message: 'Test session set', 
        sessionId: req.sessionID,
        userId: req.session.testUserId 
      });
    }
  });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log('Server listening on', PORT));

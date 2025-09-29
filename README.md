# FA AI Agent

A full-stack AI-powered personal assistant that integrates with Google Workspace and HubSpot to help manage emails, calendar events, contacts, and tasks through natural language conversations.

## 📋 Prerequisites

- Node.js (v16 or higher)
- MongoDB database
- Google Cloud Console project with OAuth2 credentials
- HubSpot developer account
- OpenAI API key

## 🚀 Quick Start

### 1. Clone the Repository
```bash
git clone <repository-url>
cd fa-ai-agent
```

### 2. Install Dependencies

**Backend:**
```bash
cd server
npm install
```

**Frontend:**
```bash
cd client
npm install
```

### 3. Environment Variables

Create a `.env` file in the `server` directory:

```env
# Database
MONGODB_URI=mongodb://localhost:27017/fa-ai-agent

# Server
PORT=4000
NODE_ENV=development
JWT_SECRET=your_jwt_secret_here

# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_OAUTH_CALLBACK=http://localhost:4000/auth/google/callback

# HubSpot OAuth
HUBSPOT_CLIENT_ID=your_hubspot_client_id
HUBSPOT_CLIENT_SECRET=your_hubspot_client_secret
HUBSPOT_OAUTH_CALLBACK=http://localhost:4000/auth/hubspot/callback

# OpenAI
OPENAI_API_KEY=your_openai_api_key

# URLs
FRONTEND_URL=http://localhost:3000
BACKEND_URL=http://localhost:4000
```

### 4. Run the Application

**Start the backend:**
```bash
cd server
npm start
```

**Start the frontend (in a new terminal):**
```bash
cd client
npm start
```

The application will be available at:
- Frontend: http://localhost:3000
- Backend: http://localhost:4000

## 🔧 Setup Instructions

### Google OAuth Setup
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable Gmail API and Google Calendar API
4. Create OAuth2 credentials
5. Add authorized redirect URI: `http://localhost:4000/auth/google/callback`

### HubSpot OAuth Setup
1. Go to [HubSpot Developer Portal](https://developers.hubspot.com/)
2. Create a new app
3. Configure OAuth settings
4. Add redirect URI: `http://localhost:4000/auth/hubspot/callback`
5. Note down Client ID and Client Secret

### OpenAI Setup
1. Go to [OpenAI Platform](https://platform.openai.com/)
2. Create an API key
3. Add the key to your environment variables

## 📁 Project Structure

```
fa-ai-agent/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── App.jsx        # Main app component
│   │   └── api.js         # API client
│   └── package.json
├── server/                # Node.js backend
│   ├── routes/           # API routes
│   ├── lib/              # Utility libraries
│   ├── middleware/       # Express middleware
│   └── index.js          # Server entry point
├── render.yaml           # Render deployment config
└── README.md
```

## 🔐 Authentication Flow

1. **Google OAuth**: User authenticates with Google to access Gmail and Calendar
2. **HubSpot OAuth**: User connects HubSpot account for CRM access
3. **JWT Tokens**: Secure session management with httpOnly cookies
4. **Protected Routes**: All API endpoints require valid authentication

## 🤖 AI Capabilities

The AI agent can help with:

- **Email Management**: Send emails, read messages, organize inbox
- **Calendar Scheduling**: Create events, check availability, manage meetings
- **Contact Management**: Create HubSpot contacts, update information
- **Task Organization**: Create and track tasks across platforms
- **Data Retrieval**: Search and summarize information from connected services


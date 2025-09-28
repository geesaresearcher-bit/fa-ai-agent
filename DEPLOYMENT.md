# Deployment Guide for Render

## Prerequisites

1. **GitHub Repository**: Your code must be in a GitHub repository
2. **Render Account**: Sign up at [render.com](https://render.com)
3. **API Keys**: Gather all required API keys

## Required Environment Variables

Set these in the Render dashboard for your backend service:

### Backend Service Environment Variables:
- `NODE_ENV`: `production`
- `PORT`: `10000` (automatically set by Render)
- `MONGODB_URI`: (automatically set by Render database service)
- `DB_NAME`: `fa_agent`
- `SESSION_SECRET`: (generate a secure random string)
- `FRONTEND_URL`: (automatically set to your frontend URL)
- `OPENAI_API_KEY`: Your OpenAI API key
- `GOOGLE_CLIENT_ID`: Your Google OAuth client ID
- `GOOGLE_CLIENT_SECRET`: Your Google OAuth client secret
- `GOOGLE_REFRESH_TOKEN`: Your Google refresh token
- `HUBSPOT_ACCESS_TOKEN`: Your HubSpot access token

### Frontend Service Environment Variables:
- `REACT_APP_API_URL`: (automatically set to your backend URL)

## Deployment Steps

### 1. Prepare Your Repository
```bash
# Make sure all files are committed
git add .
git commit -m "Prepare for Render deployment"
git push origin main
```

### 2. Deploy to Render

#### Option A: Using render.yaml (Recommended)
1. Go to [render.com](https://render.com) and sign in
2. Click "New +" → "Blueprint"
3. Connect your GitHub repository
4. Render will automatically detect the `render.yaml` file
5. Click "Apply" to deploy all services

#### Option B: Manual Setup
If you prefer to set up services manually:

1. **Create Database**:
   - Go to "New +" → "MongoDB" (if available) or use external MongoDB service
   - Name it `fa-ai-agent-db`
   - Note the connection string
   - **Alternative**: Use MongoDB Atlas (free tier) or keep your existing MongoDB setup

2. **Deploy Backend**:
   - Go to "New +" → "Web Service"
   - Connect your GitHub repository
   - Set:
     - **Name**: `fa-ai-agent-backend`
     - **Root Directory**: `server`
     - **Build Command**: `npm install`
     - **Start Command**: `npm start`
     - **Environment**: `Node`
   - Add all environment variables listed above

3. **Deploy Frontend**:
   - Go to "New +" → "Static Site"
   - Connect your GitHub repository
   - Set:
     - **Name**: `fa-ai-agent-frontend`
     - **Root Directory**: `client`
     - **Build Command**: `npm install && npm run build`
     - **Publish Directory**: `build`

### 3. Configure Environment Variables
1. Go to each service in your Render dashboard
2. Navigate to "Environment" tab
3. Add all the required environment variables
4. Make sure to use the actual URLs provided by Render for cross-service communication

### 4. Update OAuth Settings
After deployment, update your OAuth application settings:
- **Google OAuth**: Update redirect URIs to include your Render URLs
- **HubSpot**: Update webhook URLs to point to your Render backend

## Post-Deployment Checklist

- [ ] Backend service is running and healthy
- [ ] Frontend service is accessible
- [ ] Database connection is working
- [ ] Environment variables are set correctly
- [ ] OAuth redirects are updated
- [ ] API endpoints are responding
- [ ] CORS is configured properly

## Troubleshooting

### Common Issues:
1. **Build Failures**: Check that all dependencies are in package.json
2. **Environment Variables**: Ensure all required variables are set
3. **CORS Issues**: Verify FRONTEND_URL is set correctly
4. **Database Connection**: Check MONGODB_URI format
5. **OAuth Issues**: Update redirect URIs in OAuth providers

### Logs:
- Check service logs in Render dashboard
- Backend logs: Service → "Logs" tab
- Frontend logs: Service → "Logs" tab

## Cost Considerations

- **Free Tier**: Limited to 750 hours/month per service
- **Database**: Free tier has limited storage
- **Bandwidth**: Free tier has usage limits
- Consider upgrading to paid plans for production use

## Security Notes

- Never commit API keys to your repository
- Use Render's environment variable system
- Enable HTTPS in production
- Set secure session secrets
- Configure proper CORS settings

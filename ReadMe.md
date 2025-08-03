# VideoVerse Backend

This is the backend server for VideoVerse, a video sharing platform.

## Deployment Instructions for Render

### Build Commands
```bash
npm install
```

### Start Command
```bash
npm start
```

### Environment Variables Required
- `MONGODB_URI`: MongoDB connection string
- `PORT`: Port number (default: 8000)
- `CORS_ORIGIN`: Frontend application URL
- `CLOUDINARY_CLOUD_NAME`: Cloudinary cloud name
- `CLOUDINARY_API_KEY`: Cloudinary API key
- `CLOUDINARY_API_SECRET`: Cloudinary API secret
- `ACCESS_TOKEN_SECRET`: JWT access token secret
- `ACCESS_TOKEN_EXPIRY`: JWT access token expiry
- `REFRESH_TOKEN_SECRET`: JWT refresh token secret
- `REFRESH_TOKEN_EXPIRY`: JWT refresh token expiry

## API Documentation
Base URL: `https://your-render-url.onrender.com/api/v1`

### Available Routes
- `/users` - User management
- `/videos` - Video management
- `/comments` - Comment management
- `/likes` - Like management
- `/playlist` - Playlist management
- `/tweet` - Tweet management
- `/subscriptions` - Subscription management
- `/dashboard` - Dashboard data
# Firebase Setup Guide for Life Arrow V1

## 🔥 Firebase Services Configuration

Life Arrow V1 is fully configured to deploy on Firebase with the following services:

### **Configured Services:**
- ✅ **Firebase Authentication** - User login/signup with email/password
- ✅ **Firestore Database** - User profiles, appointments, health data
- ✅ **Firebase Storage** - File uploads, avatars, documents
- ✅ **Firebase Hosting** - Static web app hosting
- ✅ **Firebase Emulators** - Local development environment
- ✅ **Security Rules** - Proper data access controls

## 🚀 Quick Start

### 1. **Create Firebase Project**

**Option A: Firebase Console (Recommended)**
1. Go to [Firebase Console](https://console.firebase.google.com)
2. Click "Create a project"
3. Project name: `Life Arrow V1` (or your preferred name)
4. Enable Google Analytics (optional)
5. Create project

**Option B: Firebase CLI**
```bash
firebase projects:create life-arrow-v1-demo --display-name "Life Arrow V1"
```

### 2. **Enable Required Services**

In the Firebase Console:

1. **Authentication:**
   - Go to Authentication → Sign-in method
   - Enable "Email/Password"
   - Enable "Email link (passwordless sign-in)" (optional)

2. **Firestore Database:**
   - Go to Firestore Database
   - Click "Create database"
   - Choose "Start in test mode" (rules will be updated via deployment)
   - Select a location (closest to your users)

3. **Storage:**
   - Go to Storage
   - Click "Get started"
   - Start in test mode
   - Use default bucket

4. **Hosting:**
   - Go to Hosting
   - Click "Get started"
   - Follow the setup steps

### 3. **Configure Environment Variables**

Create a `.env` file in the project root:

```env
# Firebase Configuration
VITE_FIREBASE_API_KEY=your_api_key_here
VITE_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_FIREBASE_MEASUREMENT_ID=your_measurement_id

# Development Settings
VITE_ENVIRONMENT=development
```

**Get these values from:**
Firebase Console → Project Settings → General → Your apps → Web app

### 4. **Connect Local Project to Firebase**

```bash
# Login to Firebase (if not already done)
firebase login

# Associate project with Firebase project
firebase use --add

# Select your project from the list
# Give it an alias like "default" or "dev"
```

## 🛠️ Development Commands

### **Start Development Environment**

**Option 1: Full Development Stack**
```bash
npm run dev:full
```
This starts both Firebase emulators AND Vite dev server.

**Option 2: Manual Start**
```bash
# Terminal 1: Start Firebase emulators
npm run firebase:emulators

# Terminal 2: Start Vite dev server  
npm run dev
```

### **Development URLs**
- **Vite Dev Server**: http://localhost:5173
- **Firebase Emulator UI**: http://localhost:4000
- **Auth Emulator**: http://localhost:9099
- **Firestore Emulator**: http://localhost:8080
- **Storage Emulator**: http://localhost:9199

## 🚀 Production Deployment

### **Build and Deploy**
```bash
# Build the application
npm run build

# Deploy to Firebase Hosting
firebase deploy

# Or use the combined command
npm run firebase:deploy
```

### **Deploy Specific Services**
```bash
# Deploy only hosting
firebase deploy --only hosting

# Deploy only Firestore rules
firebase deploy --only firestore

# Deploy only storage rules
firebase deploy --only storage
```

## 🔒 Security Rules

### **Firestore Rules** (`firestore.rules`)
- Users can only access their own data
- Practitioners can read their clients' data
- Proper role-based access control

### **Storage Rules** (`storage.rules`)
- Users can only upload to their own folders
- File size limits (10MB)
- File type restrictions (images, PDFs, text)

## 📊 Firebase Configuration Files

### **`firebase.json`**
```json
{
  "hosting": {
    "public": "dist",
    "rewrites": [{"source": "**", "destination": "/index.html"}]
  },
  "firestore": {
    "rules": "firestore.rules",
    "indexes": "firestore.indexes.json"
  },
  "storage": {
    "rules": "storage.rules"
  },
  "emulators": {
    "auth": {"port": 9099},
    "firestore": {"port": 8080},
    "storage": {"port": 9199},
    "ui": {"enabled": true, "port": 4000}
  }
}
```

## 🔧 Troubleshooting

### **Common Issues:**

1. **"No Firebase project configured"**
   ```bash
   firebase use --add
   ```

2. **"Permission denied" in Firestore**
   - Check that authentication is working
   - Verify Firestore rules are deployed

3. **Emulators not starting**
   ```bash
   # Kill any existing processes
   npx kill-port 4000 8080 9099 9199
   
   # Restart emulators
   firebase emulators:start --project=demo-project
   ```

4. **Environment variables not loading**
   - Ensure `.env` file is in project root
   - Restart development server
   - Check variable names start with `VITE_`

## 📝 Next Steps

Once Firebase is set up:

1. **Test Authentication**: Try signing up and logging in
2. **Check Emulator UI**: Verify data is being saved
3. **Deploy to Staging**: Test the production build
4. **Set up CI/CD**: Automate deployments with GitHub Actions

## 🎯 Production Checklist

Before going live:

- [ ] Enable Firestore security rules
- [ ] Configure proper CORS settings
- [ ] Set up monitoring and alerts
- [ ] Configure custom domain (optional)
- [ ] Enable Firebase Analytics
- [ ] Set up error reporting
- [ ] Configure backup policies

---

**Life Arrow V1 is ready for Firebase! 🚀**

The authentication system, database structure, and security rules are all production-ready. 
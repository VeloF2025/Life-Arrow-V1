# Life Arrow V1 - Wellness Management Platform

A comprehensive wellness management platform with dual interfaces for practitioners/admins and clients, built with React 18 + TypeScript + Vite + Firebase + Tailwind CSS. Features a complete admin management system with full CRUD operations for Services, Treatment Centres, and Staff Management.

## 🚀 Quick Start for Agents/Developers

### Prerequisites
- **Node.js 18+** (Recommended: v18.18.0 or higher)
- **npm** (comes with Node.js)
- **Firebase account** (for production deployment)
- **Git** for version control

### ⚡ Development Environment Setup

#### 1. Clone and Install Dependencies
```bash
cd life-arrow-v1
npm install
```

#### 2. **IMPORTANT**: Fix React Firebase Hooks Package (Required!)
The `react-firebase-hooks` package has known entry point issues. Fix it immediately:
```bash
npm install react-firebase-hooks@5.1.1 --force
```

#### 3. Clean Up Development Ports (If Multiple Instances Running)
If you see port conflicts (5173-5185 in use), clean up first:
```bash
# Windows PowerShell
taskkill /F /IM node.exe

# macOS/Linux
pkill node
```

#### 4. Start Development Server
```bash
npm run dev
```

The server will automatically find an available port (typically 5173, 5174, etc.).

### 🛠️ Development Scripts

```bash
# Main development server
npm run dev

# Full development environment (Vite + Firebase Emulators)
npm run dev:full

# Build for production
npm run build

# Lint code
npm run lint

# Preview production build
npm run preview

# Firebase emulators only
npm run firebase:emulators

# Deploy to Firebase
npm run firebase:deploy
```

## 🏗️ Project Architecture

### Core Tech Stack
- **Frontend**: React 18, TypeScript, Vite
- **Styling**: Tailwind CSS + Headless UI + Heroicons
- **Backend**: Firebase (Auth, Firestore, Storage)
- **State Management**: TanStack Query + React Hook Form
- **Charts**: Recharts
- **Animation**: Framer Motion
- **Development**: ESLint, Prettier, TypeScript ESLint

### Project Structure
```
life-arrow-v1/
├── src/
│   ├── components/
│   │   ├── ui/                 # Reusable UI components (Button, Card, Input, etc.)
│   │   ├── admin/              # Admin management components (CRUD operations)
│   │   ├── forms/              # Form components with validation
│   │   └── layout/             # Layout components (headers, navigation)
│   ├── pages/
│   │   ├── admin/              # Admin/Practitioner pages
│   │   │   ├── Dashboard.tsx   # Main admin dashboard
│   │   │   └── AuditPage.tsx   # System health/audit (super-admin only)
│   │   ├── client/             # Client-facing pages
│   │   ├── auth/               # Authentication pages
│   │   └── *.tsx              # Other pages (landing, registration)
│   ├── hooks/                  # Custom React hooks
│   │   ├── useUserProfile.ts   # User profile management
│   │   ├── useFormAutoSave.ts  # Form auto-save functionality
│   │   └── useProfileCompletion.ts # Profile completion tracking
│   ├── lib/                    # Utilities and configurations
│   │   ├── firebase.ts         # Firebase configuration
│   │   ├── utils.ts           # General utilities
│   │   ├── validation.ts      # Form validation schemas
│   │   └── constants.ts       # App constants
│   ├── types/                  # TypeScript type definitions
│   │   └── index.ts           # Comprehensive type system (780+ lines)
│   └── store/                  # Global state management
├── public/                     # Static assets
├── scripts/                    # Development scripts
│   └── start-dev.js           # Advanced dev environment starter
└── Configuration files
```

## 🎯 Current Implementation Status

### ✅ **COMPLETED Features:**

#### **Core Infrastructure**
- Project setup with Vite + TypeScript + React 18
- Tailwind CSS design system with custom color palette
- Firebase configuration (Auth, Firestore, Storage)
- Comprehensive TypeScript type system (780+ lines)
- Protected routing with role-based access control
- Form validation with React Hook Form + Zod

#### **UI Components Library**
- **Base Components**: Button, Card, Input, TextArea, Select, Checkbox, LoadingSpinner
- **Layout Components**: DashboardHeader, ProgressIndicator
- **Specialized Components**: ProfileCompletionBanner

#### **Authentication System**
- Login/Signup forms with validation
- Role-based access control (super-admin, admin, client)
- User profile management
- Profile completion tracking

#### **Admin Management System (Full CRUD)**
- **Services Management**: Complete CRUD with pricing, qualifications, booking settings, analytics
- **Treatment Centres Management**: Location management, operating hours, capacity settings, analytics
- **Staff Management**: Role management, qualifications, centre assignments, performance metrics
- **Site Health/Audit Page**: System monitoring (super-admin only)

#### **Client Management**
- Client registration with medical history, goals, preferences
- Profile completion system with progress tracking
- Dashboard with wellness metrics and appointments

### 🚧 **NEXT DEVELOPMENT PRIORITIES:**

1. **Firebase Integration**: Connect CRUD operations to Firestore
2. **Authentication Backend**: Implement Firebase Auth integration
3. **Appointment Scheduling**: Calendar system with availability management
4. **Payment Integration**: Stripe/payment processing
5. **Scan Management**: File upload and processing system
6. **Reporting System**: Analytics and dashboard metrics
7. **Notification System**: Email/SMS reminders and alerts

## 🔧 Development Guidelines for Agents

### **Code Style & Standards**
- **TypeScript**: Strict mode enabled, all components fully typed
- **ESLint**: Configured with React hooks rules and TypeScript support
- **Prettier**: Code formatting (run `npm run lint` to check)
- **Component Structure**: Functional components with hooks, named exports preferred

### **Key Development Patterns**
1. **UI Components**: Use the existing component library in `src/components/ui/`
2. **Forms**: Use React Hook Form + Zod validation (see existing forms in `src/components/forms/`)
3. **State Management**: Use TanStack Query for server state, React hooks for local state
4. **Styling**: Tailwind CSS classes, custom colors defined in `tailwind.config.js`
5. **Icons**: Use Heroicons (`@heroicons/react/24/outline` or `/24/solid`)

### **Import/Export Conventions**
- **UI Components**: Named exports (`export { Button }`)
- **Pages**: Default exports (`export default Dashboard`)
- **Utilities**: Named exports (`export const formatPrice = ...`)
- **Types**: All in `src/types/index.ts` with named exports

### **Component Architecture Example**
```tsx
// ✅ Good component structure
import React, { useState } from 'react';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { PlusIcon } from '@heroicons/react/24/outline';

interface Props {
  title: string;
  onAction: () => void;
}

export default function MyComponent({ title, onAction }: Props) {
  const [isLoading, setIsLoading] = useState(false);

  return (
    <Card>
      <h2 className="text-lg font-semibold text-gray-900 mb-4">{title}</h2>
      <Button onClick={onAction} disabled={isLoading}>
        <PlusIcon className="w-4 h-4 mr-2" />
        Add Item
      </Button>
    </Card>
  );
}
```

## 🐛 Common Issues & Troubleshooting

### **1. React Firebase Hooks Import Error**
```
Failed to resolve entry for package "react-firebase-hooks"
```
**Fix**: Reinstall with force flag:
```bash
npm install react-firebase-hooks@5.1.1 --force
```

### **2. Multiple Port Conflicts**
```
Port 5173 is in use, trying another one...
Port 5174 is in use, trying another one...
```
**Fix**: Kill all Node processes:
```bash
# Windows
taskkill /F /IM node.exe

# macOS/Linux  
pkill node
```

### **3. Tailwind Classes Not Working**
**Check**: Ensure Tailwind is properly configured in `tailwind.config.js` and your component file is included in the content paths.

### **4. ESLint/TypeScript Errors**
**Common fixes**:
- Remove unused imports: `import React from 'react'` (not needed in React 18)
- Fix Select component onChange: Use `(value) => setValue(value)` not `(e) => setValue(e.target.value)`
- Remove unused variables: Delete or prefix with underscore `_unusedVar`

### **5. Firebase Configuration**
Create `.env` file in project root:
```env
VITE_FIREBASE_API_KEY=your_api_key_here
VITE_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_FIREBASE_MEASUREMENT_ID=your_measurement_id
```

## 📁 Key Files for Agents

### **Essential Files to Understand**
- **`src/types/index.ts`**: Complete type system (780+ lines) - READ FIRST
- **`src/components/admin/`**: Admin CRUD components with full functionality
- **`src/pages/admin/Dashboard.tsx`**: Main admin interface with role-based sections
- **`src/lib/firebase.ts`**: Firebase configuration
- **`src/lib/validation.ts`**: Form validation schemas
- **`tailwind.config.js`**: Design system configuration

### **Important Patterns to Follow**
- **Role-Based Access**: Check user role before showing admin features
- **Form Validation**: Use existing schemas in `validation.ts`
- **Error Handling**: Consistent error states with LoadingSpinner
- **Responsive Design**: Mobile-first with Tailwind responsive classes
- **Accessibility**: Use semantic HTML and proper ARIA labels

## 🚀 Deployment

### **Development Deployment**
```bash
npm run dev:full  # Starts Vite + Firebase emulators
```

### **Production Deployment**
```bash
npm run build
npm run firebase:deploy
```

### **Environment Configuration**
- **Development**: Uses Firebase emulators
- **Production**: Requires Firebase project setup

## 📊 Performance & Best Practices

### **Code Splitting**
- Pages are lazy-loaded with React.lazy()
- Components are organized by feature
- Shared utilities in dedicated lib/ folder

### **State Management**
- **Server State**: TanStack Query for API calls
- **Form State**: React Hook Form for forms
- **UI State**: React useState/useReducer for local state
- **Global State**: Context API for user authentication

### **Optimization**
- Vite for fast builds and HMR
- TypeScript for type safety
- ESLint for code quality
- Tailwind for optimized CSS

---

## 🤝 Agent Quick Reference

### **Starting Development**
1. `npm install` then `npm install react-firebase-hooks@5.1.1 --force`
2. Kill any existing Node processes if port conflicts occur
3. `npm run dev` to start development server
4. Access at `http://localhost:5173` (or next available port)

### **Making Changes**
1. Check `src/types/index.ts` for existing types
2. Use existing UI components from `src/components/ui/`
3. Follow established patterns in admin components
4. Test role-based access control (super-admin, admin, client)
5. Ensure TypeScript compliance with `npm run lint`

### **Key Commands**
```bash
npm run dev          # Start development
npm run lint         # Check code quality
npm run build        # Build for production
taskkill /F /IM node.exe  # Windows: Kill Node processes
```

**🔗 Development Server**: Usually runs on `http://localhost:5173`  
**🎯 Current Focus**: Admin management system with full CRUD operations  
**👥 User Roles**: super-admin (full access), admin (management), client (self-service)

---

*Last Updated: December 2024 - Full CRUD admin system implemented with role-based access control*

# Life Arrow Application Architecture

## Overview

Life Arrow is a React-based web application built with TypeScript and Firebase. The application provides a comprehensive platform for managing health and wellness services, including appointment scheduling, staff management, client profiles, and administrative functions.

## Technology Stack

- **Frontend**: React 18 with TypeScript
- **Styling**: Tailwind CSS with shadcn/ui components
- **Backend**: Firebase (Authentication, Firestore, Storage, Functions)
- **Build Tool**: Vite
- **Package Manager**: npm

## Application Structure

The application is transitioning to a feature-based architecture with the following structure:

```
src/
  features/           # Feature-specific code
    admin/            # Admin-related features
    auth/             # Authentication features
    clients/          # Client management features
    staff/            # Staff management features
    services/         # Service management features
    appointments/     # Appointment scheduling features
  shared/             # Shared code
    components/       # Reusable UI components
    hooks/            # Custom React hooks
    utils/            # Utility functions
  providers/          # Context providers
  app/                # App-level components
  lib/                # Core libraries and services
  types/              # TypeScript type definitions
```

## Core Features

### Authentication and Authorization

- Firebase Authentication for user management
- Role-based access control (client, staff, admin, super-admin)
- Permission-based UI rendering

### Database Structure

- Firestore collections for users, appointments, services, centres
- Real-time data synchronization
- Optimistic UI updates

### State Management

- React Context for global state
- React Query for server state management
- Local component state for UI-specific state

## Development Approach

- Component-driven development
- Separation of concerns (UI, business logic, data access)
- Progressive enhancement
- Mobile-first responsive design

## Future Considerations

- Performance optimization with code splitting
- Enhanced testing coverage
- Internationalization support
- Offline capabilities

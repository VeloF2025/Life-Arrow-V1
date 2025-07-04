# Life Arrow State Management

## Overview

This document outlines the state management approach for the Life Arrow application. We use a combination of React's built-in state management features and external libraries to manage application state efficiently.

## State Categories

### 1. UI State

UI state refers to the state that controls the user interface but doesn't affect the application data model.

**Examples:**
- Modal open/closed state
- Form input values before submission
- Loading indicators
- Pagination controls
- Expanded/collapsed sections

**Management Approach:**
- Local component state using `useState` and `useReducer` hooks
- Lifted state for closely related components
- Custom hooks for reusable UI logic

### 2. Application State

Application state refers to the state that is relevant to the application as a whole and may be needed by multiple components.

**Examples:**
- Current user authentication status
- User permissions and roles
- Theme preferences
- Global notifications

**Management Approach:**
- React Context API with custom providers
- Context-specific reducers for complex state logic
- Memoization to prevent unnecessary re-renders

### 3. Server State

Server state refers to the data that comes from the server and is cached on the client.

**Examples:**
- User data
- Appointments
- Services
- Client information

**Management Approach:**
- Firebase SDK for real-time data
- Custom hooks for data fetching and caching
- Optimistic UI updates for improved user experience

## State Management Patterns

### Context Providers

We use React Context to provide state to component trees without prop drilling. Each context provider is focused on a specific domain:

```typescript
// src/providers/AuthProvider.tsx
export const AuthProvider: React.FC = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Auth logic...
  
  return (
    <AuthContext.Provider value={{ user, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};
```

### Custom Hooks

We encapsulate state logic in custom hooks to promote reusability and separation of concerns:

```typescript
// src/hooks/useStaffList.ts
export function useStaffList() {
  const [staff, setStaff] = useState<Schema.UserDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Data fetching logic...
  
  return { staff, loading, error, refetch };
}
```

### Component State

For component-specific state, we use React's built-in hooks:

```typescript
// Component-level state
const [isOpen, setIsOpen] = useState(false);
const [formData, setFormData] = useState(initialData);
```

## Best Practices

1. **Keep state as local as possible** - Only lift state up when necessary
2. **Use context sparingly** - Context is not a replacement for all prop passing
3. **Memoize expensive calculations** - Use `useMemo` and `useCallback` for performance
4. **Normalize complex state** - Avoid deeply nested state objects
5. **Separate UI state from data state** - Different types of state have different lifecycles
6. **Use immutable update patterns** - Always create new state objects rather than mutating existing ones
7. **Document state shape** - Use TypeScript interfaces to document state shape

## Future Considerations

- Evaluate React Query for server state management
- Consider Zustand for global state management if application complexity increases
- Implement persistent state for offline capabilities

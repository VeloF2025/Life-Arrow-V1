# Life Arrow Coding Standards

## Overview

This document outlines the coding standards and best practices for the Life Arrow application. Following these standards ensures code consistency, maintainability, and quality across the project.

## TypeScript

### Type Definitions

- Use explicit type annotations for function parameters and return types
- Create interfaces for complex objects
- Use type aliases for union types and complex types
- Avoid using `any` type; use `unknown` when type is truly unknown
- Use generics for reusable components and functions

```typescript
// Good
function getUser(id: string): Promise<UserDocument> { ... }

// Avoid
function getUser(id): Promise<any> { ... }
```

### Imports

- Use named imports for multiple exports from the same module
- Use default imports for single exports
- Group imports by source (external libraries first, then internal modules)
- Use absolute imports for modules outside the current directory
- Use relative imports for modules within the same feature

```typescript
// External libraries
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

// Internal modules
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/hooks/useAuth';
import { formatDate } from '@/utils/date';

// Relative imports
import { StaffCard } from './StaffCard';
```

## React Components

### Component Structure

- Use functional components with hooks
- Keep components focused on a single responsibility
- Extract complex logic to custom hooks
- Use named exports for components
- Place each component in its own file for larger components

```typescript
// StaffList.tsx
export function StaffList({ staff, onEdit, onDelete }: StaffListProps) {
  // Component logic
  return (
    // JSX
  );
}
```

### Props

- Define prop types using interfaces
- Use destructuring for props
- Provide default values for optional props
- Document complex props with JSDoc comments

```typescript
interface ButtonProps {
  /** The variant determines the button's appearance */
  variant?: 'default' | 'primary' | 'secondary' | 'ghost';
  /** The size of the button */
  size?: 'sm' | 'md' | 'lg';
  /** Called when the button is clicked */
  onClick?: () => void;
  /** Whether the button is disabled */
  disabled?: boolean;
  /** The content of the button */
  children: React.ReactNode;
}

export function Button({
  variant = 'default',
  size = 'md',
  onClick,
  disabled = false,
  children,
}: ButtonProps) {
  // Component logic
}
```

### State Management

- Keep state as local as possible
- Use context for truly global state
- Use reducers for complex state logic
- Memoize expensive calculations and callbacks

## File Organization

### Directory Structure

- Organize code by features
- Keep related files together
- Use consistent naming conventions
- Place shared code in the shared directory

```
features/
  staff/
    api/          # API calls related to staff
    components/   # Staff-specific components
    hooks/        # Staff-specific hooks
    pages/        # Staff pages
    types.ts      # Staff-specific types
```

### File Naming

- Use PascalCase for component files: `StaffList.tsx`
- Use camelCase for utility files: `dateUtils.ts`
- Use kebab-case for CSS files: `staff-list.css`
- Use descriptive names that reflect the purpose of the file

## Code Style

### Formatting

- Use consistent indentation (2 spaces)
- Limit line length to 100 characters
- Use semicolons at the end of statements
- Use single quotes for strings
- Add trailing commas in multi-line objects and arrays

### Comments

- Use JSDoc comments for functions and components
- Add comments for complex logic
- Keep comments up-to-date with code changes
- Avoid obvious comments that repeat what the code does

```typescript
/**
 * Formats a date into a localized string
 * @param date - The date to format
 * @param format - The format to use (default: 'short')
 * @returns The formatted date string
 */
function formatDate(date: Date, format: 'short' | 'long' = 'short'): string {
  // Implementation
}
```

## Testing

### Unit Tests

- Write tests for critical functionality
- Use descriptive test names
- Follow the Arrange-Act-Assert pattern
- Mock external dependencies

```typescript
describe('StaffList', () => {
  it('should render a list of staff members', () => {
    // Arrange
    const staff = [...];
    
    // Act
    render(<StaffList staff={staff} />);
    
    // Assert
    expect(screen.getAllByRole('listitem')).toHaveLength(staff.length);
  });
});
```

## Performance

### Optimization

- Memoize expensive calculations with `useMemo`
- Memoize callbacks with `useCallback`
- Use virtualization for long lists
- Lazy load components when appropriate
- Optimize re-renders by avoiding unnecessary state updates

## Accessibility

### Best Practices

- Use semantic HTML elements
- Add appropriate ARIA attributes when necessary
- Ensure keyboard navigation works
- Maintain sufficient color contrast
- Test with screen readers

## Git Workflow

### Commits

- Write clear, descriptive commit messages
- Use present tense for commit messages
- Reference issue numbers in commit messages
- Keep commits focused on a single change

### Branches

- Use feature branches for new features
- Use fix branches for bug fixes
- Use a consistent naming convention for branches
- Keep branches up-to-date with the main branch

## Code Reviews

### Guidelines

- Review code for functionality, readability, and maintainability
- Check for adherence to coding standards
- Provide constructive feedback
- Approve only when all issues are addressed

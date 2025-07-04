# Life Arrow Component Library

## Overview

This document provides an overview of the reusable UI components in the Life Arrow application. The application uses a combination of custom components and shadcn/ui components styled with Tailwind CSS.

## Core UI Components

### Layout Components

#### `PageContainer`
- **Purpose**: Provides consistent page layout with proper padding and max-width
- **Usage**: Wrap page content with this component
- **Props**: `className`, `children`

#### `Card`
- **Purpose**: Displays content in a card format with consistent styling
- **Usage**: Used for sections of related information
- **Props**: `title`, `className`, `children`

### Form Components

#### `Button`
- **Purpose**: Consistent button styling with variants
- **Usage**: Used for actions throughout the application
- **Props**: `variant`, `size`, `className`, `children`, `onClick`, etc.
- **Variants**: `default`, `primary`, `secondary`, `ghost`, `link`, `destructive`

#### `Input`
- **Purpose**: Styled input fields
- **Usage**: Used in forms for text input
- **Props**: Standard input props plus `label`, `error`

#### `Select`
- **Purpose**: Dropdown selection component
- **Usage**: Used for selecting from a list of options
- **Props**: `options`, `value`, `onChange`, `label`, `error`

#### `Checkbox`
- **Purpose**: Styled checkbox input
- **Usage**: Used for boolean selections
- **Props**: Standard checkbox props plus `label`

### Data Display Components

#### `Table`
- **Purpose**: Displays tabular data
- **Usage**: Used for lists of items
- **Props**: `columns`, `data`, `onRowClick`

#### `LoadingSpinner`
- **Purpose**: Indicates loading state
- **Usage**: Used when content is loading
- **Props**: `size`, `className`, `text`

#### `EmptyState`
- **Purpose**: Displays when no data is available
- **Usage**: Used in lists and tables when empty
- **Props**: `title`, `description`, `icon`, `action`

### Feedback Components

#### `Alert`
- **Purpose**: Displays important information
- **Usage**: Used for notifications and warnings
- **Props**: `type`, `title`, `message`, `onClose`
- **Types**: `info`, `success`, `warning`, `error`

#### `Modal`
- **Purpose**: Displays content in a modal dialog
- **Usage**: Used for focused interactions
- **Props**: `isOpen`, `onClose`, `title`, `children`, `footer`

## Feature-Specific Components

### Staff Management

#### `StaffList`
- **Purpose**: Displays a list of staff members
- **Usage**: Used in the staff management page
- **Props**: `staff`, `onEdit`, `onDelete`, `onPromote`

#### `StaffForm`
- **Purpose**: Form for creating and editing staff members
- **Usage**: Used in the staff management page
- **Props**: `staff`, `onSubmit`, `onCancel`

#### `PhotoUploadModal`
- **Purpose**: Modal for uploading and capturing photos
- **Usage**: Used in the staff form
- **Props**: `isOpen`, `onClose`, `onCapture`, `onUpload`

### Appointment Management

#### `AppointmentCalendar`
- **Purpose**: Displays appointments in a calendar view
- **Usage**: Used in the appointment management page
- **Props**: `appointments`, `onSelectSlot`, `onSelectAppointment`

#### `TimeSlotPicker`
- **Purpose**: Allows selection of time slots
- **Usage**: Used in the appointment booking flow
- **Props**: `date`, `availableSlots`, `onSelectSlot`

## Usage Guidelines

1. Always use the appropriate component for the task
2. Maintain consistent styling by using the provided props
3. Avoid direct styling of components when possible
4. Extend components through composition rather than modification
5. Document any new components added to the library

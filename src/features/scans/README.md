# Scan Management System

## Overview
The Scan Management System is a standalone add-on for the Life Arrow admin interface that enables staff and administrators to upload, view, and manage scan files. The system supports CSV file uploads, automatic user matching, data normalization, and assignment of scans to users.

## Features
- CSV file upload with drag-and-drop functionality
- Automatic user matching based on file identifiers
- Data normalization for binary flag values
- Scan listing with filtering and search capabilities
- Detailed view of scan data
- Assignment of unmatched scans to users
- Role-based access control

## Technical Implementation

### Data Models
- **Scan**: Core scan metadata including file identifier, user ID, and timestamps
- **ScanValue**: Individual scan data points with path IDs and normalized values
- **PathDefinition**: Definitions of scan paths and their meanings
- **UnmatchedScan**: Scans that couldn't be automatically matched to a user

### Components
- **ScanFileUpload**: Handles file upload, processing, and saving to Firestore
- **ScanList**: Displays a filterable list of scans
- **ScanDetail**: Shows detailed information about a selected scan
- **ScanManagement**: Main component integrating all scan management functionality

### API Services
- **scanService**: Provides CRUD operations for scans, scan values, and user assignments

### File Processing
- CSV parsing and validation
- User ID extraction from file identifiers
- Data normalization to binary flags
- Automatic categorization of matched/unmatched scans

## Security
- Role-based access control via Firebase security rules
- Only staff and admin users can access scan management features
- Specific permissions for viewing, uploading, assigning, and deleting scans

## Usage
1. Navigate to the Scan Management page via the admin sidebar
2. Upload CSV files using the drag-and-drop interface
3. View the list of scans and filter by status
4. Click on a scan to view detailed information
5. Assign unmatched scans to users as needed

## Future Enhancements
- Dropbox integration for automated scan processing
- Advanced filtering and reporting capabilities
- Batch operations for scan management
- Email notifications for new scans
- Mobile-responsive interface improvements

## Dependencies
- React 18 + TypeScript
- Firebase Firestore for data storage
- React Query for data fetching and caching
- React Dropzone for file upload
- Headless UI for modals and transitions
- Tailwind CSS for styling

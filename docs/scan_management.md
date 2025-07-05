# Life Arrow V1 Scan Management System

## System Overview
Create a comprehensive scan management system that handles file uploads through multiple channels (manual upload and Dropbox API integration) with automatic user matching and data processing capabilities.

## Core Requirements

### 1. File Upload Mechanisms
- **Manual Upload**: Direct file upload interface
- **Dropbox Integration**: Automatic file processing when files are added/edited in a specific Dropbox folder
- **Supported Format**: CSV files with specific structure (see Data Structure section)

### 2. Data Structure and Processing

#### File Structure:
- **Cell A3**: Contains the file identifier with embedded user ID and metadata
  - Format: `{USER_ID} {DATE}T{TIME}^{SEQUENCE}_{SUFFIX}.txt`
  - Example: `7802035087081 2025-4-20T21_10^004_brv.txt`
  - **User ID Extraction**: Extract the first numeric sequence (e.g., `7802035087081`)

- **Row 1 (from B1 onwards)**: Path IDs (constant identifiers)
  - Example: `[1000, 1001, 1002, 1003, ...]`
  - These are permanent reference IDs for each data column

- **Row 2 (from B2 onwards)**: Descriptions (informational, not critical)
  - Example: `["Endocrine", "Gastrointestinal2", "Lymphatic", ...]`

- **Row 3 (from B3 onwards)**: Variable field values (binary flags)
  - Example: `[0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, ...]`
  - These values correspond to the Path IDs above
  - **IMPORTANT**: Values can only be 0 or 1 (binary flags)
  - **Normalization Rule**: Any value > 1 must be converted to 1 during import

### 3. User Matching Logic
- Extract user ID from cell A3 (first numeric sequence)
- Attempt to match against existing user database
- **If matched**: Allocate scan to the specific user's portfolio
- **If unmatched**: Place in "Unmatched Basket" for manual staff allocation

### 4. Database Schema

**IMPORTANT**: The system must create all necessary database tables, indexes, stored procedures, functions, and other database objects during initial setup or deployment.

#### Tables Required:
```sql
-- Users table
CREATE TABLE users (
    id BIGINT PRIMARY KEY,
    name VARCHAR(255),
    email VARCHAR(255),
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);

-- Path definitions (constant reference data)
CREATE TABLE path_definitions (
    path_id INT PRIMARY KEY,
    description VARCHAR(255),
    category VARCHAR(100),
    created_at TIMESTAMP
);

-- Scans table
CREATE TABLE scans (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    file_identifier VARCHAR(500),
    user_id BIGINT NULL, -- NULL if unmatched
    original_filename VARCHAR(255),
    upload_source ENUM('manual', 'dropbox'),
    scan_date DATE,
    scan_time TIME,
    status ENUM('matched', 'unmatched', 'processing', 'error'),
    raw_data_json JSON, -- Store the complete scan data
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Scan values (normalized data storage - binary flags only)
CREATE TABLE scan_values (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    scan_id BIGINT,
    path_id INT,
    value TINYINT(1) NOT NULL, -- 0 or 1 only (binary flag)
    created_at TIMESTAMP,
    FOREIGN KEY (scan_id) REFERENCES scans(id),
    FOREIGN KEY (path_id) REFERENCES path_definitions(path_id),
    CONSTRAINT chk_binary_value CHECK (value IN (0, 1))
);

-- Unmatched basket
CREATE TABLE unmatched_scans (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    scan_id BIGINT,
    staff_notes TEXT,
    assigned_to_staff_id BIGINT,
    resolution_date TIMESTAMP NULL,
    FOREIGN KEY (scan_id) REFERENCES scans(id)
);
```

#### Required Indexes:
```sql
-- Performance indexes
CREATE INDEX idx_scans_user_id ON scans(user_id);
CREATE INDEX idx_scans_status ON scans(status);
CREATE INDEX idx_scans_upload_source ON scans(upload_source);
CREATE INDEX idx_scans_scan_date ON scans(scan_date);
CREATE INDEX idx_scans_file_identifier ON scans(file_identifier);
CREATE INDEX idx_scan_values_scan_id ON scan_values(scan_id);
CREATE INDEX idx_scan_values_path_id ON scan_values(path_id);
CREATE INDEX idx_unmatched_scans_scan_id ON unmatched_scans(scan_id);
CREATE INDEX idx_unmatched_scans_assigned_to ON unmatched_scans(assigned_to_staff_id);

-- Composite indexes for common queries
CREATE INDEX idx_scans_user_date ON scans(user_id, scan_date);
CREATE INDEX idx_scan_values_scan_path ON scan_values(scan_id, path_id);
```

#### Required Database Functions:
```sql
-- Function to extract user ID from file identifier
DELIMITER //
CREATE FUNCTION extract_user_id_from_file_identifier(file_id VARCHAR(500))
RETURNS BIGINT
READS SQL DATA
DETERMINISTIC
BEGIN
    DECLARE user_id BIGINT DEFAULT NULL;
    
    -- Extract first numeric sequence from file identifier
    SET user_id = CAST(REGEXP_SUBSTR(file_id, '^[0-9]+') AS UNSIGNED);
    
    RETURN user_id;
END //
DELIMITER ;

-- Function to extract scan date from file identifier  
DELIMITER //
CREATE FUNCTION extract_scan_date_from_file_identifier(file_id VARCHAR(500))
RETURNS DATE
READS SQL DATA
DETERMINISTIC
BEGIN
    DECLARE scan_date DATE DEFAULT NULL;
    DECLARE date_part VARCHAR(20);
    
    -- Extract date part (format: 2025-4-20)
    SET date_part = REGEXP_SUBSTR(file_id, '[0-9]{4}-[0-9]{1,2}-[0-9]{1,2}');
    
    IF date_part IS NOT NULL THEN
        SET scan_date = STR_TO_DATE(date_part, '%Y-%m-%d');
    END IF;
    
    RETURN scan_date;
END //
DELIMITER ;
```

#### Required Stored Procedures:
```sql
-- Procedure to process uploaded scan file
DELIMITER //
CREATE PROCEDURE process_scan_upload(
    IN p_file_identifier VARCHAR(500),
    IN p_original_filename VARCHAR(255),
    IN p_upload_source ENUM('manual', 'dropbox'),
    IN p_raw_data_json JSON,
    OUT p_scan_id BIGINT,
    OUT p_match_status VARCHAR(20)
)
BEGIN
    DECLARE v_user_id BIGINT;
    DECLARE v_scan_date DATE;
    DECLARE v_user_exists INT DEFAULT 0;
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;
    
    START TRANSACTION;
    
    -- Extract user ID and scan date
    SET v_user_id = extract_user_id_from_file_identifier(p_file_identifier);
    SET v_scan_date = extract_scan_date_from_file_identifier(p_file_identifier);
    
    -- Check if user exists
    SELECT COUNT(*) INTO v_user_exists FROM users WHERE id = v_user_id;
    
    -- Insert scan record
    INSERT INTO scans (
        file_identifier, 
        user_id, 
        original_filename, 
        upload_source, 
        scan_date, 
        status, 
        raw_data_json,
        created_at,
        updated_at
    ) VALUES (
        p_file_identifier,
        CASE WHEN v_user_exists > 0 THEN v_user_id ELSE NULL END,
        p_original_filename,
        p_upload_source,
        v_scan_date,
        CASE WHEN v_user_exists > 0 THEN 'matched' ELSE 'unmatched' END,
        p_raw_data_json,
        NOW(),
        NOW()
    );
    
    SET p_scan_id = LAST_INSERT_ID();
    SET p_match_status = CASE WHEN v_user_exists > 0 THEN 'matched' ELSE 'unmatched' END;
    
    -- If unmatched, add to unmatched basket
    IF v_user_exists = 0 THEN
        INSERT INTO unmatched_scans (scan_id, created_at) VALUES (p_scan_id, NOW());
    END IF;
    
    COMMIT;
END //
DELIMITER ;
```

#### Database Setup Requirements:
- **Auto-creation**: System must automatically create all tables, indexes, functions, and procedures during initial deployment
- **Migration support**: Include database migration scripts for version control
- **Seed data**: Pre-populate path_definitions table with standard Path IDs and descriptions
- **Backup procedures**: Implement automated backup strategies for scan data
- **Performance monitoring**: Set up query performance monitoring and optimization

### 5. Initial Implementation Features

#### Phase 1: Core Upload and Matching
1. **File Upload Interface**
   - Drag-and-drop file upload
   - File validation (CSV format, structure check)
   - Progress indicators

2. **Data Processing Pipeline**
   - Parse CSV structure
   - Extract user ID from A3
   - Validate Path IDs against database
   - Store raw data and normalized values

3. **User Matching System**
   - User ID lookup
   - Match status display
   - Automatic routing (matched vs unmatched)

4. **Raw Data Display**
   - Show complete scan data in tabular format
   - Display match status prominently
   - Show Path ID mappings with descriptions

#### Phase 1 UI Requirements:
```
Upload Results Dashboard:
┌─────────────────────────────────────────────────┐
│ File: DelphiData.csv                            │
│ Status: ✅ MATCHED - User ID: 7802035087081     │
│ Scan Date: 2025-04-20 21:10                    │
│ Upload Source: Manual                           │
├─────────────────────────────────────────────────┤
│ Raw Scan Data:                                  │
│ ┌─────────┬─────────────────┬─────────┐        │
│ │ Path ID │ Description     │ Value   │        │
│ ├─────────┼─────────────────┼─────────┤        │
│ │ 1000    │ Endocrine       │ 0       │        │
│ │ 1001    │ Gastrointestinal│ 0       │        │
│ │ 1035    │ green1          │ 1       │        │
│ │ 1036    │ green2          │ 1       │        │
│ │ ...     │ ...             │ ...     │        │
│ └─────────┴─────────────────┴─────────┘        │
└─────────────────────────────────────────────────┘
```

### 6. Technical Implementation Guidelines

#### Backend (Choose your preferred stack):
- **API Endpoints**:
  - `POST /api/scans/upload` - Manual file upload
  - `POST /api/scans/dropbox-webhook` - Dropbox integration
  - `GET /api/scans/{id}` - Retrieve scan details
  - `GET /api/scans/unmatched` - List unmatched scans
  - `PUT /api/scans/{id}/assign-user` - Manual user assignment

#### File Processing Logic:
```javascript
function processScanFile(csvContent) {
    // 1. Parse CSV
    const rows = parseCSV(csvContent);
    
    // 2. Extract file identifier from A3
    const fileId = rows[2][0]; // Row 3, Column A
    
    // 3. Extract user ID (first numeric sequence)
    const userIdMatch = fileId.match(/^(\d+)/);
    const userId = userIdMatch ? userIdMatch[1] : null;
    
    // 4. Extract Path IDs (Row 1, from column B onwards)
    const pathIds = rows[0].slice(1);
    
    // 5. Extract values (Row 3, from column B onwards)
    const rawValues = rows[2].slice(1);
    
    // 6. Normalize values: convert any value > 1 to 1, ensure only 0 or 1
    const normalizedValues = rawValues.map(value => {
        const numValue = Number(value);
        return numValue > 0 ? 1 : 0; // Any positive value becomes 1, everything else becomes 0
    });
    
    // 7. Create scan record
    return {
        fileIdentifier: fileId,
        userId: userId,
        pathData: pathIds.map((pathId, index) => ({
            pathId: pathId,
            value: normalizedValues[index] // Guaranteed to be 0 or 1
        })),
        scanDate: extractDateFromFileId(fileId),
        scanTime: extractTimeFromFileId(fileId)
    };
}
```

#### Dropbox Integration

- Set up Dropbox webhook for folder monitoring
- Process files automatically when added/modified
- Handle file validation and error cases
- Maintain audit trail of all operations

### 7. Future Enhancement Considerations
- **Phase 2**: Replace raw data view with calculated reports
- **Phase 3**: Add video and script generation based on calculations
- **Phase 4**: Advanced analytics and trend analysis
- **Phase 5**: Mobile app integration

### 8. Error Handling

- Invalid file format handling
- Duplicate file detection
- Incomplete data validation
- User ID not found scenarios
- Network/API failure recovery

### 9. Security Requirements

- File upload size limits
- Virus scanning for uploaded files
- User authentication and authorization
- Data encryption at rest
- Audit logging for all operations

## Development Priority
1. ✅ **First Priority**: File upload, parsing, user matching, and raw data display
2. Later: Calculations, reports, and advanced features
3. Future: Mobile integration and advanced analytics

This prompt provides a comprehensive foundation for building your scan management system with clear technical specifications and implementation guidelines.

## Implementation Details

### Scan Management System Architecture

The Life Arrow V1 Scan Management System has been implemented with the following components:

#### 1. Core Services
- **scanService.ts**: Central service handling all scan-related operations
  - Creating scans with auto-matching capability
  - Managing unmatched scans in a dedicated collection
  - Assigning scans to clients
  - Deleting scans and related data

#### 2. UI Components
- **ScanManagementPage**: Main admin interface with tabbed navigation
  - Upload Scans tab for file upload
  - Unmatched Scans tab for managing unmatched scans
- **UnmatchedScansManagement**: Component for listing and assigning unmatched scans
- **ClientSelectionModal**: Reusable modal for selecting clients during manual assignment

#### 3. Database Collections
- **scans**: Main collection storing scan documents
- **scan_values**: Collection storing individual scan values
- **unmatched_basket**: Collection tracking scans requiring manual assignment
- **path_definitions**: Reference collection for scan path definitions

### Unmatched Scan Workflow

1. **Scan Creation**:
   - When a scan is uploaded, the system attempts to match it to a client using the file identifier
   - If no match is found, the scan is marked as 'unmatched' and added to the unmatched_basket

2. **Unmatched Scan Management**:
   - Admin users can view all unmatched scans in the Unmatched Scans tab
   - Each unmatched scan displays its file name, date, and extracted client identifier
   - Admin can select a scan and assign it to a client using the Client Selection Modal

3. **Assignment Process**:
   - When a scan is assigned to a client:
     - The scan document is updated with the client's userId
     - The scan status is changed from 'unmatched' to 'matched'
     - The scan is removed from the unmatched_basket collection
     - All operations are performed in a Firestore batch for atomicity

4. **Security**:
   - All scan operations are protected by role-based permissions
   - Firestore security rules enforce permission checks for each collection
   - Only users with appropriate permissions can view, upload, assign, or delete scans

### Testing

The system includes test utilities to verify functionality:

1. **Manual Testing**:
   - Visit `/test/unmatched-scans` to access the UnmatchedScansTest component
   - Create test unmatched scans and verify they appear in the list
   - Assign test scans to clients and verify they're removed from the list

2. **Programmatic Testing**:
   - Use the scanService.test.js script to verify core functionality
   - Tests cover scan creation, unmatched scan fetching, and assignment

### Permissions

The following permissions control access to scan management features:

- **scans.view**: Required to view scans and scan values
- **scans.upload**: Required to upload new scans
- **scans.assign**: Required to assign unmatched scans to clients
- **scans.delete**: Required to delete scans and related data
export interface Scan {
  id?: string;
  fileIdentifier: string;
  userId: string | null;
  personName?: string | null;
  originalFilename: string;
  uploadSource: 'manual' | 'dropbox';
  scanDate: string;
  scanTime: string;
  status: 'matched' | 'unmatched' | 'processing' | 'error';
  assignmentType?: 'auto' | 'manual';
  rawDataJson: any;
  createdAt: string;
  updatedAt: string;
}

export interface ScanValue {
  id?: string;
  scanId: string;
  pathId: number | string;
  description: string;
  value: 0 | 1;
  createdAt: string;
  updatedAt?: string;
}

export interface PathDefinition {
  pathId: number;
  description: string;
  category: string;
  createdAt: string;
}

export interface UnmatchedScan {
  id?: string;
  scanId: string;
  staffNotes?: string;
  assignedToStaffId?: string;
  resolutionDate?: string;
  createdAt: string;
}

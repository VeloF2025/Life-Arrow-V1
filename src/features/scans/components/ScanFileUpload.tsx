import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { processScanFile, isValidCsvFile } from '../utils/csvProcessor';
import { scanService } from '../api/scanService';
import { CloudArrowUpIcon } from '@heroicons/react/24/outline';

interface ScanFileUploadProps {
  onUploadComplete: () => void;
  onUploadError: (error: Error) => void;
}

export const ScanFileUpload: React.FC<ScanFileUploadProps> = ({
  onUploadComplete,
  onUploadError
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const handleProcessFile = async (file: File) => {
    try {
      setIsUploading(true);
      setUploadProgress(10);

      if (!isValidCsvFile(file)) {
        throw new Error('Invalid file format. Please upload a CSV file.');
      }
      setUploadProgress(30);

      // Process the CSV content
      const { scan, scanValues, clientIdentifier } = await processScanFile(file);
      setUploadProgress(60);

      // Save to Firestore
      const scanId = await scanService.createScan(scan, clientIdentifier);
      setUploadProgress(80);

      // Save scan values if user is matched
      if (scan.userId) {
        const scanValuesWithId = scanValues.map(value => ({
          ...value,
          scanId
        }));
        
        await scanService.saveScanValues(scanValuesWithId);
      }
      // Note: We don't need to add to unmatched basket here anymore
      // as it's now handled in the createScan method
      
      setUploadProgress(100);
      
      // Upload complete
      onUploadComplete();
    } catch (error) {
      console.error('Error processing file:', error);
      onUploadError(error instanceof Error ? error : new Error('Unknown error during file upload'));
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  // File processing is now handled directly in the processScanFile utility

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;
    
    const file = acceptedFiles[0];
    if (file.type !== 'text/csv' && !file.name.endsWith('.csv')) {
      onUploadError(new Error('Only CSV files are supported'));
      return;
    }
    
    await handleProcessFile(file);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv']
    },
    multiple: false
  });

  return (
    <div className="w-full">
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
          isDragActive
            ? 'border-primary-500 bg-primary-50'
            : 'border-gray-300 hover:border-gray-400'
        }`}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center justify-center space-y-3">
          <CloudArrowUpIcon className="h-12 w-12 text-primary-500" aria-hidden="true" />
          <p className="text-lg font-medium text-gray-700">
            {isDragActive
              ? 'Drop the CSV file here'
              : 'Drag & drop a CSV file here, or click to select'}
          </p>
          <p className="text-sm text-gray-500">Only CSV files are supported</p>
        </div>
      </div>

      {isUploading && (
        <div className="mt-4">
          <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div
              className="bg-primary-500 h-2.5 rounded-full transition-all duration-300"
              style={{ width: `${uploadProgress}%` }}
            ></div>
          </div>
          <p className="text-sm text-gray-600 mt-1">
            Processing file... {uploadProgress}%
          </p>
        </div>
      )}
    </div>
  );
};

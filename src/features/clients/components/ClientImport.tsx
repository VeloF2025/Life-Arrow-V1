import React, { useState, useRef } from 'react';
import { importClientsFromCSV, importClientsFromJSON } from '@/utils/clientImport';
import { Button } from '@/components/ui/Button';
import { ArrowUpTrayIcon, DocumentTextIcon, DocumentIcon } from '@heroicons/react/24/outline';
import { CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/solid';
import { hasPermission } from '@/lib/permissions';
import { useAuth } from '@/hooks/useAuth';

type ImportFormat = 'csv' | 'json';

export const ClientImport: React.FC = () => {
  const { user } = useAuth();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [importFormat, setImportFormat] = useState<ImportFormat>('csv');
  const [hasHeader, setHasHeader] = useState(true);
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<{
    successful: number;
    failed: number;
    errors: string[];
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Check if user has permission to import clients
  // Use the same permission as creating clients
  const canImportClients = user && user.role && hasPermission(user.role, 'create_client');

  if (!canImportClients) {
    return (
      <div className="p-6 bg-red-50 rounded-lg border border-red-200">
        <h3 className="text-lg font-medium text-red-800">Permission Denied</h3>
        <p className="mt-2 text-sm text-red-700">
          You do not have permission to import clients. Please contact your administrator.
        </p>
      </div>
    );
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setSelectedFile(file);
    setImportResult(null);
    
    // Auto-detect format from file extension
    if (file) {
      if (file.name.endsWith('.csv')) {
        setImportFormat('csv');
      } else if (file.name.endsWith('.json')) {
        setImportFormat('json');
      }
    }
  };


  const handleImport = async () => {
    if (!selectedFile) return;
    
    setIsImporting(true);
    setImportResult(null);
    
    try {
      const fileContent = await selectedFile.text();
      
      let result;
      if (importFormat === 'csv') {
        result = await importClientsFromCSV(fileContent, hasHeader);
      } else {
        // Parse JSON
        try {
          const jsonData = JSON.parse(fileContent);
          const dataArray = Array.isArray(jsonData) ? jsonData : [jsonData];
          result = await importClientsFromJSON(dataArray);
        } catch (error) {
          setImportResult({
            successful: 0,
            failed: 0,
            errors: [`Failed to parse JSON: ${(error as Error).message}`]
          });
          setIsImporting(false);
          return;
        }
      }
      
      setImportResult(result);
    } catch (error) {
      setImportResult({
        successful: 0,
        failed: 0,
        errors: [`Import failed: ${(error as Error).message}`]
      });
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="bg-white shadow rounded-lg overflow-hidden">
      <div className="px-4 py-5 sm:p-6">
        <h3 className="text-lg font-medium leading-6 text-gray-900">Import Clients</h3>
        
        <div className="mt-5">
          <div className="flex flex-col space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Import Format</label>
              <div className="mt-1 flex space-x-4">
                <label className="inline-flex items-center">
                  <input
                    type="radio"
                    className="form-radio"
                    name="importFormat"
                    value="csv"
                    checked={importFormat === 'csv'}
                    onChange={() => setImportFormat('csv')}
                  />
                  <span className="ml-2 flex items-center">
                    <DocumentTextIcon className="h-5 w-5 text-gray-400 mr-1" />
                    CSV
                  </span>
                </label>
                <label className="inline-flex items-center">
                  <input
                    type="radio"
                    className="form-radio"
                    name="importFormat"
                    value="json"
                    checked={importFormat === 'json'}
                    onChange={() => setImportFormat('json')}
                  />
                  <span className="ml-2 flex items-center">
                    <DocumentIcon className="h-5 w-5 text-gray-400 mr-1" />
                    JSON
                  </span>
                </label>
              </div>
            </div>
            
            {importFormat === 'csv' && (
              <div>
                <label className="inline-flex items-center">
                  <input
                    type="checkbox"
                    className="form-checkbox"
                    checked={hasHeader}
                    onChange={(e) => setHasHeader(e.target.checked)}
                  />
                  <span className="ml-2">First row contains headers</span>
                </label>
              </div>
            )}
            
            <div className="mt-2">
              <div className="flex items-center justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
                <div className="space-y-1 text-center">
                  <ArrowUpTrayIcon className="mx-auto h-12 w-12 text-gray-400" />
                  <div className="flex text-sm text-gray-600">
                    <label
                      htmlFor="file-upload"
                      className="relative cursor-pointer bg-white rounded-md font-medium text-indigo-600 hover:text-indigo-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-indigo-500"
                    >
                      <span>Upload a file</span>
                      <input
                        id="file-upload"
                        name="file-upload"
                        type="file"
                        className="sr-only"
                        ref={fileInputRef}
                        accept={importFormat === 'csv' ? '.csv' : '.json'}
                        onChange={handleFileChange}
                      />
                    </label>
                    <p className="pl-1">or drag and drop</p>
                  </div>
                  <p className="text-xs text-gray-500">
                    {importFormat === 'csv' ? 'CSV' : 'JSON'} up to 10MB
                  </p>
                </div>
              </div>
            </div>
            
            {selectedFile && (
              <div className="flex items-center space-x-2 text-sm text-gray-500">
                <DocumentTextIcon className="h-5 w-5 text-gray-400" />
                <span>{selectedFile.name}</span>
                <span>({Math.round(selectedFile.size / 1024)} KB)</span>
              </div>
            )}
            
            <div className="mt-4">
              <Button
                onClick={handleImport}
                disabled={!selectedFile || isImporting}
                className="w-full"
              >
                {isImporting ? 'Importing...' : 'Import Clients'}
              </Button>
            </div>
            
            {importResult && (
              <div className="mt-4 p-4 bg-gray-50 rounded-md">
                <h4 className="font-medium text-gray-900">Import Results</h4>
                
                <div className="mt-2 flex items-center space-x-2">
                  <CheckCircleIcon className="h-5 w-5 text-green-500" />
                  <span>{importResult.successful} clients successfully imported</span>
                </div>
                
                {importResult.failed > 0 && (
                  <div className="mt-1 flex items-center space-x-2">
                    <XCircleIcon className="h-5 w-5 text-red-500" />
                    <span>{importResult.failed} clients failed to import</span>
                  </div>
                )}
                
                {importResult.errors.length > 0 && (
                  <div className="mt-3">
                    <h5 className="text-sm font-medium text-gray-900">Errors:</h5>
                    <div className="mt-1 max-h-40 overflow-y-auto">
                      <ul className="list-disc pl-5 text-xs text-red-600 space-y-1">
                        {importResult.errors.map((error, index) => (
                          <li key={index}>{error}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

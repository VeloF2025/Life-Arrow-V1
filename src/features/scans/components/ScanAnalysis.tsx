import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { scanService } from '../api/scanService';
import type { EpdResult, EbcResult } from '@/types';
import { format } from 'date-fns';

const COLOR_ORDER = ['red', 'orange', 'yellow', 'green', 'cyan', 'blue', 'violet'];

const EbcAnalysisDetails: React.FC<{ scanId: string }> = ({ scanId }) => {
  const { data: ebcResult, isLoading, error } = useQuery<EbcResult | null>({
    queryKey: ['ebcResult', scanId],
    queryFn: () => scanService.getEbcResultByScanId(scanId),
    enabled: !!scanId, // Only run the query if a scanId is provided
  });

  if (isLoading) return <div className="text-center py-4">Loading EBC results...</div>;
  if (error) return <div className="text-center py-4 text-red-500">Error fetching EBC results.</div>;
  if (!ebcResult) return <div className="text-center py-4 text-gray-500">No EBC result found for this scan.</div>;

  return (
    <div className="mt-6 bg-white shadow overflow-hidden sm:rounded-lg">
      <div className="px-4 py-5 sm:px-6">
        <h3 className="text-lg leading-6 font-medium text-gray-900">Emotional Binary Code (EBC)</h3>
        <p className="mt-1 max-w-2xl text-sm text-gray-500">Result ID: {ebcResult.id}</p>
      </div>
      <div className="border-t border-gray-200 px-4 py-5 sm:p-0">
        <dl className="sm:divide-y sm:divide-gray-200">
          {Object.entries(ebcResult.scores)
            .sort(([colorA], [colorB]) => COLOR_ORDER.indexOf(colorA.toLowerCase()) - COLOR_ORDER.indexOf(colorB.toLowerCase()))
            .map(([color, score]) => (
            <div key={color} className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500 capitalize">{color}</dt>
              <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{score}</dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
};

const ScanAnalysis: React.FC = () => {
  const [selectedAnalysis, setSelectedAnalysis] = useState<EpdResult | null>(null);

  const { data: analysisResults, isLoading, error } = useQuery<EpdResult[]>({
    queryKey: ['epdResults'],
    queryFn: scanService.getEpdResults,
  });

  if (isLoading) {
    return <div className="text-center py-10">Loading analysis results...</div>;
  }

  if (error) {
    return <div className="text-center py-10 text-red-500">Error fetching results: {error.message}</div>;
  }

  return (
    <div className="flex space-x-6">
      {/* Left Panel: List of Analysis Results */}
      <div className="w-1/3 bg-white shadow overflow-hidden sm:rounded-lg">
        <div className="px-4 py-5 sm:px-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900">Completed Analyses</h3>
          <p className="mt-1 max-w-2xl text-sm text-gray-500">Select an analysis to view its results.</p>
        </div>
        <div className="border-t border-gray-200">
          <ul className="divide-y divide-gray-200 h-[60vh] overflow-y-auto">
            {analysisResults && analysisResults.length > 0 ? (
              analysisResults.map(result => (
                <li
                  key={result.id}
                  onClick={() => setSelectedAnalysis(result)}
                  className={`p-4 cursor-pointer hover:bg-gray-50 ${selectedAnalysis?.id === result.id ? 'bg-blue-50' : ''
                    }`}>
                  <div className="font-medium text-gray-800">Client ID: {result.clientId}</div>
                  <div className="text-sm text-gray-500">Scan ID: {result.scanId}</div>
                  <div className="text-sm text-gray-500">
                    Analyzed on: {result.createdAt && typeof result.createdAt === 'object' && 'toDate' in result.createdAt ? format(result.createdAt.toDate(), 'yyyy-MM-dd HH:mm') : 'Date not available'}
                  </div>
                </li>
              ))
            ) : (
              <li className="p-4 text-center text-gray-500">No analysis results found.</li>
            )}
          </ul>
        </div>
      </div>

      {/* Right Panel: Analysis Details or Placeholder */}
      <div className="w-2/3">
        {selectedAnalysis ? (
          <>
            <div className="bg-white shadow overflow-hidden sm:rounded-lg">
              <div className="px-4 py-5 sm:px-6">
                <h3 className="text-lg leading-6 font-medium text-gray-900">EPD Analysis Details</h3>
                <p className="mt-1 max-w-2xl text-sm text-gray-500">Result ID: {selectedAnalysis.id}</p>
              </div>
              <div className="border-t border-gray-200 px-4 py-5 sm:p-0">
                <dl className="sm:divide-y sm:divide-gray-200">
                  {Object.entries(selectedAnalysis.scores)
                    .sort(([colorA], [colorB]) => COLOR_ORDER.indexOf(colorA.toLowerCase()) - COLOR_ORDER.indexOf(colorB.toLowerCase()))
                    .map(([color, score]) => (
                    <div key={color} className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                      <dt className="text-sm font-medium text-gray-500 capitalize">{color}</dt>
                      <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{score}%</dd>
                    </div>
                  ))}
                </dl>
              </div>
            </div>

            {/* EBC Analysis Details */}
            <EbcAnalysisDetails scanId={selectedAnalysis.scanId} />
          </>
        ) : (
          <div className="bg-white shadow overflow-hidden sm:rounded-lg h-full flex items-center justify-center">
            <div className="text-center">
              <h3 className="text-lg font-medium text-gray-900">Select an Analysis</h3>
              <p className="mt-1 text-sm text-gray-500">Choose an analysis from the list to view its results.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ScanAnalysis;

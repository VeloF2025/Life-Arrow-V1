import { Button } from './Button';
import { 
  ExclamationTriangleIcon, 
  XMarkIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline';

interface ProfileCompletionBannerProps {
  completionPercentage: number;
  missingFields: string[];
  onCompleteProfile: () => void;
  onDismiss?: () => void;
  isDismissible?: boolean;
}

export function ProfileCompletionBanner({
  completionPercentage,
  missingFields,
  onCompleteProfile,
  onDismiss,
  isDismissible = true
}: ProfileCompletionBannerProps) {
  if (completionPercentage === 100) return null;

  const isLowCompletion = completionPercentage < 50;
  const bgColor = isLowCompletion ? 'bg-red-50' : 'bg-yellow-50';
  const borderColor = isLowCompletion ? 'border-red-200' : 'border-yellow-200';
  const textColor = isLowCompletion ? 'text-red-800' : 'text-yellow-800';
  const iconColor = isLowCompletion ? 'text-red-500' : 'text-yellow-500';

  return (
    <div className={`${bgColor} ${borderColor} border rounded-lg p-6 mb-6`}>
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-4 flex-1">
          <div className={`${iconColor} mt-1`}>
            <ExclamationTriangleIcon className="h-6 w-6" />
          </div>
          
          <div className="flex-1">
            <div className="flex items-center space-x-3 mb-3">
              <h3 className={`font-semibold ${textColor}`}>
                Complete Your Profile ({completionPercentage}%)
              </h3>
              <div className="flex-1 bg-gray-200 rounded-full h-2 max-w-xs">
                <div 
                  className={`h-2 rounded-full transition-all duration-300 ${
                    isLowCompletion ? 'bg-red-500' : 'bg-yellow-500'
                  }`}
                  style={{ width: `${completionPercentage}%` }}
                />
              </div>
            </div>
            
            <p className={`${textColor} mb-4`}>
              {isLowCompletion ? (
                <>
                  <strong>Important:</strong> Please complete your profile to get personalized wellness recommendations and unlock all features.
                </>
              ) : (
                <>
                  You're almost done! Complete the remaining profile sections to get the full Life Arrow experience.
                </>
              )}
            </p>

            {missingFields.length > 0 && missingFields.length < 10 && (
              <div className="mb-4">
                <p className={`text-sm ${textColor} mb-2`}>Missing information:</p>
                <div className="flex flex-wrap gap-2">
                  {missingFields.slice(0, 5).map((field, index) => (
                    <span 
                      key={index}
                      className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                        isLowCompletion 
                          ? 'bg-red-100 text-red-700' 
                          : 'bg-yellow-100 text-yellow-700'
                      }`}
                    >
                      {field.replace(/([A-Z])/g, ' $1').toLowerCase().replace(/^./, str => str.toUpperCase())}
                    </span>
                  ))}
                  {missingFields.length > 5 && (
                    <span className={`text-xs ${textColor}`}>
                      +{missingFields.length - 5} more
                    </span>
                  )}
                </div>
              </div>
            )}

            <div className="flex items-center space-x-3">
              <Button
                onClick={onCompleteProfile}
                variant="primary"
                size="sm"
                className="flex items-center space-x-2"
              >
                <ChartBarIcon className="h-4 w-4" />
                <span>Complete Profile</span>
              </Button>
              
              <p className={`text-xs ${textColor}`}>
                Takes about 5-10 minutes
              </p>
            </div>
          </div>
        </div>

        {isDismissible && onDismiss && (
          <button
            onClick={onDismiss}
            className={`${textColor} hover:${textColor.replace('800', '900')} ml-4`}
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        )}
      </div>
    </div>
  );
} 
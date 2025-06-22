export interface ProgressStep {
  id: number;
  title: string;
  description?: string;
  icon?: string;
}

export interface ProgressIndicatorProps {
  steps: ProgressStep[];
  currentStep: number;
  completedSteps?: number[];
  className?: string;
}

export function ProgressIndicator({
  steps,
  currentStep,
  completedSteps = [],
  className = ''
}: ProgressIndicatorProps) {
  const getStepStatus = (stepId: number) => {
    if (completedSteps.includes(stepId)) return 'completed';
    if (stepId === currentStep) return 'current';
    if (stepId < currentStep) return 'completed';
    return 'upcoming';
  };

  const getStepIcon = (step: ProgressStep, status: string) => {
    if (status === 'completed') {
      return (
        <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
        </svg>
      );
    }
    
    if (status === 'current') {
      return <span className="text-primary-600 font-medium">{step.id}</span>;
    }
    
    return <span className="text-gray-500">{step.id}</span>;
  };

  return (
    <nav aria-label="Progress" className={className}>
      <ol className="flex items-center">
        {steps.map((step, stepIdx) => {
          const status = getStepStatus(step.id);
          const isLast = stepIdx === steps.length - 1;
          
          return (
            <li key={step.id} className={`${isLast ? '' : 'flex-1'} flex items-center`}>
              <div className="flex flex-col items-center group">
                {/* Step Circle */}
                <div
                  className={`
                    flex items-center justify-center w-10 h-10 border-2 rounded-full
                    ${status === 'completed' 
                      ? 'bg-primary-600 border-primary-600' 
                      : status === 'current'
                        ? 'border-primary-600 bg-white'
                        : 'border-gray-300 bg-white'
                    }
                  `}
                >
                  {getStepIcon(step, status)}
                </div>
                
                {/* Step Title */}
                <div className="mt-2 text-center">
                  <p
                    className={`
                      text-sm font-medium
                      ${status === 'current' 
                        ? 'text-primary-600' 
                        : status === 'completed'
                          ? 'text-primary-600'
                          : 'text-gray-500'
                      }
                    `}
                  >
                    {step.title}
                  </p>
                  {step.description && (
                    <p className="text-xs text-gray-500 mt-1 max-w-24 mx-auto">
                      {step.description}
                    </p>
                  )}
                </div>
              </div>
              
              {/* Connector Line */}
              {!isLast && (
                <div
                  className={`
                    flex-1 h-0.5 mx-4 mt-5
                    ${status === 'completed' || currentStep > step.id
                      ? 'bg-primary-600' 
                      : 'bg-gray-200'
                    }
                  `}
                />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

// Compact version for smaller screens
export function CompactProgressIndicator({
  steps,
  currentStep,
  className = ''
}: ProgressIndicatorProps) {
  const currentStepData = steps.find(step => step.id === currentStep);
  const progress = ((currentStep - 1) / (steps.length - 1)) * 100;

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Progress Bar */}
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div 
          className="bg-primary-600 h-2 rounded-full transition-all duration-300 ease-in-out"
          style={{ width: `${Math.max(progress, 8)}%` }}
        />
      </div>
      
      {/* Current Step Info */}
      <div className="flex justify-between items-center text-sm">
        <div>
          <span className="font-medium text-gray-900">
            Step {currentStep} of {steps.length}
          </span>
          {currentStepData && (
            <span className="text-gray-500 ml-2">
              - {currentStepData.title}
            </span>
          )}
        </div>
        <span className="text-gray-500">
          {Math.round(progress)}% Complete
        </span>
      </div>
    </div>
  );
} 
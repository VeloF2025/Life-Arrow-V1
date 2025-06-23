import { CheckIcon } from '@heroicons/react/24/solid';

interface BookingProgressProps {
  currentStep: number;
  isAdminMode?: boolean;
  hasPreSelectedClient?: boolean;
}

const BookingProgress = ({ currentStep, isAdminMode = false, hasPreSelectedClient = false }: BookingProgressProps) => {
  // Define steps based on mode
  const getSteps = () => {
    const baseSteps = [
      { id: 1, name: 'Centre', description: 'Select treatment centre' },
      { id: 2, name: 'Service', description: 'Choose your service' },
      { id: 3, name: 'Staff', description: 'Select staff member' },
      { id: 4, name: 'Time', description: 'Pick date & time' },
      { id: 5, name: 'Confirm', description: 'Review & book' }
    ];

    if (isAdminMode && !hasPreSelectedClient) {
      // Admin mode without pre-selected client - includes client selection
      return [
        { id: 0, name: 'Client', description: 'Select client' },
        ...baseSteps
      ];
    }

    return baseSteps;
  };

  const steps = getSteps();

  return (
    <div className="mb-8">
      <nav aria-label="Progress">
        <ol className="flex items-center justify-between">
          {steps.map((step, stepIdx) => (
            <li key={step.id} className={`flex-1 ${stepIdx !== steps.length - 1 ? 'pr-2 sm:pr-4' : ''}`}>
              <div className="flex items-center">
                <div className="flex items-center">
                  <div
                    className={`flex h-8 w-8 items-center justify-center rounded-full border-2 text-xs ${
                      step.id < currentStep
                        ? 'border-blue-600 bg-blue-600'
                        : step.id === currentStep
                        ? 'border-blue-600 bg-white'
                        : 'border-gray-300 bg-white'
                    }`}
                  >
                    {step.id < currentStep ? (
                      <CheckIcon className="h-4 w-4 text-white" aria-hidden="true" />
                    ) : (
                      <span
                        className={`text-xs font-medium ${
                          step.id === currentStep ? 'text-blue-600' : 'text-gray-500'
                        }`}
                      >
                        {step.id + 1}
                      </span>
                    )}
                  </div>
                  <div className="ml-2 min-w-0 flex-1">
                    <p
                      className={`text-xs font-medium ${
                        step.id <= currentStep ? 'text-blue-600' : 'text-gray-500'
                      }`}
                    >
                      {step.name}
                    </p>
                    <p className="text-xs text-gray-500 hidden sm:block">{step.description}</p>
                  </div>
                </div>
                {stepIdx !== steps.length - 1 && (
                  <div
                    className={`absolute top-4 ml-4 h-0.5 w-full ${
                      step.id < currentStep ? 'bg-blue-600' : 'bg-gray-300'
                    }`}
                    style={{ left: '2rem' }}
                    aria-hidden="true"
                  />
                )}
              </div>
            </li>
          ))}
        </ol>
      </nav>
    </div>
  );
};

export default BookingProgress; 
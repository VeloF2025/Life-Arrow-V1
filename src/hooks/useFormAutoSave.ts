import { useEffect, useCallback, useRef } from 'react';
import type { ClientRegistrationData } from '../lib/validation';

interface UseFormAutoSaveOptions {
  key: string;
  data: Partial<ClientRegistrationData>;
  enabled?: boolean;
  debounceMs?: number;
}

export function useFormAutoSave({
  key,
  data,
  enabled = true,
  debounceMs = 1000
}: UseFormAutoSaveOptions) {
  const timeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const isInitialMount = useRef(true);

  // Save data to localStorage with debouncing
  const saveToStorage = useCallback(() => {
    if (!enabled || isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    try {
      const existingData = localStorage.getItem(key);
      const parsedExisting = existingData ? JSON.parse(existingData) : {};
      
      // Merge with existing data to preserve values from other steps
      const mergedData = { ...parsedExisting, ...data };
      
      localStorage.setItem(key, JSON.stringify(mergedData));
      console.log('Form data auto-saved to localStorage');
    } catch (error) {
      console.error('Failed to save form data to localStorage:', error);
    }
  }, [key, data, enabled]);

  // Debounced save effect
  useEffect(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(saveToStorage, debounceMs);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [saveToStorage, debounceMs]);

  // Load saved data from localStorage
  const loadFromStorage = useCallback((): Partial<ClientRegistrationData> | null => {
    try {
      const savedData = localStorage.getItem(key);
      return savedData ? JSON.parse(savedData) : null;
    } catch (error) {
      console.error('Failed to load form data from localStorage:', error);
      return null;
    }
  }, [key]);

  // Clear saved data from localStorage
  const clearStorage = useCallback(() => {
    try {
      localStorage.removeItem(key);
      console.log('Form data cleared from localStorage');
    } catch (error) {
      console.error('Failed to clear form data from localStorage:', error);
    }
  }, [key]);

  // Check if there's saved data available
  const hasSavedData = useCallback(() => {
    try {
      const savedData = localStorage.getItem(key);
      return savedData !== null && JSON.parse(savedData) !== null;
    } catch {
      return false;
    }
  }, [key]);

  return {
    loadFromStorage,
    clearStorage,
    hasSavedData
  };
}

// Hook for managing form step progression
export function useFormStepManager(totalSteps: number) {
  const currentStepKey = 'lifeArrow-registration-currentStep';

  const getCurrentStep = useCallback((): number => {
    try {
      const saved = localStorage.getItem(currentStepKey);
      return saved ? parseInt(saved, 10) : 1;
    } catch {
      return 1;
    }
  }, []);

  const setCurrentStep = useCallback((step: number) => {
    try {
      localStorage.setItem(currentStepKey, step.toString());
    } catch (error) {
      console.error('Failed to save current step:', error);
    }
  }, []);

  const nextStep = useCallback((currentStep: number) => {
    const next = Math.min(currentStep + 1, totalSteps);
    setCurrentStep(next);
    return next;
  }, [totalSteps, setCurrentStep]);

  const previousStep = useCallback((currentStep: number) => {
    const previous = Math.max(currentStep - 1, 1);
    setCurrentStep(previous);
    return previous;
  }, [setCurrentStep]);

  const goToStep = useCallback((step: number) => {
    const validStep = Math.max(1, Math.min(step, totalSteps));
    setCurrentStep(validStep);
    return validStep;
  }, [totalSteps, setCurrentStep]);

  const clearStepProgress = useCallback(() => {
    try {
      localStorage.removeItem(currentStepKey);
    } catch (error) {
      console.error('Failed to clear step progress:', error);
    }
  }, []);

  return {
    getCurrentStep,
    setCurrentStep,
    nextStep,
    previousStep,
    goToStep,
    clearStepProgress
  };
} 
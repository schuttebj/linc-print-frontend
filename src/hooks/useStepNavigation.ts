import { useState, useCallback, useRef } from 'react';
import { usePersonFormValidation } from './usePersonFormValidation';

export interface StepState {
  isValid: boolean;
  isCompleted: boolean;
  isVisited: boolean;
}

export interface StepNavigationHook {
  stepStates: Record<number, StepState>;
  markStepValid: (stepIndex: number, isValid: boolean) => void;
  markStepCompleted: (stepIndex: number) => void;
  markStepVisited: (stepIndex: number) => void;
  isStepClickable: (stepIndex: number, currentStep: number, isExistingPerson: boolean) => boolean;
  getStepIcon: (stepIndex: number, currentStep: number) => 'completed' | 'warning' | 'current' | 'default';
  validateAndUpdateStep: (stepIndex: number, data: any) => boolean;
  resetAllSteps: () => void;
  initializeForExistingPerson: (totalSteps: number) => void;
}

export const useStepNavigation = (totalSteps: number): StepNavigationHook => {
  const formValidation = usePersonFormValidation();
  
  // Initialize step states
  const [stepStates, setStepStates] = useState<Record<number, StepState>>(() => {
    const initialStates: Record<number, StepState> = {};
    for (let i = 0; i < totalSteps; i++) {
      initialStates[i] = {
        isValid: false,
        isCompleted: false,
        isVisited: i === 0 // Only the first step is initially visited
      };
    }
    return initialStates;
  });

  // Track which steps have been visited in the current session
  const visitedStepsRef = useRef<Set<number>>(new Set([0]));

  const markStepValid = useCallback((stepIndex: number, isValid: boolean) => {
    setStepStates(prev => ({
      ...prev,
      [stepIndex]: {
        ...prev[stepIndex],
        isValid
      }
    }));
  }, []);

  const markStepCompleted = useCallback((stepIndex: number) => {
    setStepStates(prev => ({
      ...prev,
      [stepIndex]: {
        ...prev[stepIndex],
        isCompleted: true,
        isValid: true // A completed step is always valid
      }
    }));
  }, []);

  const markStepVisited = useCallback((stepIndex: number) => {
    visitedStepsRef.current.add(stepIndex);
    setStepStates(prev => ({
      ...prev,
      [stepIndex]: {
        ...prev[stepIndex],
        isVisited: true
      }
    }));
  }, []);

  const isStepClickable = useCallback((stepIndex: number, currentStep: number, isExistingPerson: boolean): boolean => {
    if (isExistingPerson) {
      // For existing persons, all steps are clickable
      return true;
    }

    // Always allow clicking the first step (lookup)
    if (stepIndex === 0) return true;
    
    // Allow clicking current step
    if (stepIndex === currentStep) return true;
    
    // Allow clicking previously completed steps
    if (stepStates[stepIndex]?.isCompleted) return true;
    
    // Allow clicking the next step if current step is valid
    if (stepIndex === currentStep + 1 && stepStates[currentStep]?.isValid) return true;
    
    // Allow clicking any previously visited step that's valid
    if (stepIndex < currentStep && stepStates[stepIndex]?.isValid) return true;
    
    return false;
  }, [stepStates]);

  const getStepIcon = useCallback((stepIndex: number, currentStep: number): 'completed' | 'warning' | 'current' | 'default' => {
    const state = stepStates[stepIndex];
    
    if (state?.isCompleted) return 'completed';
    if (stepIndex === currentStep) return 'current';
    if (state?.isVisited && !state?.isValid) return 'warning';
    return 'default';
  }, [stepStates]);

  const validateAndUpdateStep = useCallback((stepIndex: number, data: any): boolean => {
    const validation = formValidation.validateStep(stepIndex, data);
    markStepValid(stepIndex, validation.isValid);
    return validation.isValid;
  }, [formValidation, markStepValid]);

  const resetAllSteps = useCallback(() => {
    const resetStates: Record<number, StepState> = {};
    for (let i = 0; i < totalSteps; i++) {
      resetStates[i] = {
        isValid: false,
        isCompleted: false,
        isVisited: i === 0
      };
    }
    setStepStates(resetStates);
    visitedStepsRef.current = new Set([0]);
  }, [totalSteps]);

  const initializeForExistingPerson = useCallback((totalSteps: number) => {
    const existingPersonStates: Record<number, StepState> = {};
    for (let i = 0; i < totalSteps; i++) {
      existingPersonStates[i] = {
        isValid: true, // Assume existing person data is valid
        isCompleted: true, // Mark all as completed for existing persons
        isVisited: true
      };
    }
    setStepStates(existingPersonStates);
    
    // Mark all steps as visited for existing persons
    const allSteps = new Set<number>();
    for (let i = 0; i < totalSteps; i++) {
      allSteps.add(i);
    }
    visitedStepsRef.current = allSteps;
  }, []);

  return {
    stepStates,
    markStepValid,
    markStepCompleted,
    markStepVisited,
    isStepClickable,
    getStepIcon,
    validateAndUpdateStep,
    resetAllSteps,
    initializeForExistingPerson
  };
};
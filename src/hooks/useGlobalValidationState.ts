import { useState, useCallback, useRef, useEffect } from 'react';
import { usePersonFormValidation } from './usePersonFormValidation';

export interface StepValidationState {
  isValid: boolean;
  isCompleted: boolean;
  isVisited: boolean;
  hasErrors: boolean;
  lastValidated: number;
}

export interface GlobalValidationState {
  activeStep: number;
  stepStates: Record<number, StepValidationState>;
  isCurrentStepValid: boolean;
  isCurrentStepInvalid: boolean;
  canNavigateNext: boolean;
  canNavigatePrevious: boolean;
  isDisabled: boolean;
  loading: boolean;
  totalSteps: number;
  mode: 'person' | 'application';
  allStepsValid: boolean;
  completedStepsCount: number;
  nextAvailableStep: number;
}

export interface GlobalValidationActions {
  setActiveStep: (step: number) => void;
  validateStep: (stepIndex: number, data: any, force?: boolean) => Promise<boolean>;
  validateAllSteps: (data: any) => Promise<boolean>;
  markStepCompleted: (stepIndex: number) => void;
  markStepVisited: (stepIndex: number) => void;
  resetValidation: () => void;
  initializeForExistingPerson: () => void;
  setLoading: (loading: boolean) => void;
  getStepIcon: (stepIndex: number) => 'completed' | 'warning' | 'current' | 'default' | 'next-available';
  isStepClickable: (stepIndex: number) => boolean;
  updateStepValidation: (stepIndex: number, data: any) => Promise<void>;
}

export interface GlobalValidationHook {
  state: GlobalValidationState;
  actions: GlobalValidationActions;
}

export const useGlobalValidationState = (
  totalSteps: number,
  mode: 'person' | 'application' = 'person'
): GlobalValidationHook => {
  const formValidation = usePersonFormValidation();
  
  // Initialize step states
  const initializeStepStates = useCallback(() => {
    const states: Record<number, StepValidationState> = {};
    for (let i = 0; i < totalSteps; i++) {
      states[i] = {
        isValid: false,
        isCompleted: false,
        isVisited: i === 0, // Only first step is initially visited
        hasErrors: false,
        lastValidated: 0
      };
    }
    return states;
  }, [totalSteps]);

  const [state, setState] = useState<GlobalValidationState>(() => ({
    activeStep: 0,
    stepStates: initializeStepStates(),
    isCurrentStepValid: false,
    isCurrentStepInvalid: false,
    canNavigateNext: false,
    canNavigatePrevious: false,
    isDisabled: true,
    loading: false,
    totalSteps,
    mode,
    allStepsValid: false,
    completedStepsCount: 0,
    nextAvailableStep: 1
  }));

  // Cache to prevent unnecessary re-validations
  const validationCacheRef = useRef<Map<string, { result: boolean; timestamp: number }>>(new Map());
  const CACHE_DURATION = 1000; // 1 second cache

  // Compute derived state
  const computeDerivedState = useCallback((currentState: GlobalValidationState): Partial<GlobalValidationState> => {
    const currentStepState = currentState.stepStates[currentState.activeStep];
    const stepStatesArray = Object.values(currentState.stepStates);
    
    const completedStepsCount = stepStatesArray.filter(s => s.isCompleted).length;
    const allStepsValid = stepStatesArray.every(s => s.isValid);
    
    // Find next available step (first incomplete step)
    let nextAvailableStep = totalSteps;
    for (let i = 0; i < totalSteps; i++) {
      if (!currentState.stepStates[i].isCompleted) {
        nextAvailableStep = i;
        break;
      }
    }

    return {
      isCurrentStepValid: currentStepState?.isValid || false,
      isCurrentStepInvalid: currentStepState?.hasErrors || false,
      canNavigateNext: currentStepState?.isValid && currentState.activeStep < totalSteps - 1,
      canNavigatePrevious: currentState.activeStep > 0,
      isDisabled: !currentStepState?.isValid,
      allStepsValid,
      completedStepsCount,
      nextAvailableStep
    };
  }, [totalSteps]);

  // Update derived state when main state changes
  useEffect(() => {
    const derivedState = computeDerivedState(state);
    setState(current => ({ ...current, ...derivedState }));
  }, [state.activeStep, state.stepStates, computeDerivedState]);

  const setActiveStep = useCallback((step: number) => {
    if (step >= 0 && step < totalSteps) {
      setState(current => {
        const newStepStates = { ...current.stepStates };
        newStepStates[step] = { ...newStepStates[step], isVisited: true };
        
        return {
          ...current,
          activeStep: step,
          stepStates: newStepStates
        };
      });
    }
  }, [totalSteps]);

  const validateStep = useCallback(async (stepIndex: number, data: any, force = false): Promise<boolean> => {
    const cacheKey = `step_${stepIndex}_${JSON.stringify(data)}`;
    const cached = validationCacheRef.current.get(cacheKey);
    const now = Date.now();
    
    // Use cache if not forcing and cache is fresh
    if (!force && cached && (now - cached.timestamp) < CACHE_DURATION) {
      return cached.result;
    }

    try {
      console.log(`🔍 Validating step ${stepIndex}:`, data);
      const validation = formValidation.validateStep(stepIndex, data);
      const isValid = validation.isValid;
      
      // Cache the result
      validationCacheRef.current.set(cacheKey, { result: isValid, timestamp: now });
      
      // Update step state
      setState(current => ({
        ...current,
        stepStates: {
          ...current.stepStates,
          [stepIndex]: {
            ...current.stepStates[stepIndex],
            isValid,
            hasErrors: !isValid,
            lastValidated: now,
            isVisited: true
          }
        }
      }));

      console.log(`✅ Step ${stepIndex} validation result:`, { isValid, errors: validation.errors });
      return isValid;
    } catch (error) {
      console.error(`❌ Error validating step ${stepIndex}:`, error);
      
      setState(current => ({
        ...current,
        stepStates: {
          ...current.stepStates,
          [stepIndex]: {
            ...current.stepStates[stepIndex],
            isValid: false,
            hasErrors: true,
            lastValidated: now
          }
        }
      }));
      
      return false;
    }
  }, [formValidation]);

  const validateAllSteps = useCallback(async (data: any): Promise<boolean> => {
    console.log('🔍 Validating all steps');
    setState(current => ({ ...current, loading: true }));
    
    try {
      const results: boolean[] = [];
      
      for (let i = 0; i < totalSteps; i++) {
        const stepData = i === 0 ? data.lookupData : data.formData;
        const isValid = await validateStep(i, stepData, true);
        results.push(isValid);
      }
      
      const allValid = results.every(Boolean);
      console.log(`✅ All steps validation result:`, { allValid, results });
      
      setState(current => ({ ...current, loading: false }));
      return allValid;
    } catch (error) {
      console.error('❌ Error validating all steps:', error);
      setState(current => ({ ...current, loading: false }));
      return false;
    }
  }, [totalSteps, validateStep]);

  const markStepCompleted = useCallback((stepIndex: number) => {
    console.log(`✅ Marking step ${stepIndex} as completed`);
    setState(current => ({
      ...current,
      stepStates: {
        ...current.stepStates,
        [stepIndex]: {
          ...current.stepStates[stepIndex],
          isCompleted: true,
          isValid: true,
          isVisited: true
        }
      }
    }));
  }, []);

  const markStepVisited = useCallback((stepIndex: number) => {
    setState(current => ({
      ...current,
      stepStates: {
        ...current.stepStates,
        [stepIndex]: {
          ...current.stepStates[stepIndex],
          isVisited: true
        }
      }
    }));
  }, []);

  const resetValidation = useCallback(() => {
    console.log('🔄 Resetting validation state');
    validationCacheRef.current.clear();
    setState(current => ({
      ...current,
      activeStep: 0,
      stepStates: initializeStepStates(),
      loading: false
    }));
  }, [initializeStepStates]);

  const initializeForExistingPerson = useCallback(() => {
    console.log('👤 Initializing for existing person');
    setState(current => {
      const newStepStates: Record<number, StepValidationState> = {};
      for (let i = 0; i < totalSteps; i++) {
        newStepStates[i] = {
          isValid: false, // Will be validated
          isCompleted: false, // Will be marked if valid
          isVisited: true, // All steps are accessible for existing persons
          hasErrors: false,
          lastValidated: 0
        };
      }
      
      return {
        ...current,
        stepStates: newStepStates
      };
    });
  }, [totalSteps]);

  const setLoading = useCallback((loading: boolean) => {
    setState(current => ({ ...current, loading }));
  }, []);

  const getStepIcon = useCallback((stepIndex: number): 'completed' | 'warning' | 'current' | 'default' | 'next-available' => {
    const stepState = state.stepStates[stepIndex];
    
    if (stepState?.isCompleted) return 'completed';
    if (stepIndex === state.activeStep) return 'current';
    if (stepState?.isVisited && stepState?.hasErrors) return 'warning';
    if (stepIndex === state.nextAvailableStep && state.isCurrentStepValid) return 'next-available';
    return 'default';
  }, [state.stepStates, state.activeStep, state.nextAvailableStep, state.isCurrentStepValid]);

  const isStepClickable = useCallback((stepIndex: number): boolean => {
    const stepState = state.stepStates[stepIndex];
    
    // Always allow current step
    if (stepIndex === state.activeStep) return true;
    
    // For existing persons (all visited), allow all steps
    if (stepState?.isVisited && state.mode === 'person') return true;
    
    // Allow completed steps
    if (stepState?.isCompleted) return true;
    
    // Allow next step if current is valid
    if (stepIndex === state.activeStep + 1 && state.isCurrentStepValid) return true;
    
    // Allow previous steps that are valid
    if (stepIndex < state.activeStep && stepState?.isValid) return true;
    
    return false;
  }, [state.stepStates, state.activeStep, state.mode, state.isCurrentStepValid]);

  const updateStepValidation = useCallback(async (stepIndex: number, data: any): Promise<void> => {
    await validateStep(stepIndex, data, false);
  }, [validateStep]);

  const actions: GlobalValidationActions = {
    setActiveStep,
    validateStep,
    validateAllSteps,
    markStepCompleted,
    markStepVisited,
    resetValidation,
    initializeForExistingPerson,
    setLoading,
    getStepIcon,
    isStepClickable,
    updateStepValidation
  };

  return { state, actions };
};
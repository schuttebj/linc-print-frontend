/**
 * Debounced Validation Hook
 * Prevents memory leaks and excessive validation calls by debouncing field validation
 */

import { useCallback, useRef } from 'react';

export const useDebounceValidation = (
  validationFn: (fieldName: string, value: any, stepIndex: number) => any,
  delay: number = 300
) => {
  const timeoutRefs = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const lastResultsRef = useRef<Map<string, any>>(new Map());

  const debouncedValidation = useCallback((
    fieldName: string, 
    value: any, 
    stepIndex: number,
    onResult?: (result: any) => void
  ) => {
    const key = `${stepIndex}-${fieldName}`;
    
    // Clear existing timeout for this field
    const existingTimeout = timeoutRefs.current.get(key);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }

    // Return cached result immediately if available
    const cachedResult = lastResultsRef.current.get(key);
    
    // Set new timeout
    const timeout = setTimeout(() => {
      const result = validationFn(fieldName, value, stepIndex);
      lastResultsRef.current.set(key, result);
      if (onResult) {
        onResult(result);
      }
      timeoutRefs.current.delete(key);
    }, delay);

    timeoutRefs.current.set(key, timeout);

    // Return cached result or default while waiting
    return cachedResult || { isValid: true, state: 'default' };
  }, [validationFn, delay]);

  const clearValidationCache = useCallback((fieldName?: string, stepIndex?: number) => {
    if (fieldName && stepIndex !== undefined) {
      const key = `${stepIndex}-${fieldName}`;
      const timeout = timeoutRefs.current.get(key);
      if (timeout) {
        clearTimeout(timeout);
        timeoutRefs.current.delete(key);
      }
      lastResultsRef.current.delete(key);
    } else {
      // Clear all timeouts and cache
      timeoutRefs.current.forEach(timeout => clearTimeout(timeout));
      timeoutRefs.current.clear();
      lastResultsRef.current.clear();
    }
  }, []);

  const getImmediateValidation = useCallback((
    fieldName: string, 
    value: any, 
    stepIndex: number
  ) => {
    // For immediate validation (e.g., on blur), skip debounce
    const result = validationFn(fieldName, value, stepIndex);
    const key = `${stepIndex}-${fieldName}`;
    lastResultsRef.current.set(key, result);
    return result;
  }, [validationFn]);

  return {
    debouncedValidation,
    clearValidationCache,
    getImmediateValidation
  };
};

export default useDebounceValidation;
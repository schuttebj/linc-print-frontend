/**
 * License Validation Service for Madagascar Driver's License System
 * Handles complex licensing rules, prerequisites, and validation logic
 */

import { 
  LicenseCategory, 
  ApplicationType,
  LICENSE_CATEGORY_RULES, 
  VALID_COMBINATIONS,
  LicenseValidationResult,
  ExistingLicenseCheck,
  ActiveLicense,
  ExternalLicenseDetails,
  LEARNERS_PERMIT_VALIDITY_MONTHS
} from '../types';
import { applicationService } from './applicationService';

export class LicenseValidationService {
  /**
   * Calculate age from birth date
   */
  public calculateAge(birthDate: string): number {
    const birth = new Date(birthDate);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    
    return age;
  }

  /**
   * Check if learner's permit is valid (not expired)
   */
  private isLearnerPermitValid(expiryDate: string): boolean {
    const expiry = new Date(expiryDate);
    const today = new Date();
    return expiry >= today;
  }

  /**
   * Validate age requirements for selected categories
   */
  validateAgeRequirements(
    birthDate: string, 
    selectedCategories: LicenseCategory[]
  ): LicenseValidationResult {
    const age = this.calculateAge(birthDate);
    const violations: { category: LicenseCategory; required_age: number; current_age: number }[] = [];

    selectedCategories.forEach(category => {
      const rules = LICENSE_CATEGORY_RULES[category];
      if (age < rules.min_age) {
        violations.push({
          category,
          required_age: rules.min_age,
          current_age: age
        });
      }
    });

    return {
      is_valid: violations.length === 0,
      message: violations.length > 0 
        ? `Age requirements not met for ${violations.map(v => v.category).join(', ')}`
        : 'Age requirements satisfied',
      missing_prerequisites: [],
      age_violations: violations,
      invalid_combinations: []
    };
  }

  /**
   * Validate license category combinations and prerequisites
   */
  validateCategoryCombinations(
    selectedCategories: LicenseCategory[],
    existingLicenses: ActiveLicense[] = []
  ): LicenseValidationResult {
    const errors: string[] = [];
    const missingPrerequisites: LicenseCategory[] = [];

    // Get categories from existing active licenses
    const existingCategories = existingLicenses
      .filter(license => license.is_valid)
      .flatMap(license => license.categories);

    // Check each selected category for prerequisites
    selectedCategories.forEach(category => {
      const rules = LICENSE_CATEGORY_RULES[category];
      
      if (rules.requires_existing.length > 0) {
        // Check if category requires specific existing licenses
        if (category === LicenseCategory.E) {
          // E requires B, C, or D (at least one)
          const hasRequiredBase = rules.requires_existing.some(req => 
            existingCategories.includes(req) || selectedCategories.includes(req)
          );
          
          if (!hasRequiredBase) {
            errors.push(`Category E requires an existing or selected Category B, C, or D license`);
            missingPrerequisites.push(LicenseCategory.B);
          }
        } else {
          // C and D require B
          rules.requires_existing.forEach(required => {
            if (!existingCategories.includes(required) && !selectedCategories.includes(required)) {
              errors.push(`Category ${category} requires Category ${required}`);
              missingPrerequisites.push(required);
            }
          });
        }
      }
    });

    // Check for invalid combinations
    const sortedSelected = [...selectedCategories].sort();
    const isValidCombination = VALID_COMBINATIONS.some(validCombo => {
      const sortedValid = [...validCombo].sort();
      return JSON.stringify(sortedSelected) === JSON.stringify(sortedValid);
    });

    if (!isValidCombination && selectedCategories.length > 1) {
      errors.push('Invalid license category combination selected');
    }

    // Auto-suggest missing prerequisites
    const suggestions: string[] = [];
    if (missingPrerequisites.includes(LicenseCategory.B)) {
      suggestions.push('Consider adding Category B to meet prerequisites');
    }

    return {
      is_valid: errors.length === 0,
      message: errors.length > 0 ? errors.join('; ') : 'Valid category combination',
      missing_prerequisites: [...new Set(missingPrerequisites)],
      age_violations: [],
      invalid_combinations: errors
    };
  }

  /**
   * Check if person has valid learner's permit for driver's license application
   */
  validateLearnerPermitForDriverLicense(
    selectedCategories: LicenseCategory[],
    existingLearnerPermit?: ActiveLicense,
    externalLearnerPermit?: ExternalLicenseDetails
  ): LicenseValidationResult {
    // Only A′, A, B require learner's permits
    const categoriesRequiringLearners = selectedCategories.filter(cat => 
      LICENSE_CATEGORY_RULES[cat].allows_learners_permit
    );

    if (categoriesRequiringLearners.length === 0) {
      return {
        is_valid: true,
        message: 'No learner\'s permit required for selected categories',
        missing_prerequisites: [],
        age_violations: [],
        invalid_combinations: []
      };
    }

    // Check existing learner's permit in system
    if (existingLearnerPermit && existingLearnerPermit.is_valid) {
      // A', A, B categories share the same learner's permit
      // Any learner's permit containing A', A, or B is valid for all three
      const baseCategories = [LicenseCategory.A_PRIME, LicenseCategory.A, LicenseCategory.B];
      const requestingBaseCategories = categoriesRequiringLearners.filter(cat => baseCategories.includes(cat));
      const hasBaseLearnerPermit = existingLearnerPermit.categories.some(cat => baseCategories.includes(cat));
      
      // For base categories (A', A, B), any base learner's permit is valid
      const baseRequirementMet = requestingBaseCategories.length === 0 || hasBaseLearnerPermit;
      
      // For other categories, exact match is required
      const otherCategories = categoriesRequiringLearners.filter(cat => !baseCategories.includes(cat));
      const otherRequirementMet = otherCategories.every(cat => existingLearnerPermit.categories.includes(cat));

      if (baseRequirementMet && otherRequirementMet) {
        return {
          is_valid: true,
          message: 'Valid learner\'s permit found in system',
          missing_prerequisites: [],
          age_violations: [],
          invalid_combinations: []
        };
      }
    }

    // Check external learner's permit
    if (externalLearnerPermit && externalLearnerPermit.verified_by_clerk) {
      const isValid = this.isLearnerPermitValid(externalLearnerPermit.expiry_date);
      
      // A', A, B categories share the same learner's permit
      const baseCategories = [LicenseCategory.A_PRIME, LicenseCategory.A, LicenseCategory.B];
      const requestingBaseCategories = categoriesRequiringLearners.filter(cat => baseCategories.includes(cat));
      const hasBaseLearnerPermit = externalLearnerPermit.categories.some(cat => baseCategories.includes(cat));
      
      // For base categories (A', A, B), any base learner's permit is valid
      const baseRequirementMet = requestingBaseCategories.length === 0 || hasBaseLearnerPermit;
      
      // For other categories, exact match is required
      const otherCategories = categoriesRequiringLearners.filter(cat => !baseCategories.includes(cat));
      const otherRequirementMet = otherCategories.every(cat => externalLearnerPermit.categories.includes(cat));

      if (isValid && baseRequirementMet && otherRequirementMet) {
        return {
          is_valid: true,
          message: 'Valid external learner\'s permit verified',
          missing_prerequisites: [],
          age_violations: [],
          invalid_combinations: []
        };
      }

      if (!isValid) {
        return {
          is_valid: false,
          message: 'External learner\'s permit has expired',
          missing_prerequisites: categoriesRequiringLearners,
          age_violations: [],
          invalid_combinations: []
        };
      }
    }

    return {
      is_valid: false,
      message: 'Valid learner\'s permit required for selected categories',
      missing_prerequisites: categoriesRequiringLearners,
      age_violations: [],
      invalid_combinations: []
    };
  }

  /**
   * Check what categories a person can apply for based on existing licenses
   */
  async checkExistingLicenses(personId: string): Promise<ExistingLicenseCheck> {
    try {
      // This would typically call the backend API
      // For now, we'll return a mock implementation
      
      // TODO: Replace with actual API call
      // const existingApplications = await applicationService.getApplicationsByPerson(personId);
      
      // Mock data for now - replace with actual API call
      const mockExistingLicenses: ActiveLicense[] = [];
      const mockLearnerPermit: ActiveLicense | undefined = undefined;

      const allCategories = Object.values(LicenseCategory);
      const existingCategories = mockExistingLicenses.flatMap(license => license.categories);
      
      // Categories they can apply for (not already held)
      const canApplyFor = allCategories.filter(cat => !existingCategories.includes(cat));
      
      // Categories they must renew (existing but near expiry)
      const mustRenew = existingCategories.filter(cat => {
        const license = mockExistingLicenses.find(l => l.categories.includes(cat));
        if (!license) return false;
        
        const expiryDate = new Date(license.expiry_date);
        const monthsUntilExpiry = (expiryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24 * 30);
        return monthsUntilExpiry <= 6; // Renewal required within 6 months
      });

      // Categories they can upgrade to
      const canUpgradeTo: LicenseCategory[] = [];
      if (existingCategories.includes(LicenseCategory.B)) {
        [LicenseCategory.C, LicenseCategory.D, LicenseCategory.E].forEach(cat => {
          if (!existingCategories.includes(cat)) {
            canUpgradeTo.push(cat);
          }
        });
      }

      return {
        person_id: personId,
        has_active_licenses: mockExistingLicenses.length > 0,
        active_licenses: mockExistingLicenses,
        has_learners_permit: !!mockLearnerPermit,
        learners_permit: mockLearnerPermit,
        can_apply_for: canApplyFor,
        must_renew: mustRenew,
        can_upgrade_to: canUpgradeTo
      };

    } catch (error) {
      console.error('Error checking existing licenses:', error);
      
      // Return empty state on error
      return {
        person_id: personId,
        has_active_licenses: false,
        active_licenses: [],
        has_learners_permit: false,
        can_apply_for: Object.values(LicenseCategory),
        must_renew: [],
        can_upgrade_to: []
      };
    }
  }

  /**
   * Comprehensive validation for application
   */
  async validateApplication(
    applicationType: ApplicationType,
    selectedCategories: LicenseCategory[],
    personBirthDate: string,
    personId: string,
    externalLearnerPermit?: ExternalLicenseDetails,
    externalExistingLicense?: ExternalLicenseDetails
  ): Promise<LicenseValidationResult> {
    
    // Get existing licenses
    const existingCheck = await this.checkExistingLicenses(personId);
    
    // Check age requirements
    const ageValidation = this.validateAgeRequirements(personBirthDate, selectedCategories);
    if (!ageValidation.is_valid) {
      return ageValidation;
    }

    // Check category combinations and prerequisites
    const comboValidation = this.validateCategoryCombinations(
      selectedCategories, 
      existingCheck.active_licenses
    );
    if (!comboValidation.is_valid) {
      return comboValidation;
    }

    // For driver's license applications, check learner's permit
    if (applicationType === ApplicationType.NEW_LICENSE) {
      const learnerValidation = this.validateLearnerPermitForDriverLicense(
        selectedCategories,
        existingCheck.learners_permit,
        externalLearnerPermit
      );
      if (!learnerValidation.is_valid) {
        return learnerValidation;
      }
    }

    // Check for duplicate applications (can't apply for categories already held)
    if (applicationType === ApplicationType.NEW_LICENSE || applicationType === ApplicationType.LEARNERS_PERMIT) {
      const existingCategories = existingCheck.active_licenses.flatMap(license => license.categories);
      const duplicates = selectedCategories.filter(cat => existingCategories.includes(cat));
      
      if (duplicates.length > 0) {
        return {
          is_valid: false,
          message: `Cannot apply for categories already held: ${duplicates.join(', ')}. Use RENEWAL or UPGRADE instead.`,
          missing_prerequisites: [],
          age_violations: [],
          invalid_combinations: [`Duplicate categories: ${duplicates.join(', ')}`]
        };
      }
    }

    return {
      is_valid: true,
      message: 'Application validation passed',
      missing_prerequisites: [],
      age_violations: [],
      invalid_combinations: []
    };
  }

  /**
   * Get suggested categories based on selection
   */
  getSuggestedCategories(selectedCategories: LicenseCategory[]): LicenseCategory[] {
    const suggestions: LicenseCategory[] = [];

    selectedCategories.forEach(category => {
      const rules = LICENSE_CATEGORY_RULES[category];
      
      // Auto-suggest missing prerequisites
      rules.requires_existing.forEach(required => {
        if (!selectedCategories.includes(required) && !suggestions.includes(required)) {
          suggestions.push(required);
        }
      });
    });

    return suggestions;
  }
}

// Export singleton instance
export const licenseValidationService = new LicenseValidationService(); 
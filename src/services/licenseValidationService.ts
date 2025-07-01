/**
 * License Validation Service for Madagascar Driver's License System
 * Handles complex licensing rules, prerequisites, and validation logic
 * Updated for comprehensive license categories with superseding matrix
 */

import { 
  LicenseCategory, 
  ApplicationType,
  LICENSE_CATEGORY_RULES, 
  LICENSE_SUPERSEDING_MATRIX,
  VALID_COMBINATIONS,
  LicenseValidationResult,
  ExistingLicenseCheck,
  ActiveLicense,
  ExternalLicenseDetails,
  TransmissionType,
  LicenseRestriction,
  getAuthorizedCategories,
  getTransmissionRestrictions,
  isCommercialLicense,
  requiresMedical60Plus,
  requiresMedicalAlways,
  getSupersededCategories,
  getCategoryFamily,
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
   * Get all categories that would be authorized with a given license
   */
  public getAuthorizedCategoriesForLicense(category: LicenseCategory): LicenseCategory[] {
    return getAuthorizedCategories(category);
  }

  /**
   * Check if person already has authorization for a category (through superseding)
   */
  public hasAuthorizationForCategory(
    targetCategory: LicenseCategory, 
    existingLicenses: ActiveLicense[]
  ): boolean {
    const existingCategories = existingLicenses
      .filter(license => license.is_valid)
      .flatMap(license => license.categories);

    // Check if any existing category supersedes the target
    return existingCategories.some(existing => {
      const authorizedCategories = getAuthorizedCategories(existing);
      return authorizedCategories.includes(targetCategory);
    });
  }

  /**
   * Validate age requirements for selected category
   */
  validateAgeRequirements(
    birthDate: string, 
    selectedCategory: LicenseCategory
  ): LicenseValidationResult {
    const age = this.calculateAge(birthDate);
    const rules = LICENSE_CATEGORY_RULES[selectedCategory];
    const violations: { category: LicenseCategory; required_age: number; current_age: number }[] = [];

    if (age < rules.min_age) {
      violations.push({
        category: selectedCategory,
        required_age: rules.min_age,
        current_age: age
      });
    }

    return {
      is_valid: violations.length === 0,
      message: violations.length > 0 
        ? `Age requirement not met: ${selectedCategory} requires minimum age ${rules.min_age} (current: ${age})`
        : 'Age requirements satisfied',
      missing_prerequisites: [],
      age_violations: violations,
      invalid_combinations: []
    };
  }

  /**
   * Validate license category prerequisites
   */
  validateCategoryPrerequisites(
    selectedCategory: LicenseCategory,
    existingLicenses: ActiveLicense[] = []
  ): LicenseValidationResult {
    const errors: string[] = [];
    const missingPrerequisites: LicenseCategory[] = [];
    const rules = LICENSE_CATEGORY_RULES[selectedCategory];

    // Get categories from existing active licenses (including superseded ones)
    const allAuthorizedCategories = existingLicenses
      .filter(license => license.is_valid)
      .flatMap(license => license.categories)
      .flatMap(category => getAuthorizedCategories(category))
      .filter((category, index, self) => self.indexOf(category) === index); // Remove duplicates

    // Check prerequisites
    if (rules.requires_existing.length > 0) {
      const missingRequirements = rules.requires_existing.filter(required => 
        !allAuthorizedCategories.includes(required)
      );

      if (missingRequirements.length > 0) {
        errors.push(`Category ${selectedCategory} requires: ${missingRequirements.join(', ')}`);
        missingPrerequisites.push(...missingRequirements);
      }
    }

    // Check if person already has this category (through superseding)
    if (this.hasAuthorizationForCategory(selectedCategory, existingLicenses)) {
      errors.push(`You already have authorization for Category ${selectedCategory} through an existing license`);
    }

    return {
      is_valid: errors.length === 0,
      message: errors.length > 0 ? errors.join('; ') : 'Prerequisites satisfied',
      missing_prerequisites: [...new Set(missingPrerequisites)],
      age_violations: [],
      invalid_combinations: errors
    };
  }

  /**
   * Check if person has valid learner's permit for driver's license application
   */
  validateLearnerPermitForDriverLicense(
    selectedCategory: LicenseCategory,
    existingLearnerPermit?: ActiveLicense,
    externalLearnerPermit?: ExternalLicenseDetails
  ): LicenseValidationResult {
    const rules = LICENSE_CATEGORY_RULES[selectedCategory];
    
    // Check if this category requires a learner's permit
    if (!rules.allows_learners_permit) {
      return {
        is_valid: true,
        message: `Category ${selectedCategory} does not require a learner's permit`,
        missing_prerequisites: [],
        age_violations: [],
        invalid_combinations: []
      };
    }

    // Check existing learner's permit in system
    if (existingLearnerPermit && existingLearnerPermit.is_valid) {
      // Check if the learner's permit covers the selected category
      const learnerAuthorizedCategories = existingLearnerPermit.categories
        .flatMap(category => getAuthorizedCategories(category));
      
      if (learnerAuthorizedCategories.includes(selectedCategory)) {
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
      
      if (isValid) {
        const learnerAuthorizedCategories = externalLearnerPermit.categories
          .flatMap(category => getAuthorizedCategories(category));
        
        if (learnerAuthorizedCategories.includes(selectedCategory)) {
          return {
            is_valid: true,
            message: 'Valid external learner\'s permit verified',
            missing_prerequisites: [],
            age_violations: [],
            invalid_combinations: []
          };
        }
      }
    }

    return {
      is_valid: false,
      message: `Valid learner's permit required for Category ${selectedCategory}`,
      missing_prerequisites: [selectedCategory], // Need learner's permit for this category
      age_violations: [],
      invalid_combinations: []
    };
  }

  /**
   * Check medical requirements for a category
   */
  validateMedicalRequirements(
    selectedCategory: LicenseCategory,
    age: number
  ): { isRequired: boolean; reason: string } {
    // Always required for passenger transport
    if (requiresMedicalAlways(selectedCategory)) {
      return {
        isRequired: true,
        reason: `Medical assessment always required for ${selectedCategory} (passenger transport)`
      };
    }

    // Required for 60+ on commercial licenses
    if (age >= 60 && requiresMedical60Plus(selectedCategory)) {
      return {
        isRequired: true,
        reason: `Medical assessment required for ${selectedCategory} at age 60+ (commercial license)`
      };
    }

    return {
      isRequired: false,
      reason: 'Medical assessment not required'
    };
  }

  /**
   * Calculate license restrictions based on transmission and disability
   */
  calculateLicenseRestrictions(
    transmission: TransmissionType,
    hasDisabilityModification: boolean,
    visionRestrictions: string[] = []
  ): LicenseRestriction[] {
    const restrictions: LicenseRestriction[] = [];

    // Transmission restrictions
    if (transmission === TransmissionType.AUTOMATIC) {
      restrictions.push(LicenseRestriction.AUTOMATIC_ONLY);
    }

    // Disability modifications
    if (hasDisabilityModification) {
      restrictions.push(LicenseRestriction.MODIFIED_VEHICLE_ONLY);
    }

    // Vision restrictions
    if (visionRestrictions.includes('CORRECTIVE_LENSES')) {
      restrictions.push(LicenseRestriction.CORRECTIVE_LENSES);
    }
    if (visionRestrictions.includes('VISION_RESTRICTED')) {
      restrictions.push(LicenseRestriction.VISION_RESTRICTED);
    }

    return restrictions;
  }

  /**
   * Get existing licenses for a person
   */
  async checkExistingLicenses(personId: string): Promise<ExistingLicenseCheck> {
    try {
      // This would typically call the backend API
      // For now, return mock data structure
      return {
        person_id: personId,
        has_active_licenses: false,
        active_licenses: [],
        has_learners_permit: false,
        can_apply_for: Object.values(LicenseCategory),
        must_renew: [],
        can_upgrade_to: []
      };
    } catch (error) {
      console.error('Error checking existing licenses:', error);
      throw new Error('Failed to check existing licenses');
    }
  }

  /**
   * Comprehensive validation for an application
   */
  async validateApplication(
    applicationType: ApplicationType,
    selectedCategory: LicenseCategory,
    personBirthDate: string,
    personId: string,
    transmission: TransmissionType,
    hasDisabilityModification: boolean = false,
    externalLearnerPermit?: ExternalLicenseDetails,
    externalExistingLicense?: ExternalLicenseDetails
  ): Promise<LicenseValidationResult & { 
    medicalRequired: boolean; 
    medicalRequiredReason: string;
    licenseRestrictions: LicenseRestriction[];
    authorizedCategories: LicenseCategory[];
  }> {
    const age = this.calculateAge(personBirthDate);
    
    // Get existing licenses
    const existingLicenseCheck = await this.checkExistingLicenses(personId);
    
    // Validate age
    const ageValidation = this.validateAgeRequirements(personBirthDate, selectedCategory);
    if (!ageValidation.is_valid) {
      return {
        ...ageValidation,
        medicalRequired: false,
        medicalRequiredReason: '',
        licenseRestrictions: [],
        authorizedCategories: []
      };
    }

    // Validate prerequisites
    const prerequisiteValidation = this.validateCategoryPrerequisites(
      selectedCategory, 
      existingLicenseCheck.active_licenses
    );
    if (!prerequisiteValidation.is_valid) {
      return {
        ...prerequisiteValidation,
        medicalRequired: false,
        medicalRequiredReason: '',
        licenseRestrictions: [],
        authorizedCategories: []
      };
    }

    // Validate learner's permit for driver's license
    if (applicationType === ApplicationType.NEW_LICENSE) {
      const learnerValidation = this.validateLearnerPermitForDriverLicense(
        selectedCategory,
        existingLicenseCheck.learners_permit,
        externalLearnerPermit
      );
      if (!learnerValidation.is_valid) {
        return {
          ...learnerValidation,
          medicalRequired: false,
          medicalRequiredReason: '',
          licenseRestrictions: [],
          authorizedCategories: []
        };
      }
    }

    // Check medical requirements
    const medicalCheck = this.validateMedicalRequirements(selectedCategory, age);
    
    // Calculate restrictions
    const restrictions = this.calculateLicenseRestrictions(
      transmission, 
      hasDisabilityModification
    );

    // Get all authorized categories
    const authorizedCategories = getAuthorizedCategories(selectedCategory);

    return {
      is_valid: true,
      message: 'Application validation successful',
      missing_prerequisites: [],
      age_violations: [],
      invalid_combinations: [],
      medicalRequired: medicalCheck.isRequired,
      medicalRequiredReason: medicalCheck.reason,
      licenseRestrictions: restrictions,
      authorizedCategories
    };
  }

  /**
   * Get suggested upgrade categories based on existing licenses
   */
  getSuggestedUpgrades(existingLicenses: ActiveLicense[]): LicenseCategory[] {
    const existingCategories = existingLicenses
      .filter(license => license.is_valid)
      .flatMap(license => license.categories);

    const suggestions: LicenseCategory[] = [];

    // Suggest motorcycle upgrades
    if (existingCategories.includes(LicenseCategory.A1)) {
      suggestions.push(LicenseCategory.A2, LicenseCategory.A);
    } else if (existingCategories.includes(LicenseCategory.A2)) {
      suggestions.push(LicenseCategory.A);
    }

    // Suggest vehicle upgrades
    if (existingCategories.includes(LicenseCategory.B)) {
      suggestions.push(
        LicenseCategory.B2, 
        LicenseCategory.BE, 
        LicenseCategory.C1, 
        LicenseCategory.D1
      );
    }

    // Suggest commercial upgrades
    if (existingCategories.includes(LicenseCategory.C1)) {
      suggestions.push(LicenseCategory.C, LicenseCategory.C1E);
    }
    if (existingCategories.includes(LicenseCategory.C)) {
      suggestions.push(LicenseCategory.CE);
    }
    if (existingCategories.includes(LicenseCategory.D1)) {
      suggestions.push(LicenseCategory.D);
    }
    if (existingCategories.includes(LicenseCategory.D)) {
      suggestions.push(LicenseCategory.D2);
    }

    // Remove categories already authorized
    const allAuthorized = existingCategories
      .flatMap(category => getAuthorizedCategories(category));
    
    return suggestions.filter(suggestion => !allAuthorized.includes(suggestion));
  }

  /**
   * Get license category display information
   */
  getCategoryInfo(category: LicenseCategory): {
    description: string;
    vehicleTypes: string[];
    minAge: number;
    requiresExisting: LicenseCategory[];
    allowsLearners: boolean;
    supersedes: LicenseCategory[];
  } {
    const rules = LICENSE_CATEGORY_RULES[category];
    return {
      description: rules.description,
      vehicleTypes: [...(rules.vehicle_types || [])],
      minAge: rules.min_age,
      requiresExisting: [...rules.requires_existing],
      allowsLearners: rules.allows_learners_permit,
      supersedes: getSupersededCategories(category)
    };
  }
}

// Export singleton instance
export const licenseValidationService = new LicenseValidationService(); 
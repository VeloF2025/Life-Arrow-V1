import { VALIDATION_PATTERNS } from './constants';

// Validation error types
export interface ValidationError {
  field: string;
  message: string;
}

// South African ID Number validation
export function validateSAIdNumber(idNumber: string): boolean {
  if (!idNumber || !VALIDATION_PATTERNS.SA_ID_NUMBER.test(idNumber)) {
    return false;
  }

  // Check if it's a valid SA ID number using Luhn algorithm
  const digits = idNumber.split('').map(Number);
  
  // Extract date of birth (YYMMDD)
  const month = digits[2] * 10 + digits[3];
  const day = digits[4] * 10 + digits[5];
  
  // Basic date validation
  if (month < 1 || month > 12) return false;
  if (day < 1 || day > 31) return false;
  
  // Luhn algorithm for checksum validation
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    if (i % 2 === 0) {
      sum += digits[i];
    } else {
      const doubled = digits[i] * 2;
      sum += doubled > 9 ? doubled - 9 : doubled;
    }
  }
  
  const checkDigit = (10 - (sum % 10)) % 10;
  return checkDigit === digits[12];
}

// Email validation
export function validateEmail(email: string): boolean {
  return VALIDATION_PATTERNS.EMAIL.test(email);
}

// Mobile number validation (South African format)
export function validateMobileNumber(mobile: string): boolean {
  return VALIDATION_PATTERNS.SA_MOBILE.test(mobile);
}

// Postal code validation based on country
export function validatePostalCode(postalCode: string, country: string): boolean {
  if (country === 'South Africa') {
    return VALIDATION_PATTERNS.SA_POSTAL_CODE.test(postalCode);
  }
  return VALIDATION_PATTERNS.INTL_POSTAL_CODE.test(postalCode);
}

// Required field validation
export function validateRequired(value: string | boolean | undefined | null, fieldName: string): ValidationError | null {
  if (value === undefined || value === null || value === '' || value === false) {
    return {
      field: fieldName,
      message: `${fieldName} is required`
    };
  }
  return null;
}

// Name validation (letters, spaces, hyphens, apostrophes only)
export function validateName(name: string, fieldName: string): ValidationError | null {
  if (!name || name.trim().length < 2) {
    return {
      field: fieldName,
      message: `${fieldName} must be at least 2 characters long`
    };
  }
  
  if (!/^[a-zA-Z\s'-]+$/.test(name)) {
    return {
      field: fieldName,
      message: `${fieldName} can only contain letters, spaces, hyphens, and apostrophes`
    };
  }
  
  return null;
}

// Password validation with security requirements
export function validatePassword(password: string): ValidationError | null {
  if (!password) {
    return { field: 'password', message: 'Password is required' };
  }
  
  if (password.length < 8) {
    return { field: 'password', message: 'Password must be at least 8 characters long' };
  }
  
  if (!/(?=.*[a-z])/.test(password)) {
    return { field: 'password', message: 'Password must contain at least one lowercase letter' };
  }
  
  if (!/(?=.*[A-Z])/.test(password)) {
    return { field: 'password', message: 'Password must contain at least one uppercase letter' };
  }
  
  if (!/(?=.*\d)/.test(password)) {
    return { field: 'password', message: 'Password must contain at least one number' };
  }
  
  if (!/(?=.*[!@#$%^&*(),.?":{}|<>])/.test(password)) {
    return { field: 'password', message: 'Password must contain at least one special character' };
  }
  
  return null;
}

// Password confirmation validation
export function validatePasswordConfirmation(password: string, confirmPassword: string): ValidationError | null {
  if (!confirmPassword) {
    return { field: 'confirmPassword', message: 'Please confirm your password' };
  }
  
  if (password !== confirmPassword) {
    return { field: 'confirmPassword', message: 'Passwords do not match' };
  }
  
  return null;
}

// Comprehensive form validation
export interface ClientRegistrationData {
  // Personal Information
  name: string;
  surname: string;
  idNumber: string;
  passport?: string;
  gender: string;
  email: string;
  mobile: string;
  
  // Password Information
  password: string;
  confirmPassword: string;
  
  // Address Information
  address1: string;
  address2?: string;
  suburb: string;
  cityTown: string;
  province: string;
  postalCode: string;
  country: string;
  addressNotes?: string;
  
  // Contact & Personal Details
  preferredMethodOfContact: string;
  maritalStatus: string;
  employmentStatus: string;
  currentEmployerUniversitySchool?: string;
  occupationSchoolGrade?: string;
  academicInstitution?: string;
  
  // Medical Information
  currentMedication?: string;
  chronicConditions?: string;
  currentTreatments?: string;
  previousProcedures?: string;
  medicalImplants?: string;
  
  // Service Information
  reasonForTransformation: string;
  whereDidYouHearAboutLifeArrow: string;
  myNearestCentre: string;
  referrerName?: string;
  
  // Terms & Administrative
  termsAndConditionsAgreed: boolean;
}

// Step-by-step validation functions
export function validatePersonalInfo(data: Partial<ClientRegistrationData>): ValidationError[] {
  const errors: ValidationError[] = [];
  
  // Name validation
  const nameError = validateName(data.name || '', 'Name');
  if (nameError) errors.push(nameError);
  
  // Surname validation
  const surnameError = validateName(data.surname || '', 'Surname');
  if (surnameError) errors.push(surnameError);
  
  // ID Number validation (required if South African, otherwise passport required)
  if (data.country === 'South Africa' || !data.country) {
    if (!data.idNumber) {
      errors.push({ field: 'idNumber', message: 'ID Number is required for South African residents' });
    } else if (!validateSAIdNumber(data.idNumber)) {
      errors.push({ field: 'idNumber', message: 'Please enter a valid South African ID Number' });
    }
  } else {
    // International clients need passport
    if (!data.passport && !data.idNumber) {
      errors.push({ field: 'passport', message: 'Passport number is required for international clients' });
    }
  }
  
  // Gender validation
  const genderError = validateRequired(data.gender, 'Gender');
  if (genderError) errors.push(genderError);
  
  // Email validation
  if (!data.email) {
    errors.push({ field: 'email', message: 'Email is required' });
  } else if (!validateEmail(data.email)) {
    errors.push({ field: 'email', message: 'Please enter a valid email address' });
  }
  
  // Mobile validation
  if (!data.mobile) {
    errors.push({ field: 'mobile', message: 'Mobile number is required' });
  } else if (!validateMobileNumber(data.mobile)) {
    errors.push({ field: 'mobile', message: 'Please enter a valid South African mobile number (e.g., 0821234567)' });
  }
  
  // Password validation
  const passwordError = validatePassword(data.password || '');
  if (passwordError) errors.push(passwordError);
  
  // Password confirmation validation
  const passwordConfirmError = validatePasswordConfirmation(data.password || '', data.confirmPassword || '');
  if (passwordConfirmError) errors.push(passwordConfirmError);
  
  return errors;
}

export function validateAddressInfo(data: Partial<ClientRegistrationData>): ValidationError[] {
  const errors: ValidationError[] = [];
  
  // Address 1 validation
  const address1Error = validateRequired(data.address1, 'Address 1');
  if (address1Error) errors.push(address1Error);
  
  // Suburb validation
  const suburbError = validateRequired(data.suburb, 'Suburb');
  if (suburbError) errors.push(suburbError);
  
  // City/Town validation
  const cityError = validateRequired(data.cityTown, 'City/Town');
  if (cityError) errors.push(cityError);
  
  // Province validation
  const provinceError = validateRequired(data.province, 'Province');
  if (provinceError) errors.push(provinceError);
  
  // Country validation
  const countryError = validateRequired(data.country, 'Country');
  if (countryError) errors.push(countryError);
  
  // Postal code validation
  if (!data.postalCode) {
    errors.push({ field: 'postalCode', message: 'Postal code is required' });
  } else if (!validatePostalCode(data.postalCode, data.country || 'South Africa')) {
    if (data.country === 'South Africa') {
      errors.push({ field: 'postalCode', message: 'Please enter a valid 4-digit postal code' });
    } else {
      errors.push({ field: 'postalCode', message: 'Please enter a valid postal code' });
    }
  }
  
  return errors;
}

export function validateContactPersonalDetails(data: Partial<ClientRegistrationData>): ValidationError[] {
  const errors: ValidationError[] = [];
  
  // Preferred contact method validation
  const contactMethodError = validateRequired(data.preferredMethodOfContact, 'Preferred Method of Contact');
  if (contactMethodError) errors.push(contactMethodError);
  
  // Marital status validation
  const maritalStatusError = validateRequired(data.maritalStatus, 'Marital Status');
  if (maritalStatusError) errors.push(maritalStatusError);
  
  // Employment status validation
  const employmentStatusError = validateRequired(data.employmentStatus, 'Employment Status');
  if (employmentStatusError) errors.push(employmentStatusError);
  
  return errors;
}

export function validateMedicalInfo(data: Partial<ClientRegistrationData>): ValidationError[] {
  // Medical information is mostly optional, but we can add specific validations if needed
  const errors: ValidationError[] = [];
  
  // No required fields in medical section, but we could add format validations
  // For example, checking for proper medication format, etc.
  // Currently all medical fields are optional
  void data; // Acknowledge parameter to avoid linter warning
  
  return errors;
}

export function validateServiceInfo(data: Partial<ClientRegistrationData>): ValidationError[] {
  const errors: ValidationError[] = [];
  
  // Reason for transformation validation
  if (!data.reasonForTransformation || data.reasonForTransformation.trim().length < 10) {
    errors.push({ 
      field: 'reasonForTransformation', 
      message: 'Please describe your wellness goals (minimum 10 characters)' 
    });
  }
  
  // Where did you hear about us validation
  const hearAboutError = validateRequired(data.whereDidYouHearAboutLifeArrow, 'Where did you hear about Life Arrow');
  if (hearAboutError) errors.push(hearAboutError);
  
  // Centre validation
  const centreError = validateRequired(data.myNearestCentre, 'Nearest Centre');
  if (centreError) errors.push(centreError);
  
  return errors;
}

export function validateTermsAdmin(data: Partial<ClientRegistrationData>): ValidationError[] {
  const errors: ValidationError[] = [];
  
  // Terms and conditions validation
  if (!data.termsAndConditionsAgreed) {
    errors.push({ 
      field: 'termsAndConditionsAgreed', 
      message: 'You must agree to the Terms and Conditions to proceed' 
    });
  }
  
  return errors;
}

// Master validation function
export function validateRegistrationStep(step: number, data: Partial<ClientRegistrationData>): ValidationError[] {
  switch (step) {
    case 1:
      return validatePersonalInfo(data);
    case 2:
      return validateAddressInfo(data);
    case 3:
      return validateContactPersonalDetails(data);
    case 4:
      return validateMedicalInfo(data);
    case 5:
      return validateServiceInfo(data);
    case 6:
      return validateTermsAdmin(data);
    default:
      return [];
  }
}

// Complete form validation
export function validateCompleteRegistration(data: ClientRegistrationData): ValidationError[] {
  const allErrors: ValidationError[] = [];
  
  // Validate each step
  for (let step = 1; step <= 6; step++) {
    const stepErrors = validateRegistrationStep(step, data);
    allErrors.push(...stepErrors);
  }
  
  return allErrors;
}

// Profile completion validation (excludes password requirements)
export function validatePersonalInfoForProfile(data: Partial<ClientRegistrationData>): ValidationError[] {
  const errors: ValidationError[] = [];
  
  // Name validation
  const nameError = validateName(data.name || '', 'Name');
  if (nameError) errors.push(nameError);
  
  // Surname validation
  const surnameError = validateName(data.surname || '', 'Surname');
  if (surnameError) errors.push(surnameError);
  
  // ID Number validation (required if South African, otherwise passport required)
  if (data.country === 'South Africa' || !data.country) {
    if (!data.idNumber) {
      errors.push({ field: 'idNumber', message: 'ID Number is required for South African residents' });
    } else if (!validateSAIdNumber(data.idNumber)) {
      errors.push({ field: 'idNumber', message: 'Please enter a valid South African ID Number' });
    }
  } else {
    // International clients need passport
    if (!data.passport && !data.idNumber) {
      errors.push({ field: 'passport', message: 'Passport number is required for international clients' });
    }
  }
  
  // Gender validation
  const genderError = validateRequired(data.gender, 'Gender');
  if (genderError) errors.push(genderError);
  
  // Email validation
  if (!data.email) {
    errors.push({ field: 'email', message: 'Email is required' });
  } else if (!validateEmail(data.email)) {
    errors.push({ field: 'email', message: 'Please enter a valid email address' });
  }
  
  // Mobile validation
  if (!data.mobile) {
    errors.push({ field: 'mobile', message: 'Mobile number is required' });
  } else if (!validateMobileNumber(data.mobile)) {
    errors.push({ field: 'mobile', message: 'Please enter a valid South African mobile number (e.g., 0821234567)' });
  }
  
  // Note: Password validation is excluded for profile completion
  
  return errors;
}

// Profile completion step validation 
export function validateProfileStep(step: number, data: Partial<ClientRegistrationData>): ValidationError[] {
  switch (step) {
    case 1:
      return validatePersonalInfoForProfile(data); // Use profile-specific validation without password
    case 2:
      return validateAddressInfo(data);
    case 3:
      return validateContactPersonalDetails(data);
    case 4:
      return validateMedicalInfo(data);
    case 5:
      return validateServiceInfo(data);
    case 6:
      return validateTermsAdmin(data);
    default:
      return [];
  }
}

// Complete profile validation (excludes password requirements)
export function validateCompleteProfile(data: Partial<ClientRegistrationData>): ValidationError[] {
  const allErrors: ValidationError[] = [];
  
  // Validate each step using profile-specific validation
  for (let step = 1; step <= 6; step++) {
    const stepErrors = validateProfileStep(step, data);
    allErrors.push(...stepErrors);
  }
  
  return allErrors;
}

// Utility function to format validation errors for display
export function formatValidationErrors(errors: ValidationError[]): Record<string, string> {
  const formattedErrors: Record<string, string> = {};
  
  errors.forEach(error => {
    formattedErrors[error.field] = error.message;
  });
  
  return formattedErrors;
} 
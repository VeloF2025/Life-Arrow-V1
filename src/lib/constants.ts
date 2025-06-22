// South African Provinces
export const PROVINCES = [
  'Eastern Cape',
  'Free State', 
  'Gauteng',
  'KwaZulu-Natal',
  'Limpopo',
  'Mpumalanga',
  'Northern Cape',
  'North West',
  'Western Cape',
  'International'
] as const;

// Life Arrow Treatment Centres
export const TREATMENT_CENTRES = [
  'Cape Town - V&A Waterfront',
  'Johannesburg - Sandton',
  'Durban - Umhlanga',
  'Pretoria - Menlyn',
  'Port Elizabeth - Baywest',
  'Bloemfontein - Central',
  'Polokwane - Mall of the North',
  'Nelspruit - Riverside Mall'
] as const;

// Contact Methods
export const CONTACT_METHODS = [
  'Email',
  'SMS',
  'Phone Call', 
  'WhatsApp'
] as const;

// Gender Options
export const GENDER_OPTIONS = [
  'Male',
  'Female',
  'Other',
  'Prefer not to say'
] as const;

// Marital Status Options
export const MARITAL_STATUS_OPTIONS = [
  'Single',
  'Married',
  'Divorced',
  'Widowed',
  'In a relationship'
] as const;

// Employment Status Options
export const EMPLOYMENT_STATUS_OPTIONS = [
  'Employed Full-time',
  'Employed Part-time',
  'Self-employed',
  'Student',
  'Unemployed',
  'Retired'
] as const;

// How did you hear about us options
export const REFERRAL_SOURCES = [
  'Google Search',
  'Social Media',
  'Friend/Family Referral',
  'Healthcare Provider',
  'Advertisement',
  'Online Review',
  'Magazine/Newspaper',
  'Radio/TV',
  'Other'
] as const;

// Countries (focused on South Africa but international friendly)
export const COUNTRIES = [
  'South Africa',
  'Botswana',
  'Namibia',
  'Eswatini',
  'Lesotho',
  'Zimbabwe',
  'Mozambique',
  'United Kingdom',
  'United States',
  'Canada',
  'Australia',
  'Other'
] as const;

// Form validation patterns
export const VALIDATION_PATTERNS = {
  // South African ID Number (13 digits)
  SA_ID_NUMBER: /^[0-9]{13}$/,
  // South African mobile number
  SA_MOBILE: /^(\+27|0)[6-8][0-9]{8}$/,
  // General email pattern
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  // South African postal code (4 digits)
  SA_POSTAL_CODE: /^[0-9]{4}$/,
  // International postal code (flexible)
  INTL_POSTAL_CODE: /^[A-Za-z0-9\s-]{3,10}$/
} as const;

// Form step configuration
export const REGISTRATION_STEPS = [
  {
    id: 1,
    title: 'Personal Information',
    description: 'Basic identity and contact details',
    icon: 'user'
  },
  {
    id: 2,
    title: 'Address Information',
    description: 'Residential address details',
    icon: 'location'
  },
  {
    id: 3,
    title: 'Contact & Personal Details',
    description: 'Communication preferences and background',
    icon: 'contact'
  },
  {
    id: 4,
    title: 'Medical Information',
    description: 'Health history and conditions',
    icon: 'medical'
  },
  {
    id: 5,
    title: 'Service Information',
    description: 'Wellness goals and preferences',
    icon: 'service'
  },
  {
    id: 6,
    title: 'Terms & Confirmation',
    description: 'Agreement and final confirmation',
    icon: 'check'
  }
] as const;

// Medical information disclaimers
export const MEDICAL_DISCLAIMER = `
This information is confidential and will only be used for treatment planning and safety purposes. 
Please consult your healthcare provider before starting any new wellness program. 
All medical information is encrypted and stored securely in compliance with POPIA regulations.
`;

// Terms and conditions text (can be made editable by admins later)
export const TERMS_AND_CONDITIONS_SUMMARY = `
By registering with Life Arrow, you agree to our Terms of Service and Privacy Policy. 
Your personal information will be processed in accordance with the Protection of Personal Information Act (POPIA).
`;

export type Province = typeof PROVINCES[number];
export type TreatmentCentre = typeof TREATMENT_CENTRES[number];
export type ContactMethod = typeof CONTACT_METHODS[number];
export type Gender = typeof GENDER_OPTIONS[number];
export type MaritalStatus = typeof MARITAL_STATUS_OPTIONS[number];
export type EmploymentStatus = typeof EMPLOYMENT_STATUS_OPTIONS[number];
export type ReferralSource = typeof REFERRAL_SOURCES[number];
export type Country = typeof COUNTRIES[number]; 
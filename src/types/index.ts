// User and Authentication Types
export type UserRole = 'super-admin' | 'admin' | 'client' | 'staff';

export interface User {
  uid: string;
  email: string;
  emailVerified: boolean;
  displayName?: string;
  photoURL?: string;
  createdAt: Date;
  lastLoginAt?: Date;
}

export interface AdminPermissions {
  canCreateAdmins: boolean;
  canDeleteAdmins: boolean;
  canManageSystem: boolean;
  canViewAllData: boolean;
  canManageClients: boolean;
  canManageBilling: boolean;
  canViewReports: boolean;
}

export interface UserProfile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  avatar?: string;
  photoUrl?: string;
  phone?: string;
  street?: string;
  city?: string;
  province?: string;
  postalCode?: string;
  position?: string;
  department?: string;
  specializations?: string[];
  qualifications?: string;
  bio?: string;
  experience?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  emergencyContactRelationship?: string;
  centreIds?: string[]; // IDs of centres the user is associated with
  createdAt: Date;
  updatedAt: Date;
}

export interface AdminProfile extends UserProfile {
  role: 'admin' | 'super-admin';
  permissions?: AdminPermissions;
  specializations?: string[];
  workingHours?: WorkingHours;
}

export interface ClientProfile extends UserProfile {
  role: 'client';
  dateOfBirth?: Date;
  gender?: 'male' | 'female' | 'other' | 'prefer-not-to-say';
  height?: number; // in cm
  weight?: number; // in kg
  medicalHistory?: string[];
  allergies?: string[];
  medications?: string[];
  emergencyContact?: EmergencyContact;
  wellnessGoals?: WellnessGoal[];
  preferences?: ClientPreferences;
  bodyMemoryScore?: number;
  lastScanDate?: Date;
}

// Client Related Types
export interface EmergencyContact {
  name: string;
  relationship: string;
  phone: string;
  email?: string;
}

export interface WellnessGoal {
  id: string;
  title: string;
  description: string;
  targetValue?: number;
  currentValue?: number;
  unit?: string;
  deadline?: Date;
  status: 'active' | 'completed' | 'paused';
  createdAt: Date;
}

export interface ClientPreferences {
  communicationMethod: 'email' | 'sms' | 'both';
  appointmentReminders: boolean;
  scanResultNotifications: boolean;
  marketingEmails: boolean;
  preferredTimeSlots?: string[];
}

// Scan and Metrics Types
export interface LifeArrowScan {
  id: string;
  clientId: string;
  adminId: string; // Who performed/uploaded the scan
  scanDate: Date;
  scanType: 'full-body' | 'emotional' | 'physiological';
  emotionalScanResult: EmotionalScanData;
  physiologicalScanResult: PhysiologicalScanData;
  bodyMemoryScore: number; // 0-100
  videoRecommendations: VideoRecommendation[];
  notes?: string;
  status: 'processing' | 'completed' | 'failed';
  rawData?: string; // Base64 or file path
  createdAt: Date;
  updatedAt: Date;
}

export interface EmotionalScanData {
  stressLevel: number; // 0-100
  anxietyLevel: number; // 0-100
  energyLevel: number; // 0-100
  moodScore: number; // 0-100
  emotionalBalance: number; // 0-100
  overallEmotionalHealth: number; // 0-100
}

export interface PhysiologicalScanData {
  muscularTension: number; // 0-100
  inflammationLevel: number; // 0-100
  circulationScore: number; // 0-100
  nervousSystemHealth: number; // 0-100
  metabolicRate: number; // 0-100
  overallPhysicalHealth: number; // 0-100
}

export interface VideoRecommendation {
  id: string;
  title: string;
  description: string;
  url: string;
  duration: number; // in seconds
  category: 'exercise' | 'meditation' | 'nutrition' | 'therapy';
  recommendationReason: string;
}

// Appointment Types
export interface WorkingHours {
  monday: { start: string; end: string; closed?: boolean };
  tuesday: { start: string; end: string; closed?: boolean };
  wednesday: { start: string; end: string; closed?: boolean };
  thursday: { start: string; end: string; closed?: boolean };
  friday: { start: string; end: string; closed?: boolean };
  saturday: { start: string; end: string; closed?: boolean };
  sunday: { start: string; end: string; closed?: boolean };
}

export interface TimeSlot {
  id: string;
  centreId: string;
  staffId: string;
  serviceId: string;
  startTime: Date;
  endTime: Date;
  isAvailable: boolean;
  price: number;
  staffName: string;
  serviceName: string;
  bookedBy?: string;
}

export interface Appointment {
  id: string;
  clientId: string;
  centreId: string;
  serviceId: string;
  staffId: string;
  startTime: Date;
  endTime: Date;
  dateTime: Date; // Alternative field name for compatibility
  duration: number; // Duration in minutes
  status: 'scheduled' | 'confirmed' | 'completed' | 'cancelled' | 'no-show' | 'rescheduled';
  notes?: string;
  price: number;
  country?: string; // Country for currency formatting
  
  // Denormalized for performance
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  serviceName: string;
  staffName: string;
  centreName: string;
  
  // Audit fields
  createdBy: string;
  lastModifiedBy: string;
  createdAt: Date;
  updatedAt: Date;
  
  // Additional fields
  reminderSent?: boolean;
  paymentStatus?: 'pending' | 'paid' | 'refunded';
  cancellationReason?: string;
  rescheduleHistory?: {
    previousStartTime: Date;
    reason: string;
    timestamp: Date;
  }[];
}

export interface Service {
  id: string;
  name: string;
  description: string;
  duration: number; // minutes
  price: number;
  category: 'scan' | 'consultation' | 'treatment' | 'wellness';
  requiredEquipment?: string[];
  staffQualifications: string[];
  isActive: boolean;
  centreIds: string[]; // Which centres offer this service
  image?: string;
  benefits?: string[];
  prerequisites?: string[];
  createdAt: Date;
  updatedAt: Date;
}

// Treatment Plans
export interface TreatmentPlan {
  id: string;
  clientId: string;
  adminId: string;
  title: string;
  description: string;
  goals: TreatmentGoal[];
  phases: TreatmentPhase[];
  startDate: Date;
  endDate?: Date;
  status: 'active' | 'completed' | 'paused' | 'cancelled';
  progress: number; // 0-100
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface TreatmentGoal {
  id: string;
  title: string;
  description: string;
  targetMetric: string;
  targetValue: number;
  currentValue?: number;
  isCompleted: boolean;
}

export interface TreatmentPhase {
  id: string;
  title: string;
  description: string;
  order: number;
  duration: number; // in days
  tasks: TreatmentTask[];
  isCompleted: boolean;
  startDate?: Date;
  endDate?: Date;
}

export interface TreatmentTask {
  id: string;
  title: string;
  description: string;
  type: 'exercise' | 'meditation' | 'diet' | 'supplement' | 'appointment';
  frequency: 'daily' | 'weekly' | 'monthly' | 'as-needed';
  isCompleted: boolean;
  completedAt?: Date;
  notes?: string;
}

// Payment and Billing
export interface Payment {
  id: string;
  clientId: string;
  appointmentId?: string;
  amount: number; // in cents
  currency: string;
  status: 'pending' | 'succeeded' | 'failed' | 'cancelled' | 'refunded';
  paymentMethod: 'card' | 'cash' | 'bank_transfer';
  stripePaymentIntentId?: string;
  description: string;
  metadata?: Record<string, string | number | boolean>;
  createdAt: Date;
  updatedAt: Date;
}

export interface Invoice {
  id: string;
  clientId: string;
  appointmentIds: string[];
  subtotal: number; // in cents
  tax: number; // in cents
  total: number; // in cents
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  dueDate: Date;
  paidAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// Communication and Notifications
export interface Notification {
  id: string;
  userId: string;
  type: 'appointment_reminder' | 'scan_ready' | 'payment_due' | 'system' | 'message';
  title: string;
  message: string;
  isRead: boolean;
  actionUrl?: string;
  metadata?: Record<string, string | number | boolean>;
  createdAt: Date;
  expiresAt?: Date;
}

export interface Message {
  id: string;
  fromUserId: string;
  toUserId: string;
  subject?: string;
  content: string;
  isRead: boolean;
  attachments?: MessageAttachment[];
  parentMessageId?: string; // For replies
  createdAt: Date;
}

export interface MessageAttachment {
  id: string;
  filename: string;
  url: string;
  size: number;
  mimeType: string;
}

// Analytics and Reports
export interface MetricData {
  date: Date;
  metric: string;
  value: number;
  clientId?: string;
  metadata?: Record<string, string | number | boolean>;
}

export interface AnalyticsReport {
  id: string;
  type: 'client_progress' | 'practice_performance' | 'financial' | 'scan_trends';
  title: string;
  description: string;
  generatedBy: string;
  data: Record<string, unknown>;
  filters: ReportFilters;
  createdAt: Date;
}

export interface ReportFilters {
  dateRange: {
    start: Date;
    end: Date;
  };
  clientIds?: string[];
  adminIds?: string[];
  metrics?: string[];
  [key: string]: any;
}

// UI and Component Types
export interface TableColumn {
  key: string;
  title: string;
  sortable?: boolean;
  filterable?: boolean;
  render?: (value: any, record: any) => React.ReactNode;
}

export interface FilterOption {
  label: string;
  value: any;
  count?: number;
}

export interface ChartData {
  label: string;
  value: number;
  color?: string;
  metadata?: Record<string, any>;
}

// Form Types
export interface FormField {
  name: string;
  label: string;
  type: 'text' | 'email' | 'password' | 'number' | 'date' | 'select' | 'textarea' | 'file';
  required?: boolean;
  validation?: any;
  options?: { label: string; value: any }[];
  placeholder?: string;
  helpText?: string;
}

// API Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface PaginationParams {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  filters?: Record<string, any>;
  search?: string;
}

// System Configuration
export interface AppSettings {
  id: string;
  businessName: string;
  businessLogo?: string;
  businessAddress?: string;
  businessPhone?: string;
  businessEmail?: string;
  timezone: string;
  currency: string;
  appointmentSettings: {
    defaultDuration: number;
    bookingWindow: number; // days in advance
    cancellationWindow: number; // hours before appointment
    reminderSettings: {
      email: boolean;
      sms: boolean;
      hoursBeforeReminder: number;
    };
  };
  paymentSettings: {
    stripePublishableKey: string;
    acceptCash: boolean;
    acceptCard: boolean;
    requirePaymentUpfront: boolean;
  };
  scanSettings: {
    maxFileSize: number; // in MB
    allowedFileTypes: string[];
    retentionPeriod: number; // in days
  };
}

// Enhanced Admin Management System Types
// =====================================

// Enhanced Services (What We Offer)
export interface ServiceManagement {
  id: string;
  name: string; // "Body Composition Scan", "Wellness Consultation"
  description: string;
  category: 'scanning' | 'consultation' | 'treatment' | 'assessment' | 'follow-up';
  duration: number; // in minutes
  price: number; // in cents for precision
  requiredQualifications: string[]; // ["Body Scanner Certified", "Nutritionist"]
  equipmentRequired: string[]; // ["InBody Scanner", "Consultation Room"]
  isActive: boolean;
  availableAtCentres: string[]; // centre IDs where this service is offered
  preparationInstructions: string; // client prep instructions
  followUpRequired: boolean;
  maxConcurrentBookings: number; // how many can be booked simultaneously
  bookingSettings: {
    advanceBookingDays: number; // how far in advance can be booked
    cancellationHours: number; // hours before appointment for free cancellation
    requiresApproval: boolean; // admin approval needed
  };
  analytics: {
    totalBookings: number;
    revenue: number;
    averageRating: number;
    noShowRate: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

// Treatment Centres (Where We Operate)
export interface TreatmentCentre {
  id: string;
  name: string;
  address: {
    street: string;
    suburb: string;
    city: string;
    province: string;
    postalCode: string;
    country: string;
    coordinates: { lat: number; lng: number };
  };
  adminIds: string[];
  staffIds: string[];
  services: string[];
  equipment: string[];
  operatingHours: {
    [day: string]: { open: string; close: string; closed?: boolean };
  };
  timezone: string;
  isActive: boolean;
  phone?: string;
  email?: string;
  description?: string;
  images?: string[];
  rating?: number;
  createdAt: Date;
  updatedAt: Date;
}

// Staff Members (Who Provides Services)
export interface StaffMember {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  position: string;
  specializations: string[];
  qualifications: string[];
  centreIds: string[];
  isActive: boolean;
  photoUrl?: string;
}

// Booking Rules and Validation
export interface BookingRule {
  id: string;
  name: string;
  description: string;
  type: 'validation' | 'business' | 'capacity' | 'conflict';
  isActive: boolean;
  priority: number;
  conditions: Array<{
    field: string;
    operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'contains' | 'in' | 'not_in';
    value: any;
  }>;
  actions: Array<{
    type: 'prevent' | 'warn' | 'require_approval' | 'apply_discount' | 'send_notification';
    message: string;
    parameters?: Record<string, any>;
  }>;
  appliesTo: {
    services: string[];
    centres: string[];
    staff: string[];
    clientTypes: string[];
  };
  schedule?: {
    validFrom?: Date;
    validTo?: Date;
    daysOfWeek?: number[]; // 0-6, Sunday-Saturday
    timeRanges?: Array<{
      start: string;
      end: string;
    }>;
  };
  createdAt: Date;
  updatedAt: Date;
}

// Booking Data
export interface BookingData {
  centre: TreatmentCentre;
  service: ServiceManagement;
  staff: StaffMember;
  timeSlot: TimeSlot;
  clientId?: string; // For admin bookings
  clientName?: string; // For admin bookings - client display name
  clientEmail?: string; // For admin bookings - client email
  clientNotes?: string; // Optional notes from client
}

// Location
export interface Location {
  coordinates: { lat: number; lng: number };
  city?: string;
  country?: string;
  accuracy: 'ip' | 'gps';
}

// Permission Types
export interface RolePermissions {
  appointments: 'own' | 'centre_assigned' | 'centre_all' | 'system_wide';
  booking: string[];
  dataAccess: 'personal_only' | 'assigned_clients' | 'centre_complete' | 'unrestricted';
}

export interface SystemMetrics {
  totalCentres: number;
  activeClients: number;
  totalStaff: number;
  monthlyRevenue: number;
  growthRate: number;
  totalAppointments: number;
  utilization: number;
  noShowRate: number;
}

export interface CentreAnalytics {
  centreId: string;
  totalAppointments: number;
  revenue: number;
  utilization: number;
  noShowRate: number;
  topServices: { serviceId: string; serviceName: string; count: number }[];
  staffPerformance: { staffId: string; staffName: string; appointments: number; rating: number }[];
  monthlyTrends: { month: string; appointments: number; revenue: number }[];
}

// Form Types
export interface ClientRegistrationData {
  // Personal Information
  firstName: string;
  lastName: string;
  email: string;
  mobile: string;
  gender: string;
  dateOfBirth: string;
  country: string;
  idNumber?: string;
  passport?: string;
  photoUrl?: string;
  
  // Address Information
  streetAddress: string;
  city: string;
  province: string;
  postalCode: string;
  
  // Contact & Personal Details
  homePhone?: string;
  workPhone?: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  emergencyContactRelationship: string;
  preferredLanguage: string;
  occupation?: string;
  
  // Medical Information
  medicalAidProvider?: string;
  medicalAidNumber?: string;
  allergies?: string;
  medications?: string;
  medicalHistory?: string;
  
  // Service Information
  myNearestTreatmentCentre: string;
  servicesInterestedIn: string[];
  howDidYouHearAboutUs: string;
  additionalInfo?: string;
  
  // Terms and Admin
  agreeToTerms: boolean;
  agreeToMarketing: boolean;
  adminId?: string;
  
  // Timestamps
  createdAt?: Date;
  updatedAt?: Date;
} 
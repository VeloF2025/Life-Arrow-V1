// User and Authentication Types
export type UserRole = 'super-admin' | 'admin' | 'client';

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
  uid: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  phone?: string;
  avatar?: string;
  createdAt: Date;
  updatedAt: Date;
  isActive: boolean;
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
  monday: TimeSlot[];
  tuesday: TimeSlot[];
  wednesday: TimeSlot[];
  thursday: TimeSlot[];
  friday: TimeSlot[];
  saturday: TimeSlot[];
  sunday: TimeSlot[];
}

export interface TimeSlot {
  start: string; // "09:00"
  end: string; // "17:00"
}

export interface Appointment {
  id: string;
  clientId: string;
  adminId: string;
  serviceId: string;
  date: Date;
  startTime: string; // "14:00"
  endTime: string; // "15:00"
  status: 'scheduled' | 'confirmed' | 'in-progress' | 'completed' | 'cancelled' | 'no-show';
  type: 'consultation' | 'scan' | 'follow-up' | 'treatment';
  notes?: string;
  clientNotes?: string;
  reminderSent: boolean;
  paymentStatus: 'pending' | 'paid' | 'failed' | 'refunded';
  paymentId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Service {
  id: string;
  name: string;
  description: string;
  duration: number; // in minutes
  price: number; // in cents
  category: 'scan' | 'consultation' | 'treatment' | 'follow-up';
  isActive: boolean;
  requiresSpecialization?: string[];
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
  name: string; // "Cape Town - V&A Waterfront"
  code: string; // "CPT-VNA" for easy reference
  address: {
    street: string;
    suburb: string;
    city: string;
    province: string;
    postalCode: string;
    country: string;
    coordinates?: {
      latitude: number;
      longitude: number;
    };
  };
  contactInfo: {
    phone: string;
    email: string;
    managerName: string;
    managerPhone?: string;
    alternateContact?: string;
  };
  operatingHours: {
    [key: string]: { // "monday", "tuesday", etc.
      isOpen: boolean;
      openTime: string; // "09:00"
      closeTime: string; // "17:00"
      breakTimes: Array<{
        startTime: string;
        endTime: string;
        description: string; // "Lunch break"
      }>;
    };
  };
  facilities: {
    availableEquipment: string[]; // ["InBody Scanner", "Consultation Room A"]
    roomsAvailable: Array<{
      id: string;
      name: string;
      type: 'consultation' | 'scanning' | 'treatment' | 'waiting';
      capacity: number;
      equipment: string[];
    }>;
    amenities: string[]; // ["Parking", "WiFi", "Accessible"]
  };
  servicesOffered: string[]; // service IDs available at this centre
  staffAssigned: string[]; // staff IDs who work at this centre
  timezone: string; // "Africa/Johannesburg"
  isActive: boolean;
  capacity: {
    maxDailyAppointments: number;
    maxConcurrentAppointments: number;
    maxWalkIns: number;
  };
  settings: {
    allowOnlineBooking: boolean;
    requiresInsurance: boolean;
    acceptsWalkIns: boolean;
    parkingAvailable: boolean;
    wheelchairAccessible: boolean;
  };
  specialNotes: string; // parking info, access instructions, etc.
  analytics: {
    utilizationRate: number; // percentage of capacity used
    revenue: number;
    clientSatisfaction: number;
    averageWaitTime: number; // in minutes
  };
  createdAt: Date;
  updatedAt: Date;
}

// Staff Members (Who Provides Services)
export interface StaffMember {
  id: string;
  personalInfo: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    employeeId: string;
    dateOfBirth?: Date;
    avatar?: string;
  };
  qualifications: Array<{
    id: string;
    certificationName: string;
    certifyingBody: string;
    dateObtained: Date;
    expiryDate?: Date;
    certificationNumber: string;
    documentUrl?: string; // uploaded certificate
    isVerified: boolean;
    notes?: string;
  }>;
  servicesCanPerform: string[]; // service IDs they're qualified for
  workingCentres: string[]; // centre IDs where they work
  availability: {
    [centreId: string]: {
      [day: string]: Array<{
        startTime: string;
        endTime: string;
        isAvailable: boolean;
        breakTimes?: Array<{
          startTime: string;
          endTime: string;
          description: string;
        }>;
      }>;
    };
  };
  role: 'practitioner' | 'consultant' | 'technician' | 'manager' | 'admin' | 'specialist';
  employmentInfo: {
    employmentStatus: 'full-time' | 'part-time' | 'contractor' | 'inactive';
    hireDate: Date;
    salary?: number;
    hourlyRate?: number;
    benefits: string[];
    department: string;
    reportsTo?: string; // staff ID of manager
  };
  emergencyContact: {
    name: string;
    relationship: string;
    phone: string;
    email?: string;
  };
  preferences: {
    preferredCentres: string[];
    maxAppointmentsPerDay: number;
    timeOffRequests: Array<{
      startDate: Date;
      endDate: Date;
      reason: string;
      status: 'pending' | 'approved' | 'denied';
    }>;
    notifications: {
      email: boolean;
      sms: boolean;
      scheduleChanges: boolean;
      newAppointments: boolean;
    };
  };
  isActive: boolean;
  performanceMetrics: {
    completedAppointments: number;
    cancelledAppointments: number;
    noShowRate: number;
    averageRating: number;
    clientRetentionRate: number;
    punctualityScore: number;
    revenueGenerated: number;
  };
  documents: Array<{
    id: string;
    type: 'contract' | 'certification' | 'id-copy' | 'resume' | 'other';
    name: string;
    url: string;
    uploadedAt: Date;
  }>;
  createdAt: Date;
  updatedAt: Date;
}

// Enhanced Appointments (Connecting Everything)
export interface AppointmentManagement {
  id: string;
  clientId: string;
  staffId: string;
  serviceId: string;
  centreId: string;
  appointmentDate: Date;
  timeSlot: {
    startTime: string; // "14:00"
    endTime: string; // "15:30"
    duration: number; // in minutes
    roomId?: string; // specific room if applicable
  };
  status: 'scheduled' | 'confirmed' | 'checked-in' | 'in-progress' | 'completed' | 'cancelled' | 'no-show' | 'rescheduled';
  bookingInfo: {
    bookedBy: string; // user ID who made the booking
    bookedByRole: 'client' | 'admin' | 'staff';
    bookedAt: Date;
    bookingMethod: 'online' | 'phone' | 'walk-in' | 'admin-portal';
    bookingSource: string; // "website", "mobile-app", "phone", etc.
  };
  pricing: {
    basePrice: number;
    discounts: Array<{
      type: 'percentage' | 'fixed';
      amount: number;
      reason: string;
      appliedBy?: string;
    }>;
    additionalCharges: Array<{
      description: string;
      amount: number;
    }>;
    totalPrice: number;
    paymentStatus: 'pending' | 'partial' | 'paid' | 'refunded' | 'failed';
    paymentMethod?: 'cash' | 'card' | 'bank-transfer' | 'insurance';
  };
  notes: {
    clientNotes: string; // from client when booking
    staffNotes: string; // internal staff notes
    adminNotes: string; // admin/management notes
    internalFlags: string[]; // ["high-priority", "first-time", "vip"]
  };
  communication: {
    remindersSent: Array<{
      type: 'email' | 'sms' | 'whatsapp' | 'push';
      sentAt: Date;
      status: 'sent' | 'delivered' | 'failed' | 'opened';
      content: string;
    }>;
    clientCommunication: Array<{
      timestamp: Date;
      type: 'email' | 'phone' | 'sms';
      direction: 'inbound' | 'outbound';
      content: string;
      handledBy?: string;
    }>;
  };
  workflow: {
    checkInTime?: Date;
    startTime?: Date;
    endTime?: Date;
    waitTime?: number; // minutes waited
    serviceTime?: number; // actual service duration
    followUpRequired: boolean;
    followUpScheduled?: Date;
  };
  rescheduleHistory: Array<{
    previousDate: Date;
    previousTime: string;
    newDate: Date;
    newTime: string;
    reason: string;
    rescheduledBy: string;
    rescheduledAt: Date;
    fee?: number; // reschedule fee if applicable
  }>;
  satisfaction: {
    rating?: number; // 1-5 stars
    feedback?: string;
    staffRating?: number;
    facilityRating?: number;
    recommendationScore?: number; // NPS
    submittedAt?: Date;
  };
  metadata: {
    isFirstVisit: boolean;
    sourceOfReferral?: string;
    insuranceInfo?: {
      provider: string;
      policyNumber: string;
      preAuthRequired: boolean;
      preAuthNumber?: string;
    };
    specialRequirements?: string[]; // ["wheelchair-access", "interpreter"]
  };
  createdAt: Date;
  updatedAt: Date;
}

// Equipment and Resource Management
export interface Equipment {
  id: string;
  name: string;
  type: 'scanner' | 'consultation-furniture' | 'computer' | 'medical-device' | 'other';
  model?: string;
  serialNumber?: string;
  purchaseDate?: Date;
  warrantyExpiry?: Date;
  status: 'operational' | 'maintenance' | 'repair' | 'retired';
  centreId: string;
  roomId?: string;
  maintenanceSchedule: Array<{
    date: Date;
    type: 'routine' | 'repair' | 'calibration';
    technician: string;
    notes: string;
    cost?: number;
  }>;
  usageLog: Array<{
    appointmentId: string;
    usedAt: Date;
    duration: number;
  }>;
  specifications: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
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
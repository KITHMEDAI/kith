// ============================================
// Kith — TypeScript Interfaces (production)
// ============================================

export type SubscriptionPlan = 'free' | 'pro' | 'ultra' | 'clinic';
export type SubscriptionStatus = 'trialing' | 'active' | 'past_due' | 'cancelled';
export type RiskLevel = 'low' | 'moderate' | 'high' | 'critical';
export type AppointmentStatus = 'scheduled' | 'confirmed' | 'in_session' | 'completed' | 'cancelled' | 'no_show' | 'rescheduled';
export type SessionType = 'individual' | 'couples' | 'family' | 'group';
export type Modality = 'in_person' | 'video';
export type PatientStatus = 'active' | 'inactive' | 'discharged';

// ---- Therapist ----
export interface Therapist {
  id: string;
  user_id: string;
  display_name: string;
  designation: string | null;
  license_number: string | null;
  license_council: string | null;
  clinic_name: string | null;
  phone: string | null;
  email: string | null;
  avatar_url: string | null;
  specializations: string[];
  bio: string | null;
  timezone: string;
  subscription_plan: SubscriptionPlan;
  subscription_status: SubscriptionStatus;
  trial_ends_at: string | null;
  razorpay_payment_id: string | null;
  razorpay_order_id: string | null;
  google_calendar_vault_secret_id: string | null;
  created_at: string;
  updated_at?: string;
}

// ---- Patient ----
export interface Patient {
  id: string;
  therapist_id: string;
  display_name: string;
  date_of_birth: string | null;
  age: number | null;
  gender: string | null;
  pronouns: string | null;
  phone: string | null;
  whatsapp_number: string | null;
  email: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  diagnosis: string[];
  therapy_modality: string | null;
  session_frequency: string | null;
  medications: string | null;
  presenting_concerns: string | null;
  therapy_goals: string[];
  consent_recording: boolean;
  consent_ai_notes: boolean;
  consent_date: string | null;
  risk_level: RiskLevel;
  status: PatientStatus;
  patient_id_number: string | null;
  created_at: string;
  updated_at?: string;
}

// ---- Appointment ----
export interface Appointment {
  id: string;
  therapist_id: string;
  patient_id: string | null;
  scheduled_at: string;
  duration_minutes: number;
  session_type: SessionType;
  modality: Modality;
  meeting_url?: string | null;
  status: AppointmentStatus;
  goals: string | null;
  notes: string | null;
  google_event_id: string | null;
  reschedule_reason: string | null;
  source: 'manual' | 'google_calendar' | 'import';
  created_at: string;
  // Joined
  patient?: Partial<Patient>;
}

// ---- Session ----
export interface Session {
  id: string;
  therapist_id: string;
  patient_id: string;
  appointment_id: string | null;
  session_number: number;
  started_at: string;
  ended_at: string | null;
  status: 'active' | 'processing' | 'completed' | 'failed';
  recording_source?: 'in_person' | 'online_bot';
  recall_bot_id?: string | null;
  audio_url: string | null;
  assemblyai_transcript_id: string | null;
  transcript_raw: TranscriptSegment[] | null;
  soap_note: SOAPNote | null;
  key_points: string[] | null;
  session_summary: string | null;
  ai_suggestions: string[] | null;
  resource_suggestions: ResourceSuggestions | null;
  risk_flags: RiskFlags | null;
  risk_level: RiskLevel | null;
  next_session_plan: string | null;
  homework_assigned: string | null;
  patient_mood_score?: number | null;
  gad7_score: number | null;
  phq9_score: number | null;
  notes_generated_at: string | null;
  created_at: string;
  // Joined
  patient?: Partial<Patient>;
  appointment?: Partial<Appointment>;
}

// ---- Transcript ----
export interface TranscriptSegment {
  /** Raw speaker label from AssemblyAI — "Speaker A", "Speaker B", etc.
   *  Role inference (clinician vs patient) is handled by the Claude pipeline,
   *  not at the data layer. Display as-is on screen. */
  speaker: string;
  text: string;
  start_ms: number;
  end_ms: number;
  confidence: number;
  is_partial: boolean;
  /** Words within this segment that the recogniser flagged as low-confidence.
   *  Layer 1 of the note pipeline repairs these from full-conversation context. */
  low_conf?: string[];
}

// ---- Notes ----
export interface SOAPNote {
  subjective?: string;
  objective?: string;
  assessment?: string;
  plan?: string;
}

export interface DAPNote {
  data?: string;
  assessment?: string;
  plan?: string;
}

export interface RiskFlags {
  level: RiskLevel;
  indicators: string[];
  action_required: boolean;
  recommended_action: string | null;
}

export interface ResourceSuggestions {
  books?: { title: string; author: string; reason: string }[];
  movies?: { title: string; year: number; reason: string }[];
  exercises?: { name: string; description: string; frequency: string }[];
  apps?: { name: string; platform: string; reason: string }[];
}

export interface SessionGrowth {
  compared_to_last: 'improved' | 'stable' | 'declined' | 'first session';
  areas_of_progress: string[];
  areas_of_concern: string[];
  narrative: string;
}

export interface PrescriptionNotes {
  medication_relevant: boolean;
  note: string | null;
  refer_to_psychiatrist: boolean;
}

export interface SessionNotes {
  soap_note: SOAPNote;
  dap_note?: DAPNote;
  key_points: string[];
  session_summary: string;
  session_growth?: SessionGrowth;
  ai_suggestions: string[];
  prescription_notes?: PrescriptionNotes;
  resource_suggestions: ResourceSuggestions;
  risk_flags: RiskFlags;
  homework_assigned: string;
  next_session_plan: string;
  session_tags?: string[];
}

// ---- Dashboard ----
export interface DashboardStats {
  patientsThisMonth: number;
  sessionsToday: number;
  notesGenerated: number;
  timeSavedMinutes: number;
  avgMoodScore?: number | null;
}

// ---- Patient Metrics ----
export interface PatientMetric {
  id: string;
  patient_id: string;
  therapist_id: string;
  session_id: string | null;
  mood_score: number | null;
  gad7_score: number | null;
  phq9_score: number | null;
  homework_completed: boolean | null;
  session_duration_minutes: number | null;
  recorded_at: string;
}
export interface VoiceCommand {
  intent: string;
  transcript?: string;
  confidence?: number;
  params: { destination?: string; text?: string; query?: string; [key: string]: unknown };
  payload?: Record<string, unknown>;
}

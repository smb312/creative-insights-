export type UserRole = "agency_admin" | "agency_member" | "client";

export type ClientStatus = "onboarding" | "active" | "churned";

export type OnboardingSection = "access" | "performance" | "creative";

export type PlatformName =
  | "meta"
  | "google"
  | "shopify"
  | "klaviyo"
  | "ga4"
  | "tiktok";

export type PlatformAccessStatus =
  | "not_started"
  | "pending"
  | "received"
  | "verified";

export type AssetFolderName =
  | "brand_guidelines"
  | "logos"
  | "raw_video"
  | "ugc"
  | "other";

export type ReportType = "weekly" | "qbr" | "ad_hoc";

export type CreativeDeliveryStatus =
  | "in_review"
  | "approved"
  | "revision_requested";

// ---- Row types ----

export interface User {
  id: string;
  email: string;
  full_name: string | null;
  role: UserRole;
  client_id: string | null;
  created_at: string;
}

export interface Client {
  id: string;
  name: string;
  logo_url: string | null;
  primary_contact_name: string | null;
  primary_contact_email: string | null;
  agency_contact_id: string | null;
  status: ClientStatus;
  created_at: string;
}

export interface OnboardingResponse {
  id: string;
  client_id: string;
  section: OnboardingSection;
  question_key: string;
  question_text: string;
  response_text: string | null;
  updated_at: string;
  updated_by: string | null;
}

export interface PlatformAccess {
  id: string;
  client_id: string;
  platform: PlatformName;
  status: PlatformAccessStatus;
  instructions_url: string | null;
  notes: string | null;
  updated_at: string;
  updated_by: string | null;
}

export interface AssetFolder {
  id: string;
  client_id: string;
  name: AssetFolderName;
  created_at: string;
}

export interface Asset {
  id: string;
  client_id: string;
  folder_id: string | null;
  file_name: string;
  file_url: string;
  file_type: string | null;
  file_size: number | null;
  uploaded_by: string | null;
  created_at: string;
}

export interface Report {
  id: string;
  client_id: string;
  type: ReportType;
  title: string;
  loom_url: string | null;
  notes: string | null;
  report_date: string | null;
  created_by: string | null;
  created_at: string;
}

export interface CreativeDelivery {
  id: string;
  client_id: string;
  title: string;
  frame_io_url: string | null;
  campaign_name: string | null;
  status: CreativeDeliveryStatus;
  delivery_date: string | null;
  created_by: string | null;
  created_at: string;
}

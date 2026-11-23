export interface CustomField {
  key: string;
  value: string;
}

export type AccountStatus = 'Active' | 'Rarely Used' | 'Suspended' | 'Archived';

export type SimType = 'SIM Fisik' | 'eSIM';
export type SimManualStatus = 'Active' | 'Suspended' | 'Archived';

export type SimHealthState =
  | 'active'
  | 'expiring_soon'
  | 'grace_period'
  | 'expired'
  | 'no_expiry'
  | 'archived';

export interface PhoneNumber {
  id: string;
  phoneNumber: string;
  label: string;
  provider: string;
  simType: SimType;
  deviceSlot: string;
  usagePurpose: string;
  noExpiry: boolean;
  activeUntil: string; // YYYY-MM-DD or ''
  graceUntil: string; // YYYY-MM-DD or ''
  renewalTip: string;
  linkedServices: string[];
  manualStatus: SimManualStatus;
  tags: string[];
  customFields: CustomField[];
  notes: string;
  updatedAt: string;
}

export interface GoogleAccount {
  id: string;
  email: string;
  aliasLabel: string;
  primaryPurpose: string;
  colorBadge: string;
  chromeProfile: string;
  status: AccountStatus;
  recoveryAccountId: string; // '' if none
  linkedPhoneId: string; // '' if none
  recoveryPhoneHint: string;
  has2FA: boolean;
  passwordManagerRef: string;
  driveUsedGb: number | null;
  driveLimitGb: number | null;
  tags: string[];
  customFields: CustomField[];
  notes: string;
  updatedAt: string;
}

export type CloudEnvironment = 'Production' | 'Staging' | 'Dev' | 'Sandbox' | 'Archived';
export type CloudStatus = 'Active' | 'Paused' | 'Billing Issue' | 'Decommissioned';

export interface CloudProject {
  id: string;
  accountId: string;
  provider: string;
  projectName: string;
  projectIdRef: string;
  environment: CloudEnvironment;
  status: CloudStatus;
  billingTier: string;
  consoleUrl: string;
  relatedDomains: string;
  tags: string[];
  customFields: CustomField[];
  notes: string;
  updatedAt: string;
}

export type LoginMethod = 'Google OAuth / SSO' | 'Email + Password' | 'Magic Link' | 'Passkey';
export type ImportanceLevel = 'Critical' | 'Normal' | 'Low';

export interface ConnectedWebsite {
  id: string;
  accountId: string;
  serviceName: string;
  url: string;
  category: string;
  loginMethod: LoginMethod;
  usernameHandle: string;
  importance: ImportanceLevel;
  tags: string[];
  customFields: CustomField[];
  notes: string;
  updatedAt: string;
}

export type SubscriptionStatus = 'Active' | 'Trial' | 'Cancelled' | 'Expired';
export type BillingCycle = 'Monthly' | 'Yearly' | 'Weekly' | 'One-time';
export type CurrencyCode = 'IDR' | 'USD';

export interface Subscription {
  id: string;
  accountId: string;
  serviceName: string;
  planName: string;
  status: SubscriptionStatus;
  costAmount: number;
  currency: CurrencyCode;
  billingCycle: BillingCycle;
  nextRenewalDate: string; // YYYY-MM-DD or ''
  autoRenew: boolean;
  paymentMethodHint: string;
  manageUrl: string;
  tags: string[];
  notes: string;
  updatedAt: string;
}

export interface OtherAsset {
  id: string;
  accountId: string;
  assetType: string;
  title: string;
  identifier: string;
  url: string;
  tags: string[];
  customFields: CustomField[];
  notes: string;
  updatedAt: string;
}

export interface VaultData {
  version: number;
  exportedAt?: string;
  phoneNumbers: PhoneNumber[];
  googleAccounts: GoogleAccount[];
  cloudProjects: CloudProject[];
  connectedWebsites: ConnectedWebsite[];
  subscriptions: Subscription[];
  otherAssets: OtherAsset[];
}

export type SyncProviderType = 'local' | 'github' | 'supabase';

export interface GitHubSyncConfig {
  owner: string;
  repo: string;
  branch: string;
  filePath: string;
  token: string;
  encryptData: boolean;
  passphrase: string;
  autoSync: boolean;
  lastSha?: string;
}

export interface SupabaseSyncConfig {
  url: string;
  anonKey: string;
  autoSync: boolean;
}

export interface SyncSettings {
  mode: SyncProviderType;
  github: GitHubSyncConfig;
  supabase: SupabaseSyncConfig;
}

export type SearchCategory =
  | 'all'
  | 'account'
  | 'phone'
  | 'cloud'
  | 'website'
  | 'subscription'
  | 'other';

export interface GlobalSearchResult {
  id: string;
  category: Exclude<SearchCategory, 'all'>;
  title: string;
  subtitle: string;
  detailLine: string;
  ownerAccount?: GoogleAccount;
  ownerPhone?: PhoneNumber;
  copyValue: string;
  copyLabel: string;
  url?: string;
  badgeText?: string;
  badgeTone?: 'neutral' | 'success' | 'warning' | 'danger' | 'info';
  score: number;
}

export type ActiveTab = 'dashboard' | 'accounts' | 'phones' | 'items' | 'settings';
export type ItemsSubTab = 'cloud' | 'websites' | 'subscriptions' | 'other';

export const ACCOUNT_COLOR_PALETTE = [
  { label: 'Cobalt', hex: '#2563EB' },
  { label: 'Emerald', hex: '#059669' },
  { label: 'Teal', hex: '#0D9488' },
  { label: 'Amber', hex: '#D97706' },
  { label: 'Crimson', hex: '#DC2626' },
  { label: 'Slate', hex: '#475569' },
  { label: 'Terracotta', hex: '#C2410C' },
  { label: 'Ocean', hex: '#0284C7' },
] as const;

export const SIM_PROVIDERS = [
  'Telkomsel',
  'by.U',
  'Indosat / IM3',
  'Tri (3)',
  'XL',
  'Axis',
  'Smartfren',
  'Lainnya',
] as const;

export const CLOUD_PROVIDERS = [
  'GCP',
  'Firebase',
  'Vercel',
  'Cloudflare',
  'Supabase',
  'AWS',
  'Azure',
  'Railway',
  'GitHub',
  'Lainnya',
] as const;

export const WEBSITE_CATEGORIES = [
  'Developer',
  'AI Tools',
  'Productivity',
  'Design',
  'Finance & Banking',
  'E-Commerce',
  'Social Media',
  'Entertainment',
  'Domain & Hosting',
  'Lainnya',
] as const;

export const OTHER_ASSET_TYPES = [
  'Google Drive / Storage',
  'YouTube Channel',
  'Google Play Developer',
  'Domain',
  'API & Quota',
  'Akun Sosial Media',
  'Akun Game',
  'Newsletter / Komunitas',
  'Lainnya',
] as const;

export const ACCOUNT_PURPOSES = [
  'Personal Utama',
  'Kerja / Klien',
  'Developer & Cloud',
  'Side Project & AI',
  'Subscription & Hiburan',
  'Belanja & Sosmed',
  'Backup & Arsip',
  'Lainnya',
] as const;

export function createEmptyVault(): VaultData {
  return {
    version: 1,
    phoneNumbers: [],
    googleAccounts: [],
    cloudProjects: [],
    connectedWebsites: [],
    subscriptions: [],
    otherAssets: [],
  };
}

export function generateId(prefix: string): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}_${crypto.randomUUID().slice(0, 12)}`;
  }
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function parseTagsInput(raw: string): string[] {
  return raw
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean);
}

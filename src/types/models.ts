export interface CustomField {
  key: string;
  value: string;
}

export type AccountStatus =
  | 'Active'
  | 'Spare'
  | 'Shared'
  | 'Sold'
  | 'Issue'
  | 'Rarely Used'
  | 'Suspended'
  | 'Archived';

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
  activeUntil: string; // Tanggal masuk masa tenggang / akhir masa aktif (YYYY-MM-DD)
  graceUntil: string; // Tanggal mati / hangus permanen (YYYY-MM-DD)
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
  passwordHint: string; // Kode pola / hint aman (bukan password mentah)
  holderName: string; // Nama pemakai / pembeli jika Shared atau Sold
  holderUntil: string; // Batas waktu pakai (mis. Juni 2027)
  quickSubName: string; // Paket langganan ringkas (mis. Google AI Pro, YouTube Premium)
  quickSubPeriod: string; // Periode/batas (mis. Nov 2026 - Nov 2027)
  quickSubNeedsCancel: boolean; // Penanda "Belum Cancel"
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

export interface ProjectItem {
  id: string;
  name: string;
  email: string;
  accountId: string; // '' jika email tidak/belum ada di daftar GoogleAccount
  notes: string;
  updatedAt: string;
}

export interface VaultData {
  version: number;
  exportedAt?: string;
  phoneNumbers: PhoneNumber[];
  googleAccounts: GoogleAccount[];
  projects: ProjectItem[];
  cloudProjects: CloudProject[];
  connectedWebsites: ConnectedWebsite[];
  subscriptions: Subscription[];
  otherAssets: OtherAsset[];
}

export type SyncProviderType = 'local' | 'gsheets' | 'github' | 'supabase';

export interface GoogleSheetsSyncConfig {
  scriptUrl: string;
  apiKey: string;
  autoSync: boolean;
  autoPull: boolean;
}

export interface GitHubSyncConfig {
  owner: string;
  repo: string;
  branch: string;
  filePath: string;
  token: string;
  encryptData: boolean;
  passphrase: string;
  autoSync: boolean;
  autoPull: boolean;
  lastSha?: string;
}

export interface SupabaseSyncConfig {
  url: string;
  anonKey: string;
  autoSync: boolean;
  autoPull: boolean;
}

export interface SyncSettings {
  mode: SyncProviderType;
  gsheets: GoogleSheetsSyncConfig;
  github: GitHubSyncConfig;
  supabase: SupabaseSyncConfig;
}

export type SearchCategory =
  | 'all'
  | 'account'
  | 'project'
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

export type ActiveTab = 'dashboard' | 'accounts' | 'projects' | 'phones' | 'items' | 'settings';
export type ItemsSubTab = 'cloud' | 'websites' | 'subscriptions' | 'other';
export type ViewMode = 'table' | 'cards';

export const ACCOUNT_STATUS_META: Record<
  AccountStatus,
  { label: string; shortLabel: string; tone: 'success' | 'info' | 'warning' | 'danger' | 'neutral' }
> = {
  Active: { label: 'Aktif (Pribadi)', shortLabel: 'Aktif', tone: 'success' },
  Spare: { label: 'Cadangan (Kosong)', shortLabel: 'Cadangan', tone: 'info' },
  Shared: { label: 'Dipakai Orang', shortLabel: 'Dipakai Orang', tone: 'warning' },
  Sold: { label: 'Sold / Terjual', shortLabel: 'Sold', tone: 'neutral' },
  Issue: { label: 'Bermasalah / Banned', shortLabel: 'Bermasalah', tone: 'danger' },
  'Rarely Used': { label: 'Jarang Dipakai', shortLabel: 'Jarang', tone: 'neutral' },
  Suspended: { label: 'Suspended', shortLabel: 'Suspended', tone: 'danger' },
  Archived: { label: 'Arsip', shortLabel: 'Arsip', tone: 'neutral' },
};

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
  'Tri (3)',
  'XL',
  'XL Prio',
  'Indosat / IM3',
  'by.U',
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
  'Cadangan / Akun Serial',
  'Belanja & Sosmed',
  'Backup & Arsip',
  'Lainnya',
] as const;

export function createEmptyVault(): VaultData {
  return {
    version: 1,
    phoneNumbers: [],
    googleAccounts: [],
    projects: [],
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

export function normalizeProjectRecord(raw: Partial<ProjectItem>): ProjectItem {
  return {
    id: raw.id || generateId('prj'),
    name: (raw.name ?? '').trim(),
    email: (raw.email ?? '').trim(),
    accountId: raw.accountId ?? '',
    notes: raw.notes ?? '',
    updatedAt: raw.updatedAt ?? new Date().toISOString(),
  };
}

export function normalizeAccountRecord(raw: Partial<GoogleAccount>): GoogleAccount {
  return {
    id: raw.id || generateId('acc'),
    email: raw.email ?? '',
    aliasLabel: raw.aliasLabel ?? '',
    primaryPurpose: raw.primaryPurpose ?? 'Personal Utama',
    colorBadge: raw.colorBadge ?? '#2563EB',
    chromeProfile: raw.chromeProfile ?? '',
    status: raw.status ?? 'Active',
    passwordHint: raw.passwordHint ?? '',
    holderName: raw.holderName ?? '',
    holderUntil: raw.holderUntil ?? '',
    quickSubName: raw.quickSubName ?? '',
    quickSubPeriod: raw.quickSubPeriod ?? '',
    quickSubNeedsCancel: Boolean(raw.quickSubNeedsCancel),
    recoveryAccountId: raw.recoveryAccountId ?? '',
    linkedPhoneId: raw.linkedPhoneId ?? '',
    recoveryPhoneHint: raw.recoveryPhoneHint ?? '',
    has2FA: Boolean(raw.has2FA),
    passwordManagerRef: raw.passwordManagerRef ?? '',
    driveUsedGb: raw.driveUsedGb ?? null,
    driveLimitGb: raw.driveLimitGb ?? null,
    tags: Array.isArray(raw.tags) ? raw.tags : [],
    customFields: Array.isArray(raw.customFields) ? raw.customFields : [],
    notes: raw.notes ?? '',
    updatedAt: raw.updatedAt ?? new Date().toISOString(),
  };
}

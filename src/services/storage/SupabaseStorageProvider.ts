import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js';
import type {
  CloudProject,
  ConnectedWebsite,
  CustomField,
  GoogleAccount,
  OtherAsset,
  PhoneNumber,
  Subscription,
  SupabaseSyncConfig,
  VaultData,
} from '../../types/models';

let cachedClient: SupabaseClient | null = null;
let cachedKey = '';

export function getSupabaseClient(config: SupabaseSyncConfig): SupabaseClient {
  const url = config.url.trim();
  const anonKey = config.anonKey.trim();
  if (!url || !anonKey) {
    throw new Error('Isi Supabase Project URL dan Publishable/Anon Key terlebih dahulu.');
  }
  const composite = `${url}::${anonKey}`;
  if (cachedClient && cachedKey === composite) {
    return cachedClient;
  }
  cachedClient = createClient(url, anonKey);
  cachedKey = composite;
  return cachedClient;
}

export async function getSupabaseUser(config: SupabaseSyncConfig): Promise<User | null> {
  if (!config.url.trim() || !config.anonKey.trim()) return null;
  const client = getSupabaseClient(config);
  const { data } = await client.auth.getUser();
  return data.user ?? null;
}

export async function signInSupabase(
  config: SupabaseSyncConfig,
  email: string,
  password: string
): Promise<User> {
  const client = getSupabaseClient(config);
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error || !data.user) {
    throw new Error(error?.message || 'Gagal login ke Supabase.');
  }
  return data.user;
}

export async function signOutSupabase(config: SupabaseSyncConfig): Promise<void> {
  if (!config.url.trim() || !config.anonKey.trim()) return;
  const client = getSupabaseClient(config);
  await client.auth.signOut();
}

function asStringArray(val: unknown): string[] {
  return Array.isArray(val) ? val.filter((v): v is string => typeof v === 'string') : [];
}

function asCustomFields(val: unknown): CustomField[] {
  if (!Array.isArray(val)) return [];
  return val
    .filter((v): v is Record<string, unknown> => Boolean(v && typeof v === 'object'))
    .map((v) => ({
      key: typeof v.key === 'string' ? v.key : '',
      value: typeof v.value === 'string' ? v.value : '',
    }));
}

export async function pullVaultFromSupabase(config: SupabaseSyncConfig): Promise<VaultData> {
  const client = getSupabaseClient(config);
  const { data: userData } = await client.auth.getUser();
  if (!userData.user) {
    throw new Error('Silakan login ke akun Supabase terlebih dahulu.');
  }

  const [phonesRes, accountsRes, cloudsRes, websRes, subsRes, othersRes] = await Promise.all([
    client.from('phone_numbers').select('*'),
    client.from('google_accounts').select('*'),
    client.from('cloud_projects').select('*'),
    client.from('connected_websites').select('*'),
    client.from('subscriptions').select('*'),
    client.from('other_assets').select('*'),
  ]);

  for (const res of [phonesRes, accountsRes, cloudsRes, websRes, subsRes, othersRes]) {
    if (res.error) {
      throw new Error(`Gagal memuat data Supabase: ${res.error.message}`);
    }
  }

  const phoneNumbers: PhoneNumber[] = (phonesRes.data ?? []).map((r) => ({
    id: r.id,
    phoneNumber: r.phone_number ?? '',
    label: r.label ?? '',
    provider: r.provider ?? 'Telkomsel',
    simType: r.sim_type === 'eSIM' ? 'eSIM' : 'SIM Fisik',
    deviceSlot: r.device_slot ?? '',
    usagePurpose: r.usage_purpose ?? '',
    noExpiry: Boolean(r.no_expiry),
    activeUntil: r.active_until ?? '',
    graceUntil: r.grace_until ?? '',
    renewalTip: r.renewal_tip ?? '',
    linkedServices: asStringArray(r.linked_services),
    manualStatus: r.manual_status ?? 'Active',
    tags: asStringArray(r.tags),
    customFields: asCustomFields(r.custom_fields),
    notes: r.notes ?? '',
    updatedAt: r.updated_at ?? new Date().toISOString(),
  }));

  const googleAccounts: GoogleAccount[] = (accountsRes.data ?? []).map((r) => ({
    id: r.id,
    email: r.email ?? '',
    aliasLabel: r.alias_label ?? '',
    primaryPurpose: r.primary_purpose ?? 'Personal Utama',
    colorBadge: r.color_badge ?? '#2563EB',
    chromeProfile: r.chrome_profile ?? '',
    status: r.status ?? 'Active',
    passwordHint: r.password_hint ?? '',
    holderName: r.holder_name ?? '',
    holderUntil: r.holder_until ?? '',
    quickSubName: r.quick_sub_name ?? '',
    quickSubPeriod: r.quick_sub_period ?? '',
    quickSubNeedsCancel: Boolean(r.quick_sub_needs_cancel),
    recoveryAccountId: r.recovery_account_id ?? '',
    linkedPhoneId: r.linked_phone_id ?? '',
    recoveryPhoneHint: r.recovery_phone_hint ?? '',
    has2FA: Boolean(r.has_2fa),
    passwordManagerRef: r.password_manager_ref ?? '',
    driveUsedGb: r.drive_used_gb !== null && r.drive_used_gb !== undefined ? Number(r.drive_used_gb) : null,
    driveLimitGb: r.drive_limit_gb !== null && r.drive_limit_gb !== undefined ? Number(r.drive_limit_gb) : null,
    tags: asStringArray(r.tags),
    customFields: asCustomFields(r.custom_fields),
    notes: r.notes ?? '',
    updatedAt: r.updated_at ?? new Date().toISOString(),
  }));

  const cloudProjects: CloudProject[] = (cloudsRes.data ?? []).map((r) => ({
    id: r.id,
    accountId: r.account_id,
    provider: r.provider ?? 'GCP',
    projectName: r.project_name ?? '',
    projectIdRef: r.project_id_ref ?? '',
    environment: r.environment ?? 'Production',
    status: r.status ?? 'Active',
    billingTier: r.billing_tier ?? 'Free Tier',
    consoleUrl: r.console_url ?? '',
    relatedDomains: r.related_domains ?? '',
    tags: asStringArray(r.tags),
    customFields: asCustomFields(r.custom_fields),
    notes: r.notes ?? '',
    updatedAt: r.updated_at ?? new Date().toISOString(),
  }));

  const connectedWebsites: ConnectedWebsite[] = (websRes.data ?? []).map((r) => ({
    id: r.id,
    accountId: r.account_id,
    serviceName: r.service_name ?? '',
    url: r.url ?? '',
    category: r.category ?? 'Developer',
    loginMethod: r.login_method ?? 'Google OAuth / SSO',
    usernameHandle: r.username_handle ?? '',
    importance: r.importance ?? 'Normal',
    tags: asStringArray(r.tags),
    customFields: asCustomFields(r.custom_fields),
    notes: r.notes ?? '',
    updatedAt: r.updated_at ?? new Date().toISOString(),
  }));

  const subscriptions: Subscription[] = (subsRes.data ?? []).map((r) => ({
    id: r.id,
    accountId: r.account_id,
    serviceName: r.service_name ?? '',
    planName: r.plan_name ?? '',
    status: r.status ?? 'Active',
    costAmount: Number(r.cost_amount ?? 0),
    currency: r.currency === 'USD' ? 'USD' : 'IDR',
    billingCycle: r.billing_cycle ?? 'Monthly',
    nextRenewalDate: r.next_renewal_date ?? '',
    autoRenew: Boolean(r.auto_renew),
    paymentMethodHint: r.payment_method_hint ?? '',
    manageUrl: r.manage_url ?? '',
    tags: asStringArray(r.tags),
    notes: r.notes ?? '',
    updatedAt: r.updated_at ?? new Date().toISOString(),
  }));

  const otherAssets: OtherAsset[] = (othersRes.data ?? []).map((r) => ({
    id: r.id,
    accountId: r.account_id,
    assetType: r.asset_type ?? 'Lainnya',
    title: r.title ?? '',
    identifier: r.identifier ?? '',
    url: r.url ?? '',
    tags: asStringArray(r.tags),
    customFields: asCustomFields(r.custom_fields),
    notes: r.notes ?? '',
    updatedAt: r.updated_at ?? new Date().toISOString(),
  }));

  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    phoneNumbers,
    googleAccounts,
    projects: [],
    cloudProjects,
    connectedWebsites,
    subscriptions,
    otherAssets,
  };
}

async function deleteMissingIds(
  client: SupabaseClient,
  table: string,
  keepIds: Set<string>
): Promise<void> {
  const { data, error } = await client.from(table).select('id');
  if (error) throw new Error(`Gagal cek data lama ${table}: ${error.message}`);
  const toDelete = (data ?? [])
    .map((r) => r.id as string)
    .filter((id) => !keepIds.has(id));
  if (toDelete.length > 0) {
    const { error: delError } = await client.from(table).delete().in('id', toDelete);
    if (delError) throw new Error(`Gagal hapus item ${table}: ${delError.message}`);
  }
}

export async function pushVaultToSupabase(
  config: SupabaseSyncConfig,
  vault: VaultData
): Promise<void> {
  const client = getSupabaseClient(config);
  const { data: userData } = await client.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) {
    throw new Error('Silakan login ke akun Supabase terlebih dahulu.');
  }

  const validPhoneIds = new Set(vault.phoneNumbers.map((p) => p.id));
  const validAccountIds = new Set(vault.googleAccounts.map((a) => a.id));

  // 1. Upsert phone_numbers first (FK parent for google_accounts)
  if (vault.phoneNumbers.length > 0) {
    const rows = vault.phoneNumbers.map((p) => ({
      id: p.id,
      user_id: userId,
      phone_number: p.phoneNumber,
      label: p.label,
      provider: p.provider,
      sim_type: p.simType,
      device_slot: p.deviceSlot,
      usage_purpose: p.usagePurpose,
      no_expiry: p.noExpiry,
      active_until: p.activeUntil || null,
      grace_until: p.graceUntil || null,
      renewal_tip: p.renewalTip,
      linked_services: p.linkedServices,
      manual_status: p.manualStatus,
      tags: p.tags,
      custom_fields: p.customFields,
      notes: p.notes,
    }));
    const { error } = await client.from('phone_numbers').upsert(rows);
    if (error) throw new Error(`Gagal sinkron phone_numbers: ${error.message}`);
  }

  // 2. Upsert google_accounts in 2 passes to safely satisfy self-referencing recovery_account_id FK
  if (vault.googleAccounts.length > 0) {
    const baseRows = vault.googleAccounts.map((a) => ({
      id: a.id,
      user_id: userId,
      email: a.email,
      alias_label: a.aliasLabel,
      primary_purpose: a.primaryPurpose,
      color_badge: a.colorBadge,
      chrome_profile: a.chromeProfile,
      status: a.status,
      password_hint: a.passwordHint,
      holder_name: a.holderName,
      holder_until: a.holderUntil,
      quick_sub_name: a.quickSubName,
      quick_sub_period: a.quickSubPeriod,
      quick_sub_needs_cancel: a.quickSubNeedsCancel,
      recovery_account_id: null,
      linked_phone_id: validPhoneIds.has(a.linkedPhoneId) ? a.linkedPhoneId : null,
      recovery_phone_hint: a.recoveryPhoneHint,
      has_2fa: a.has2FA,
      password_manager_ref: a.passwordManagerRef,
      drive_used_gb: a.driveUsedGb,
      drive_limit_gb: a.driveLimitGb,
      tags: a.tags,
      custom_fields: a.customFields,
      notes: a.notes,
    }));
    const { error: pass1Err } = await client.from('google_accounts').upsert(baseRows);
    if (pass1Err) throw new Error(`Gagal sinkron google_accounts: ${pass1Err.message}`);

    const recoveryUpdates = vault.googleAccounts
      .filter((a) => a.recoveryAccountId && validAccountIds.has(a.recoveryAccountId))
      .map((a) =>
        client
          .from('google_accounts')
          .update({ recovery_account_id: a.recoveryAccountId })
          .eq('id', a.id)
      );
    if (recoveryUpdates.length > 0) {
      await Promise.all(recoveryUpdates);
    }
  }

  // 3. Upsert child tables
  const cloudRows = vault.cloudProjects
    .filter((c) => validAccountIds.has(c.accountId))
    .map((c) => ({
      id: c.id,
      user_id: userId,
      account_id: c.accountId,
      provider: c.provider,
      project_name: c.projectName,
      project_id_ref: c.projectIdRef,
      environment: c.environment,
      status: c.status,
      billing_tier: c.billingTier,
      console_url: c.consoleUrl,
      related_domains: c.relatedDomains,
      tags: c.tags,
      custom_fields: c.customFields,
      notes: c.notes,
    }));
  if (cloudRows.length > 0) {
    const { error } = await client.from('cloud_projects').upsert(cloudRows);
    if (error) throw new Error(`Gagal sinkron cloud_projects: ${error.message}`);
  }

  const webRows = vault.connectedWebsites
    .filter((w) => validAccountIds.has(w.accountId))
    .map((w) => ({
      id: w.id,
      user_id: userId,
      account_id: w.accountId,
      service_name: w.serviceName,
      url: w.url,
      category: w.category,
      login_method: w.loginMethod,
      username_handle: w.usernameHandle,
      importance: w.importance,
      tags: w.tags,
      custom_fields: w.customFields,
      notes: w.notes,
    }));
  if (webRows.length > 0) {
    const { error } = await client.from('connected_websites').upsert(webRows);
    if (error) throw new Error(`Gagal sinkron connected_websites: ${error.message}`);
  }

  const subRows = vault.subscriptions
    .filter((s) => validAccountIds.has(s.accountId))
    .map((s) => ({
      id: s.id,
      user_id: userId,
      account_id: s.accountId,
      service_name: s.serviceName,
      plan_name: s.planName,
      status: s.status,
      cost_amount: s.costAmount,
      currency: s.currency,
      billing_cycle: s.billingCycle,
      next_renewal_date: s.nextRenewalDate || null,
      auto_renew: s.autoRenew,
      payment_method_hint: s.paymentMethodHint,
      manage_url: s.manageUrl,
      tags: s.tags,
      notes: s.notes,
    }));
  if (subRows.length > 0) {
    const { error } = await client.from('subscriptions').upsert(subRows);
    if (error) throw new Error(`Gagal sinkron subscriptions: ${error.message}`);
  }

  const otherRows = vault.otherAssets
    .filter((o) => validAccountIds.has(o.accountId))
    .map((o) => ({
      id: o.id,
      user_id: userId,
      account_id: o.accountId,
      asset_type: o.assetType,
      title: o.title,
      identifier: o.identifier,
      url: o.url,
      tags: o.tags,
      custom_fields: o.customFields,
      notes: o.notes,
    }));
  if (otherRows.length > 0) {
    const { error } = await client.from('other_assets').upsert(otherRows);
    if (error) throw new Error(`Gagal sinkron other_assets: ${error.message}`);
  }

  // 4. Clean up deleted rows in reverse FK order
  await deleteMissingIds(client, 'other_assets', new Set(otherRows.map((r) => r.id)));
  await deleteMissingIds(client, 'subscriptions', new Set(subRows.map((r) => r.id)));
  await deleteMissingIds(client, 'connected_websites', new Set(webRows.map((r) => r.id)));
  await deleteMissingIds(client, 'cloud_projects', new Set(cloudRows.map((r) => r.id)));
  await deleteMissingIds(client, 'google_accounts', validAccountIds);
  await deleteMissingIds(client, 'phone_numbers', validPhoneIds);
}

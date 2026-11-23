import type { WorkBook } from 'xlsx';
import type { CustomField, VaultData } from '../types/models';
import { createEmptyVault } from '../types/models';
import { downloadTextFile } from './calendarIcs';
import { getSimHealth, toIsoDate } from './simStatus';

function formatCustomFieldsText(fields: CustomField[]): string {
  return fields
    .filter((f) => f.key.trim() || f.value.trim())
    .map((f) => `${f.key}: ${f.value}`)
    .join(' | ');
}

export async function buildExcelWorkbook(vault: VaultData): Promise<WorkBook> {
  const XLSX = await import('xlsx');
  const wb = XLSX.utils.book_new();
  const accountById = new Map(vault.googleAccounts.map((a) => [a.id, a]));
  const phoneById = new Map(vault.phoneNumbers.map((p) => [p.id, p]));

  const accountsRows = vault.googleAccounts.map((a) => ({
    ID: a.id,
    Email: a.email,
    Label: a.aliasLabel,
    Kegunaan: a.primaryPurpose,
    'Profil Chrome': a.chromeProfile,
    Status: a.status,
    'Akun Recovery': accountById.get(a.recoveryAccountId)?.email ?? '',
    'Nomor HP Tertaut': phoneById.get(a.linkedPhoneId)?.phoneNumber ?? a.recoveryPhoneHint,
    '2FA Aktif': a.has2FA ? 'Ya' : 'Tidak',
    'Password Manager': a.passwordManagerRef,
    'Drive Terpakai (GB)': a.driveUsedGb ?? '',
    'Kuota Drive (GB)': a.driveLimitGb ?? '',
    Tags: a.tags.join(', '),
    'Custom Fields': formatCustomFieldsText(a.customFields),
    Catatan: a.notes,
  }));

  const phoneRows = vault.phoneNumbers.map((p) => {
    const health = getSimHealth(p);
    const linkedEmails = vault.googleAccounts
      .filter((a) => a.linkedPhoneId === p.id)
      .map((a) => a.email)
      .join(', ');
    return {
      ID: p.id,
      'Nomor HP': p.phoneNumber,
      Label: p.label,
      Provider: p.provider,
      'Jenis SIM': p.simType,
      'Lokasi Perangkat / Slot': p.deviceSlot,
      Kegunaan: p.usagePurpose,
      'Status Otomatis': health.label,
      'Tanpa Masa Aktif': p.noExpiry ? 'Ya' : 'Tidak',
      'Masa Aktif Sampai': p.activeUntil,
      'Masa Tenggang Sampai': p.graceUntil,
      'Tips Perpanjangan': p.renewalTip,
      'Akun Google Tertaut': linkedEmails,
      'Layanan Lain Tertaut': p.linkedServices.join(', '),
      Tags: p.tags.join(', '),
      'Custom Fields': formatCustomFieldsText(p.customFields),
      Catatan: p.notes,
    };
  });

  const cloudRows = vault.cloudProjects.map((c) => ({
    ID: c.id,
    'Akun Google': accountById.get(c.accountId)?.email ?? c.accountId,
    Provider: c.provider,
    'Nama Project': c.projectName,
    'Project ID': c.projectIdRef,
    Environment: c.environment,
    Status: c.status,
    'Billing Tier': c.billingTier,
    'Console URL': c.consoleUrl,
    'Domain / Repo': c.relatedDomains,
    Tags: c.tags.join(', '),
    'Custom Fields': formatCustomFieldsText(c.customFields),
    Catatan: c.notes,
  }));

  const webRows = vault.connectedWebsites.map((w) => ({
    ID: w.id,
    'Akun Google': accountById.get(w.accountId)?.email ?? w.accountId,
    'Nama Layanan / Website': w.serviceName,
    URL: w.url,
    Kategori: w.category,
    'Metode Login': w.loginMethod,
    'Username / Handle': w.usernameHandle,
    Prioritas: w.importance,
    Tags: w.tags.join(', '),
    'Custom Fields': formatCustomFieldsText(w.customFields),
    Catatan: w.notes,
  }));

  const subRows = vault.subscriptions.map((s) => ({
    ID: s.id,
    'Akun Google': accountById.get(s.accountId)?.email ?? s.accountId,
    Layanan: s.serviceName,
    Plan: s.planName,
    Status: s.status,
    Biaya: s.costAmount,
    'Mata Uang': s.currency,
    Siklus: s.billingCycle,
    'Tanggal Perpanjangan': s.nextRenewalDate,
    'Auto Renew': s.autoRenew ? 'Ya' : 'Tidak',
    'Metode Bayar (Hint)': s.paymentMethodHint,
    'URL Kelola': s.manageUrl,
    Tags: s.tags.join(', '),
    Catatan: s.notes,
  }));

  const otherRows = vault.otherAssets.map((o) => ({
    ID: o.id,
    'Akun Google': accountById.get(o.accountId)?.email ?? o.accountId,
    'Tipe Aset': o.assetType,
    Judul: o.title,
    'ID / Handle': o.identifier,
    URL: o.url,
    Tags: o.tags.join(', '),
    'Custom Fields': formatCustomFieldsText(o.customFields),
    Catatan: o.notes,
  }));

  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(accountsRows), 'Google_Accounts');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(phoneRows), 'Phone_Numbers');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(cloudRows), 'Cloud_Projects');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(webRows), 'Connected_Websites');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(subRows), 'Subscriptions');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(otherRows), 'Other_Assets');

  return wb;
}

export async function exportVaultToExcel(vault: VaultData): Promise<void> {
  const XLSX = await import('xlsx');
  const wb = await buildExcelWorkbook(vault);
  const stamp = toIsoDate(new Date());
  XLSX.writeFile(wb, `accvault-backup-${stamp}.xlsx`);
}

export function serializeVaultToJson(vault: VaultData): string {
  const payload: VaultData = {
    ...vault,
    version: 1,
    exportedAt: new Date().toISOString(),
  };
  return JSON.stringify(payload, null, 2);
}

export function exportVaultToJson(vault: VaultData): void {
  const stamp = toIsoDate(new Date());
  downloadTextFile(
    `accvault-backup-${stamp}.json`,
    serializeVaultToJson(vault),
    'application/json;charset=utf-8'
  );
}

export function parseVaultFromJson(rawJson: string): VaultData {
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawJson);
  } catch {
    throw new Error('Format file JSON tidak valid.');
  }

  if (!parsed || typeof parsed !== 'object') {
    throw new Error('Isi JSON tidak sesuai struktur backup AccVault.');
  }

  const obj = parsed as Partial<VaultData>;
  const base = createEmptyVault();

  if (
    !Array.isArray(obj.googleAccounts) &&
    !Array.isArray(obj.phoneNumbers) &&
    !Array.isArray(obj.cloudProjects) &&
    !Array.isArray(obj.connectedWebsites) &&
    !Array.isArray(obj.subscriptions) &&
    !Array.isArray(obj.otherAssets)
  ) {
    throw new Error('File JSON tidak memiliki data AccVault yang dikenali.');
  }

  return {
    version: 1,
    exportedAt: typeof obj.exportedAt === 'string' ? obj.exportedAt : undefined,
    phoneNumbers: Array.isArray(obj.phoneNumbers) ? obj.phoneNumbers : base.phoneNumbers,
    googleAccounts: Array.isArray(obj.googleAccounts) ? obj.googleAccounts : base.googleAccounts,
    cloudProjects: Array.isArray(obj.cloudProjects) ? obj.cloudProjects : base.cloudProjects,
    connectedWebsites: Array.isArray(obj.connectedWebsites)
      ? obj.connectedWebsites
      : base.connectedWebsites,
    subscriptions: Array.isArray(obj.subscriptions) ? obj.subscriptions : base.subscriptions,
    otherAssets: Array.isArray(obj.otherAssets) ? obj.otherAssets : base.otherAssets,
  };
}

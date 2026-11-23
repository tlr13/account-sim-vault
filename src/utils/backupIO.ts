import type { WorkBook } from 'xlsx';
import {
  ACCOUNT_COLOR_PALETTE,
  ACCOUNT_STATUS_META,
  createEmptyVault,
  generateId,
  normalizeAccountRecord,
  type AccountStatus,
  type CustomField,
  type GoogleAccount,
  type PhoneNumber,
  type VaultData,
} from '../types/models';
import { downloadTextFile } from './calendarIcs';
import { getSimHealth, normalizePhoneNumber, toIsoDate } from './simStatus';

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
    'Kode / Hint Pass': a.passwordHint,
    Status: ACCOUNT_STATUS_META[a.status]?.label ?? a.status,
    'Pemakai / Pembeli': a.holderName,
    'Batas Pakai': a.holderUntil,
    'Subscription Ringkas': a.quickSubName,
    'Periode Subscription': a.quickSubPeriod,
    'Status Cancel': a.quickSubNeedsCancel ? 'Belum Cancel' : '',
    Kegunaan: a.primaryPurpose,
    'Profil Chrome': a.chromeProfile,
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
      Provider: p.provider,
      'Nomor HP': p.phoneNumber,
      Label: p.label,
      'Jenis SIM': p.simType,
      'Lokasi Perangkat / Slot': p.deviceSlot,
      Kegunaan: p.usagePurpose,
      'Status Otomatis': health.label,
      'Pascabayar / Tanpa Expired': p.noExpiry ? 'Ya' : 'Tidak',
      'Masa Tenggang': p.activeUntil,
      Mati: p.graceUntil,
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
    googleAccounts: Array.isArray(obj.googleAccounts)
      ? obj.googleAccounts.map((a) => normalizeAccountRecord(a))
      : base.googleAccounts,
    cloudProjects: Array.isArray(obj.cloudProjects) ? obj.cloudProjects : base.cloudProjects,
    connectedWebsites: Array.isArray(obj.connectedWebsites)
      ? obj.connectedWebsites
      : base.connectedWebsites,
    subscriptions: Array.isArray(obj.subscriptions) ? obj.subscriptions : base.subscriptions,
    otherAssets: Array.isArray(obj.otherAssets) ? obj.otherAssets : base.otherAssets,
  };
}

/* ==========================================================================
   Smart Excel / CSV Importer (mendukung Export AccVault & format tab email/nomor)
   ========================================================================== */

export interface SpreadsheetImportSummary {
  accounts: GoogleAccount[];
  phones: PhoneNumber[];
  redactedSecretsCount: number;
  detectedSheets: string[];
}

function cellToString(val: unknown): string {
  if (val === null || val === undefined) return '';
  if (val instanceof Date && !Number.isNaN(val.getTime())) {
    return toIsoDate(val);
  }
  return String(val).trim();
}

function cellToIsoDate(val: unknown): string {
  if (val === null || val === undefined || val === '') return '';
  if (val instanceof Date && !Number.isNaN(val.getTime())) {
    return toIsoDate(val);
  }
  if (typeof val === 'number' && val > 20000 && val < 80000) {
    // Excel serial date (epoch 1899-12-30)
    const utcMs = Math.round((val - 25569) * 86400 * 1000);
    const d = new Date(utcMs);
    if (!Number.isNaN(d.getTime())) return toIsoDate(d);
  }
  const str = String(val).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) return str.slice(0, 10);
  const dmy = str.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (dmy) {
    const day = dmy[1].padStart(2, '0');
    const month = dmy[2].padStart(2, '0');
    return `${dmy[3]}-${month}-${day}`;
  }
  return '';
}

export function sanitizePasswordHint(rawPass: string): {
  hint: string;
  wasRedacted: boolean;
} {
  const trimmed = rawPass.trim();
  if (!trimmed) return { hint: '', wasRedacted: false };

  const lower = trimmed.toLowerCase();
  // Safe short pattern codes (e.g. "i", "e", "!e", "pola i") or references ("ada di ...", "diganti ...", "bitwarden")
  if (
    trimmed.length <= 3 ||
    lower.startsWith('pola ') ||
    lower.includes('bitwarden') ||
    lower.includes('1password') ||
    lower.includes('ada di') ||
    lower.includes('diganti') ||
    lower.includes('dipegang')
  ) {
    return { hint: trimmed, wasRedacted: false };
  }

  // Anything longer without clear reference keywords looks like a raw password -> redact safely!
  return { hint: '[Pindahkan ke Password Manager]', wasRedacted: true };
}

function normalizeProviderName(raw: string): string {
  const lower = raw.trim().toLowerCase();
  if (!lower) return 'Lainnya';
  if (lower.includes('xl prio') || lower.includes('prio')) return 'XL Prio';
  if (lower.includes('telkom')) return 'Telkomsel';
  if (lower.includes('by.u') || lower.includes('byu')) return 'by.U';
  if (lower.includes('tri') || lower === '3') return 'Tri (3)';
  if (lower.includes('indosat') || lower.includes('im3')) return 'Indosat / IM3';
  if (lower.includes('xl')) return 'XL';
  if (lower.includes('axis')) return 'Axis';
  if (lower.includes('smartfren')) return 'Smartfren';
  return raw.trim();
}

function parseAccountCondition(
  rawCondition: string,
  hasSub: boolean
): { status: AccountStatus; holderName: string; holderUntil: string; extraNote: string } {
  const cond = rawCondition.trim();
  const lower = cond.toLowerCase();

  if (!cond) {
    return {
      status: hasSub ? 'Active' : 'Spare',
      holderName: '',
      holderUntil: '',
      extraNote: '',
    };
  }

  if (lower.includes('sold') || lower.includes('jual') || lower.includes('terjual')) {
    const buyerMatch = cond.match(/(?:di)?jual(?:\s+ke)?\s+(.+)/i);
    return {
      status: 'Sold',
      holderName: buyerMatch ? buyerMatch[1].trim() : '',
      holderUntil: '',
      extraNote: buyerMatch ? '' : cond.toLowerCase() === 'sold' ? '' : cond,
    };
  }

  if (
    lower.includes('dipake') ||
    lower.includes('dipakai') ||
    lower.includes('hak milik') ||
    lower.includes('pinjam')
  ) {
    const untilMatch = cond.match(/sampe\s+(.+)|sampai\s+(.+)/i);
    const holderUntil = untilMatch ? (untilMatch[1] || untilMatch[2] || '').trim() : '';
    const cleanedName = cond
      .replace(/^(dipake|dipakai|hak milik|dipinjam)\s+/i, '')
      .replace(/\s*(sampe|sampai)\s+.+$/i, '')
      .trim();
    return {
      status: 'Shared',
      holderName: cleanedName,
      holderUntil,
      extraNote: '',
    };
  }

  if (lower.includes('banned') || lower.includes('suspend') || lower.includes('masalah')) {
    return { status: 'Issue', holderName: '', holderUntil: '', extraNote: cond };
  }

  if (lower.includes('arsip') || lower.includes('archive')) {
    return { status: 'Archived', holderName: '', holderUntil: '', extraNote: '' };
  }

  if (lower.includes('cadangan') || lower.includes('spare')) {
    return { status: 'Spare', holderName: '', holderUntil: '', extraNote: '' };
  }

  if (lower.includes('aktif') || lower.includes('active')) {
    return { status: 'Active', holderName: '', holderUntil: '', extraNote: '' };
  }

  return {
    status: hasSub ? 'Active' : 'Spare',
    holderName: '',
    holderUntil: '',
    extraNote: cond,
  };
}

function splitQuickSub(rawSub: string): { name: string; period: string } {
  const s = rawSub.trim();
  if (!s) return { name: '', period: '' };

  // Extract trailing month/year period if written inline (e.g. "google ai pro november 2026-2027")
  const periodMatch = s.match(
    /\b((?:jan|feb|mar|apr|mei|may|jun|jul|agu|aug|sep|okt|oct|nov|nove|des|dec)[a-z]*\s+\d{4}(?:\s*[-–]\s*(?:(?:[a-z]+\s+)?\d{4}))?)$/i
  );
  if (periodMatch && periodMatch.index !== undefined) {
    return {
      name: s.slice(0, periodMatch.index).trim(),
      period: periodMatch[1].trim(),
    };
  }
  return { name: s, period: '' };
}

export async function parseSpreadsheetFile(
  buffer: ArrayBuffer
): Promise<SpreadsheetImportSummary> {
  const XLSX = await import('xlsx');
  const wb = XLSX.read(buffer, { type: 'array', cellDates: true });
  const nowIso = new Date().toISOString();

  const accounts: GoogleAccount[] = [];
  const phones: PhoneNumber[] = [];
  const detectedSheets: string[] = [];
  let redactedSecretsCount = 0;

  for (const sheetName of wb.SheetNames) {
    const ws = wb.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: '' });
    if (rows.length === 0) continue;

    // Find header row within first 5 rows
    let headerIdx = -1;
    let headers: string[] = [];
    for (let i = 0; i < Math.min(rows.length, 5); i += 1) {
      const candidate = rows[i].map((c) => cellToString(c).toLowerCase());
      const looksLikeEmailSheet = candidate.some((h) => h === 'email' || h.includes('email'));
      const looksLikePhoneSheet =
        candidate.some((h) => h.includes('nomor hp') || h === 'nomor') &&
        candidate.some((h) => h.includes('kartu') || h.includes('provider') || h.includes('tenggang'));
      if (looksLikeEmailSheet || looksLikePhoneSheet) {
        headerIdx = i;
        headers = candidate;
        break;
      }
    }

    if (headerIdx === -1) continue;

    const findCol = (...patterns: string[]): number =>
      headers.findIndex((h) => patterns.some((p) => h === p || h.includes(p)));

    const isPhoneSheet =
      findCol('nomor hp', 'nomor') !== -1 &&
      findCol('kartu', 'provider', 'masa tenggang', 'tenggang') !== -1 &&
      findCol('email') === -1;

    const isEmailSheet =
      !isPhoneSheet &&
      findCol('email') !== -1 &&
      !sheetName.toLowerCase().includes('hadiah') &&
      !sheetName.toLowerCase().includes('cloud_projects') &&
      !sheetName.toLowerCase().includes('connected_websites') &&
      !sheetName.toLowerCase().includes('subscriptions') &&
      !sheetName.toLowerCase().includes('other_assets');

    if (isEmailSheet) {
      detectedSheets.push(sheetName);
      const colEmail = findCol('email');
      const colLabel = findCol('label');
      const colPass = findCol('kode / hint pass', 'hint pass', 'pass');
      const colCond = findCol('kondisi', 'status');
      const colHolder = findCol('pemakai', 'pembeli');
      const colUntil = findCol('batas pakai');
      const colSub = findCol('subscription ringkas', 'subscription');
      const colSubPeriod = findCol('periode subscription');
      const colCancel = findCol('status cancel', 'cancel');
      const colNotes = findCol('catatan', 'notes');

      const knownCols = new Set(
        [
          colEmail,
          colLabel,
          colPass,
          colCond,
          colHolder,
          colUntil,
          colSub,
          colSubPeriod,
          colCancel,
          colNotes,
        ].filter((idx) => idx >= 0)
      );

      for (let r = headerIdx + 1; r < rows.length; r += 1) {
        const row = rows[r];
        const rawEmail = cellToString(row[colEmail]);
        if (!rawEmail) continue;
        // Skip accidental passphrase/header rows
        if (rawEmail.toLowerCase() === 'email') continue;

        const email = rawEmail.includes('@') ? rawEmail : `${rawEmail}@gmail.com`;
        const rawPass = colPass >= 0 ? cellToString(row[colPass]) : '';
        const { hint, wasRedacted } = sanitizePasswordHint(rawPass);
        if (wasRedacted) redactedSecretsCount += 1;

        const rawSub = colSub >= 0 ? cellToString(row[colSub]) : '';
        const parsedSub = splitQuickSub(rawSub);
        const subPeriod =
          (colSubPeriod >= 0 ? cellToString(row[colSubPeriod]) : '') || parsedSub.period;

        // Scan any extra unlabelled columns (like user's col F/G containing "belum cancel" or notes)
        const extraCells: string[] = [];
        for (let c = 0; c < row.length; c += 1) {
          if (c === 0 && /^\d+$/.test(cellToString(row[c]))) continue; // skip row "No"
          if (knownCols.has(c)) continue;
          const text = cellToString(row[c]);
          if (text) extraCells.push(text);
        }

        const explicitCancel = colCancel >= 0 ? cellToString(row[colCancel]) : '';
        const allTextForCancel = `${explicitCancel} ${extraCells.join(' ')}`.toLowerCase();
        const needsCancel = allTextForCancel.includes('belum cancel');

        const cleanedExtras = extraCells.filter(
          (t) => t.toLowerCase() !== 'belum cancel'
        );

        const rawCond = colCond >= 0 ? cellToString(row[colCond]) : '';
        const parsedCond = parseAccountCondition(rawCond, Boolean(parsedSub.name));
        const holderName =
          (colHolder >= 0 ? cellToString(row[colHolder]) : '') || parsedCond.holderName;
        const holderUntil =
          (colUntil >= 0 ? cellToString(row[colUntil]) : '') || parsedCond.holderUntil;

        const baseNotes = [
          colNotes >= 0 ? cellToString(row[colNotes]) : '',
          parsedCond.extraNote,
          ...cleanedExtras,
        ]
          .filter(Boolean)
          .join(' · ');

        const label =
          (colLabel >= 0 ? cellToString(row[colLabel]) : '') || rawEmail.split('@')[0];

        accounts.push(
          normalizeAccountRecord({
            id: generateId('acc'),
            email,
            aliasLabel: label,
            primaryPurpose:
              parsedCond.status === 'Spare' || parsedCond.status === 'Sold'
                ? 'Cadangan / Akun Serial'
                : parsedSub.name
                  ? 'Subscription & Hiburan'
                  : 'Personal Utama',
            colorBadge:
              ACCOUNT_COLOR_PALETTE[accounts.length % ACCOUNT_COLOR_PALETTE.length].hex,
            status: parsedCond.status,
            passwordHint: hint,
            holderName,
            holderUntil,
            quickSubName: parsedSub.name,
            quickSubPeriod: subPeriod,
            quickSubNeedsCancel: needsCancel,
            notes: baseNotes,
            updatedAt: nowIso,
          })
        );
      }
    } else if (isPhoneSheet) {
      detectedSheets.push(sheetName);
      const colProvider = findCol('kartu', 'provider');
      const colNumber = findCol('nomor hp', 'nomor');
      const colLabel = findCol('label');
      const colActive = findCol('masa tenggang', 'masa aktif', 'tenggang');
      const colGrace = findCol('mati', 'hangus', 'grace');
      const colNoExpiry = findCol('pascabayar', 'tanpa expired', 'tanpa masa aktif');
      const colNotes = findCol('catatan', 'notes');

      for (let r = headerIdx + 1; r < rows.length; r += 1) {
        const row = rows[r];
        const rawNumber = colNumber >= 0 ? cellToString(row[colNumber]) : '';
        const rawProvider = colProvider >= 0 ? cellToString(row[colProvider]) : '';
        if (!rawNumber && !rawProvider) continue;

        const provider = normalizeProviderName(rawProvider);
        const normalizedPhone = normalizePhoneNumber(rawNumber);
        if (!normalizedPhone) continue;

        const activeUntil = colActive >= 0 ? cellToIsoDate(row[colActive]) : '';
        const graceUntil = colGrace >= 0 ? cellToIsoDate(row[colGrace]) : '';
        const explicitNoExpiry =
          colNoExpiry >= 0 && cellToString(row[colNoExpiry]).toLowerCase() === 'ya';
        const isNoExpiry =
          explicitNoExpiry ||
          provider === 'XL Prio' ||
          provider === 'by.U' ||
          (!activeUntil && !graceUntil && provider.toLowerCase().includes('prio'));

        phones.push({
          id: generateId('sim'),
          phoneNumber: normalizedPhone,
          label: colLabel >= 0 ? cellToString(row[colLabel]) : '',
          provider,
          simType: 'SIM Fisik',
          deviceSlot: '',
          usagePurpose: '',
          noExpiry: isNoExpiry,
          activeUntil: isNoExpiry ? '' : activeUntil,
          graceUntil: isNoExpiry ? '' : graceUntil,
          renewalTip: '',
          linkedServices: [],
          manualStatus: 'Active',
          tags: [],
          customFields: [],
          notes: colNotes >= 0 ? cellToString(row[colNotes]) : '',
          updatedAt: nowIso,
        });
      }
    }
  }

  return {
    accounts,
    phones,
    redactedSecretsCount,
    detectedSheets,
  };
}

export function mergeImportedSpreadsheet(
  current: VaultData,
  imported: SpreadsheetImportSummary,
  mode: 'merge' | 'replace'
): VaultData {
  if (mode === 'replace') {
    return {
      ...createEmptyVault(),
      googleAccounts: imported.accounts,
      phoneNumbers: imported.phones,
    };
  }

  const existingEmails = new Set(current.googleAccounts.map((a) => a.email.toLowerCase()));
  const existingPhones = new Set(
    current.phoneNumbers.map((p) => p.phoneNumber.replace(/\D/g, ''))
  );

  const newAccounts = imported.accounts.filter(
    (a) => !existingEmails.has(a.email.toLowerCase())
  );
  const newPhones = imported.phones.filter(
    (p) => !existingPhones.has(p.phoneNumber.replace(/\D/g, ''))
  );

  return {
    ...current,
    googleAccounts: [...current.googleAccounts, ...newAccounts],
    phoneNumbers: [...current.phoneNumbers, ...newPhones],
  };
}

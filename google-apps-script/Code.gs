/**
 * ============================================================================
 * AccVault — Google Apps Script Bridge (Code.gs)
 * ============================================================================
 * Cara Pasang (sekitar 2 menit):
 * 1. Buka Google Sheets AccVault milikmu -> klik menu "Extensions" -> "Apps Script"
 * 2. Hapus kode bawaan, tempel seluruh isi file ini, lalu klik Save (Ctrl+S).
 * 3. (Opsional) Isi API_SECRET di bawah jika ingin proteksi PIN tambahan.
 * 4. Klik "Deploy" -> "New deployment" -> ikon gear -> pilih "Web app":
 *    - Execute as: Me
 *    - Who has access: Anyone
 *    Klik "Deploy" -> izinkan akses -> salin Web App URL (berakhiran /exec).
 * 5. Tempel URL tersebut di AccVault -> menu "Sync & Setelan" -> tab "Google Sheets".
 */

// Opsional: isi PIN/kata sandi singkat (mis. '240899'), atau biarkan kosong ''
const API_SECRET = '';

const SHEET_SCHEMAS = {
  Google_Accounts: [
    'id',
    'email',
    'alias_label',
    'password_hint',
    'status',
    'holder_name',
    'holder_until',
    'quick_sub_name',
    'quick_sub_period',
    'quick_sub_needs_cancel',
    'primary_purpose',
    'color_badge',
    'chrome_profile',
    'recovery_account_id',
    'linked_phone_id',
    'recovery_phone_hint',
    'has_2fa',
    'password_manager_ref',
    'drive_used_gb',
    'drive_limit_gb',
    'tags',
    'custom_fields',
    'notes',
    'updated_at',
  ],
  Phone_Numbers: [
    'id',
    'provider',
    'phone_number',
    'label',
    'sim_type',
    'device_slot',
    'usage_purpose',
    'no_expiry',
    'active_until',
    'grace_until',
    'renewal_tip',
    'linked_services',
    'manual_status',
    'tags',
    'custom_fields',
    'notes',
    'updated_at',
  ],
  Projects: [
    'no',
    'project',
    'email',
    'notes',
    'id',
    'account_id',
    'updated_at',
  ],
  Cloud_Projects: [
    'id',
    'account_id',
    'provider',
    'project_name',
    'project_id_ref',
    'environment',
    'status',
    'billing_tier',
    'console_url',
    'related_domains',
    'tags',
    'custom_fields',
    'notes',
    'updated_at',
  ],
  Connected_Websites: [
    'id',
    'account_id',
    'service_name',
    'url',
    'category',
    'login_method',
    'username_handle',
    'importance',
    'tags',
    'custom_fields',
    'notes',
    'updated_at',
  ],
  Subscriptions: [
    'id',
    'account_id',
    'service_name',
    'plan_name',
    'status',
    'cost_amount',
    'currency',
    'billing_cycle',
    'next_renewal_date',
    'auto_renew',
    'payment_method_hint',
    'manage_url',
    'tags',
    'notes',
    'updated_at',
  ],
  Other_Assets: [
    'id',
    'account_id',
    'asset_type',
    'title',
    'identifier',
    'url',
    'tags',
    'custom_fields',
    'notes',
    'updated_at',
  ],
};

function jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(
    ContentService.MimeType.JSON
  );
}

function checkAuth(providedKey) {
  if (!API_SECRET) return true;
  return String(providedKey || '') === String(API_SECRET);
}

function ensureSheet(ss, name) {
  const headers = SHEET_SCHEMAS[name];
  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.setFrozenRows(1);
    return sheet;
  }
  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function toIsoDateStr(val) {
  if (val === null || val === undefined || val === '') return '';
  if (val instanceof Date && !isNaN(val.getTime())) {
    return Utilities.formatDate(val, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  }
  const s = String(val).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  return s;
}

function toBool(val) {
  if (typeof val === 'boolean') return val;
  const s = String(val || '').trim().toLowerCase();
  return s === 'true' || s === 'ya' || s === 'yes' || s === '1' || s === 'belum cancel';
}

function toNumberOrNull(val) {
  if (val === null || val === undefined || val === '') return null;
  const n = Number(val);
  return isNaN(n) ? null : n;
}

function parseList(val) {
  if (!val) return [];
  if (Array.isArray(val)) return val.map(String);
  const s = String(val).trim();
  if (!s) return [];
  if (s.startsWith('[')) {
    try {
      const parsed = JSON.parse(s);
      if (Array.isArray(parsed)) return parsed.map(String);
    } catch (e) {}
  }
  return s
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseCustomFields(val) {
  if (!val) return [];
  const s = String(val).trim();
  if (!s) return [];
  if (s.startsWith('[')) {
    try {
      const parsed = JSON.parse(s);
      if (Array.isArray(parsed)) return parsed;
    } catch (e) {}
  }
  return [];
}

function normalizePhone(val) {
  const s = String(val || '').trim();
  if (!s) return '';
  const digits = s.replace(/\D/g, '');
  if (/^8\d{8,12}$/.test(digits) && !s.startsWith('0') && !s.startsWith('+')) {
    return '0' + digits;
  }
  return s;
}

function normalizeStatus(val) {
  const s = String(val || '').trim();
  const lower = s.toLowerCase();
  if (!s) return 'Active';
  if (lower.includes('sold') || lower.includes('terjual')) return 'Sold';
  if (lower.includes('shared') || lower.includes('dipakai') || lower.includes('dipake')) return 'Shared';
  if (lower.includes('spare') || lower.includes('cadangan')) return 'Spare';
  if (lower.includes('issue') || lower.includes('masalah') || lower.includes('banned')) return 'Issue';
  if (lower.includes('rarely') || lower.includes('jarang')) return 'Rarely Used';
  if (lower.includes('suspend')) return 'Suspended';
  if (lower.includes('archiv') || lower.includes('arsip')) return 'Archived';
  return 'Active';
}

function readTableObjects(ss, sheetName) {
  const sheet = ensureSheet(ss, sheetName);
  const lastRow = sheet.getLastRow();
  const lastCol = sheet.getLastColumn();
  if (lastRow < 2 || lastCol < 1) return [];

  const values = sheet.getRange(1, 1, lastRow, lastCol).getValues();
  const headers = values[0].map((h) => String(h || '').trim());
  const rows = [];

  for (let r = 1; r < values.length; r++) {
    const row = values[r];
    let hasValue = false;
    const obj = { _rowIndex: r + 1 };
    for (let c = 0; c < headers.length; c++) {
      const key = headers[c];
      if (!key) continue;
      obj[key] = row[c];
      if (row[c] !== '' && row[c] !== null && row[c] !== undefined) {
        hasValue = true;
      }
    }
    if (hasValue) rows.push(obj);
  }
  return rows;
}

function readVault(ss) {
  const nowIso = new Date().toISOString();

  const phoneNumbers = readTableObjects(ss, 'Phone_Numbers')
    .filter((r) => String(r.phone_number || '').trim() !== '')
    .map((r) => ({
      id: String(r.id || 'sim_row_' + r._rowIndex),
      provider: String(r.provider || 'Lainnya').trim(),
      phoneNumber: normalizePhone(r.phone_number),
      label: String(r.label || '').trim(),
      simType: String(r.sim_type || '').trim() === 'eSIM' ? 'eSIM' : 'SIM Fisik',
      deviceSlot: String(r.device_slot || '').trim(),
      usagePurpose: String(r.usage_purpose || '').trim(),
      noExpiry: toBool(r.no_expiry),
      activeUntil: toIsoDateStr(r.active_until),
      graceUntil: toIsoDateStr(r.grace_until),
      renewalTip: String(r.renewal_tip || '').trim(),
      linkedServices: parseList(r.linked_services),
      manualStatus: String(r.manual_status || 'Active').trim() || 'Active',
      tags: parseList(r.tags),
      customFields: parseCustomFields(r.custom_fields),
      notes: String(r.notes || '').trim(),
      updatedAt: String(r.updated_at || nowIso),
    }));

  const googleAccounts = readTableObjects(ss, 'Google_Accounts')
    .filter((r) => String(r.email || '').trim() !== '')
    .map((r) => {
      const rawEmail = String(r.email || '').trim();
      const email = rawEmail.indexOf('@') >= 0 ? rawEmail : rawEmail + '@gmail.com';
      return {
        id: String(r.id || 'acc_row_' + r._rowIndex),
        email: email,
        aliasLabel: String(r.alias_label || '').trim() || email.split('@')[0],
        passwordHint: String(r.password_hint || '').trim(),
        status: normalizeStatus(r.status),
        holderName: String(r.holder_name || '').trim(),
        holderUntil: String(r.holder_until || '').trim(),
        quickSubName: String(r.quick_sub_name || '').trim(),
        quickSubPeriod: String(r.quick_sub_period || '').trim(),
        quickSubNeedsCancel: toBool(r.quick_sub_needs_cancel),
        primaryPurpose: String(r.primary_purpose || 'Personal Utama').trim(),
        colorBadge: String(r.color_badge || '#2563EB').trim() || '#2563EB',
        chromeProfile: String(r.chrome_profile || '').trim(),
        recoveryAccountId: String(r.recovery_account_id || '').trim(),
        linkedPhoneId: String(r.linked_phone_id || '').trim(),
        recoveryPhoneHint: String(r.recovery_phone_hint || '').trim(),
        has2FA: toBool(r.has_2fa),
        passwordManagerRef: String(r.password_manager_ref || '').trim(),
        driveUsedGb: toNumberOrNull(r.drive_used_gb),
        driveLimitGb: toNumberOrNull(r.drive_limit_gb),
        tags: parseList(r.tags),
        customFields: parseCustomFields(r.custom_fields),
        notes: String(r.notes || '').trim(),
        updatedAt: String(r.updated_at || nowIso),
      };
    });

  const accountIdByEmail = {};
  for (let i = 0; i < googleAccounts.length; i++) {
    const em = String(googleAccounts[i].email || '').trim().toLowerCase();
    if (em) accountIdByEmail[em] = googleAccounts[i].id;
  }

  const projects = readTableObjects(ss, 'Projects')
    .filter((r) => String(r.project || r.name || '').trim() !== '')
    .map((r) => {
      const emailStr = String(r.email || '').trim();
      const matchedId = accountIdByEmail[emailStr.toLowerCase()] || '';
      return {
        id: String(r.id || 'prj_row_' + r._rowIndex),
        name: String(r.project || r.name || '').trim(),
        email: emailStr,
        accountId: String(r.account_id || matchedId || '').trim(),
        notes: String(r.notes || '').trim(),
        updatedAt: String(r.updated_at || nowIso),
      };
    });

  const cloudProjects = readTableObjects(ss, 'Cloud_Projects')
    .filter((r) => String(r.project_name || '').trim() !== '')
    .map((r) => ({
      id: String(r.id || 'cld_row_' + r._rowIndex),
      accountId: String(r.account_id || '').trim(),
      provider: String(r.provider || 'GCP').trim(),
      projectName: String(r.project_name || '').trim(),
      projectIdRef: String(r.project_id_ref || '').trim(),
      environment: String(r.environment || 'Production').trim(),
      status: String(r.status || 'Active').trim(),
      billingTier: String(r.billing_tier || 'Free Tier').trim(),
      consoleUrl: String(r.console_url || '').trim(),
      relatedDomains: String(r.related_domains || '').trim(),
      tags: parseList(r.tags),
      customFields: parseCustomFields(r.custom_fields),
      notes: String(r.notes || '').trim(),
      updatedAt: String(r.updated_at || nowIso),
    }));

  const connectedWebsites = readTableObjects(ss, 'Connected_Websites')
    .filter((r) => String(r.service_name || '').trim() !== '')
    .map((r) => ({
      id: String(r.id || 'web_row_' + r._rowIndex),
      accountId: String(r.account_id || '').trim(),
      serviceName: String(r.service_name || '').trim(),
      url: String(r.url || '').trim(),
      category: String(r.category || 'Developer').trim(),
      loginMethod: String(r.login_method || 'Google OAuth / SSO').trim(),
      usernameHandle: String(r.username_handle || '').trim(),
      importance: String(r.importance || 'Normal').trim(),
      tags: parseList(r.tags),
      customFields: parseCustomFields(r.custom_fields),
      notes: String(r.notes || '').trim(),
      updatedAt: String(r.updated_at || nowIso),
    }));

  const subscriptions = readTableObjects(ss, 'Subscriptions')
    .filter((r) => String(r.service_name || '').trim() !== '')
    .map((r) => ({
      id: String(r.id || 'sub_row_' + r._rowIndex),
      accountId: String(r.account_id || '').trim(),
      serviceName: String(r.service_name || '').trim(),
      planName: String(r.plan_name || '').trim(),
      status: String(r.status || 'Active').trim(),
      costAmount: Number(r.cost_amount || 0) || 0,
      currency: String(r.currency || 'IDR').trim() === 'USD' ? 'USD' : 'IDR',
      billingCycle: String(r.billing_cycle || 'Monthly').trim(),
      nextRenewalDate: toIsoDateStr(r.next_renewal_date),
      autoRenew: toBool(r.auto_renew),
      paymentMethodHint: String(r.payment_method_hint || '').trim(),
      manageUrl: String(r.manage_url || '').trim(),
      tags: parseList(r.tags),
      notes: String(r.notes || '').trim(),
      updatedAt: String(r.updated_at || nowIso),
    }));

  const otherAssets = readTableObjects(ss, 'Other_Assets')
    .filter((r) => String(r.title || '').trim() !== '')
    .map((r) => ({
      id: String(r.id || 'oth_row_' + r._rowIndex),
      accountId: String(r.account_id || '').trim(),
      assetType: String(r.asset_type || 'Lainnya').trim(),
      title: String(r.title || '').trim(),
      identifier: String(r.identifier || '').trim(),
      url: String(r.url || '').trim(),
      tags: parseList(r.tags),
      customFields: parseCustomFields(r.custom_fields),
      notes: String(r.notes || '').trim(),
      updatedAt: String(r.updated_at || nowIso),
    }));

  return {
    version: 1,
    exportedAt: nowIso,
    phoneNumbers: phoneNumbers,
    googleAccounts: googleAccounts,
    projects: projects,
    cloudProjects: cloudProjects,
    connectedWebsites: connectedWebsites,
    subscriptions: subscriptions,
    otherAssets: otherAssets,
  };
}

function writeTableRows(ss, sheetName, rows, textColumns) {
  const headers = SHEET_SCHEMAS[sheetName];
  const sheet = ensureSheet(ss, sheetName);

  // Clear existing data rows while preserving header formatting
  const maxRows = sheet.getLastRow();
  if (maxRows > 1) {
    sheet.getRange(2, 1, maxRows - 1, Math.max(sheet.getLastColumn(), headers.length)).clearContent();
  }
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);

  if (rows.length > 0) {
    const range = sheet.getRange(2, 1, rows.length, headers.length);
    // Force plain-text format on phone numbers and YYYY-MM-DD dates so Sheets never strips leading 0
    if (textColumns && textColumns.length > 0) {
      for (let i = 0; i < textColumns.length; i++) {
        const colIdx = headers.indexOf(textColumns[i]) + 1;
        if (colIdx > 0) {
          sheet.getRange(2, colIdx, rows.length, 1).setNumberFormat('@');
        }
      }
    }
    range.setValues(rows);
  }
}

function writeVault(ss, vault) {
  const nowIso = new Date().toISOString();

  const accRows = (vault.googleAccounts || []).map((a) => [
    a.id || '',
    a.email || '',
    a.aliasLabel || '',
    a.passwordHint || '',
    a.status || 'Active',
    a.holderName || '',
    a.holderUntil || '',
    a.quickSubName || '',
    a.quickSubPeriod || '',
    Boolean(a.quickSubNeedsCancel),
    a.primaryPurpose || '',
    a.colorBadge || '#2563EB',
    a.chromeProfile || '',
    a.recoveryAccountId || '',
    a.linkedPhoneId || '',
    a.recoveryPhoneHint || '',
    Boolean(a.has2FA),
    a.passwordManagerRef || '',
    a.driveUsedGb === null || a.driveUsedGb === undefined ? '' : a.driveUsedGb,
    a.driveLimitGb === null || a.driveLimitGb === undefined ? '' : a.driveLimitGb,
    (a.tags || []).join(', '),
    a.customFields && a.customFields.length ? JSON.stringify(a.customFields) : '',
    a.notes || '',
    a.updatedAt || nowIso,
  ]);
  writeTableRows(ss, 'Google_Accounts', accRows, ['password_hint', 'recovery_phone_hint']);

  const phoneRows = (vault.phoneNumbers || []).map((p) => [
    p.id || '',
    p.provider || '',
    normalizePhone(p.phoneNumber),
    p.label || '',
    p.simType || 'SIM Fisik',
    p.deviceSlot || '',
    p.usagePurpose || '',
    Boolean(p.noExpiry),
    p.activeUntil || '',
    p.graceUntil || '',
    p.renewalTip || '',
    (p.linkedServices || []).join(', '),
    p.manualStatus || 'Active',
    (p.tags || []).join(', '),
    p.customFields && p.customFields.length ? JSON.stringify(p.customFields) : '',
    p.notes || '',
    p.updatedAt || nowIso,
  ]);
  writeTableRows(ss, 'Phone_Numbers', phoneRows, ['phone_number', 'active_until', 'grace_until']);

  const emailByAccountId = {};
  const accountsList = vault.googleAccounts || [];
  for (let i = 0; i < accountsList.length; i++) {
    if (accountsList[i].id && accountsList[i].email) {
      emailByAccountId[accountsList[i].id] = accountsList[i].email;
    }
  }

  const projectRows = (vault.projects || []).map((prj, idx) => [
    idx + 1,
    prj.name || '',
    prj.email || emailByAccountId[prj.accountId] || '',
    prj.notes || '',
    prj.id || '',
    prj.accountId || '',
    prj.updatedAt || nowIso,
  ]);
  writeTableRows(ss, 'Projects', projectRows, []);

  const cloudRows = (vault.cloudProjects || []).map((c) => [
    c.id || '',
    c.accountId || '',
    c.provider || '',
    c.projectName || '',
    c.projectIdRef || '',
    c.environment || 'Production',
    c.status || 'Active',
    c.billingTier || '',
    c.consoleUrl || '',
    c.relatedDomains || '',
    (c.tags || []).join(', '),
    c.customFields && c.customFields.length ? JSON.stringify(c.customFields) : '',
    c.notes || '',
    c.updatedAt || nowIso,
  ]);
  writeTableRows(ss, 'Cloud_Projects', cloudRows, []);

  const webRows = (vault.connectedWebsites || []).map((w) => [
    w.id || '',
    w.accountId || '',
    w.serviceName || '',
    w.url || '',
    w.category || '',
    w.loginMethod || 'Google OAuth / SSO',
    w.usernameHandle || '',
    w.importance || 'Normal',
    (w.tags || []).join(', '),
    w.customFields && w.customFields.length ? JSON.stringify(w.customFields) : '',
    w.notes || '',
    w.updatedAt || nowIso,
  ]);
  writeTableRows(ss, 'Connected_Websites', webRows, []);

  const subRows = (vault.subscriptions || []).map((s) => [
    s.id || '',
    s.accountId || '',
    s.serviceName || '',
    s.planName || '',
    s.status || 'Active',
    Number(s.costAmount || 0),
    s.currency || 'IDR',
    s.billingCycle || 'Monthly',
    s.nextRenewalDate || '',
    Boolean(s.autoRenew),
    s.paymentMethodHint || '',
    s.manageUrl || '',
    (s.tags || []).join(', '),
    s.notes || '',
    s.updatedAt || nowIso,
  ]);
  writeTableRows(ss, 'Subscriptions', subRows, ['next_renewal_date']);

  const otherRows = (vault.otherAssets || []).map((o) => [
    o.id || '',
    o.accountId || '',
    o.assetType || '',
    o.title || '',
    o.identifier || '',
    o.url || '',
    (o.tags || []).join(', '),
    o.customFields && o.customFields.length ? JSON.stringify(o.customFields) : '',
    o.notes || '',
    o.updatedAt || nowIso,
  ]);
  writeTableRows(ss, 'Other_Assets', otherRows, []);
}

function doGet(e) {
  try {
    const params = (e && e.parameter) || {};
    if (!checkAuth(params.key)) {
      return jsonResponse({ ok: false, error: 'PIN / API Secret tidak cocok.' });
    }

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    if (params.action === 'ping') {
      return jsonResponse({
        ok: true,
        spreadsheetName: ss.getName(),
        serverTime: new Date().toISOString(),
      });
    }

    const vault = readVault(ss);
    return jsonResponse({
      ok: true,
      spreadsheetName: ss.getName(),
      vault: vault,
      serverTime: new Date().toISOString(),
    });
  } catch (err) {
    return jsonResponse({ ok: false, error: String(err && err.message ? err.message : err) });
  }
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(15000);
    const raw = (e && e.postData && e.postData.contents) || '{}';
    const body = JSON.parse(raw);

    if (!checkAuth(body.key)) {
      return jsonResponse({ ok: false, error: 'PIN / API Secret tidak cocok.' });
    }

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    if (body.action === 'ping') {
      return jsonResponse({
        ok: true,
        spreadsheetName: ss.getName(),
        serverTime: new Date().toISOString(),
      });
    }

    if (body.action === 'push' && body.vault) {
      writeVault(ss, body.vault);
      return jsonResponse({
        ok: true,
        spreadsheetName: ss.getName(),
        updatedAt: new Date().toISOString(),
      });
    }

    return jsonResponse({ ok: false, error: 'Action tidak dikenali.' });
  } catch (err) {
    return jsonResponse({ ok: false, error: String(err && err.message ? err.message : err) });
  } finally {
    lock.releaseLock();
  }
}

import {
  createEmptyVault,
  normalizeAccountRecord,
  normalizeProjectRecord,
  type GoogleSheetsSyncConfig,
  type SyncSettings,
  type VaultData,
} from '../../types/models';
import { normalizePhoneNumber } from '../../utils/simStatus';

interface AppsScriptResponse {
  ok: boolean;
  error?: string;
  spreadsheetName?: string;
  vault?: Partial<VaultData>;
  updatedAt?: string;
  serverTime?: string;
}

function validateScriptUrl(config: GoogleSheetsSyncConfig): string {
  const url = config.scriptUrl.trim();
  if (!url) {
    throw new Error('Masukkan Web App URL Google Apps Script (berakhiran /exec) terlebih dahulu.');
  }
  if (!url.startsWith('https://')) {
    throw new Error('URL Google Apps Script harus diawali dengan https://');
  }
  return url;
}

function buildGetUrl(baseUrl: string, action: 'ping' | 'pull', apiKey: string): string {
  const url = new URL(baseUrl);
  url.searchParams.set('action', action);
  if (apiKey.trim()) {
    url.searchParams.set('key', apiKey.trim());
  }
  return url.toString();
}

async function parseJsonResponse(res: Response): Promise<AppsScriptResponse> {
  if (!res.ok) {
    throw new Error(`Google Apps Script mengembalikan HTTP ${res.status}.`);
  }
  const text = await res.text();
  try {
    return JSON.parse(text) as AppsScriptResponse;
  } catch {
    throw new Error(
      'Respon dari Apps Script bukan JSON valid. Pastikan Deployment "Who has access" disetel ke "Anyone" dan memakai URL berakhiran /exec.'
    );
  }
}

export async function testGoogleSheetsConnection(
  config: GoogleSheetsSyncConfig
): Promise<string> {
  const baseUrl = validateScriptUrl(config);
  const res = await fetch(buildGetUrl(baseUrl, 'ping', config.apiKey), {
    method: 'GET',
    cache: 'no-store',
  });
  const data = await parseJsonResponse(res);
  if (!data.ok) {
    throw new Error(data.error || 'Gagal menghubungi Google Sheets Apps Script.');
  }
  return `Terhubung ke Google Sheets: ${data.spreadsheetName || 'Spreadsheet AccVault'}`;
}

export async function pullVaultFromGoogleSheets(
  config: GoogleSheetsSyncConfig
): Promise<{ vault: VaultData; spreadsheetName: string }> {
  const baseUrl = validateScriptUrl(config);
  const res = await fetch(buildGetUrl(baseUrl, 'pull', config.apiKey), {
    method: 'GET',
    cache: 'no-store',
  });
  const data = await parseJsonResponse(res);
  if (!data.ok || !data.vault) {
    throw new Error(data.error || 'Gagal menarik data dari Google Sheets.');
  }

  const base = createEmptyVault();
  const raw = data.vault;
  const vault: VaultData = {
    version: 1,
    exportedAt: data.serverTime || new Date().toISOString(),
    phoneNumbers: Array.isArray(raw.phoneNumbers)
      ? raw.phoneNumbers.map((p) => ({
          ...p,
          phoneNumber: normalizePhoneNumber(p.phoneNumber),
        }))
      : base.phoneNumbers,
    googleAccounts: Array.isArray(raw.googleAccounts)
      ? raw.googleAccounts.map((a) => normalizeAccountRecord(a))
      : base.googleAccounts,
    projects: Array.isArray(raw.projects)
      ? raw.projects.map((p) => normalizeProjectRecord(p)).filter((p) => p.name !== '')
      : base.projects,
    cloudProjects: Array.isArray(raw.cloudProjects) ? raw.cloudProjects : base.cloudProjects,
    connectedWebsites: Array.isArray(raw.connectedWebsites)
      ? raw.connectedWebsites
      : base.connectedWebsites,
    subscriptions: Array.isArray(raw.subscriptions) ? raw.subscriptions : base.subscriptions,
    otherAssets: Array.isArray(raw.otherAssets) ? raw.otherAssets : base.otherAssets,
  };

  return {
    vault,
    spreadsheetName: data.spreadsheetName || 'Google Sheets',
  };
}

export async function pushVaultToGoogleSheets(
  config: GoogleSheetsSyncConfig,
  vault: VaultData
): Promise<{ spreadsheetName: string; updatedAt: string }> {
  const baseUrl = validateScriptUrl(config);
  // Use text/plain so browsers skip CORS OPTIONS preflight (required for Google Apps Script)
  const res = await fetch(baseUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'text/plain;charset=utf-8',
    },
    body: JSON.stringify({
      action: 'push',
      key: config.apiKey.trim(),
      vault,
    }),
  });

  const data = await parseJsonResponse(res);
  if (!data.ok) {
    throw new Error(data.error || 'Gagal menyimpan data ke Google Sheets.');
  }

  return {
    spreadsheetName: data.spreadsheetName || 'Google Sheets',
    updatedAt: data.updatedAt || new Date().toISOString(),
  };
}

/* ---------------- Device Pairing Link / QR Payload (#pair=...) ---------------- */

export interface PairingPayload {
  v: 1;
  mode: 'gsheets' | 'github';
  gsheets?: {
    scriptUrl: string;
    apiKey: string;
  };
  github?: {
    owner: string;
    repo: string;
    branch: string;
    filePath: string;
    token: string;
    encryptData: boolean;
    passphrase: string;
  };
}

function toBase64Url(jsonText: string): string {
  const bytes = new TextEncoder().encode(jsonText);
  let binary = '';
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function fromBase64Url(encoded: string): string {
  const padded = encoded.replace(/-/g, '+').replace(/_/g, '/');
  const padLen = (4 - (padded.length % 4)) % 4;
  const binary = atob(padded + '='.repeat(padLen));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new TextDecoder().decode(bytes);
}

export function buildPairingUrl(settings: SyncSettings, originHref: string): string {
  const base = originHref.split('#')[0];
  let payload: PairingPayload;

  if (settings.mode === 'gsheets') {
    payload = {
      v: 1,
      mode: 'gsheets',
      gsheets: {
        scriptUrl: settings.gsheets.scriptUrl.trim(),
        apiKey: settings.gsheets.apiKey.trim(),
      },
    };
  } else if (settings.mode === 'github') {
    payload = {
      v: 1,
      mode: 'github',
      github: {
        owner: settings.github.owner.trim(),
        repo: settings.github.repo.trim(),
        branch: settings.github.branch.trim() || 'main',
        filePath: settings.github.filePath.trim() || 'vault-data.json',
        token: settings.github.token.trim(),
        encryptData: settings.github.encryptData,
        passphrase: settings.github.passphrase,
      },
    };
  } else {
    throw new Error('Pairing QR hanya tersedia untuk mode Google Sheets atau 100% GitHub.');
  }

  return `${base}#pair=${toBase64Url(JSON.stringify(payload))}`;
}

export function parsePairingHash(hash: string): PairingPayload | null {
  if (!hash || !hash.includes('pair=')) return null;
  const match = hash.match(/pair=([A-Za-z0-9_-]+)/);
  if (!match) return null;
  try {
    const decoded = JSON.parse(fromBase64Url(match[1])) as Partial<PairingPayload>;
    if (decoded.v !== 1) return null;
    if (decoded.mode === 'gsheets' && decoded.gsheets?.scriptUrl) {
      return decoded as PairingPayload;
    }
    if (decoded.mode === 'github' && decoded.github?.owner && decoded.github?.repo) {
      return decoded as PairingPayload;
    }
    return null;
  } catch {
    return null;
  }
}

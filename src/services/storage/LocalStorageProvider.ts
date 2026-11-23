import { buildSampleVault } from '../../data/sampleData';
import type { SyncSettings, VaultData } from '../../types/models';
import { createEmptyVault } from '../../types/models';
import { parseVaultFromJson } from '../../utils/backupIO';

const VAULT_STORAGE_KEY = 'accvault_data_v1';
const SETTINGS_STORAGE_KEY = 'accvault_sync_settings_v1';
const THEME_STORAGE_KEY = 'accvault_theme_v1';
const PRIVACY_STORAGE_KEY = 'accvault_privacy_v1';

export function getDefaultSyncSettings(): SyncSettings {
  const envUrl = import.meta.env.VITE_SUPABASE_URL ?? '';
  const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY ?? '';
  return {
    mode: envUrl && envKey ? 'supabase' : 'local',
    github: {
      owner: '',
      repo: 'accvault-private-data',
      branch: 'main',
      filePath: 'vault-data.json',
      token: '',
      encryptData: false,
      passphrase: '',
      autoSync: true,
      lastSha: '',
    },
    supabase: {
      url: envUrl,
      anonKey: envKey,
      autoSync: true,
    },
  };
}

export function loadLocalVault(): VaultData {
  try {
    const raw = localStorage.getItem(VAULT_STORAGE_KEY);
    if (!raw) {
      const sample = buildSampleVault();
      saveLocalVault(sample);
      return sample;
    }
    return parseVaultFromJson(raw);
  } catch {
    return createEmptyVault();
  }
}

export function saveLocalVault(vault: VaultData): void {
  localStorage.setItem(
    VAULT_STORAGE_KEY,
    JSON.stringify({
      ...vault,
      version: 1,
      exportedAt: new Date().toISOString(),
    })
  );
}

export function loadSyncSettings(): SyncSettings {
  const defaults = getDefaultSyncSettings();
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) return defaults;
    const parsed = JSON.parse(raw) as Partial<SyncSettings>;
    return {
      mode: parsed.mode ?? defaults.mode,
      github: { ...defaults.github, ...(parsed.github ?? {}) },
      supabase: { ...defaults.supabase, ...(parsed.supabase ?? {}) },
    };
  } catch {
    return defaults;
  }
}

export function saveSyncSettings(settings: SyncSettings): void {
  localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
}

export function loadThemePreference(): 'light' | 'dark' {
  const stored = localStorage.getItem(THEME_STORAGE_KEY);
  if (stored === 'dark' || stored === 'light') return stored;
  return 'light';
}

export function saveThemePreference(theme: 'light' | 'dark'): void {
  localStorage.setItem(THEME_STORAGE_KEY, theme);
}

export function loadPrivacyPreference(): boolean {
  return localStorage.getItem(PRIVACY_STORAGE_KEY) === 'true';
}

export function savePrivacyPreference(masked: boolean): void {
  localStorage.setItem(PRIVACY_STORAGE_KEY, String(masked));
}

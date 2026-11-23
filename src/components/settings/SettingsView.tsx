import type { User } from '@supabase/supabase-js';
import {
  Cloud,
  CloudDownload,
  CloudUpload,
  Database,
  Download,
  FileSpreadsheet,
  GitBranch,
  HardDrive,
  Lock,
  LogIn,
  LogOut,
  RotateCcw,
  ShieldAlert,
  Trash2,
  Upload,
} from 'lucide-react';
import { useRef, useState } from 'react';
import { testGitHubConnection } from '../../services/storage/GitHubStorageProvider';
import {
  signInSupabase,
  signOutSupabase,
} from '../../services/storage/SupabaseStorageProvider';
import type { SyncProviderType, SyncSettings, VaultData } from '../../types/models';
import {
  exportVaultToExcel,
  exportVaultToJson,
  parseVaultFromJson,
} from '../../utils/backupIO';

interface SettingsViewProps {
  vault: VaultData;
  settings: SyncSettings;
  supabaseUser: User | null;
  syncBusy: boolean;
  lastSyncText: string;
  onUpdateSettings: (next: SyncSettings) => void;
  onSupabaseUserChange: (user: User | null) => void;
  onPullCloud: () => Promise<void>;
  onPushCloud: () => Promise<void>;
  onImportVault: (nextVault: VaultData) => void;
  onLoadSampleData: () => void;
  onClearAllData: () => void;
  onToast: (text: string, tone?: 'default' | 'error') => void;
}

export function SettingsView({
  vault,
  settings,
  supabaseUser,
  syncBusy,
  lastSyncText,
  onUpdateSettings,
  onSupabaseUserChange,
  onPullCloud,
  onPushCloud,
  onImportVault,
  onLoadSampleData,
  onClearAllData,
  onToast,
}: SettingsViewProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [testingGh, setTestingGh] = useState(false);
  const [sbEmail, setSbEmail] = useState('');
  const [sbPassword, setSbPassword] = useState('');
  const [authBusy, setAuthBusy] = useState(false);

  const setMode = (mode: SyncProviderType) => {
    onUpdateSettings({ ...settings, mode });
  };

  const handleTestGitHub = async () => {
    setTestingGh(true);
    try {
      const msg = await testGitHubConnection(settings.github);
      onToast(msg);
    } catch (err) {
      onToast(err instanceof Error ? err.message : 'Gagal tes koneksi GitHub.', 'error');
    } finally {
      setTestingGh(false);
    }
  };

  const handleSupabaseLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthBusy(true);
    try {
      const user = await signInSupabase(settings.supabase, sbEmail.trim(), sbPassword);
      onSupabaseUserChange(user);
      setSbPassword('');
      onToast(`Berhasil login sebagai ${user.email}`);
    } catch (err) {
      onToast(err instanceof Error ? err.message : 'Gagal login Supabase.', 'error');
    } finally {
      setAuthBusy(false);
    }
  };

  const handleSupabaseLogout = async () => {
    setAuthBusy(true);
    try {
      await signOutSupabase(settings.supabase);
      onSupabaseUserChange(null);
      onToast('Berhasil keluar dari sesi Supabase.');
    } catch (err) {
      onToast(err instanceof Error ? err.message : 'Gagal keluar.', 'error');
    } finally {
      setAuthBusy(false);
    }
  };

  const handleJsonFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = parseVaultFromJson(String(reader.result ?? ''));
        onImportVault(parsed);
        onToast(
          `Berhasil import ${parsed.googleAccounts.length} akun Google & ${parsed.phoneNumbers.length} kartu SIM.`
        );
      } catch (err) {
        onToast(err instanceof Error ? err.message : 'Gagal membaca file JSON.', 'error');
      } finally {
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsText(file);
  };

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Sinkronisasi &amp; Pengaturan</h1>
          <p className="page-subtitle">
            Pilih penyimpanan untuk sinkron otomatis Laptop &amp; HP, atau export backup ke
            Excel/JSON.
          </p>
        </div>
      </div>

      {/* Sync Mode Selector */}
      <section className="surface-card" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div className="section-header" style={{ marginBottom: 0 }}>
          <h2 className="section-title">
            <Cloud size={17} /> Mode Penyimpanan &amp; Sinkronisasi
          </h2>
          {lastSyncText && (
            <span style={{ fontSize: 12, color: 'var(--ink-muted)' }}>{lastSyncText}</span>
          )}
        </div>

        <div className="segmented-tabs" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={settings.mode === 'local'}
            className={`segmented-tab${settings.mode === 'local' ? ' active' : ''}`}
            onClick={() => setMode('local')}
          >
            <HardDrive size={15} /> Lokal (Perangkat Ini)
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={settings.mode === 'github'}
            className={`segmented-tab${settings.mode === 'github' ? ' active' : ''}`}
            onClick={() => setMode('github')}
          >
            <GitBranch size={15} /> 100% GitHub (Private Repo)
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={settings.mode === 'supabase'}
            className={`segmented-tab${settings.mode === 'supabase' ? ' active' : ''}`}
            onClick={() => setMode('supabase')}
          >
            <Database size={15} /> Supabase Cloud
          </button>
        </div>

        {settings.mode === 'local' && (
          <div className="callout-box">
            <HardDrive size={17} style={{ flexShrink: 0, marginTop: 2 }} />
            <div>
              <strong>Mode Lokal Aktif:</strong> Semua data tersimpan di browser perangkat ini
              (100% offline &amp; langsung jalan). Untuk sinkronisasi otomatis antara Laptop dan HP,
              pilih tab <strong>100% GitHub</strong> atau <strong>Supabase Cloud</strong> di atas.
            </div>
          </div>
        )}

        {settings.mode === 'github' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div className="callout-box">
              <GitBranch size={17} style={{ flexShrink: 0, marginTop: 2 }} />
              <div>
                <strong>Mode 100% GitHub (Tanpa Auto-Pause):</strong> Data disimpan sebagai file
                JSON di <strong>Private Repository GitHub</strong> milikmu sendiri. Buat token
                Fine-grained PAT di GitHub dengan izin <code>Contents: Read and write</code> khusus
                ke 1 repo data tersebut saja.
              </div>
            </div>

            <div className="form-grid-2">
              <div className="form-field">
                <label className="form-label" htmlFor="gh-owner">
                  Username GitHub (Owner)
                </label>
                <input
                  id="gh-owner"
                  type="text"
                  className="form-input mono"
                  placeholder="username-kamu"
                  value={settings.github.owner}
                  onChange={(e) =>
                    onUpdateSettings({
                      ...settings,
                      github: { ...settings.github, owner: e.target.value },
                    })
                  }
                />
              </div>

              <div className="form-field">
                <label className="form-label" htmlFor="gh-repo">
                  Nama Private Repository Data
                </label>
                <input
                  id="gh-repo"
                  type="text"
                  className="form-input mono"
                  placeholder="accvault-private-data"
                  value={settings.github.repo}
                  onChange={(e) =>
                    onUpdateSettings({
                      ...settings,
                      github: { ...settings.github, repo: e.target.value },
                    })
                  }
                />
              </div>
            </div>

            <div className="form-grid-2">
              <div className="form-field">
                <label className="form-label" htmlFor="gh-branch">
                  Branch &amp; Path File
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '110px 1fr', gap: 8 }}>
                  <input
                    id="gh-branch"
                    type="text"
                    className="form-input mono"
                    value={settings.github.branch}
                    onChange={(e) =>
                      onUpdateSettings({
                        ...settings,
                        github: { ...settings.github, branch: e.target.value },
                      })
                    }
                  />
                  <input
                    aria-label="Path file JSON"
                    type="text"
                    className="form-input mono"
                    value={settings.github.filePath}
                    onChange={(e) =>
                      onUpdateSettings({
                        ...settings,
                        github: { ...settings.github, filePath: e.target.value },
                      })
                    }
                  />
                </div>
              </div>

              <div className="form-field">
                <label className="form-label" htmlFor="gh-token">
                  Fine-grained Personal Access Token (disimpan lokal di browser ini)
                </label>
                <input
                  id="gh-token"
                  type="password"
                  className="form-input mono"
                  placeholder="github_pat_..."
                  value={settings.github.token}
                  onChange={(e) =>
                    onUpdateSettings({
                      ...settings,
                      github: { ...settings.github, token: e.target.value },
                    })
                  }
                />
              </div>
            </div>

            <label className="checkbox-row">
              <input
                type="checkbox"
                checked={settings.github.encryptData}
                onChange={(e) =>
                  onUpdateSettings({
                    ...settings,
                    github: { ...settings.github, encryptData: e.target.checked },
                  })
                }
              />
              <span>
                <Lock size={13} style={{ verticalAlign: 'middle', marginRight: 4 }} />
                Enkripsi file JSON dengan <strong>AES-256 (Web Crypto)</strong> sebelum dikirim ke
                GitHub
              </span>
            </label>

            {settings.github.encryptData && (
              <div className="form-field" style={{ maxWidth: 420 }}>
                <label className="form-label" htmlFor="gh-passphrase">
                  Passphrase Enkripsi (Gunakan passphrase yang sama di HP &amp; Laptop)
                </label>
                <input
                  id="gh-passphrase"
                  type="password"
                  className="form-input"
                  placeholder="Minimal 4 karakter..."
                  value={settings.github.passphrase}
                  onChange={(e) =>
                    onUpdateSettings({
                      ...settings,
                      github: { ...settings.github, passphrase: e.target.value },
                    })
                  }
                />
              </div>
            )}

            <label className="checkbox-row">
              <input
                type="checkbox"
                checked={settings.github.autoSync}
                onChange={(e) =>
                  onUpdateSettings({
                    ...settings,
                    github: { ...settings.github, autoSync: e.target.checked },
                  })
                }
              />
              <span>Otomatis push ke GitHub setiap kali data diubah</span>
            </label>

            <div className="filter-bar">
              <button
                type="button"
                className="btn btn-sm"
                disabled={testingGh}
                onClick={handleTestGitHub}
              >
                {testingGh ? 'Menguji...' : 'Tes Koneksi Repo'}
              </button>
              <button
                type="button"
                className="btn btn-sm"
                disabled={syncBusy}
                onClick={onPullCloud}
              >
                <CloudDownload size={14} /> Tarik Data (Pull)
              </button>
              <button
                type="button"
                className="btn btn-sm btn-primary"
                disabled={syncBusy}
                onClick={onPushCloud}
              >
                <CloudUpload size={14} /> Simpan ke GitHub (Push)
              </button>
            </div>
          </div>
        )}

        {settings.mode === 'supabase' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div className="callout-box">
              <Database size={17} style={{ flexShrink: 0, marginTop: 2 }} />
              <div>
                <strong>Mode Supabase Cloud:</strong> Jalankan file{' '}
                <code>supabase/schema.sql</code> di Supabase SQL Editor, buat 1 user di menu
                Authentication (lalu matikan publik Sign Up), kemudian masukkan URL &amp; Anon Key
                di bawah.
              </div>
            </div>

            <div className="form-grid-2">
              <div className="form-field">
                <label className="form-label" htmlFor="sb-url">
                  Supabase Project URL
                </label>
                <input
                  id="sb-url"
                  type="url"
                  className="form-input mono"
                  placeholder="https://xxxxx.supabase.co"
                  value={settings.supabase.url}
                  onChange={(e) =>
                    onUpdateSettings({
                      ...settings,
                      supabase: { ...settings.supabase, url: e.target.value },
                    })
                  }
                />
              </div>
              <div className="form-field">
                <label className="form-label" htmlFor="sb-key">
                  Publishable / Anon Key
                </label>
                <input
                  id="sb-key"
                  type="password"
                  className="form-input mono"
                  placeholder="eyJ... atau sb_publishable_..."
                  value={settings.supabase.anonKey}
                  onChange={(e) =>
                    onUpdateSettings({
                      ...settings,
                      supabase: { ...settings.supabase, anonKey: e.target.value },
                    })
                  }
                />
              </div>
            </div>

            {supabaseUser ? (
              <div className="callout-box success" style={{ justifyContent: 'space-between' }}>
                <div>
                  Login aktif sebagai <strong className="mono">{supabaseUser.email}</strong>
                </div>
                <button
                  type="button"
                  className="btn btn-sm"
                  disabled={authBusy}
                  onClick={handleSupabaseLogout}
                >
                  <LogOut size={14} /> Keluar
                </button>
              </div>
            ) : (
              <form
                onSubmit={handleSupabaseLogin}
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                  gap: 10,
                  alignItems: 'end',
                  padding: 14,
                  borderRadius: 12,
                  background: 'var(--bg-subtle)',
                  border: '1px solid var(--border-hairline)',
                }}
              >
                <div className="form-field">
                  <label className="form-label" htmlFor="sb-login-email">
                    Email Login Supabase
                  </label>
                  <input
                    id="sb-login-email"
                    type="email"
                    required
                    className="form-input"
                    value={sbEmail}
                    onChange={(e) => setSbEmail(e.target.value)}
                  />
                </div>
                <div className="form-field">
                  <label className="form-label" htmlFor="sb-login-pass">
                    Password Login Supabase
                  </label>
                  <input
                    id="sb-login-pass"
                    type="password"
                    required
                    className="form-input"
                    value={sbPassword}
                    onChange={(e) => setSbPassword(e.target.value)}
                  />
                </div>
                <button type="submit" className="btn btn-primary" disabled={authBusy}>
                  <LogIn size={14} /> {authBusy ? 'Masuk...' : 'Login Supabase'}
                </button>
              </form>
            )}

            <label className="checkbox-row">
              <input
                type="checkbox"
                checked={settings.supabase.autoSync}
                onChange={(e) =>
                  onUpdateSettings({
                    ...settings,
                    supabase: { ...settings.supabase, autoSync: e.target.checked },
                  })
                }
              />
              <span>Otomatis sinkron ke Supabase setiap kali data diubah</span>
            </label>

            <div className="filter-bar">
              <button
                type="button"
                className="btn btn-sm"
                disabled={syncBusy || !supabaseUser}
                onClick={onPullCloud}
              >
                <CloudDownload size={14} /> Tarik Data (Pull)
              </button>
              <button
                type="button"
                className="btn btn-sm btn-primary"
                disabled={syncBusy || !supabaseUser}
                onClick={onPushCloud}
              >
                <CloudUpload size={14} /> Simpan ke Supabase (Push)
              </button>
            </div>
          </div>
        )}
      </section>

      {/* Export / Import Backup */}
      <section className="surface-card" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <h2 className="section-title">Backup &amp; Portabilitas Data (Excel &amp; JSON)</h2>
        <p style={{ margin: 0, fontSize: 13, color: 'var(--ink-secondary)' }}>
          Export seluruh data ke file Excel multi-sheet (siap dibuka di Google Sheets / Microsoft
          Excel) atau simpan backup penuh dalam format JSON agar terhindar dari risiko kehilangan
          akses.
        </p>

        <div className="filter-bar">
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => {
              void exportVaultToExcel(vault).then(() =>
                onToast('File Excel (.xlsx) berhasil diunduh!')
              );
            }}
          >
            <FileSpreadsheet size={15} /> Export Excel (.xlsx — 6 Sheet)
          </button>

          <button
            type="button"
            className="btn"
            onClick={() => {
              exportVaultToJson(vault);
              onToast('Backup JSON berhasil diunduh!');
            }}
          >
            <Download size={15} /> Export Backup JSON
          </button>

          <button
            type="button"
            className="btn"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload size={15} /> Import dari JSON
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json,.json"
            style={{ display: 'none' }}
            onChange={handleJsonFileUpload}
          />
        </div>
      </section>

      {/* Data Management & Security Policy */}
      <section className="surface-card" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <h2 className="section-title">Kelola Data Contoh &amp; Prinsip Keamanan</h2>

        <div className="callout-box warning">
          <ShieldAlert size={18} style={{ flexShrink: 0, marginTop: 2 }} />
          <div>
            <strong>Zero Secret Policy:</strong> Jangan simpan password asli, kode OTP/backup 2FA,
            PIN M-Banking, atau secret API key di aplikasi ini. Simpan informasi sensitif tersebut
            di Password Manager khusus (mis. Bitwarden), dan gunakan AccVault sebagai peta aset,
            relasi akun, serta pelacak masa aktif kartu SIM.
          </div>
        </div>

        <div className="filter-bar">
          <button type="button" className="btn btn-sm" onClick={onLoadSampleData}>
            <RotateCcw size={14} /> Muat Ulang Data Contoh
          </button>
          <button type="button" className="btn btn-sm btn-danger" onClick={onClearAllData}>
            <Trash2 size={14} /> Kosongkan Semua Data (Mulai Bersih)
          </button>
        </div>
      </section>
    </>
  );
}

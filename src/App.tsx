import type { User } from '@supabase/supabase-js';
import {
  Eye,
  EyeOff,
  FolderKanban,
  Layers,
  LayoutDashboard,
  Mail,
  Moon,
  Plus,
  RefreshCw,
  Search,
  Settings,
  Shield,
  Smartphone,
  Sun,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AccountDetailView } from './components/accounts/AccountDetailView';
import { AccountFormModal } from './components/accounts/AccountFormModal';
import { AccountsView } from './components/accounts/AccountsView';
import { ImportSpreadsheetModal } from './components/common/ImportSpreadsheetModal';
import { Toast, type ToastMessage } from './components/common/Toast';
import { DashboardView } from './components/dashboard/DashboardView';
import {
  CloudFormModal,
  OtherFormModal,
  SubscriptionFormModal,
  WebsiteFormModal,
} from './components/items/ItemFormModals';
import { ItemsHubView } from './components/items/ItemsHubView';
import { ExtendSimModal } from './components/phones/ExtendSimModal';
import { PhoneFormModal } from './components/phones/PhoneFormModal';
import { PhonesView } from './components/phones/PhonesView';
import { ProjectsView } from './components/projects/ProjectsView';
import { GlobalSearchModal } from './components/search/GlobalSearchModal';
import { SettingsView } from './components/settings/SettingsView';
import { buildSampleVault } from './data/sampleData';
import {
  pullVaultFromGitHub,
  pushVaultToGitHub,
} from './services/storage/GitHubStorageProvider';
import {
  parsePairingHash,
  pullVaultFromGoogleSheets,
  pushVaultToGoogleSheets,
} from './services/storage/GoogleSheetsStorageProvider';
import {
  loadLocalVault,
  loadPrivacyPreference,
  loadSyncSettings,
  loadThemePreference,
  saveLocalVault,
  savePrivacyPreference,
  saveSyncSettings,
  saveThemePreference,
} from './services/storage/LocalStorageProvider';
import {
  getSupabaseUser,
  pullVaultFromSupabase,
  pushVaultToSupabase,
} from './services/storage/SupabaseStorageProvider';
import {
  createEmptyVault,
  type ActiveTab,
  type CloudProject,
  type ConnectedWebsite,
  type GlobalSearchResult,
  type GoogleAccount,
  type ItemsSubTab,
  type OtherAsset,
  type PhoneNumber,
  type ProjectItem,
  type Subscription,
  type SyncSettings,
  type VaultData,
} from './types/models';
import {
  mergeImportedSpreadsheet,
  type SpreadsheetImportSummary,
} from './utils/backupIO';
import {
  downloadTextFile,
  generateSimReminderIcs,
  generateSubscriptionReminderIcs,
} from './utils/calendarIcs';
import { getSimHealth, getSubscriptionHealth } from './utils/simStatus';

function loadInitialSettingsWithPairing(): { settings: SyncSettings; paired: boolean } {
  const base = loadSyncSettings();
  if (typeof window === 'undefined') return { settings: base, paired: false };

  const pairing = parsePairingHash(window.location.hash);
  if (!pairing) return { settings: base, paired: false };

  // Strip #pair=... immediately from browser URL so secrets do not linger in address bar
  window.history.replaceState(null, '', window.location.pathname + window.location.search);

  let next: SyncSettings = base;
  if (pairing.mode === 'gsheets' && pairing.gsheets) {
    next = {
      ...base,
      mode: 'gsheets',
      gsheets: {
        ...base.gsheets,
        scriptUrl: pairing.gsheets.scriptUrl,
        apiKey: pairing.gsheets.apiKey,
        autoSync: true,
        autoPull: true,
      },
    };
  } else if (pairing.mode === 'github' && pairing.github) {
    next = {
      ...base,
      mode: 'github',
      github: {
        ...base.github,
        ...pairing.github,
        autoSync: true,
        autoPull: true,
      },
    };
  }

  saveSyncSettings(next);
  return { settings: next, paired: true };
}

export default function App() {
  const [vault, setVault] = useState<VaultData>(() => loadLocalVault());
  const [bootState] = useState(() => loadInitialSettingsWithPairing());
  const [settings, setSettings] = useState<SyncSettings>(() => bootState.settings);
  const [theme, setTheme] = useState<'light' | 'dark'>(() => loadThemePreference());
  const [privacyMask, setPrivacyMask] = useState<boolean>(() => loadPrivacyPreference());

  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [itemsSubTab, setItemsSubTab] = useState<ItemsSubTab>('cloud');
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);

  const [searchOpen, setSearchOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const toastTimerRef = useRef<number | null>(null);

  // Cloud sync state
  const [supabaseUser, setSupabaseUser] = useState<User | null>(null);
  const [syncState, setSyncState] = useState<'idle' | 'syncing' | 'synced' | 'error'>('idle');
  const [lastSyncText, setLastSyncText] = useState('');
  const syncTimerRef = useRef<number | null>(null);
  const lastPullTimestampRef = useRef<number>(0);

  // Modal states
  const [accountModal, setAccountModal] = useState<{ open: boolean; editing: GoogleAccount | null }>({
    open: false,
    editing: null,
  });
  const [phoneModal, setPhoneModal] = useState<{ open: boolean; editing: PhoneNumber | null }>({
    open: false,
    editing: null,
  });
  const [extendingPhone, setExtendingPhone] = useState<PhoneNumber | null>(null);
  const [cloudModal, setCloudModal] = useState<{
    open: boolean;
    editing: CloudProject | null;
    accountId?: string;
  }>({ open: false, editing: null });
  const [websiteModal, setWebsiteModal] = useState<{
    open: boolean;
    editing: ConnectedWebsite | null;
    accountId?: string;
  }>({ open: false, editing: null });
  const [subModal, setSubModal] = useState<{
    open: boolean;
    editing: Subscription | null;
    accountId?: string;
  }>({ open: false, editing: null });
  const [otherModal, setOtherModal] = useState<{
    open: boolean;
    editing: OtherAsset | null;
    accountId?: string;
  }>({ open: false, editing: null });

  const showToast = useCallback((text: string, tone: 'default' | 'error' = 'default') => {
    setToast({ text, tone });
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => setToast(null), 3200);
  }, []);

  // Theme application
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    saveThemePreference(theme);
  }, [theme]);

  useEffect(() => {
    savePrivacyPreference(privacyMask);
  }, [privacyMask]);

  // Global keyboard shortcut Ctrl+K / Cmd+K
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setSearchOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  // Check Supabase session on mount or when config changes
  const supabaseUrl = settings.supabase.url;
  const supabaseAnonKey = settings.supabase.anonKey;
  useEffect(() => {
    let active = true;
    if (!supabaseUrl || !supabaseAnonKey) return;
    getSupabaseUser({
      url: supabaseUrl,
      anonKey: supabaseAnonKey,
      autoSync: false,
      autoPull: false,
    })
      .then((user) => {
        if (active) setSupabaseUser(user);
      })
      .catch(() => {
        if (active) setSupabaseUser(null);
      });
    return () => {
      active = false;
    };
  }, [supabaseUrl, supabaseAnonKey]);

  const activeSupabaseUser = supabaseUrl && supabaseAnonKey ? supabaseUser : null;

  const handleUpdateSettings = useCallback((next: SyncSettings) => {
    setSettings(next);
    saveSyncSettings(next);
  }, []);

  const pushToActiveCloud = useCallback(
    async (dataToPush: VaultData, currentSettings: SyncSettings, silent = false) => {
      if (currentSettings.mode === 'local') return;
      setSyncState('syncing');
      try {
        if (currentSettings.mode === 'gsheets') {
          await pushVaultToGoogleSheets(currentSettings.gsheets, dataToPush);
          lastPullTimestampRef.current = Date.now();
          setSyncState('synced');
          setLastSyncText(
            `Tersimpan ke Google Sheets · ${new Date().toLocaleTimeString('id-ID')}`
          );
          if (!silent) showToast('Data berhasil disimpan ke Google Sheets!');
        } else if (currentSettings.mode === 'github') {
          const result = await pushVaultToGitHub(currentSettings.github, dataToPush);
          const updated: SyncSettings = {
            ...currentSettings,
            github: { ...currentSettings.github, lastSha: result.sha },
          };
          setSettings(updated);
          saveSyncSettings(updated);
          lastPullTimestampRef.current = Date.now();
          setSyncState('synced');
          setLastSyncText(`Tersinkron ke GitHub · ${new Date().toLocaleTimeString('id-ID')}`);
          if (!silent) showToast('Data berhasil disimpan ke GitHub Private Repo!');
        } else if (currentSettings.mode === 'supabase') {
          await pushVaultToSupabase(currentSettings.supabase, dataToPush);
          lastPullTimestampRef.current = Date.now();
          setSyncState('synced');
          setLastSyncText(`Tersinkron ke Supabase · ${new Date().toLocaleTimeString('id-ID')}`);
          if (!silent) showToast('Data berhasil disimpan ke Supabase!');
        }
      } catch (err) {
        setSyncState('error');
        showToast(err instanceof Error ? err.message : 'Sinkronisasi gagal.', 'error');
      }
    },
    [showToast]
  );

  const pullFromActiveCloud = useCallback(
    async (silent = false) => {
      if (settings.mode === 'local') {
        if (!silent) showToast('Saat ini berada di Mode Lokal.');
        return;
      }
      setSyncState('syncing');
      try {
        if (settings.mode === 'gsheets') {
          const res = await pullVaultFromGoogleSheets(settings.gsheets);
          setVault(res.vault);
          saveLocalVault(res.vault);
          lastPullTimestampRef.current = Date.now();
          setSyncState('synced');
          setLastSyncText(
            `Auto-sync Google Sheets · ${new Date().toLocaleTimeString('id-ID')}`
          );
          if (!silent) {
            showToast(
              `Data terbaru ditarik (${res.vault.googleAccounts.length} akun, ${res.vault.phoneNumbers.length} SIM)`
            );
          }
        } else if (settings.mode === 'github') {
          const res = await pullVaultFromGitHub(settings.github);
          if (res.wasEmpty || !res.vault) {
            if (!silent) {
              showToast('File belum ada di repo GitHub. Klik Push untuk menyimpan data pertama.');
            }
            setSyncState('idle');
            return;
          }
          setVault(res.vault);
          saveLocalVault(res.vault);
          const updated: SyncSettings = {
            ...settings,
            github: { ...settings.github, lastSha: res.sha },
          };
          setSettings(updated);
          saveSyncSettings(updated);
          lastPullTimestampRef.current = Date.now();
          setSyncState('synced');
          setLastSyncText(`Ditarik dari GitHub · ${new Date().toLocaleTimeString('id-ID')}`);
          if (!silent) showToast('Data terbaru berhasil ditarik dari GitHub!');
        } else if (settings.mode === 'supabase') {
          const remote = await pullVaultFromSupabase(settings.supabase);
          setVault(remote);
          saveLocalVault(remote);
          lastPullTimestampRef.current = Date.now();
          setSyncState('synced');
          setLastSyncText(`Ditarik dari Supabase · ${new Date().toLocaleTimeString('id-ID')}`);
          if (!silent) showToast('Data terbaru berhasil ditarik dari Supabase!');
        }
      } catch (err) {
        setSyncState('error');
        if (!silent) {
          showToast(err instanceof Error ? err.message : 'Gagal menarik data cloud.', 'error');
        }
      }
    },
    [settings, showToast]
  );

  // Auto-Pull on mount and when returning to the app tab on HP / Laptop
  const canAutoPull =
    (settings.mode === 'gsheets' &&
      settings.gsheets.autoPull &&
      Boolean(settings.gsheets.scriptUrl.trim())) ||
    (settings.mode === 'github' &&
      settings.github.autoPull &&
      Boolean(settings.github.token.trim())) ||
    (settings.mode === 'supabase' &&
      settings.supabase.autoPull &&
      Boolean(activeSupabaseUser));

  const autoPullRef = useRef({ canAutoPull, pull: pullFromActiveCloud });
  useEffect(() => {
    autoPullRef.current = { canAutoPull, pull: pullFromActiveCloud };
  }, [canAutoPull, pullFromActiveCloud]);

  useEffect(() => {
    const triggerPull = (forceNotify: boolean) => {
      const { canAutoPull: enabled, pull } = autoPullRef.current;
      if (!enabled) return;
      // Do not overwrite pending local edits waiting to push
      if (syncTimerRef.current !== null) return;
      const elapsed = Date.now() - lastPullTimestampRef.current;
      if (!forceNotify && elapsed < 15_000) return;
      void pull(!forceNotify);
    };

    // Initial pull on boot (show toast if device just paired via QR)
    const initialTimer = window.setTimeout(() => {
      triggerPull(bootState.paired);
    }, 150);

    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        triggerPull(false);
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.clearTimeout(initialTimer);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [bootState.paired]);

  const commitVault = useCallback(
    (updater: (prev: VaultData) => VaultData) => {
      setVault((prev) => {
        const next = updater(prev);
        saveLocalVault(next);

        const shouldAutoPush =
          (settings.mode === 'gsheets' &&
            settings.gsheets.autoSync &&
            Boolean(settings.gsheets.scriptUrl.trim())) ||
          (settings.mode === 'github' &&
            settings.github.autoSync &&
            Boolean(settings.github.token.trim())) ||
          (settings.mode === 'supabase' &&
            settings.supabase.autoSync &&
            Boolean(activeSupabaseUser));

        if (shouldAutoPush) {
          if (syncTimerRef.current) window.clearTimeout(syncTimerRef.current);
          syncTimerRef.current = window.setTimeout(() => {
            syncTimerRef.current = null;
            void pushToActiveCloud(next, settings, true);
          }, 900);
        }
        return next;
      });
    },
    [settings, activeSupabaseUser, pushToActiveCloud]
  );

  const handleCopy = useCallback(
    (text: string, label: string) => {
      const compactPreview =
        text.includes('\n') || text.length > 60 ? '' : `: ${text}`;
      if (navigator.clipboard?.writeText) {
        navigator.clipboard
          .writeText(text)
          .then(() => showToast(`${label}${compactPreview}`))
          .catch(() => showToast('Gagal menyalin ke clipboard.', 'error'));
      } else {
        showToast(`${label}${compactPreview}`);
      }
    },
    [showToast]
  );

  const urgentSimCount = useMemo(
    () => vault.phoneNumbers.filter((p) => getSimHealth(p).needsAttention).length,
    [vault.phoneNumbers]
  );

  const urgentSubCount = useMemo(
    () =>
      vault.subscriptions.filter((s) => {
        const h = getSubscriptionHealth(s);
        return h.isUpcoming || h.isOverdue;
      }).length,
    [vault.subscriptions]
  );

  const urgentCancelCount = useMemo(
    () => vault.googleAccounts.filter((a) => a.quickSubNeedsCancel).length,
    [vault.googleAccounts]
  );

  const totalAlerts = urgentSimCount + urgentSubCount + urgentCancelCount;

  const toggleNeedsCancel = (account: GoogleAccount) => {
    const nextVal = !account.quickSubNeedsCancel;
    commitVault((prev) => ({
      ...prev,
      googleAccounts: prev.googleAccounts.map((a) =>
        a.id === account.id
          ? { ...a, quickSubNeedsCancel: nextVal, updatedAt: new Date().toISOString() }
          : a
      ),
    }));
    showToast(
      nextVal
        ? `${account.email} ditandai Belum Cancel.`
        : `${account.email} ditandai Sudah Cancel!`
    );
  };

  const handleSpreadsheetImport = (
    summary: SpreadsheetImportSummary,
    mode: 'merge' | 'replace'
  ) => {
    commitVault((prev) => mergeImportedSpreadsheet(prev, summary, mode));
    setSelectedAccountId(null);
    showToast(
      `Import berhasil: ${summary.accounts.length} akun email & ${summary.phones.length} nomor HP.`
    );
  };

  const selectedAccount = useMemo(
    () => vault.googleAccounts.find((a) => a.id === selectedAccountId) ?? null,
    [vault.googleAccounts, selectedAccountId]
  );

  const navigateTab = (tab: ActiveTab, sub?: ItemsSubTab) => {
    setActiveTab(tab);
    setSelectedAccountId(null);
    if (sub) setItemsSubTab(sub);
  };

  const openAccountDetail = (accountId: string) => {
    setSelectedAccountId(accountId);
    setActiveTab('accounts');
  };

  const handleQuickAdd = (
    kind: 'account' | 'phone' | 'cloud' | 'website' | 'subscription' | 'other',
    accountId?: string
  ) => {
    if (kind === 'account') {
      setAccountModal({ open: true, editing: null });
      return;
    }
    if (kind === 'phone') {
      setPhoneModal({ open: true, editing: null });
      return;
    }
    if (vault.googleAccounts.length === 0) {
      showToast('Tambahkan minimal 1 Akun Google terlebih dahulu.', 'error');
      setAccountModal({ open: true, editing: null });
      return;
    }
    if (kind === 'cloud') setCloudModal({ open: true, editing: null, accountId });
    else if (kind === 'website') setWebsiteModal({ open: true, editing: null, accountId });
    else if (kind === 'subscription') setSubModal({ open: true, editing: null, accountId });
    else setOtherModal({ open: true, editing: null, accountId });
  };

  const handleSelectSearchResult = (res: GlobalSearchResult) => {
    if (res.category === 'account') {
      openAccountDetail(res.id);
    } else if (res.category === 'project') {
      navigateTab('projects');
    } else if (res.category === 'phone') {
      navigateTab('phones');
    } else if (res.ownerAccount) {
      openAccountDetail(res.ownerAccount.id);
    } else if (res.category === 'cloud') {
      navigateTab('items', 'cloud');
    } else if (res.category === 'website') {
      navigateTab('items', 'websites');
    } else if (res.category === 'subscription') {
      navigateTab('items', 'subscriptions');
    } else {
      navigateTab('items', 'other');
    }
  };

  // CRUD Upsert / Delete Handlers
  const saveAccount = (account: GoogleAccount) => {
    commitVault((prev) => {
      const exists = prev.googleAccounts.some((a) => a.id === account.id);
      return {
        ...prev,
        googleAccounts: exists
          ? prev.googleAccounts.map((a) => (a.id === account.id ? account : a))
          : [account, ...prev.googleAccounts],
      };
    });
    showToast(`Akun ${account.email} disimpan.`);
  };

  const deleteAccount = (account: GoogleAccount) => {
    const ok = window.confirm(
      `Hapus akun ${account.email} beserta seluruh cloud project, website, subscription, dan aset di dalamnya?`
    );
    if (!ok) return;
    commitVault((prev) => ({
      ...prev,
      googleAccounts: prev.googleAccounts
        .filter((a) => a.id !== account.id)
        .map((a) =>
          a.recoveryAccountId === account.id ? { ...a, recoveryAccountId: '' } : a
        ),
      cloudProjects: prev.cloudProjects.filter((c) => c.accountId !== account.id),
      connectedWebsites: prev.connectedWebsites.filter((w) => w.accountId !== account.id),
      subscriptions: prev.subscriptions.filter((s) => s.accountId !== account.id),
      otherAssets: prev.otherAssets.filter((o) => o.accountId !== account.id),
    }));
    setSelectedAccountId(null);
    showToast(`Akun ${account.email} dihapus.`);
  };

  const savePhone = (phone: PhoneNumber) => {
    commitVault((prev) => {
      const exists = prev.phoneNumbers.some((p) => p.id === phone.id);
      return {
        ...prev,
        phoneNumbers: exists
          ? prev.phoneNumbers.map((p) => (p.id === phone.id ? phone : p))
          : [phone, ...prev.phoneNumbers],
      };
    });
    showToast(`Kartu SIM ${phone.provider} (${phone.phoneNumber}) disimpan.`);
  };

  const deletePhone = (phone: PhoneNumber) => {
    const ok = window.confirm(`Hapus catatan kartu SIM ${phone.phoneNumber} (${phone.provider})?`);
    if (!ok) return;
    commitVault((prev) => ({
      ...prev,
      phoneNumbers: prev.phoneNumbers.filter((p) => p.id !== phone.id),
      googleAccounts: prev.googleAccounts.map((a) =>
        a.linkedPhoneId === phone.id ? { ...a, linkedPhoneId: '' } : a
      ),
    }));
    showToast(`Kartu SIM ${phone.phoneNumber} dihapus.`);
  };

  const confirmExtendSim = (
    phone: PhoneNumber,
    nextActiveUntil: string,
    nextGraceUntil: string
  ) => {
    commitVault((prev) => ({
      ...prev,
      phoneNumbers: prev.phoneNumbers.map((p) =>
        p.id === phone.id
          ? {
              ...p,
              activeUntil: nextActiveUntil,
              graceUntil: nextGraceUntil,
              manualStatus: 'Active',
              updatedAt: new Date().toISOString(),
            }
          : p
      ),
    }));
    showToast(`Masa aktif ${phone.provider} diperpanjang hingga ${nextActiveUntil}!`);
  };

  const downloadSimIcs = (phone: PhoneNumber) => {
    const linked = vault.googleAccounts.filter((a) => a.linkedPhoneId === phone.id);
    const ics = generateSimReminderIcs(phone, linked);
    const safeNum = phone.phoneNumber.replace(/[^0-9]/g, '').slice(-4) || 'sim';
    downloadTextFile(
      `reminder-sim-${phone.provider.toLowerCase().replace(/\W+/g, '-')}-${safeNum}.ics`,
      ics,
      'text/calendar;charset=utf-8'
    );
    showToast('File kalender (.ics) diunduh — buka file untuk pasang alarm di HP!');
  };

  const downloadSubIcs = (sub: Subscription) => {
    const owner = vault.googleAccounts.find((a) => a.id === sub.accountId);
    const ics = generateSubscriptionReminderIcs(sub, owner);
    downloadTextFile(
      `reminder-sub-${sub.serviceName.toLowerCase().replace(/\W+/g, '-')}.ics`,
      ics,
      'text/calendar;charset=utf-8'
    );
    showToast('Pengingat kalender (.ics) subscription diunduh!');
  };

  const saveCloud = (item: CloudProject) => {
    commitVault((prev) => {
      const exists = prev.cloudProjects.some((c) => c.id === item.id);
      return {
        ...prev,
        cloudProjects: exists
          ? prev.cloudProjects.map((c) => (c.id === item.id ? item : c))
          : [item, ...prev.cloudProjects],
      };
    });
    showToast(`Cloud project ${item.projectName} disimpan.`);
  };

  const saveWebsite = (item: ConnectedWebsite) => {
    commitVault((prev) => {
      const exists = prev.connectedWebsites.some((w) => w.id === item.id);
      return {
        ...prev,
        connectedWebsites: exists
          ? prev.connectedWebsites.map((w) => (w.id === item.id ? item : w))
          : [item, ...prev.connectedWebsites],
      };
    });
    showToast(`Website ${item.serviceName} disimpan.`);
  };

  const saveSubscription = (item: Subscription) => {
    commitVault((prev) => {
      const exists = prev.subscriptions.some((s) => s.id === item.id);
      return {
        ...prev,
        subscriptions: exists
          ? prev.subscriptions.map((s) => (s.id === item.id ? item : s))
          : [item, ...prev.subscriptions],
      };
    });
    showToast(`Subscription ${item.serviceName} disimpan.`);
  };

  const saveOther = (item: OtherAsset) => {
    commitVault((prev) => {
      const exists = prev.otherAssets.some((o) => o.id === item.id);
      return {
        ...prev,
        otherAssets: exists
          ? prev.otherAssets.map((o) => (o.id === item.id ? item : o))
          : [item, ...prev.otherAssets],
      };
    });
    showToast(`Aset ${item.title} disimpan.`);
  };

  const saveProject = (project: ProjectItem) => {
    commitVault((prev) => {
      const list = prev.projects ?? [];
      const exists = list.some((p) => p.id === project.id);
      return {
        ...prev,
        projects: exists
          ? list.map((p) => (p.id === project.id ? project : p))
          : [...list, project],
      };
    });
    showToast(`Project "${project.name}" disimpan.`);
  };

  const deleteProject = (id: string) => {
    commitVault((prev) => ({
      ...prev,
      projects: (prev.projects ?? []).filter((p) => p.id !== id),
    }));
    showToast('Project dihapus.');
  };

  const syncModeLabel =
    settings.mode === 'gsheets'
      ? settings.gsheets.scriptUrl
        ? 'Sync: Google Sheets'
        : 'Sheets (Belum diatur)'
      : settings.mode === 'github'
        ? 'Sync: GitHub Private'
        : settings.mode === 'supabase'
          ? activeSupabaseUser
            ? 'Sync: Supabase Aktif'
            : 'Supabase (Belum Login)'
          : 'Mode Lokal';

  return (
    <div className="app-shell">
      {/* Desktop Sidebar */}
      <aside className="sidebar" aria-label="Navigasi utama">
        <div className="brand-lockup">
          <div className="brand-mark" aria-hidden="true">
            <Shield size={18} />
          </div>
          <div>
            <div className="brand-title">AccVault</div>
            <div className="brand-subtitle">Peta Google &amp; Kartu SIM</div>
          </div>
        </div>

        <nav className="nav-list">
          <button
            id="nav-dashboard"
            type="button"
            className={`nav-item${activeTab === 'dashboard' ? ' active' : ''}`}
            onClick={() => navigateTab('dashboard')}
          >
            <LayoutDashboard size={17} />
            <span>Beranda</span>
            {totalAlerts > 0 && <span className="nav-badge danger">{totalAlerts}</span>}
          </button>

          <button
            id="nav-accounts"
            type="button"
            className={`nav-item${activeTab === 'accounts' ? ' active' : ''}`}
            onClick={() => navigateTab('accounts')}
          >
            <Mail size={17} />
            <span>Akun Google</span>
            <span className="nav-badge">{vault.googleAccounts.length}</span>
          </button>

          <button
            id="nav-projects"
            type="button"
            className={`nav-item${activeTab === 'projects' ? ' active' : ''}`}
            onClick={() => navigateTab('projects')}
          >
            <FolderKanban size={17} />
            <span>Project</span>
            <span className="nav-badge">{(vault.projects ?? []).length}</span>
          </button>

          <button
            id="nav-phones"
            type="button"
            className={`nav-item${activeTab === 'phones' ? ' active' : ''}`}
            onClick={() => navigateTab('phones')}
          >
            <Smartphone size={17} />
            <span>Kartu SIM</span>
            {urgentSimCount > 0 ? (
              <span className="nav-badge danger">{urgentSimCount}</span>
            ) : (
              <span className="nav-badge">{vault.phoneNumbers.length}</span>
            )}
          </button>

          <button
            id="nav-items"
            type="button"
            className={`nav-item${activeTab === 'items' ? ' active' : ''}`}
            onClick={() => navigateTab('items')}
          >
            <Layers size={17} />
            <span>Aset &amp; Tagihan</span>
            <span className="nav-badge">
              {vault.cloudProjects.length +
                vault.connectedWebsites.length +
                vault.subscriptions.length +
                vault.otherAssets.length}
            </span>
          </button>

          <button
            id="nav-settings"
            type="button"
            className={`nav-item${activeTab === 'settings' ? ' active' : ''}`}
            onClick={() => navigateTab('settings')}
          >
            <Settings size={17} />
            <span>Sync &amp; Setelan</span>
          </button>
        </nav>

        <div className="sidebar-footer">
          <button
            type="button"
            className="sync-pill"
            onClick={() => navigateTab('settings')}
            title="Atur sinkronisasi cloud"
          >
            <span
              className={`sync-dot${
                syncState === 'synced'
                  ? ' synced'
                  : syncState === 'syncing'
                    ? ' syncing'
                    : syncState === 'error'
                      ? ' error'
                      : ''
              }`}
            />
            <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {syncState === 'syncing' ? 'Menyinkronkan...' : syncModeLabel}
            </span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="app-main">
        <header className="topbar">
          <button
            id="open-global-search"
            type="button"
            className="search-trigger"
            onClick={() => setSearchOpen(true)}
          >
            <Search size={16} />
            <span className="search-trigger-text">
              Cari project, email, nomor HP, website, atau catatan...
            </span>
            <span className="kbd-hint">Ctrl K</span>
          </button>

          <div className="topbar-actions">
            {settings.mode !== 'local' && (
              <button
                type="button"
                className="btn btn-icon"
                title="Tarik data terbaru dari cloud"
                disabled={syncState === 'syncing'}
                onClick={() => void pullFromActiveCloud(false)}
              >
                <RefreshCw size={16} />
              </button>
            )}

            <button
              id="toggle-privacy-mask"
              type="button"
              className="btn btn-icon"
              title={privacyMask ? 'Tampilkan nomor HP penuh' : 'Sensor nomor HP (Mode Privasi)'}
              onClick={() => setPrivacyMask((p) => !p)}
            >
              {privacyMask ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>

            <button
              id="toggle-theme"
              type="button"
              className="btn btn-icon"
              title={theme === 'dark' ? 'Beralih ke Mode Terang' : 'Beralih ke Mode Gelap'}
              onClick={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
            >
              {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
            </button>

            <button
              id="topbar-quick-add"
              type="button"
              className="btn btn-primary"
              onClick={() =>
                handleQuickAdd(activeTab === 'phones' ? 'phone' : 'account')
              }
            >
              <Plus size={15} />
              <span className="hide-mobile">
                {activeTab === 'phones' ? 'Kartu SIM' : 'Tambah'}
              </span>
            </button>
          </div>
        </header>

        <main className="page-container">
          {activeTab === 'dashboard' && (
            <DashboardView
              vault={vault}
              privacyMask={privacyMask}
              onNavigateTab={navigateTab}
              onOpenAccount={openAccountDetail}
              onOpenSearch={() => setSearchOpen(true)}
              onOpenImport={() => setImportOpen(true)}
              onQuickAdd={(kind) => handleQuickAdd(kind)}
              onQuickExtendPhone={(phone) => setExtendingPhone(phone)}
              onDownloadSimIcs={downloadSimIcs}
              onMarkAccountCancelled={toggleNeedsCancel}
              onCopy={handleCopy}
            />
          )}

          {activeTab === 'accounts' &&
            (selectedAccount ? (
              <AccountDetailView
                key={selectedAccount.id}
                account={selectedAccount}
                vault={vault}
                privacyMask={privacyMask}
                onBack={() => setSelectedAccountId(null)}
                onOpenAccount={openAccountDetail}
                onNavigatePhones={() => navigateTab('phones')}
                onEditAccount={(acc) => setAccountModal({ open: true, editing: acc })}
                onSaveAccountNotes={(acc, nextNotes) => {
                  commitVault((prev) => ({
                    ...prev,
                    googleAccounts: prev.googleAccounts.map((a) =>
                      a.id === acc.id
                        ? { ...a, notes: nextNotes, updatedAt: new Date().toISOString() }
                        : a
                    ),
                  }));
                  showToast('Catatan akun disimpan.');
                }}
                onSaveProject={saveProject}
                onDeleteProject={deleteProject}
                onDeleteAccount={deleteAccount}
                onCopy={handleCopy}
                onAddItem={(kind, accountId) => handleQuickAdd(kind, accountId)}
                onEditCloud={(item) => setCloudModal({ open: true, editing: item })}
                onDeleteCloud={(id) =>
                  commitVault((p) => ({
                    ...p,
                    cloudProjects: p.cloudProjects.filter((c) => c.id !== id),
                  }))
                }
                onEditWebsite={(item) => setWebsiteModal({ open: true, editing: item })}
                onDeleteWebsite={(id) =>
                  commitVault((p) => ({
                    ...p,
                    connectedWebsites: p.connectedWebsites.filter((w) => w.id !== id),
                  }))
                }
                onEditSubscription={(item) => setSubModal({ open: true, editing: item })}
                onDeleteSubscription={(id) =>
                  commitVault((p) => ({
                    ...p,
                    subscriptions: p.subscriptions.filter((s) => s.id !== id),
                  }))
                }
                onEditOther={(item) => setOtherModal({ open: true, editing: item })}
                onDeleteOther={(id) =>
                  commitVault((p) => ({
                    ...p,
                    otherAssets: p.otherAssets.filter((o) => o.id !== id),
                  }))
                }
              />
            ) : (
              <AccountsView
                vault={vault}
                privacyMask={privacyMask}
                onOpenAccount={openAccountDetail}
                onOpenProjects={() => navigateTab('projects')}
                onAddAccount={() => setAccountModal({ open: true, editing: null })}
                onEditAccount={(acc) => setAccountModal({ open: true, editing: acc })}
                onSaveAccountNotes={(acc, nextNotes) => {
                  commitVault((prev) => ({
                    ...prev,
                    googleAccounts: prev.googleAccounts.map((a) =>
                      a.id === acc.id
                        ? { ...a, notes: nextNotes, updatedAt: new Date().toISOString() }
                        : a
                    ),
                  }));
                  showToast('Catatan akun disimpan.');
                }}
                onToggleNeedsCancel={toggleNeedsCancel}
                onOpenImport={() => setImportOpen(true)}
                onCopy={handleCopy}
              />
            ))}

          {activeTab === 'projects' && (
            <ProjectsView
              vault={vault}
              onSaveProject={saveProject}
              onDeleteProject={deleteProject}
              onOpenAccount={openAccountDetail}
              onCopy={handleCopy}
            />
          )}

          {activeTab === 'phones' && (
            <PhonesView
              vault={vault}
              privacyMask={privacyMask}
              onAddPhone={() => setPhoneModal({ open: true, editing: null })}
              onEditPhone={(p) => setPhoneModal({ open: true, editing: p })}
              onDeletePhone={deletePhone}
              onExtendPhone={(p) => setExtendingPhone(p)}
              onDownloadIcs={downloadSimIcs}
              onOpenAccount={openAccountDetail}
              onOpenImport={() => setImportOpen(true)}
              onCopy={handleCopy}
            />
          )}

          {activeTab === 'items' && (
            <ItemsHubView
              vault={vault}
              subTab={itemsSubTab}
              onChangeSubTab={setItemsSubTab}
              onOpenAccount={openAccountDetail}
              onCopy={handleCopy}
              onAddItem={(kind) => handleQuickAdd(kind)}
              onEditCloud={(item) => setCloudModal({ open: true, editing: item })}
              onDeleteCloud={(id) =>
                commitVault((p) => ({
                  ...p,
                  cloudProjects: p.cloudProjects.filter((c) => c.id !== id),
                }))
              }
              onEditWebsite={(item) => setWebsiteModal({ open: true, editing: item })}
              onDeleteWebsite={(id) =>
                commitVault((p) => ({
                  ...p,
                  connectedWebsites: p.connectedWebsites.filter((w) => w.id !== id),
                }))
              }
              onEditSubscription={(item) => setSubModal({ open: true, editing: item })}
              onDeleteSubscription={(id) =>
                commitVault((p) => ({
                  ...p,
                  subscriptions: p.subscriptions.filter((s) => s.id !== id),
                }))
              }
              onDownloadSubIcs={downloadSubIcs}
              onEditOther={(item) => setOtherModal({ open: true, editing: item })}
              onDeleteOther={(id) =>
                commitVault((p) => ({
                  ...p,
                  otherAssets: p.otherAssets.filter((o) => o.id !== id),
                }))
              }
            />
          )}

          {activeTab === 'settings' && (
            <SettingsView
              vault={vault}
              settings={settings}
              supabaseUser={activeSupabaseUser}
              syncBusy={syncState === 'syncing'}
              lastSyncText={lastSyncText}
              onUpdateSettings={handleUpdateSettings}
              onSupabaseUserChange={setSupabaseUser}
              onPullCloud={() => pullFromActiveCloud(false)}
              onPushCloud={() => pushToActiveCloud(vault, settings, false)}
              onImportVault={(imported) => commitVault(() => imported)}
              onOpenImport={() => setImportOpen(true)}
              onLoadSampleData={() => {
                if (
                  window.confirm(
                    'Muat ulang data contoh? Data yang ada di layar saat ini akan diganti.'
                  )
                ) {
                  commitVault(() => buildSampleVault());
                  showToast('Data contoh berhasil dimuat.');
                }
              }}
              onClearAllData={() => {
                if (
                  window.confirm(
                    'Kosongkan seluruh data lokal agar kamu bisa mulai mengisi dari nol?'
                  )
                ) {
                  commitVault(() => createEmptyVault());
                  setSelectedAccountId(null);
                  showToast('Semua data dikosongkan. Siap diisi data milikmu!');
                }
              }}
              onCopy={handleCopy}
              onToast={showToast}
            />
          )}
        </main>
      </div>

      {/* Mobile Bottom Navigation Bar */}
      <nav className="mobile-bottom-nav" aria-label="Navigasi mobile">
        <button
          type="button"
          className={`mobile-nav-btn${activeTab === 'dashboard' ? ' active' : ''}`}
          onClick={() => navigateTab('dashboard')}
        >
          <LayoutDashboard size={19} />
          <span>Beranda</span>
          {totalAlerts > 0 && <span className="mobile-nav-dot" />}
        </button>
        <button
          type="button"
          className={`mobile-nav-btn${activeTab === 'accounts' ? ' active' : ''}`}
          onClick={() => navigateTab('accounts')}
        >
          <Mail size={19} />
          <span>Akun</span>
        </button>
        <button
          type="button"
          className={`mobile-nav-btn${activeTab === 'projects' ? ' active' : ''}`}
          onClick={() => navigateTab('projects')}
        >
          <FolderKanban size={19} />
          <span>Project</span>
        </button>
        <button
          type="button"
          className={`mobile-nav-btn${activeTab === 'phones' ? ' active' : ''}`}
          onClick={() => navigateTab('phones')}
        >
          <Smartphone size={19} />
          <span>SIM</span>
          {urgentSimCount > 0 && <span className="mobile-nav-dot" />}
        </button>
        <button
          type="button"
          className={`mobile-nav-btn${activeTab === 'settings' ? ' active' : ''}`}
          onClick={() => navigateTab('settings')}
        >
          <Settings size={19} />
          <span>Setelan</span>
        </button>
      </nav>

      {/* Modals */}
      <GlobalSearchModal
        open={searchOpen}
        vault={vault}
        privacyMask={privacyMask}
        onClose={() => setSearchOpen(false)}
        onCopy={handleCopy}
        onSelectResult={handleSelectSearchResult}
      />

      {importOpen && (
        <ImportSpreadsheetModal
          open
          onClose={() => setImportOpen(false)}
          onConfirmImport={handleSpreadsheetImport}
        />
      )}

      {accountModal.open && (
        <AccountFormModal
          key={accountModal.editing?.id ?? 'new-account'}
          open
          initial={accountModal.editing}
          accounts={vault.googleAccounts}
          phones={vault.phoneNumbers}
          onClose={() => setAccountModal({ open: false, editing: null })}
          onSave={saveAccount}
        />
      )}

      {phoneModal.open && (
        <PhoneFormModal
          key={phoneModal.editing?.id ?? 'new-phone'}
          open
          initial={phoneModal.editing}
          onClose={() => setPhoneModal({ open: false, editing: null })}
          onSave={savePhone}
        />
      )}

      {extendingPhone && (
        <ExtendSimModal
          key={extendingPhone.id}
          phone={extendingPhone}
          onClose={() => setExtendingPhone(null)}
          onConfirm={confirmExtendSim}
        />
      )}

      {cloudModal.open && (
        <CloudFormModal
          key={cloudModal.editing?.id ?? `new-cloud-${cloudModal.accountId ?? ''}`}
          open
          initial={cloudModal.editing}
          defaultAccountId={cloudModal.accountId}
          accounts={vault.googleAccounts}
          onClose={() => setCloudModal({ open: false, editing: null })}
          onSave={saveCloud}
        />
      )}

      {websiteModal.open && (
        <WebsiteFormModal
          key={websiteModal.editing?.id ?? `new-web-${websiteModal.accountId ?? ''}`}
          open
          initial={websiteModal.editing}
          defaultAccountId={websiteModal.accountId}
          accounts={vault.googleAccounts}
          onClose={() => setWebsiteModal({ open: false, editing: null })}
          onSave={saveWebsite}
        />
      )}

      {subModal.open && (
        <SubscriptionFormModal
          key={subModal.editing?.id ?? `new-sub-${subModal.accountId ?? ''}`}
          open
          initial={subModal.editing}
          defaultAccountId={subModal.accountId}
          accounts={vault.googleAccounts}
          onClose={() => setSubModal({ open: false, editing: null })}
          onSave={saveSubscription}
        />
      )}

      {otherModal.open && (
        <OtherFormModal
          key={otherModal.editing?.id ?? `new-other-${otherModal.accountId ?? ''}`}
          open
          initial={otherModal.editing}
          defaultAccountId={otherModal.accountId}
          accounts={vault.googleAccounts}
          onClose={() => setOtherModal({ open: false, editing: null })}
          onSave={saveOther}
        />
      )}

      <Toast toast={toast} />
    </div>
  );
}

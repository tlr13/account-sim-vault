import {
  AlertTriangle,
  CalendarPlus,
  CheckCircle2,
  Cloud,
  Copy,
  CreditCard,
  FolderKanban,
  Globe,
  Mail,
  Plus,
  RefreshCw,
  Search,
  Smartphone,
  Upload,
} from 'lucide-react';
import { useMemo } from 'react';
import {
  ACCOUNT_STATUS_META,
  type ActiveTab,
  type GoogleAccount,
  type ItemsSubTab,
  type PhoneNumber,
  type VaultData,
} from '../../types/models';
import {
  formatCurrency,
  formatDateID,
  getProviderAccent,
  getSimHealth,
  getSubscriptionHealth,
  maskPhoneNumber,
  summarizeSubscriptionCosts,
} from '../../utils/simStatus';

interface DashboardViewProps {
  vault: VaultData;
  privacyMask: boolean;
  onNavigateTab: (tab: ActiveTab, itemsSub?: ItemsSubTab) => void;
  onOpenAccount: (accountId: string) => void;
  onOpenSearch: () => void;
  onOpenImport: () => void;
  onQuickAdd: (
    kind: 'account' | 'phone' | 'cloud' | 'website' | 'subscription' | 'other'
  ) => void;
  onQuickExtendPhone: (phone: PhoneNumber) => void;
  onDownloadSimIcs: (phone: PhoneNumber) => void;
  onMarkAccountCancelled: (account: GoogleAccount) => void;
  onCopy: (text: string, label: string) => void;
}

export function DashboardView({
  vault,
  privacyMask,
  onNavigateTab,
  onOpenAccount,
  onOpenSearch,
  onOpenImport,
  onQuickAdd,
  onQuickExtendPhone,
  onDownloadSimIcs,
  onMarkAccountCancelled,
  onCopy,
}: DashboardViewProps) {
  const accountById = useMemo(
    () => new Map<string, GoogleAccount>(vault.googleAccounts.map((a) => [a.id, a])),
    [vault.googleAccounts]
  );

  const urgentPhones = useMemo(() => {
    return vault.phoneNumbers
      .map((phone) => ({
        phone,
        health: getSimHealth(phone),
        linkedAccounts: vault.googleAccounts.filter((a) => a.linkedPhoneId === phone.id),
      }))
      .filter((item) => item.health.needsAttention)
      .sort((a, b) => a.health.urgencyRank - b.health.urgencyRank);
  }, [vault.phoneNumbers, vault.googleAccounts]);

  const accountsNeedingCancel = useMemo(
    () => vault.googleAccounts.filter((a) => a.quickSubNeedsCancel),
    [vault.googleAccounts]
  );

  const upcomingSubs = useMemo(() => {
    return vault.subscriptions
      .map((sub) => ({
        sub,
        health: getSubscriptionHealth(sub),
        owner: accountById.get(sub.accountId),
      }))
      .filter((item) => item.health.isUpcoming || item.health.isOverdue)
      .sort(
        (a, b) =>
          (a.health.daysUntilRenewal ?? 999) - (b.health.daysUntilRenewal ?? 999)
      );
  }, [vault.subscriptions, accountById]);

  const costSummary = useMemo(
    () => summarizeSubscriptionCosts(vault.subscriptions),
    [vault.subscriptions]
  );

  const hasCriticalAlert = urgentPhones.some(
    (p) => p.health.state === 'grace_period' || p.health.state === 'expired'
  );
  const totalAlerts =
    urgentPhones.length + accountsNeedingCancel.length + upcomingSubs.length;

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Ringkasan Identitas &amp; Aset</h1>
          <p className="page-subtitle">
            Cari cepat akun Google, pantau status Belum Cancel, dan jaga masa aktif kartu SIM.
          </p>
        </div>
        <div className="filter-bar">
          <button type="button" className="btn" onClick={onOpenImport}>
            <Upload size={15} /> Import Excel
          </button>
          <button type="button" className="btn" onClick={onOpenSearch}>
            <Search size={15} /> Cari Cepat
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => onQuickAdd('account')}
          >
            <Plus size={15} /> Tambah Akun
          </button>
        </div>
      </div>

      {/* KPI Summary Strip */}
      <section className="kpi-strip" aria-label="Statistik utama">
        <button
          type="button"
          className="kpi-tile"
          onClick={() => onNavigateTab('accounts')}
        >
          <span className="kpi-label">Akun Email</span>
          <span className="kpi-value">{vault.googleAccounts.length}</span>
          <span className="kpi-meta">
            {accountsNeedingCancel.length > 0
              ? `${accountsNeedingCancel.length} belum cancel · ${vault.googleAccounts.filter((a) => a.status === 'Spare').length} cadangan`
              : `${vault.googleAccounts.filter((a) => a.status === 'Active').length} aktif pribadi`}
          </span>
        </button>

        <button
          type="button"
          className="kpi-tile"
          onClick={() => onNavigateTab('phones')}
        >
          <span className="kpi-label">Kartu SIM / eSIM</span>
          <span className="kpi-value">{vault.phoneNumbers.length}</span>
          <span
            className="kpi-meta"
            style={{
              color: urgentPhones.length > 0 ? 'var(--danger)' : undefined,
              fontWeight: urgentPhones.length > 0 ? 600 : undefined,
            }}
          >
            {urgentPhones.length > 0
              ? `${urgentPhones.length} perlu perpanjangan`
              : 'Semua masa aktif aman'}
          </span>
        </button>

        <button
          type="button"
          className="kpi-tile"
          onClick={() => onNavigateTab('items', 'cloud')}
        >
          <span className="kpi-label">Cloud &amp; Website</span>
          <span className="kpi-value">
            {vault.cloudProjects.length + vault.connectedWebsites.length}
          </span>
          <span className="kpi-meta">
            {vault.cloudProjects.length} cloud · {vault.connectedWebsites.length} web
          </span>
        </button>

        <button
          type="button"
          className="kpi-tile"
          onClick={() => onNavigateTab('items', 'subscriptions')}
        >
          <span className="kpi-label">Estimasi Langganan / Bln</span>
          <span className="kpi-value" style={{ fontSize: 19 }}>
            {costSummary.length > 0
              ? formatCurrency(costSummary[0].monthlyTotal, costSummary[0].currency)
              : 'Rp 0'}
          </span>
          <span className="kpi-meta">
            {costSummary.length > 1
              ? `+ ${formatCurrency(costSummary[1].monthlyTotal, costSummary[1].currency)}/bln`
              : `${vault.subscriptions.filter((s) => s.status === 'Active' || s.status === 'Trial').length} tagihan tercatat`}
          </span>
        </button>
      </section>

      {/* Urgent Alerts Panel */}
      {totalAlerts > 0 && (
        <section
          className={`alerts-panel${hasCriticalAlert ? ' critical' : ''}`}
          aria-label="Perlu perhatian segera"
        >
          <div className="alerts-panel-head">
            <div style={{ display: 'flex', alignItems: 'center', gap: 9, fontWeight: 700 }}>
              <AlertTriangle
                size={17}
                color={hasCriticalAlert ? 'var(--danger)' : 'var(--warning)'}
              />
              <span>Perlu Perhatian Segera ({totalAlerts})</span>
            </div>
            <span style={{ fontSize: 12, color: 'var(--ink-secondary)' }}>
              Kartu SIM tenggang/hampir habis, akun Belum Cancel, &amp; tagihan
            </span>
          </div>

          <div className="alert-list">
            {urgentPhones.map(({ phone, health, linkedAccounts }) => {
              const displayPhone = privacyMask
                ? maskPhoneNumber(phone.phoneNumber)
                : phone.phoneNumber;
              const isDanger =
                health.state === 'grace_period' || health.state === 'expired';

              return (
                <div key={phone.id} className="alert-row">
                  <div className="alert-info">
                    <div
                      style={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        alignItems: 'center',
                        gap: 8,
                      }}
                    >
                      <span className={`badge badge-${isDanger ? 'danger' : 'warning'}`}>
                        {health.label}
                      </span>
                      <strong className="mono">{displayPhone}</strong>
                      <span className="badge badge-neutral">{phone.provider}</span>
                      {phone.deviceSlot && (
                        <span style={{ fontSize: 12, color: 'var(--ink-muted)' }}>
                          {phone.deviceSlot}
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: 12.5, color: 'var(--ink-secondary)' }}>
                      {linkedAccounts.length > 0 ? (
                        <>
                          Tertaut ke{' '}
                          <strong>{linkedAccounts.length} Akun Email</strong>:{' '}
                          <span className="mono">
                            {linkedAccounts.map((a) => a.email).join(', ')}
                          </span>
                        </>
                      ) : (
                        phone.label || phone.usagePurpose || 'Kartu SIM tanpa tautan akun email'
                      )}
                    </div>
                  </div>

                  <div className="alert-actions">
                    <button
                      type="button"
                      className="btn btn-sm btn-primary"
                      onClick={() => onQuickExtendPhone(phone)}
                    >
                      <RefreshCw size={13} /> Perpanjang
                    </button>
                    <button
                      type="button"
                      className="btn btn-sm"
                      onClick={() => onDownloadSimIcs(phone)}
                      title="Unduh pengingat kalender (.ics)"
                    >
                      <CalendarPlus size={13} /> Kalender
                    </button>
                  </div>
                </div>
              );
            })}

            {accountsNeedingCancel.map((acc) => (
              <div key={`cancel-${acc.id}`} className="alert-row">
                <div className="alert-info">
                  <div
                    style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      alignItems: 'center',
                      gap: 8,
                    }}
                  >
                    <span className="badge badge-warning">Belum Cancel</span>
                    <strong>{acc.quickSubName || 'Subscription Aktif'}</strong>
                    {acc.quickSubPeriod && (
                      <span className="mono" style={{ fontSize: 12, color: 'var(--ink-muted)' }}>
                        ({acc.quickSubPeriod})
                      </span>
                    )}
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      alignItems: 'center',
                      gap: 8,
                      fontSize: 12.5,
                      color: 'var(--ink-secondary)',
                    }}
                  >
                    <button
                      type="button"
                      className="account-pill"
                      onClick={() => onOpenAccount(acc.id)}
                    >
                      <span className="color-dot" style={{ background: acc.colorBadge }} />
                      <span className="mono">{acc.email}</span>
                    </button>
                    {acc.holderName && <span>· Pemakai: {acc.holderName}</span>}
                  </div>
                </div>

                <div className="alert-actions">
                  <button
                    type="button"
                    className="btn btn-sm"
                    onClick={() => onMarkAccountCancelled(acc)}
                  >
                    <CheckCircle2 size={13} /> Tandai Sudah Cancel
                  </button>
                </div>
              </div>
            ))}

            {upcomingSubs.map(({ sub, health, owner }) => (
              <div key={sub.id} className="alert-row">
                <div className="alert-info">
                  <div
                    style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      alignItems: 'center',
                      gap: 8,
                    }}
                  >
                    <span
                      className={`badge badge-${health.isOverdue ? 'danger' : 'warning'}`}
                    >
                      {health.label}
                    </span>
                    <strong>{sub.serviceName}</strong>
                    <span className="mono" style={{ fontWeight: 600 }}>
                      {formatCurrency(sub.costAmount, sub.currency)}
                    </span>
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      alignItems: 'center',
                      gap: 8,
                      fontSize: 12.5,
                      color: 'var(--ink-secondary)',
                    }}
                  >
                    {owner && (
                      <button
                        type="button"
                        className="account-pill"
                        onClick={() => onOpenAccount(owner.id)}
                      >
                        <span
                          className="color-dot"
                          style={{ background: owner.colorBadge }}
                        />
                        <span className="mono">{owner.email}</span>
                      </button>
                    )}
                    <span>Jatuh tempo: {formatDateID(sub.nextRenewalDate)}</span>
                  </div>
                </div>
                <div className="alert-actions">
                  <button
                    type="button"
                    className="btn btn-sm"
                    onClick={() => onNavigateTab('items', 'subscriptions')}
                  >
                    Lihat Tagihan
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Quick Add Strip */}
      <section className="surface-card" aria-label="Tambah data cepat">
        <div className="section-header" style={{ marginBottom: 12 }}>
          <h2 className="section-title">Tambah Catatan Cepat</h2>
          <span style={{ fontSize: 12, color: 'var(--ink-muted)' }}>
            1 klik untuk mencatat item baru
          </span>
        </div>
        <div className="filter-bar">
          <button type="button" className="btn btn-sm" onClick={() => onQuickAdd('account')}>
            <Mail size={14} /> + Akun Email
          </button>
          <button type="button" className="btn btn-sm" onClick={() => onQuickAdd('phone')}>
            <Smartphone size={14} /> + Nomor HP / SIM
          </button>
          <button type="button" className="btn btn-sm" onClick={() => onQuickAdd('cloud')}>
            <Cloud size={14} /> + Cloud Project
          </button>
          <button type="button" className="btn btn-sm" onClick={() => onQuickAdd('website')}>
            <Globe size={14} /> + Website Terhubung
          </button>
          <button
            type="button"
            className="btn btn-sm"
            onClick={() => onQuickAdd('subscription')}
          >
            <CreditCard size={14} /> + Subscription
          </button>
          <button type="button" className="btn btn-sm" onClick={() => onQuickAdd('other')}>
            <FolderKanban size={14} /> + Aset Lainnya
          </button>
        </div>
      </section>

      {/* Two-Column Overview */}
      <div className="card-grid-2">
        <section className="surface-card">
          <div className="section-header">
            <h2 className="section-title">
              <Mail size={16} /> Akun Email ({vault.googleAccounts.length})
            </h2>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => onNavigateTab('accounts')}
            >
              Lihat Tabel
            </button>
          </div>
          {vault.googleAccounts.length === 0 ? (
            <div className="empty-state" style={{ padding: 24 }}>
              <div>Belum ada akun email dicatat.</div>
              <button
                type="button"
                className="btn btn-sm btn-primary"
                onClick={() => onQuickAdd('account')}
              >
                + Tambah Akun Pertama
              </button>
            </div>
          ) : (
            <div className="item-list">
              {vault.googleAccounts.slice(0, 5).map((acc) => {
                const statusMeta = ACCOUNT_STATUS_META[acc.status] ?? ACCOUNT_STATUS_META.Active;
                return (
                  <div
                    key={acc.id}
                    className="item-row"
                    style={{ cursor: 'pointer', padding: '11px 13px' }}
                    onClick={() => onOpenAccount(acc.id)}
                  >
                    <div className="item-main">
                      <div className="item-title-line">
                        <span
                          className="color-dot"
                          style={{ background: acc.colorBadge }}
                        />
                        <span className="item-title mono" style={{ fontSize: 13 }}>
                          {acc.email}
                        </span>
                        <span className={`badge badge-${statusMeta.tone}`}>
                          {statusMeta.shortLabel}
                        </span>
                        {acc.quickSubNeedsCancel && (
                          <span className="badge badge-warning">Belum Cancel</span>
                        )}
                      </div>
                      <div className="item-meta-line">
                        {acc.quickSubName && <span>{acc.quickSubName}</span>}
                        {acc.holderName && <span>· {acc.holderName}</span>}
                        {acc.passwordHint && (
                          <span className="mono">· Pass: {acc.passwordHint}</span>
                        )}
                      </div>
                    </div>
                    <button
                      type="button"
                      className="btn btn-ghost btn-icon-sm"
                      title="Salin email"
                      onClick={(e) => {
                        e.stopPropagation();
                        onCopy(acc.email, 'Email disalin');
                      }}
                    >
                      <Copy size={14} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section className="surface-card">
          <div className="section-header">
            <h2 className="section-title">
              <Smartphone size={16} /> Status Kartu SIM ({vault.phoneNumbers.length})
            </h2>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => onNavigateTab('phones')}
            >
              Lihat Tabel
            </button>
          </div>
          {vault.phoneNumbers.length === 0 ? (
            <div className="empty-state" style={{ padding: 24 }}>
              <div>Belum ada nomor HP dicatat.</div>
              <button
                type="button"
                className="btn btn-sm btn-primary"
                onClick={() => onQuickAdd('phone')}
              >
                + Tambah Nomor HP
              </button>
            </div>
          ) : (
            <div className="item-list">
              {vault.phoneNumbers.slice(0, 5).map((phone) => {
                const health = getSimHealth(phone);
                const displayNum = privacyMask
                  ? maskPhoneNumber(phone.phoneNumber)
                  : phone.phoneNumber;
                const tone =
                  health.state === 'grace_period' || health.state === 'expired'
                    ? 'danger'
                    : health.state === 'expiring_soon'
                      ? 'warning'
                      : health.state === 'active' || health.state === 'no_expiry'
                        ? 'success'
                        : 'neutral';

                return (
                  <div
                    key={phone.id}
                    className="item-row"
                    style={{ cursor: 'pointer', padding: '11px 13px' }}
                    onClick={() => onNavigateTab('phones')}
                  >
                    <div className="item-main">
                      <div className="item-title-line">
                        <span
                          className="color-dot"
                          style={{ background: getProviderAccent(phone.provider) }}
                        />
                        <span className="item-title mono">{displayNum}</span>
                        <span className="badge badge-neutral">{phone.provider}</span>
                      </div>
                      <div className="item-meta-line">
                        {phone.noExpiry ? (
                          <span>Pascabayar / Tanpa masa tenggang</span>
                        ) : (
                          <>
                            <span>Tenggang: {formatDateID(phone.activeUntil)}</span>
                            {phone.graceUntil && (
                              <span>· Mati: {formatDateID(phone.graceUntil)}</span>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                    <span className={`badge badge-${tone}`}>{health.shortLabel}</span>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </>
  );
}

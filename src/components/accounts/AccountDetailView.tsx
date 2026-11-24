import {
  ArrowLeft,
  Check,
  Cloud,
  Copy,
  CreditCard,
  Edit3,
  ExternalLink,
  FileText,
  FolderKanban,
  Globe,
  Plus,
  ShieldCheck,
  Smartphone,
  Trash2,
} from 'lucide-react';
import { useState } from 'react';
import type {
  CloudProject,
  ConnectedWebsite,
  GoogleAccount,
  OtherAsset,
  Subscription,
  VaultData,
} from '../../types/models';
import {
  formatCurrency,
  formatDateID,
  getSimHealth,
  getSubscriptionHealth,
  maskPhoneNumber,
} from '../../utils/simStatus';

interface AccountDetailViewProps {
  account: GoogleAccount;
  vault: VaultData;
  privacyMask: boolean;
  onBack: () => void;
  onOpenAccount: (accountId: string) => void;
  onNavigatePhones: () => void;
  onEditAccount: (account: GoogleAccount) => void;
  onSaveAccountNotes: (account: GoogleAccount, notes: string) => void;
  onDeleteAccount: (account: GoogleAccount) => void;
  onCopy: (text: string, label: string) => void;
  onAddItem: (
    kind: 'cloud' | 'website' | 'subscription' | 'other',
    accountId: string
  ) => void;
  onEditCloud: (item: CloudProject) => void;
  onDeleteCloud: (id: string) => void;
  onEditWebsite: (item: ConnectedWebsite) => void;
  onDeleteWebsite: (id: string) => void;
  onEditSubscription: (item: Subscription) => void;
  onDeleteSubscription: (id: string) => void;
  onEditOther: (item: OtherAsset) => void;
  onDeleteOther: (id: string) => void;
}

type DetailTab = 'meta' | 'cloud' | 'websites' | 'subscriptions' | 'other';

export function AccountDetailView({
  account,
  vault,
  privacyMask,
  onBack,
  onOpenAccount,
  onNavigatePhones,
  onEditAccount,
  onSaveAccountNotes,
  onDeleteAccount,
  onCopy,
  onAddItem,
  onEditCloud,
  onDeleteCloud,
  onEditWebsite,
  onDeleteWebsite,
  onEditSubscription,
  onDeleteSubscription,
  onEditOther,
  onDeleteOther,
}: AccountDetailViewProps) {
  const [activeTab, setActiveTab] = useState<DetailTab>('meta');
  const [notesDraft, setNotesDraft] = useState(() => account.notes);

  const clouds = vault.cloudProjects.filter((c) => c.accountId === account.id);
  const websites = vault.connectedWebsites.filter((w) => w.accountId === account.id);
  const subs = vault.subscriptions.filter((s) => s.accountId === account.id);
  const others = vault.otherAssets.filter((o) => o.accountId === account.id);

  const recoveryAccount = vault.googleAccounts.find(
    (a) => a.id === account.recoveryAccountId
  );
  const accountsRecoveredByThis = vault.googleAccounts.filter(
    (a) => a.recoveryAccountId === account.id
  );
  const linkedPhone = vault.phoneNumbers.find((p) => p.id === account.linkedPhoneId);
  const linkedPhoneHealth = linkedPhone ? getSimHealth(linkedPhone) : null;

  return (
    <>
      <div>
        <button type="button" className="btn btn-ghost btn-sm" onClick={onBack}>
          <ArrowLeft size={15} /> Kembali ke Daftar Akun
        </button>
      </div>

      {/* Account Hero Card */}
      <section className="surface-card" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div className="entity-card-head">
          <div className="entity-identity">
            <div
              className="avatar-swatch"
              style={{ background: account.colorBadge, width: 48, height: 48, fontSize: 18 }}
            >
              {(account.aliasLabel || account.email).slice(0, 2).toUpperCase()}
            </div>
            <div>
              <h1 className="page-title" style={{ fontSize: 21 }}>
                {account.aliasLabel || account.email}
              </h1>
              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  alignItems: 'center',
                  gap: 8,
                  marginTop: 3,
                }}
              >
                <span className="mono" style={{ color: 'var(--ink-secondary)' }}>
                  {account.email}
                </span>
                <button
                  type="button"
                  className="btn btn-sm"
                  onClick={() => onCopy(account.email, 'Email disalin')}
                >
                  <Copy size={13} /> Salin Email
                </button>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" className="btn btn-sm" onClick={() => onEditAccount(account)}>
              <Edit3 size={14} /> Edit
            </button>
            <button
              type="button"
              className="btn btn-sm btn-danger"
              onClick={() => onDeleteAccount(account)}
            >
              <Trash2 size={14} /> Hapus
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          <span className="badge badge-info">{account.primaryPurpose}</span>
          <span
            className={`badge badge-${
              account.status === 'Active'
                ? 'success'
                : account.status === 'Issue' || account.status === 'Suspended'
                  ? 'danger'
                  : account.status === 'Shared'
                    ? 'warning'
                    : account.status === 'Spare'
                      ? 'info'
                      : 'neutral'
            }`}
          >
            {account.status === 'Spare'
              ? 'Cadangan'
              : account.status === 'Shared'
                ? 'Dipakai Orang'
                : account.status === 'Sold'
                  ? 'Sold / Terjual'
                  : account.status === 'Issue'
                    ? 'Bermasalah'
                    : account.status}
          </span>
          {account.passwordHint && (
            <span className="tag-chip">Hint Pass: {account.passwordHint}</span>
          )}
          {account.holderName && (
            <span className="badge badge-warning">
              {account.status === 'Sold' ? 'Pembeli' : 'Pemakai'}: {account.holderName}
              {account.holderUntil ? ` (s/d ${account.holderUntil})` : ''}
            </span>
          )}
          {account.quickSubName && (
            <span className="badge badge-info">
              {account.quickSubName}
              {account.quickSubPeriod ? ` · ${account.quickSubPeriod}` : ''}
            </span>
          )}
          {account.quickSubNeedsCancel && (
            <span className="badge badge-warning">Belum Cancel</span>
          )}
          {account.has2FA && (
            <span className="badge badge-success">
              <ShieldCheck size={12} /> 2FA Aktif
            </span>
          )}
          {account.chromeProfile && (
            <span className="badge badge-neutral">{account.chromeProfile}</span>
          )}
          {account.passwordManagerRef && (
            <span className="badge badge-neutral">
              Password di: {account.passwordManagerRef}
            </span>
          )}
        </div>

        {/* Linked SIM & Recovery Chain */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))',
            gap: 10,
          }}
        >
          <div
            style={{
              padding: '10px 12px',
              borderRadius: 10,
              background: 'var(--bg-subtle)',
              border: '1px solid var(--border-hairline)',
              display: 'flex',
              flexDirection: 'column',
              gap: 5,
            }}
          >
            <span className="sim-date-label">Kartu SIM / Nomor HP Tertaut</span>
            {linkedPhone ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="account-pill"
                  onClick={onNavigatePhones}
                >
                  <Smartphone size={13} />
                  <span className="mono">
                    {privacyMask
                      ? maskPhoneNumber(linkedPhone.phoneNumber)
                      : linkedPhone.phoneNumber}
                  </span>
                  <span>({linkedPhone.provider})</span>
                </button>
                {linkedPhoneHealth && (
                  <span
                    className={`badge badge-${
                      linkedPhoneHealth.state === 'grace_period' ||
                      linkedPhoneHealth.state === 'expired'
                        ? 'danger'
                        : linkedPhoneHealth.state === 'expiring_soon'
                          ? 'warning'
                          : 'success'
                    }`}
                  >
                    {linkedPhoneHealth.shortLabel}
                  </span>
                )}
              </div>
            ) : (
              <span style={{ fontSize: 12.5, color: 'var(--ink-muted)' }}>
                {account.recoveryPhoneHint
                  ? `Hint: ${account.recoveryPhoneHint}`
                  : 'Belum ditautkan ke kartu SIM'}
              </span>
            )}
          </div>

          <div
            style={{
              padding: '10px 12px',
              borderRadius: 10,
              background: 'var(--bg-subtle)',
              border: '1px solid var(--border-hairline)',
              display: 'flex',
              flexDirection: 'column',
              gap: 5,
            }}
          >
            <span className="sim-date-label">Rantai Pemulihan (Recovery)</span>
            {recoveryAccount ? (
              <button
                type="button"
                className="account-pill"
                style={{ width: 'fit-content' }}
                onClick={() => onOpenAccount(recoveryAccount.id)}
              >
                <span
                  className="color-dot"
                  style={{ background: recoveryAccount.colorBadge }}
                />
                <span className="mono">{recoveryAccount.email}</span>
              </button>
            ) : (
              <span style={{ fontSize: 12.5, color: 'var(--ink-muted)' }}>
                Tidak merujuk akun Google internal
              </span>
            )}
            {accountsRecoveredByThis.length > 0 && (
              <span style={{ fontSize: 11.5, color: 'var(--ink-muted)' }}>
                Menjadi recovery bagi {accountsRecoveredByThis.length} akun lain
              </span>
            )}
          </div>
        </div>
      </section>

      {/* Segmented Tabs */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
        }}
      >
        <div className="segmented-tabs" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'meta'}
            className={`segmented-tab${activeTab === 'meta' ? ' active' : ''}`}
            onClick={() => setActiveTab('meta')}
          >
            <FileText size={15} /> Catatan &amp; Project
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'cloud'}
            className={`segmented-tab${activeTab === 'cloud' ? ' active' : ''}`}
            onClick={() => setActiveTab('cloud')}
          >
            <Cloud size={15} /> Cloud ({clouds.length})
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'websites'}
            className={`segmented-tab${activeTab === 'websites' ? ' active' : ''}`}
            onClick={() => setActiveTab('websites')}
          >
            <Globe size={15} /> Website ({websites.length})
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'subscriptions'}
            className={`segmented-tab${activeTab === 'subscriptions' ? ' active' : ''}`}
            onClick={() => setActiveTab('subscriptions')}
          >
            <CreditCard size={15} /> Subscription ({subs.length})
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'other'}
            className={`segmented-tab${activeTab === 'other' ? ' active' : ''}`}
            onClick={() => setActiveTab('other')}
          >
            <FolderKanban size={15} /> Lainnya ({others.length})
          </button>
        </div>

        {activeTab !== 'meta' && (
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={() =>
              onAddItem(
                activeTab === 'websites'
                  ? 'website'
                  : activeTab === 'subscriptions'
                    ? 'subscription'
                    : activeTab,
                account.id
              )
            }
          >
            <Plus size={14} /> Tambah ke Akun Ini
          </button>
        )}
      </div>

      {/* Tab Content */}
      {activeTab === 'cloud' && (
        <div className="item-list">
          {clouds.length === 0 ? (
            <div className="empty-state">
              <div>Belum ada project cloud di akun ini.</div>
              <button
                type="button"
                className="btn btn-sm btn-primary"
                onClick={() => onAddItem('cloud', account.id)}
              >
                + Tambah Cloud Project
              </button>
            </div>
          ) : (
            clouds.map((c) => (
              <div key={c.id} className="item-row">
                <div className="item-main">
                  <div className="item-title-line">
                    <span className="item-title">{c.projectName}</span>
                    <span className="badge badge-info">{c.provider}</span>
                    <span className="badge badge-neutral">{c.environment}</span>
                    <span
                      className={`badge badge-${
                        c.status === 'Billing Issue'
                          ? 'danger'
                          : c.status === 'Active'
                            ? 'success'
                            : 'neutral'
                      }`}
                    >
                      {c.status}
                    </span>
                  </div>
                  <div className="item-meta-line">
                    {c.projectIdRef && <span className="mono">ID: {c.projectIdRef}</span>}
                    {c.billingTier && <span>· {c.billingTier}</span>}
                    {c.relatedDomains && <span className="mono">· {c.relatedDomains}</span>}
                  </div>
                  {c.notes && (
                    <div style={{ fontSize: 12.5, color: 'var(--ink-muted)' }}>{c.notes}</div>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  {c.consoleUrl && (
                    <a
                      href={c.consoleUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="btn btn-sm"
                    >
                      <ExternalLink size={13} /> Console
                    </a>
                  )}
                  <button
                    type="button"
                    className="btn btn-ghost btn-icon-sm"
                    onClick={() => onEditCloud(c)}
                    title="Edit"
                  >
                    <Edit3 size={14} />
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost btn-icon-sm"
                    onClick={() => onDeleteCloud(c.id)}
                    title="Hapus"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === 'websites' && (
        <div className="item-list">
          {websites.length === 0 ? (
            <div className="empty-state">
              <div>Belum ada website terhubung di akun ini.</div>
              <button
                type="button"
                className="btn btn-sm btn-primary"
                onClick={() => onAddItem('website', account.id)}
              >
                + Tambah Website Terhubung
              </button>
            </div>
          ) : (
            websites.map((w) => (
              <div key={w.id} className="item-row">
                <div className="item-main">
                  <div className="item-title-line">
                    <span className="item-title">{w.serviceName}</span>
                    <span className="badge badge-neutral">{w.category}</span>
                    <span className="badge badge-info">{w.loginMethod}</span>
                    {w.importance === 'Critical' && (
                      <span className="badge badge-warning">Penting</span>
                    )}
                  </div>
                  <div className="item-meta-line">
                    {w.usernameHandle && <span className="mono">{w.usernameHandle}</span>}
                    {w.url && (
                      <a href={w.url} target="_blank" rel="noreferrer" className="mono">
                        {w.url.replace(/^https?:\/\//, '')}
                      </a>
                    )}
                  </div>
                  {w.notes && (
                    <div style={{ fontSize: 12.5, color: 'var(--ink-muted)' }}>{w.notes}</div>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  {w.url && (
                    <a href={w.url} target="_blank" rel="noreferrer" className="btn btn-sm">
                      <ExternalLink size={13} /> Buka
                    </a>
                  )}
                  <button
                    type="button"
                    className="btn btn-ghost btn-icon-sm"
                    onClick={() => onEditWebsite(w)}
                    title="Edit"
                  >
                    <Edit3 size={14} />
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost btn-icon-sm"
                    onClick={() => onDeleteWebsite(w.id)}
                    title="Hapus"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === 'subscriptions' && (
        <div className="item-list">
          {subs.length === 0 ? (
            <div className="empty-state">
              <div>Belum ada subscription di akun ini.</div>
              <button
                type="button"
                className="btn btn-sm btn-primary"
                onClick={() => onAddItem('subscription', account.id)}
              >
                + Tambah Subscription
              </button>
            </div>
          ) : (
            subs.map((s) => {
              const health = getSubscriptionHealth(s);
              return (
                <div key={s.id} className="item-row">
                  <div className="item-main">
                    <div className="item-title-line">
                      <span className="item-title">{s.serviceName}</span>
                      {s.planName && <span className="badge badge-neutral">{s.planName}</span>}
                      <span
                        className={`badge badge-${
                          health.isOverdue
                            ? 'danger'
                            : health.isUpcoming
                              ? 'warning'
                              : s.status === 'Active'
                                ? 'success'
                                : 'neutral'
                        }`}
                      >
                        {health.label}
                      </span>
                    </div>
                    <div className="item-meta-line">
                      <strong className="mono">
                        {formatCurrency(s.costAmount, s.currency)} / {s.billingCycle}
                      </strong>
                      {s.nextRenewalDate && (
                        <span>· Tanggal: {formatDateID(s.nextRenewalDate)}</span>
                      )}
                      {s.paymentMethodHint && <span>· {s.paymentMethodHint}</span>}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {s.manageUrl && (
                      <a
                        href={s.manageUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="btn btn-sm"
                      >
                        <ExternalLink size={13} /> Kelola
                      </a>
                    )}
                    <button
                      type="button"
                      className="btn btn-ghost btn-icon-sm"
                      onClick={() => onEditSubscription(s)}
                      title="Edit"
                    >
                      <Edit3 size={14} />
                    </button>
                    <button
                      type="button"
                      className="btn btn-ghost btn-icon-sm"
                      onClick={() => onDeleteSubscription(s.id)}
                      title="Hapus"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {activeTab === 'other' && (
        <div className="item-list">
          {others.length === 0 ? (
            <div className="empty-state">
              <div>Belum ada aset lainnya di akun ini.</div>
              <button
                type="button"
                className="btn btn-sm btn-primary"
                onClick={() => onAddItem('other', account.id)}
              >
                + Tambah Aset Lainnya
              </button>
            </div>
          ) : (
            others.map((o) => (
              <div key={o.id} className="item-row">
                <div className="item-main">
                  <div className="item-title-line">
                    <span className="item-title">{o.title}</span>
                    <span className="badge badge-neutral">{o.assetType}</span>
                  </div>
                  <div className="item-meta-line">
                    {o.identifier && <span className="mono">{o.identifier}</span>}
                    {o.notes && <span>· {o.notes}</span>}
                  </div>
                  {o.customFields.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
                      {o.customFields.map((cf, i) => (
                        <span key={i} className="tag-chip">
                          {cf.key}: {cf.value}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  {o.url && (
                    <a href={o.url} target="_blank" rel="noreferrer" className="btn btn-sm">
                      <ExternalLink size={13} /> Buka
                    </a>
                  )}
                  <button
                    type="button"
                    className="btn btn-ghost btn-icon-sm"
                    onClick={() => onEditOther(o)}
                    title="Edit"
                  >
                    <Edit3 size={14} />
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost btn-icon-sm"
                    onClick={() => onDeleteOther(o.id)}
                    title="Hapus"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === 'meta' && (
        <section className="surface-card" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="form-field">
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 8,
              }}
            >
              <label className="form-label" htmlFor="detail-account-notes">
                Catatan Bebas &amp; List Project di Akun Ini
              </label>
              <button
                type="button"
                className="btn btn-sm btn-primary"
                disabled={notesDraft.trim() === account.notes.trim()}
                onClick={() => onSaveAccountNotes(account, notesDraft.trim())}
              >
                <Check size={14} /> Simpan Catatan
              </button>
            </div>
            <textarea
              id="detail-account-notes"
              className="form-textarea"
              rows={7}
              placeholder={'Tulis bebas apa saja yang dilakukan dengan email ini...\nContoh:\n- Project Antigravity: ...\n- Website / tools yang terhubung: ...'}
              value={notesDraft}
              onChange={(e) => setNotesDraft(e.target.value)}
            />
            <span className="form-help">
              Semua yang kamu tulis di sini langsung masuk ke Global Search (Ctrl+K) dan tersimpan
              otomatis ke Google Sheets.
            </span>
          </div>

          {account.customFields.length > 0 && (
            <div>
              <div className="sim-date-label" style={{ marginBottom: 6 }}>
                Custom Fields
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {account.customFields.map((cf, i) => (
                  <span key={i} className="tag-chip">
                    <strong>{cf.key}:</strong> {cf.value}
                  </span>
                ))}
              </div>
            </div>
          )}

          {account.tags.length > 0 && (
            <div>
              <div className="sim-date-label" style={{ marginBottom: 6 }}>
                Tags
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {account.tags.map((t) => (
                  <span key={t} className="tag-chip">
                    #{t}
                  </span>
                ))}
              </div>
            </div>
          )}
        </section>
      )}
    </>
  );
}

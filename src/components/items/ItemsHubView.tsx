import {
  CalendarPlus,
  Cloud,
  Copy,
  CreditCard,
  Edit3,
  ExternalLink,
  FolderKanban,
  Globe,
  Plus,
  Trash2,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import type {
  CloudProject,
  ConnectedWebsite,
  GoogleAccount,
  ItemsSubTab,
  OtherAsset,
  Subscription,
  VaultData,
} from '../../types/models';
import {
  formatCurrency,
  formatDateID,
  getSubscriptionHealth,
  summarizeSubscriptionCosts,
} from '../../utils/simStatus';

interface ItemsHubViewProps {
  vault: VaultData;
  subTab: ItemsSubTab;
  onChangeSubTab: (next: ItemsSubTab) => void;
  onOpenAccount: (accountId: string) => void;
  onCopy: (text: string, label: string) => void;
  onAddItem: (kind: 'cloud' | 'website' | 'subscription' | 'other') => void;
  onEditCloud: (item: CloudProject) => void;
  onDeleteCloud: (id: string) => void;
  onEditWebsite: (item: ConnectedWebsite) => void;
  onDeleteWebsite: (id: string) => void;
  onEditSubscription: (item: Subscription) => void;
  onDeleteSubscription: (id: string) => void;
  onDownloadSubIcs: (item: Subscription) => void;
  onEditOther: (item: OtherAsset) => void;
  onDeleteOther: (id: string) => void;
}

export function ItemsHubView({
  vault,
  subTab,
  onChangeSubTab,
  onOpenAccount,
  onCopy,
  onAddItem,
  onEditCloud,
  onDeleteCloud,
  onEditWebsite,
  onDeleteWebsite,
  onEditSubscription,
  onDeleteSubscription,
  onDownloadSubIcs,
  onEditOther,
  onDeleteOther,
}: ItemsHubViewProps) {
  const [accountFilter, setAccountFilter] = useState<string>('ALL');
  const [query, setQuery] = useState('');

  const accountById = useMemo(
    () => new Map<string, GoogleAccount>(vault.googleAccounts.map((a) => [a.id, a])),
    [vault.googleAccounts]
  );

  const subCostSummary = useMemo(
    () => summarizeSubscriptionCosts(vault.subscriptions),
    [vault.subscriptions]
  );

  const q = query.trim().toLowerCase();

  const clouds = useMemo(
    () =>
      vault.cloudProjects.filter((c) => {
        if (accountFilter !== 'ALL' && c.accountId !== accountFilter) return false;
        if (!q) return true;
        const email = accountById.get(c.accountId)?.email ?? '';
        return `${c.projectName} ${c.projectIdRef} ${c.provider} ${c.relatedDomains} ${email} ${c.notes}`
          .toLowerCase()
          .includes(q);
      }),
    [vault.cloudProjects, accountFilter, q, accountById]
  );

  const websites = useMemo(
    () =>
      vault.connectedWebsites.filter((w) => {
        if (accountFilter !== 'ALL' && w.accountId !== accountFilter) return false;
        if (!q) return true;
        const email = accountById.get(w.accountId)?.email ?? '';
        return `${w.serviceName} ${w.url} ${w.category} ${w.loginMethod} ${w.usernameHandle} ${email} ${w.notes}`
          .toLowerCase()
          .includes(q);
      }),
    [vault.connectedWebsites, accountFilter, q, accountById]
  );

  const subscriptions = useMemo(
    () =>
      vault.subscriptions.filter((s) => {
        if (accountFilter !== 'ALL' && s.accountId !== accountFilter) return false;
        if (!q) return true;
        const email = accountById.get(s.accountId)?.email ?? '';
        return `${s.serviceName} ${s.planName} ${s.paymentMethodHint} ${email} ${s.notes}`
          .toLowerCase()
          .includes(q);
      }),
    [vault.subscriptions, accountFilter, q, accountById]
  );

  const others = useMemo(
    () =>
      vault.otherAssets.filter((o) => {
        if (accountFilter !== 'ALL' && o.accountId !== accountFilter) return false;
        if (!q) return true;
        const email = accountById.get(o.accountId)?.email ?? '';
        return `${o.title} ${o.assetType} ${o.identifier} ${o.url} ${email} ${o.notes}`
          .toLowerCase()
          .includes(q);
      }),
    [vault.otherAssets, accountFilter, q, accountById]
  );

  const renderOwnerPill = (accountId: string) => {
    const owner = accountById.get(accountId);
    if (!owner) return null;
    return (
      <button
        type="button"
        className="account-pill"
        onClick={() => onOpenAccount(owner.id)}
      >
        <span className="color-dot" style={{ background: owner.colorBadge }} />
        <span className="mono">{owner.email}</span>
      </button>
    );
  };

  const addKind =
    subTab === 'websites'
      ? 'website'
      : subTab === 'subscriptions'
        ? 'subscription'
        : subTab;

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Cloud, Website, Subscription &amp; Aset</h1>
          <p className="page-subtitle">
            Lihat seluruh item lintas akun Google sekaligus lengkap dengan badge email pemiliknya.
          </p>
        </div>
        <button
          type="button"
          className="btn btn-primary"
          disabled={vault.googleAccounts.length === 0}
          onClick={() => onAddItem(addKind)}
        >
          <Plus size={15} /> Tambah{' '}
          {subTab === 'cloud'
            ? 'Cloud Project'
            : subTab === 'websites'
              ? 'Website'
              : subTab === 'subscriptions'
                ? 'Subscription'
                : 'Aset Lain'}
        </button>
      </div>

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
            aria-selected={subTab === 'cloud'}
            className={`segmented-tab${subTab === 'cloud' ? ' active' : ''}`}
            onClick={() => onChangeSubTab('cloud')}
          >
            <Cloud size={15} /> Cloud ({vault.cloudProjects.length})
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={subTab === 'websites'}
            className={`segmented-tab${subTab === 'websites' ? ' active' : ''}`}
            onClick={() => onChangeSubTab('websites')}
          >
            <Globe size={15} /> Website ({vault.connectedWebsites.length})
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={subTab === 'subscriptions'}
            className={`segmented-tab${subTab === 'subscriptions' ? ' active' : ''}`}
            onClick={() => onChangeSubTab('subscriptions')}
          >
            <CreditCard size={15} /> Subscription ({vault.subscriptions.length})
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={subTab === 'other'}
            className={`segmented-tab${subTab === 'other' ? ' active' : ''}`}
            onClick={() => onChangeSubTab('other')}
          >
            <FolderKanban size={15} /> Lainnya ({vault.otherAssets.length})
          </button>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          <select
            aria-label="Filter berdasarkan akun Google"
            className="form-select"
            style={{ width: 'auto', minWidth: 190 }}
            value={accountFilter}
            onChange={(e) => setAccountFilter(e.target.value)}
          >
            <option value="ALL">Semua Akun Google</option>
            {vault.googleAccounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.email}
              </option>
            ))}
          </select>
          <input
            type="text"
            className="form-input"
            style={{ width: 210 }}
            placeholder="Saring cepat..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </div>

      {subTab === 'subscriptions' && subCostSummary.length > 0 && (
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 12,
          }}
        >
          {subCostSummary.map((bucket) => (
            <div
              key={bucket.currency}
              className="surface-card"
              style={{ padding: '12px 16px', flex: '1 1 220px' }}
            >
              <div className="sim-date-label">
                Estimasi Langganan Aktif ({bucket.currency}) · {bucket.activeCount} layanan
              </div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'baseline',
                  gap: 10,
                  marginTop: 4,
                }}
              >
                <strong className="mono" style={{ fontSize: 18 }}>
                  {formatCurrency(bucket.monthlyTotal, bucket.currency)}/bln
                </strong>
                <span className="mono" style={{ fontSize: 12, color: 'var(--ink-muted)' }}>
                  ({formatCurrency(bucket.yearlyTotal, bucket.currency)}/thn)
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {subTab === 'cloud' && (
        <div className="item-list">
          {clouds.length === 0 ? (
            <div className="empty-state">Tidak ada cloud project yang cocok.</div>
          ) : (
            clouds.map((c) => {
              const owner = accountById.get(c.accountId);
              return (
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
                      {renderOwnerPill(c.accountId)}
                      {c.projectIdRef && <span className="mono">ID: {c.projectIdRef}</span>}
                      {c.billingTier && <span>· {c.billingTier}</span>}
                      {c.relatedDomains && <span className="mono">· {c.relatedDomains}</span>}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {owner && (
                      <button
                        type="button"
                        className="btn btn-ghost btn-icon-sm"
                        title="Salin email pemilik"
                        onClick={() => onCopy(owner.email, 'Email pemilik disalin')}
                      >
                        <Copy size={14} />
                      </button>
                    )}
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
                    >
                      <Edit3 size={14} />
                    </button>
                    <button
                      type="button"
                      className="btn btn-ghost btn-icon-sm"
                      onClick={() => onDeleteCloud(c.id)}
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

      {subTab === 'websites' && (
        <div className="item-list">
          {websites.length === 0 ? (
            <div className="empty-state">Tidak ada website terhubung yang cocok.</div>
          ) : (
            websites.map((w) => {
              const owner = accountById.get(w.accountId);
              return (
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
                      {renderOwnerPill(w.accountId)}
                      {w.usernameHandle && <span className="mono">{w.usernameHandle}</span>}
                      {w.url && (
                        <a href={w.url} target="_blank" rel="noreferrer" className="mono">
                          {w.url.replace(/^https?:\/\//, '')}
                        </a>
                      )}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {owner && (
                      <button
                        type="button"
                        className="btn btn-ghost btn-icon-sm"
                        title="Salin email pemilik"
                        onClick={() => onCopy(owner.email, 'Email pemilik disalin')}
                      >
                        <Copy size={14} />
                      </button>
                    )}
                    {w.url && (
                      <a href={w.url} target="_blank" rel="noreferrer" className="btn btn-sm">
                        <ExternalLink size={13} /> Buka
                      </a>
                    )}
                    <button
                      type="button"
                      className="btn btn-ghost btn-icon-sm"
                      onClick={() => onEditWebsite(w)}
                    >
                      <Edit3 size={14} />
                    </button>
                    <button
                      type="button"
                      className="btn btn-ghost btn-icon-sm"
                      onClick={() => onDeleteWebsite(w.id)}
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

      {subTab === 'subscriptions' && (
        <div className="item-list">
          {subscriptions.length === 0 ? (
            <div className="empty-state">Tidak ada subscription yang cocok.</div>
          ) : (
            subscriptions.map((s) => {
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
                      {renderOwnerPill(s.accountId)}
                      <strong className="mono">
                        {formatCurrency(s.costAmount, s.currency)} / {s.billingCycle}
                      </strong>
                      {s.nextRenewalDate && (
                        <span>· {formatDateID(s.nextRenewalDate)}</span>
                      )}
                      {s.paymentMethodHint && <span>· {s.paymentMethodHint}</span>}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {s.nextRenewalDate && (
                      <button
                        type="button"
                        className="btn btn-ghost btn-icon-sm"
                        title="Unduh reminder kalender (.ics)"
                        onClick={() => onDownloadSubIcs(s)}
                      >
                        <CalendarPlus size={14} />
                      </button>
                    )}
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
                    >
                      <Edit3 size={14} />
                    </button>
                    <button
                      type="button"
                      className="btn btn-ghost btn-icon-sm"
                      onClick={() => onDeleteSubscription(s.id)}
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

      {subTab === 'other' && (
        <div className="item-list">
          {others.length === 0 ? (
            <div className="empty-state">Tidak ada aset lainnya yang cocok.</div>
          ) : (
            others.map((o) => (
              <div key={o.id} className="item-row">
                <div className="item-main">
                  <div className="item-title-line">
                    <span className="item-title">{o.title}</span>
                    <span className="badge badge-neutral">{o.assetType}</span>
                  </div>
                  <div className="item-meta-line">
                    {renderOwnerPill(o.accountId)}
                    {o.identifier && <span className="mono">{o.identifier}</span>}
                    {o.notes && <span>· {o.notes}</span>}
                  </div>
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
                  >
                    <Edit3 size={14} />
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost btn-icon-sm"
                    onClick={() => onDeleteOther(o.id)}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </>
  );
}

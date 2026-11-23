import {
  CheckCircle2,
  Cloud,
  Copy,
  CreditCard,
  Edit3,
  FolderKanban,
  Globe,
  LayoutGrid,
  Plus,
  ShieldCheck,
  Smartphone,
  Table2,
  Upload,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import {
  ACCOUNT_STATUS_META,
  type AccountStatus,
  type GoogleAccount,
  type VaultData,
  type ViewMode,
} from '../../types/models';
import { getSimHealth, maskPhoneNumber } from '../../utils/simStatus';

interface AccountsViewProps {
  vault: VaultData;
  privacyMask: boolean;
  onOpenAccount: (accountId: string) => void;
  onAddAccount: () => void;
  onEditAccount: (account: GoogleAccount) => void;
  onToggleNeedsCancel: (account: GoogleAccount) => void;
  onOpenImport: () => void;
  onCopy: (text: string, label: string) => void;
}

type StatusFilter = 'ALL' | 'NEEDS_CANCEL' | AccountStatus;

export function AccountsView({
  vault,
  privacyMask,
  onOpenAccount,
  onAddAccount,
  onEditAccount,
  onToggleNeedsCancel,
  onOpenImport,
  onCopy,
}: AccountsViewProps) {
  const [viewMode, setViewMode] = useState<ViewMode>(() =>
    typeof window !== 'undefined' && window.innerWidth < 720 ? 'cards' : 'table'
  );
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [localFilter, setLocalFilter] = useState('');

  const phoneById = useMemo(
    () => new Map(vault.phoneNumbers.map((p) => [p.id, p])),
    [vault.phoneNumbers]
  );

  const counts = useMemo(() => {
    const map = {
      ALL: vault.googleAccounts.length,
      NEEDS_CANCEL: 0,
      Active: 0,
      Spare: 0,
      Shared: 0,
      Sold: 0,
      Issue: 0,
    };
    for (const acc of vault.googleAccounts) {
      if (acc.quickSubNeedsCancel) map.NEEDS_CANCEL += 1;
      if (acc.status === 'Active') map.Active += 1;
      else if (acc.status === 'Spare') map.Spare += 1;
      else if (acc.status === 'Shared') map.Shared += 1;
      else if (acc.status === 'Sold') map.Sold += 1;
      else if (acc.status === 'Issue' || acc.status === 'Suspended') map.Issue += 1;
    }
    return map;
  }, [vault.googleAccounts]);

  const filteredAccounts = useMemo(() => {
    const q = localFilter.trim().toLowerCase();
    return vault.googleAccounts.filter((acc) => {
      if (statusFilter === 'NEEDS_CANCEL' && !acc.quickSubNeedsCancel) return false;
      if (statusFilter === 'Issue' && acc.status !== 'Issue' && acc.status !== 'Suspended') {
        return false;
      }
      if (
        statusFilter !== 'ALL' &&
        statusFilter !== 'NEEDS_CANCEL' &&
        statusFilter !== 'Issue' &&
        acc.status !== statusFilter
      ) {
        return false;
      }
      if (!q) return true;
      return [
        acc.email,
        acc.aliasLabel,
        acc.primaryPurpose,
        acc.passwordHint,
        acc.holderName,
        acc.holderUntil,
        acc.quickSubName,
        acc.quickSubPeriod,
        acc.chromeProfile,
        acc.tags.join(' '),
        acc.notes,
      ]
        .join(' ')
        .toLowerCase()
        .includes(q);
    });
  }, [vault.googleAccounts, statusFilter, localFilter]);

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Daftar Akun Email ({vault.googleAccounts.length})</h1>
          <p className="page-subtitle">
            Tampilan tabel ringkas untuk memindai banyak akun sekaligus — klik baris untuk detail
            project cloud, website &amp; aset.
          </p>
        </div>
        <div className="filter-bar">
          <button type="button" className="btn btn-sm" onClick={onOpenImport}>
            <Upload size={14} /> Import Excel/CSV
          </button>
          <button type="button" className="btn btn-primary" onClick={onAddAccount}>
            <Plus size={15} /> Tambah Akun
          </button>
        </div>
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
        <div className="filter-bar">
          <button
            type="button"
            className={`chip-filter${statusFilter === 'ALL' ? ' active' : ''}`}
            onClick={() => setStatusFilter('ALL')}
          >
            Semua ({counts.ALL})
          </button>
          {counts.NEEDS_CANCEL > 0 && (
            <button
              type="button"
              className={`chip-filter${statusFilter === 'NEEDS_CANCEL' ? ' active' : ''}`}
              style={
                statusFilter === 'NEEDS_CANCEL'
                  ? undefined
                  : {
                      borderColor: 'var(--warning-border)',
                      background: 'var(--warning-soft)',
                      color: 'var(--warning)',
                    }
              }
              onClick={() => setStatusFilter('NEEDS_CANCEL')}
            >
              Belum Cancel ({counts.NEEDS_CANCEL})
            </button>
          )}
          <button
            type="button"
            className={`chip-filter${statusFilter === 'Active' ? ' active' : ''}`}
            onClick={() => setStatusFilter('Active')}
          >
            Aktif ({counts.Active})
          </button>
          <button
            type="button"
            className={`chip-filter${statusFilter === 'Spare' ? ' active' : ''}`}
            onClick={() => setStatusFilter('Spare')}
          >
            Cadangan ({counts.Spare})
          </button>
          <button
            type="button"
            className={`chip-filter${statusFilter === 'Shared' ? ' active' : ''}`}
            onClick={() => setStatusFilter('Shared')}
          >
            Dipakai Orang ({counts.Shared})
          </button>
          <button
            type="button"
            className={`chip-filter${statusFilter === 'Sold' ? ' active' : ''}`}
            onClick={() => setStatusFilter('Sold')}
          >
            Sold ({counts.Sold})
          </button>
          {counts.Issue > 0 && (
            <button
              type="button"
              className={`chip-filter${statusFilter === 'Issue' ? ' active' : ''}`}
              onClick={() => setStatusFilter('Issue')}
            >
              Bermasalah ({counts.Issue})
            </button>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <input
            type="text"
            className="form-input"
            style={{ width: 220 }}
            placeholder="Saring email, pemakai, paket..."
            value={localFilter}
            onChange={(e) => setLocalFilter(e.target.value)}
          />
          <div className="segmented-tabs" role="group" aria-label="Mode tampilan">
            <button
              type="button"
              className={`segmented-tab${viewMode === 'table' ? ' active' : ''}`}
              style={{ padding: '5px 9px' }}
              onClick={() => setViewMode('table')}
              title="Tampilan Tabel Ringkas"
            >
              <Table2 size={15} />
            </button>
            <button
              type="button"
              className={`segmented-tab${viewMode === 'cards' ? ' active' : ''}`}
              style={{ padding: '5px 9px' }}
              onClick={() => setViewMode('cards')}
              title="Tampilan Kartu"
            >
              <LayoutGrid size={15} />
            </button>
          </div>
        </div>
      </div>

      {filteredAccounts.length === 0 ? (
        <div className="empty-state">
          <div style={{ fontWeight: 700 }}>Belum ada akun email pada filter ini</div>
          <div style={{ fontSize: 13 }}>
            Tambahkan akun baru atau import langsung dari file Excel/CSV milikmu.
          </div>
          <div className="filter-bar">
            <button type="button" className="btn" onClick={onOpenImport}>
              <Upload size={14} /> Import Excel/CSV
            </button>
            <button type="button" className="btn btn-primary" onClick={onAddAccount}>
              <Plus size={15} /> Tambah Akun
            </button>
          </div>
        </div>
      ) : viewMode === 'table' ? (
        <div className="data-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: 42 }}>#</th>
                <th>Email</th>
                <th>Hint Pass</th>
                <th>Kondisi / Pemakai</th>
                <th>Subscription &amp; Cancel</th>
                <th>SIM &amp; Catatan</th>
                <th style={{ width: 88, textAlign: 'right' }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {filteredAccounts.map((acc, index) => {
                const statusMeta = ACCOUNT_STATUS_META[acc.status] ?? ACCOUNT_STATUS_META.Active;
                const linkedPhone = phoneById.get(acc.linkedPhoneId);
                const cloudCount = vault.cloudProjects.filter((c) => c.accountId === acc.id).length;
                const webCount = vault.connectedWebsites.filter(
                  (w) => w.accountId === acc.id
                ).length;
                const extraSubs = vault.subscriptions.filter(
                  (s) => s.accountId === acc.id && (s.status === 'Active' || s.status === 'Trial')
                );
                const subDisplay =
                  acc.quickSubName || extraSubs.map((s) => s.serviceName).join(', ');

                return (
                  <tr
                    key={acc.id}
                    className="clickable"
                    onClick={() => onOpenAccount(acc.id)}
                  >
                    <td>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                          color: 'var(--ink-muted)',
                        }}
                        className="mono"
                      >
                        <span className="color-dot" style={{ background: acc.colorBadge }} />
                        {index + 1}
                      </span>
                    </td>

                    <td>
                      <div className="table-cell-stack">
                        <strong className="mono" style={{ fontSize: 12.5 }}>
                          {acc.email}
                        </strong>
                        {acc.aliasLabel &&
                          acc.aliasLabel.toLowerCase() !== acc.email.split('@')[0].toLowerCase() && (
                            <span className="table-subtext">{acc.aliasLabel}</span>
                          )}
                      </div>
                    </td>

                    <td>
                      {acc.passwordHint ? (
                        <span className="tag-chip">{acc.passwordHint}</span>
                      ) : (
                        <span className="table-subtext">—</span>
                      )}
                    </td>

                    <td>
                      <div className="table-cell-stack" style={{ gap: 4 }}>
                        <span
                          className={`badge badge-${statusMeta.tone}`}
                          style={{ width: 'fit-content' }}
                        >
                          {statusMeta.shortLabel}
                        </span>
                        {(acc.holderName || acc.holderUntil) && (
                          <span className="table-subtext">
                            {acc.holderName}
                            {acc.holderUntil ? ` (s/d ${acc.holderUntil})` : ''}
                          </span>
                        )}
                      </div>
                    </td>

                    <td onClick={(e) => e.stopPropagation()}>
                      <div className="table-cell-stack" style={{ gap: 4 }}>
                        {subDisplay ? (
                          <span style={{ fontWeight: 600 }}>{subDisplay}</span>
                        ) : (
                          <span className="table-subtext">—</span>
                        )}
                        {acc.quickSubPeriod && (
                          <span className="table-subtext mono">{acc.quickSubPeriod}</span>
                        )}
                        {acc.quickSubNeedsCancel ? (
                          <button
                            type="button"
                            className="badge badge-warning"
                            style={{ cursor: 'pointer', width: 'fit-content' }}
                            title="Klik untuk menandai sudah cancel"
                            onClick={() => onToggleNeedsCancel(acc)}
                          >
                            Belum Cancel · Tandai Selesai
                          </button>
                        ) : (
                          subDisplay && (
                            <button
                              type="button"
                              className="btn btn-ghost"
                              style={{
                                height: 22,
                                padding: '0 4px',
                                fontSize: 11,
                                width: 'fit-content',
                                color: 'var(--ink-muted)',
                              }}
                              onClick={() => onToggleNeedsCancel(acc)}
                            >
                              <CheckCircle2 size={11} /> Aman / Sudah cancel
                            </button>
                          )
                        )}
                      </div>
                    </td>

                    <td>
                      <div className="table-cell-stack" style={{ gap: 4, maxWidth: 260 }}>
                        {linkedPhone && (
                          <span className="table-subtext mono">
                            SIM: {linkedPhone.provider} (
                            {privacyMask
                              ? maskPhoneNumber(linkedPhone.phoneNumber)
                              : linkedPhone.phoneNumber}
                            )
                          </span>
                        )}
                        {(cloudCount > 0 || webCount > 0) && (
                          <span className="table-subtext">
                            {cloudCount} cloud · {webCount} website
                          </span>
                        )}
                        {acc.notes && (
                          <span
                            className="table-subtext"
                            style={{
                              color: 'var(--ink-secondary)',
                              whiteSpace: 'normal',
                              lineHeight: 1.35,
                            }}
                          >
                            {acc.notes}
                          </span>
                        )}
                        {!linkedPhone && !acc.notes && cloudCount === 0 && webCount === 0 && (
                          <span className="table-subtext">—</span>
                        )}
                      </div>
                    </td>

                    <td
                      style={{ textAlign: 'right', whiteSpace: 'nowrap' }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        type="button"
                        className="btn btn-ghost btn-icon-sm"
                        title="Salin email"
                        onClick={() => onCopy(acc.email, 'Email disalin')}
                      >
                        <Copy size={14} />
                      </button>
                      <button
                        type="button"
                        className="btn btn-ghost btn-icon-sm"
                        title="Edit akun"
                        onClick={() => onEditAccount(acc)}
                      >
                        <Edit3 size={14} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="card-grid-2">
          {filteredAccounts.map((acc) => {
            const statusMeta = ACCOUNT_STATUS_META[acc.status] ?? ACCOUNT_STATUS_META.Active;
            const cloudCount = vault.cloudProjects.filter((c) => c.accountId === acc.id).length;
            const webCount = vault.connectedWebsites.filter((w) => w.accountId === acc.id).length;
            const subCount = vault.subscriptions.filter((s) => s.accountId === acc.id).length;
            const otherCount = vault.otherAssets.filter((o) => o.accountId === acc.id).length;
            const linkedPhone = phoneById.get(acc.linkedPhoneId);
            const phoneHealth = linkedPhone ? getSimHealth(linkedPhone) : null;

            return (
              <article
                key={acc.id}
                className="entity-card"
                style={{ cursor: 'pointer' }}
                onClick={() => onOpenAccount(acc.id)}
              >
                <div className="entity-card-head">
                  <div className="entity-identity">
                    <div
                      className="avatar-swatch"
                      style={{ background: acc.colorBadge }}
                      aria-hidden="true"
                    >
                      {(acc.aliasLabel || acc.email).slice(0, 2).toUpperCase()}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <h2 className="entity-title">{acc.aliasLabel || acc.email}</h2>
                      <div className="entity-email">{acc.email}</div>
                    </div>
                  </div>
                  <div
                    style={{ display: 'flex', gap: 4 }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      type="button"
                      className="btn btn-ghost btn-icon-sm"
                      title="Salin email"
                      onClick={() => onCopy(acc.email, 'Email disalin')}
                    >
                      <Copy size={14} />
                    </button>
                    <button
                      type="button"
                      className="btn btn-ghost btn-icon-sm"
                      title="Edit akun"
                      onClick={() => onEditAccount(acc)}
                    >
                      <Edit3 size={14} />
                    </button>
                  </div>
                </div>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  <span className={`badge badge-${statusMeta.tone}`}>{statusMeta.label}</span>
                  {acc.passwordHint && (
                    <span className="tag-chip">Pass: {acc.passwordHint}</span>
                  )}
                  {acc.quickSubName && (
                    <span className="badge badge-info">
                      {acc.quickSubName}
                      {acc.quickSubPeriod ? ` · ${acc.quickSubPeriod}` : ''}
                    </span>
                  )}
                  {acc.quickSubNeedsCancel && (
                    <span className="badge badge-warning">Belum Cancel</span>
                  )}
                  {acc.has2FA && (
                    <span className="badge badge-neutral">
                      <ShieldCheck size={12} /> 2FA
                    </span>
                  )}
                </div>

                {(acc.holderName || acc.notes) && (
                  <div style={{ fontSize: 12.5, color: 'var(--ink-secondary)' }}>
                    {acc.holderName && (
                      <div>
                        <strong>Pemakai/Pembeli:</strong> {acc.holderName}
                        {acc.holderUntil ? ` (s/d ${acc.holderUntil})` : ''}
                      </div>
                    )}
                    {acc.notes && <div>{acc.notes}</div>}
                  </div>
                )}

                {linkedPhone && (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 8,
                      padding: '8px 10px',
                      borderRadius: 9,
                      background: 'var(--bg-subtle)',
                      border: '1px solid var(--border-hairline)',
                      fontSize: 12,
                    }}
                  >
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                      <Smartphone size={13} />
                      <span className="mono">
                        {privacyMask
                          ? maskPhoneNumber(linkedPhone.phoneNumber)
                          : linkedPhone.phoneNumber}
                      </span>
                      <span style={{ color: 'var(--ink-muted)' }}>({linkedPhone.provider})</span>
                    </span>
                    {phoneHealth && (
                      <span
                        className={`badge badge-${
                          phoneHealth.state === 'grace_period' || phoneHealth.state === 'expired'
                            ? 'danger'
                            : phoneHealth.state === 'expiring_soon'
                              ? 'warning'
                              : 'success'
                        }`}
                      >
                        {phoneHealth.shortLabel}
                      </span>
                    )}
                  </div>
                )}

                <div className="stat-row">
                  <span className="mini-stat">
                    <Cloud size={13} /> <strong>{cloudCount}</strong> Cloud
                  </span>
                  <span className="mini-stat">
                    <Globe size={13} /> <strong>{webCount}</strong> Web
                  </span>
                  <span className="mini-stat">
                    <CreditCard size={13} /> <strong>{subCount}</strong> Sub
                  </span>
                  <span className="mini-stat">
                    <FolderKanban size={13} /> <strong>{otherCount}</strong> Lainnya
                  </span>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </>
  );
}

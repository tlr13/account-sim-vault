import {
  Cloud,
  Copy,
  CreditCard,
  Edit3,
  FolderKanban,
  Globe,
  Plus,
  ShieldCheck,
  Smartphone,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import type { GoogleAccount, VaultData } from '../../types/models';
import { getSimHealth, maskPhoneNumber } from '../../utils/simStatus';

interface AccountsViewProps {
  vault: VaultData;
  privacyMask: boolean;
  onOpenAccount: (accountId: string) => void;
  onAddAccount: () => void;
  onEditAccount: (account: GoogleAccount) => void;
  onCopy: (text: string, label: string) => void;
}

export function AccountsView({
  vault,
  privacyMask,
  onOpenAccount,
  onAddAccount,
  onEditAccount,
  onCopy,
}: AccountsViewProps) {
  const [purposeFilter, setPurposeFilter] = useState<string>('ALL');
  const [localFilter, setLocalFilter] = useState('');

  const phoneById = useMemo(
    () => new Map(vault.phoneNumbers.map((p) => [p.id, p])),
    [vault.phoneNumbers]
  );

  const purposes = useMemo(() => {
    const set = new Set(vault.googleAccounts.map((a) => a.primaryPurpose));
    return ['ALL', ...Array.from(set)];
  }, [vault.googleAccounts]);

  const filteredAccounts = useMemo(() => {
    const q = localFilter.trim().toLowerCase();
    return vault.googleAccounts.filter((acc) => {
      if (purposeFilter !== 'ALL' && acc.primaryPurpose !== purposeFilter) return false;
      if (!q) return true;
      return (
        acc.email.toLowerCase().includes(q) ||
        acc.aliasLabel.toLowerCase().includes(q) ||
        acc.primaryPurpose.toLowerCase().includes(q) ||
        acc.chromeProfile.toLowerCase().includes(q) ||
        acc.tags.some((t) => t.toLowerCase().includes(q)) ||
        acc.notes.toLowerCase().includes(q)
      );
    });
  }, [vault.googleAccounts, purposeFilter, localFilter]);

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Daftar Akun Google</h1>
          <p className="page-subtitle">
            Klik salah satu akun untuk melihat semua project cloud, website, subscription, dan aset
            di dalamnya.
          </p>
        </div>
        <button type="button" className="btn btn-primary" onClick={onAddAccount}>
          <Plus size={15} /> Tambah Akun Google
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
        <div className="filter-bar">
          {purposes.map((p) => (
            <button
              key={p}
              type="button"
              className={`chip-filter${purposeFilter === p ? ' active' : ''}`}
              onClick={() => setPurposeFilter(p)}
            >
              {p === 'ALL' ? `Semua (${vault.googleAccounts.length})` : p}
            </button>
          ))}
        </div>

        <input
          type="text"
          className="form-input"
          style={{ maxWidth: 260 }}
          placeholder="Saring email, profil, atau tag..."
          value={localFilter}
          onChange={(e) => setLocalFilter(e.target.value)}
        />
      </div>

      {filteredAccounts.length === 0 ? (
        <div className="empty-state">
          <div style={{ fontWeight: 700 }}>Belum ada akun Google yang cocok</div>
          <div style={{ fontSize: 13 }}>
            Tambahkan akun Google pertamamu untuk mulai memetakan kegunaan dan proyeknya.
          </div>
          <button type="button" className="btn btn-primary" onClick={onAddAccount}>
            <Plus size={15} /> Tambah Akun Google
          </button>
        </div>
      ) : (
        <div className="card-grid-2">
          {filteredAccounts.map((acc) => {
            const cloudCount = vault.cloudProjects.filter((c) => c.accountId === acc.id).length;
            const webCount = vault.connectedWebsites.filter((w) => w.accountId === acc.id).length;
            const subCount = vault.subscriptions.filter((s) => s.accountId === acc.id).length;
            const otherCount = vault.otherAssets.filter((o) => o.accountId === acc.id).length;
            const linkedPhone = phoneById.get(acc.linkedPhoneId);
            const phoneHealth = linkedPhone ? getSimHealth(linkedPhone) : null;
            const drivePct =
              acc.driveUsedGb !== null && acc.driveLimitGb
                ? Math.min(100, Math.round((acc.driveUsedGb / acc.driveLimitGb) * 100))
                : null;

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
                  <span className="badge badge-info">{acc.primaryPurpose}</span>
                  <span
                    className={`badge badge-${acc.status === 'Active' ? 'success' : 'neutral'}`}
                  >
                    {acc.status}
                  </span>
                  {acc.has2FA && (
                    <span className="badge badge-neutral">
                      <ShieldCheck size={12} /> 2FA
                    </span>
                  )}
                  {acc.chromeProfile && (
                    <span className="badge badge-neutral">{acc.chromeProfile}</span>
                  )}
                </div>

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

                {drivePct !== null && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        fontSize: 11.5,
                        color: 'var(--ink-muted)',
                      }}
                    >
                      <span>Google Drive</span>
                      <span className="mono">
                        {acc.driveUsedGb} / {acc.driveLimitGb} GB ({drivePct}%)
                      </span>
                    </div>
                    <div className="progress-track">
                      <div
                        className={`progress-fill${
                          drivePct >= 85 ? ' danger' : drivePct >= 70 ? ' warning' : ''
                        }`}
                        style={{ width: `${drivePct}%` }}
                      />
                    </div>
                  </div>
                )}

                {acc.tags.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                    {acc.tags.map((tag) => (
                      <span key={tag} className="tag-chip">
                        #{tag}
                      </span>
                    ))}
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

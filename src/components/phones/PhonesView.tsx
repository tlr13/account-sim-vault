import {
  CalendarPlus,
  Copy,
  Edit3,
  Plus,
  RefreshCw,
  Smartphone,
  Trash2,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import type { PhoneNumber, VaultData } from '../../types/models';
import {
  formatDateID,
  getProviderAccent,
  getSimHealth,
  maskPhoneNumber,
} from '../../utils/simStatus';

interface PhonesViewProps {
  vault: VaultData;
  privacyMask: boolean;
  onAddPhone: () => void;
  onEditPhone: (phone: PhoneNumber) => void;
  onDeletePhone: (phone: PhoneNumber) => void;
  onExtendPhone: (phone: PhoneNumber) => void;
  onDownloadIcs: (phone: PhoneNumber) => void;
  onOpenAccount: (accountId: string) => void;
  onCopy: (text: string, label: string) => void;
}

type SimFilter = 'ALL' | 'ATTENTION' | 'ACTIVE' | 'ARCHIVED';

export function PhonesView({
  vault,
  privacyMask,
  onAddPhone,
  onEditPhone,
  onDeletePhone,
  onExtendPhone,
  onDownloadIcs,
  onOpenAccount,
  onCopy,
}: PhonesViewProps) {
  const [filter, setFilter] = useState<SimFilter>('ALL');

  const enriched = useMemo(() => {
    return vault.phoneNumbers
      .map((phone) => ({
        phone,
        health: getSimHealth(phone),
        linkedAccounts: vault.googleAccounts.filter((a) => a.linkedPhoneId === phone.id),
      }))
      .sort((a, b) => a.health.urgencyRank - b.health.urgencyRank);
  }, [vault.phoneNumbers, vault.googleAccounts]);

  const attentionCount = enriched.filter((e) => e.health.needsAttention).length;

  const visible = useMemo(() => {
    if (filter === 'ATTENTION') return enriched.filter((e) => e.health.needsAttention);
    if (filter === 'ACTIVE') {
      return enriched.filter(
        (e) => e.health.state === 'active' || e.health.state === 'no_expiry'
      );
    }
    if (filter === 'ARCHIVED') {
      return enriched.filter(
        (e) => e.health.state === 'archived' || e.health.state === 'expired'
      );
    }
    return enriched;
  }, [enriched, filter]);

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Nomor HP &amp; Kartu SIM</h1>
          <p className="page-subtitle">
            Pantau masa aktif, masa tenggang, lokasi slot HP, dan akun Google yang bergantung pada
            tiap kartu.
          </p>
        </div>
        <button type="button" className="btn btn-primary" onClick={onAddPhone}>
          <Plus size={15} /> Tambah Nomor HP
        </button>
      </div>

      <div className="filter-bar">
        <button
          type="button"
          className={`chip-filter${filter === 'ALL' ? ' active' : ''}`}
          onClick={() => setFilter('ALL')}
        >
          Semua ({enriched.length})
        </button>
        <button
          type="button"
          className={`chip-filter${filter === 'ATTENTION' ? ' active' : ''}`}
          onClick={() => setFilter('ATTENTION')}
        >
          Perlu Perhatian ({attentionCount})
        </button>
        <button
          type="button"
          className={`chip-filter${filter === 'ACTIVE' ? ' active' : ''}`}
          onClick={() => setFilter('ACTIVE')}
        >
          Aktif Aman
        </button>
        <button
          type="button"
          className={`chip-filter${filter === 'ARCHIVED' ? ' active' : ''}`}
          onClick={() => setFilter('ARCHIVED')}
        >
          Hangus / Arsip
        </button>
      </div>

      {visible.length === 0 ? (
        <div className="empty-state">
          <Smartphone size={26} color="var(--ink-muted)" />
          <div style={{ fontWeight: 700 }}>Belum ada kartu SIM pada filter ini</div>
          <button type="button" className="btn btn-primary" onClick={onAddPhone}>
            <Plus size={15} /> Tambah Nomor HP Pertama
          </button>
        </div>
      ) : (
        <div className="card-grid-2">
          {visible.map(({ phone, health, linkedAccounts }) => {
            const displayNumber = privacyMask
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
              <article key={phone.id} className="entity-card">
                <div className="entity-card-head">
                  <div className="entity-identity">
                    <div
                      className="avatar-swatch"
                      style={{ background: getProviderAccent(phone.provider) }}
                      aria-hidden="true"
                    >
                      <Smartphone size={18} />
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <h2 className="entity-title mono">{displayNumber}</h2>
                      <div style={{ fontSize: 13, color: 'var(--ink-secondary)' }}>
                        {phone.label || phone.usagePurpose || phone.provider}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button
                      type="button"
                      className="btn btn-ghost btn-icon-sm"
                      title="Salin nomor HP penuh"
                      onClick={() => onCopy(phone.phoneNumber, 'Nomor HP disalin')}
                    >
                      <Copy size={14} />
                    </button>
                    <button
                      type="button"
                      className="btn btn-ghost btn-icon-sm"
                      title="Edit kartu SIM"
                      onClick={() => onEditPhone(phone)}
                    >
                      <Edit3 size={14} />
                    </button>
                    <button
                      type="button"
                      className="btn btn-ghost btn-icon-sm"
                      title="Hapus kartu SIM"
                      onClick={() => onDeletePhone(phone)}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  <span className={`badge badge-${tone}`}>{health.label}</span>
                  <span className="badge badge-neutral">{phone.provider}</span>
                  <span className="badge badge-neutral">{phone.simType}</span>
                  {phone.deviceSlot && (
                    <span className="badge badge-neutral">{phone.deviceSlot}</span>
                  )}
                </div>

                {!phone.noExpiry && (
                  <>
                    <div className="sim-dates-row">
                      <div className="sim-date-col">
                        <span className="sim-date-label">Masa Aktif Sampai</span>
                        <span className="sim-date-value">
                          {formatDateID(phone.activeUntil)}
                        </span>
                      </div>
                      <div className="sim-date-col">
                        <span className="sim-date-label">Masa Tenggang Sampai</span>
                        <span
                          className="sim-date-value"
                          style={{
                            color:
                              health.state === 'grace_period' || health.state === 'expired'
                                ? 'var(--danger)'
                                : undefined,
                          }}
                        >
                          {formatDateID(phone.graceUntil)}
                        </span>
                      </div>
                    </div>

                    <div className="progress-track" aria-hidden="true">
                      <div
                        className={`progress-fill ${tone === 'neutral' ? '' : tone}`}
                        style={{ width: `${health.progressPercent}%` }}
                      />
                    </div>
                  </>
                )}

                {phone.renewalTip && (
                  <div style={{ fontSize: 12.5, color: 'var(--ink-secondary)' }}>
                    <strong>Tips perpanjang:</strong> {phone.renewalTip}
                  </div>
                )}

                {/* Linked Google Accounts */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <span className="sim-date-label">
                    Akun Google Tertaut ({linkedAccounts.length})
                  </span>
                  {linkedAccounts.length === 0 ? (
                    <span style={{ fontSize: 12, color: 'var(--ink-muted)' }}>
                      Belum ada akun Google yang ditautkan ke nomor ini.
                    </span>
                  ) : (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {linkedAccounts.map((acc) => (
                        <button
                          key={acc.id}
                          type="button"
                          className="account-pill"
                          onClick={() => onOpenAccount(acc.id)}
                        >
                          <span
                            className="color-dot"
                            style={{ background: acc.colorBadge }}
                          />
                          <span className="mono">{acc.email}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {phone.linkedServices.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                    {phone.linkedServices.map((srv) => (
                      <span key={srv} className="tag-chip">
                        {srv}
                      </span>
                    ))}
                  </div>
                )}

                {!phone.noExpiry && (
                  <div
                    style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: 8,
                      paddingTop: 10,
                      borderTop: '1px solid var(--border-hairline)',
                    }}
                  >
                    <button
                      type="button"
                      className={`btn btn-sm${health.needsAttention ? ' btn-primary' : ''}`}
                      onClick={() => onExtendPhone(phone)}
                    >
                      <RefreshCw size={13} /> Perpanjang Masa Aktif
                    </button>
                    {(phone.activeUntil || phone.graceUntil) && (
                      <button
                        type="button"
                        className="btn btn-sm"
                        onClick={() => onDownloadIcs(phone)}
                      >
                        <CalendarPlus size={13} /> Reminder Kalender (.ics)
                      </button>
                    )}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </>
  );
}

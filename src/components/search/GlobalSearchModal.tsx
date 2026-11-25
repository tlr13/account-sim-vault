import {
  Cloud,
  Copy,
  CreditCard,
  ExternalLink,
  FolderKanban,
  Globe,
  Mail,
  Search,
  Smartphone,
  X,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { searchVault } from '../../services/search/searchEngine';
import type { GlobalSearchResult, SearchCategory, VaultData } from '../../types/models';

interface GlobalSearchModalProps {
  open: boolean;
  vault: VaultData;
  privacyMask: boolean;
  onClose: () => void;
  onCopy: (value: string, label: string) => void;
  onSelectResult: (result: GlobalSearchResult) => void;
}

const CATEGORY_OPTIONS: { value: SearchCategory; label: string }[] = [
  { value: 'all', label: 'Semua' },
  { value: 'project', label: 'Project' },
  { value: 'account', label: 'Akun Google' },
  { value: 'phone', label: 'Kartu SIM' },
  { value: 'cloud', label: 'Cloud' },
  { value: 'website', label: 'Website' },
  { value: 'subscription', label: 'Subscription' },
  { value: 'other', label: 'Lainnya' },
];

function CategoryIcon({ category }: { category: GlobalSearchResult['category'] }) {
  switch (category) {
    case 'account':
      return <Mail size={16} />;
    case 'phone':
      return <Smartphone size={16} />;
    case 'cloud':
      return <Cloud size={16} />;
    case 'website':
      return <Globe size={16} />;
    case 'subscription':
      return <CreditCard size={16} />;
    default:
      return <FolderKanban size={16} />;
  }
}

export function GlobalSearchModal({
  open,
  vault,
  privacyMask,
  onClose,
  onCopy,
  onSelectResult,
}: GlobalSearchModalProps) {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<SearchCategory>('all');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(() => inputRef.current?.focus(), 30);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  const results = useMemo(
    () => searchVault(vault, query, category, privacyMask),
    [vault, query, category, privacyMask]
  );

  if (!open) return null;

  return (
    <div
      className="modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label="Pencarian cepat lintas akun dan kartu SIM"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal-panel wide">
        <div className="search-modal-input-wrap">
          <Search size={19} color="var(--ink-muted)" />
          <input
            ref={inputRef}
            id="global-search-input"
            type="text"
            className="search-modal-input"
            placeholder="Ketik nama website, project cloud, subscription, nomor HP, atau email..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {query && (
            <button
              type="button"
              className="btn btn-ghost btn-icon-sm"
              onClick={() => setQuery('')}
              aria-label="Bersihkan kata kunci"
            >
              <X size={16} />
            </button>
          )}
          <button
            type="button"
            className="btn btn-ghost btn-icon-sm"
            onClick={onClose}
            aria-label="Tutup pencarian"
          >
            <X size={18} />
          </button>
        </div>

        <div
          className="filter-bar"
          style={{
            padding: '10px 16px',
            borderBottom: '1px solid var(--border-hairline)',
            background: 'var(--bg-subtle)',
          }}
        >
          {CATEGORY_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              className={`chip-filter${category === opt.value ? ' active' : ''}`}
              onClick={() => setCategory(opt.value)}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <div className="search-results-list">
          {results.length === 0 ? (
            <div className="empty-state" style={{ border: 'none', padding: '32px 16px' }}>
              <Search size={24} color="var(--ink-muted)" />
              <div style={{ fontWeight: 600 }}>Tidak ada hasil untuk &ldquo;{query}&rdquo;</div>
              <div style={{ fontSize: 12.5, color: 'var(--ink-muted)' }}>
                Coba kata kunci lain seperti nama layanan, provider SIM, 4 digit terakhir nomor HP,
                atau tag.
              </div>
            </div>
          ) : (
            results.map((item) => (
              <div
                key={`${item.category}-${item.id}`}
                className="search-result-row"
                onClick={() => {
                  onSelectResult(item);
                  onClose();
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 11, minWidth: 0 }}>
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 9,
                      background: 'var(--bg-subtle)',
                      border: '1px solid var(--border-hairline)',
                      display: 'grid',
                      placeItems: 'center',
                      color: 'var(--ink-secondary)',
                      flexShrink: 0,
                      marginTop: 2,
                    }}
                  >
                    <CategoryIcon category={item.category} />
                  </div>
                  <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: 3 }}>
                    <div
                      style={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        alignItems: 'center',
                        gap: 7,
                      }}
                    >
                      <span style={{ fontWeight: 700, fontSize: 14 }}>{item.title}</span>
                      {item.badgeText && (
                        <span className={`badge badge-${item.badgeTone ?? 'neutral'}`}>
                          {item.badgeText}
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: 12.5, color: 'var(--ink-secondary)' }}>
                      {item.subtitle}
                    </div>
                    <div
                      style={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        alignItems: 'center',
                        gap: 8,
                        marginTop: 2,
                      }}
                    >
                      {item.ownerAccount && item.category !== 'account' && (
                        <span className="account-pill" style={{ cursor: 'default' }}>
                          <span
                            className="color-dot"
                            style={{ background: item.ownerAccount.colorBadge }}
                          />
                          <span className="mono">{item.ownerAccount.email}</span>
                        </span>
                      )}
                      {item.detailLine && (
                        <span style={{ fontSize: 11.5, color: 'var(--ink-muted)' }}>
                          {item.detailLine}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div
                  style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}
                  onClick={(e) => e.stopPropagation()}
                >
                  {item.copyValue && (
                    <button
                      type="button"
                      className="btn btn-sm"
                      onClick={() => onCopy(item.copyValue, item.copyLabel)}
                      title={item.copyLabel}
                    >
                      <Copy size={13} />
                      <span className="hide-mobile">{item.copyLabel}</span>
                    </button>
                  )}
                  {item.url && (
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noreferrer"
                      className="btn btn-icon-sm"
                      title="Buka tautan"
                    >
                      <ExternalLink size={14} />
                    </a>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

import { ChevronDown } from 'lucide-react';
import { useState } from 'react';
import {
  ACCOUNT_COLOR_PALETTE,
  ACCOUNT_PURPOSES,
  ACCOUNT_STATUS_META,
  generateId,
  parseTagsInput,
  type AccountStatus,
  type CustomField,
  type GoogleAccount,
  type PhoneNumber,
} from '../../types/models';
import { CustomFieldsEditor } from '../common/CustomFieldsEditor';
import { Modal } from '../common/Modal';

interface AccountFormModalProps {
  open: boolean;
  initial?: GoogleAccount | null;
  accounts: GoogleAccount[];
  phones: PhoneNumber[];
  onClose: () => void;
  onSave: (account: GoogleAccount) => void;
}

const PRIMARY_STATUS_OPTIONS: AccountStatus[] = [
  'Active',
  'Spare',
  'Shared',
  'Sold',
  'Issue',
  'Rarely Used',
  'Archived',
];

export function AccountFormModal({
  open,
  initial,
  accounts,
  phones,
  onClose,
  onSave,
}: AccountFormModalProps) {
  const [email, setEmail] = useState(() => initial?.email ?? '');
  const [autoGmail, setAutoGmail] = useState(true);
  const [aliasLabel, setAliasLabel] = useState(() => initial?.aliasLabel ?? '');
  const [status, setStatus] = useState<AccountStatus>(() => initial?.status ?? 'Active');
  const [passwordHint, setPasswordHint] = useState(() => initial?.passwordHint ?? '');
  const [holderName, setHolderName] = useState(() => initial?.holderName ?? '');
  const [holderUntil, setHolderUntil] = useState(() => initial?.holderUntil ?? '');
  const [quickSubName, setQuickSubName] = useState(() => initial?.quickSubName ?? '');
  const [quickSubPeriod, setQuickSubPeriod] = useState(() => initial?.quickSubPeriod ?? '');
  const [quickSubNeedsCancel, setQuickSubNeedsCancel] = useState(
    () => initial?.quickSubNeedsCancel ?? false
  );
  const [linkedPhoneId, setLinkedPhoneId] = useState(() => initial?.linkedPhoneId ?? '');
  const [notes, setNotes] = useState(() => initial?.notes ?? '');

  // Advanced / Optional Fields
  const [primaryPurpose, setPrimaryPurpose] = useState<string>(
    () => initial?.primaryPurpose ?? ACCOUNT_PURPOSES[0]
  );
  const [colorBadge, setColorBadge] = useState<string>(
    () =>
      initial?.colorBadge ??
      ACCOUNT_COLOR_PALETTE[accounts.length % ACCOUNT_COLOR_PALETTE.length].hex
  );
  const [chromeProfile, setChromeProfile] = useState(() => initial?.chromeProfile ?? '');
  const [recoveryAccountId, setRecoveryAccountId] = useState(
    () => initial?.recoveryAccountId ?? ''
  );
  const [recoveryPhoneHint, setRecoveryPhoneHint] = useState(
    () => initial?.recoveryPhoneHint ?? ''
  );
  const [has2FA, setHas2FA] = useState(() => initial?.has2FA ?? false);
  const [passwordManagerRef, setPasswordManagerRef] = useState(
    () => initial?.passwordManagerRef ?? ''
  );
  const [driveUsedGb, setDriveUsedGb] = useState(() =>
    initial?.driveUsedGb !== null && initial?.driveUsedGb !== undefined
      ? String(initial.driveUsedGb)
      : ''
  );
  const [driveLimitGb, setDriveLimitGb] = useState(() =>
    initial?.driveLimitGb !== null && initial?.driveLimitGb !== undefined
      ? String(initial.driveLimitGb)
      : ''
  );
  const [tagsText, setTagsText] = useState(() => initial?.tags.join(', ') ?? '');
  const [customFields, setCustomFields] = useState<CustomField[]>(
    () => initial?.customFields ?? []
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const rawEmail = email.trim();
    if (!rawEmail) return;
    const normalizedEmail =
      !rawEmail.includes('@') && autoGmail ? `${rawEmail}@gmail.com` : rawEmail;

    const record: GoogleAccount = {
      id: initial?.id ?? generateId('acc'),
      email: normalizedEmail,
      aliasLabel: aliasLabel.trim() || normalizedEmail.split('@')[0],
      primaryPurpose,
      colorBadge,
      chromeProfile: chromeProfile.trim(),
      status,
      passwordHint: passwordHint.trim(),
      holderName: holderName.trim(),
      holderUntil: holderUntil.trim(),
      quickSubName: quickSubName.trim(),
      quickSubPeriod: quickSubPeriod.trim(),
      quickSubNeedsCancel,
      recoveryAccountId,
      linkedPhoneId,
      recoveryPhoneHint: recoveryPhoneHint.trim(),
      has2FA,
      passwordManagerRef: passwordManagerRef.trim(),
      driveUsedGb: driveUsedGb.trim() ? Number(driveUsedGb) : null,
      driveLimitGb: driveLimitGb.trim() ? Number(driveLimitGb) : null,
      tags: parseTagsInput(tagsText),
      customFields: customFields.filter((f) => f.key.trim() || f.value.trim()),
      notes: notes.trim(),
      updatedAt: new Date().toISOString(),
    };

    onSave(record);
    onClose();
  };

  return (
    <Modal
      open={open}
      title={initial ? 'Edit Akun Email' : 'Tambah Akun Email Cepat'}
      onClose={onClose}
      wide
      footer={
        <>
          <button type="button" className="btn" onClick={onClose}>
            Batal
          </button>
          <button type="submit" form="account-form" className="btn btn-primary">
            Simpan Akun
          </button>
        </>
      }
    >
      <form
        id="account-form"
        onSubmit={handleSubmit}
        style={{ display: 'flex', flexDirection: 'column', gap: 14 }}
      >
        {/* Bagian Inti — Cepat Diisi Seperti Spreadsheet */}
        <div className="form-grid-2">
          <div className="form-field">
            <label className="form-label" htmlFor="acc-email">
              Email atau Username *
            </label>
            <input
              id="acc-email"
              type="text"
              required
              className="form-input mono"
              placeholder="mis. namaakun atau nama@gmail.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <label className="checkbox-row" style={{ fontSize: 12, color: 'var(--ink-muted)' }}>
              <input
                type="checkbox"
                checked={autoGmail}
                onChange={(e) => setAutoGmail(e.target.checked)}
              />
              <span>Otomatis lengkapi @gmail.com jika tanpa @</span>
            </label>
          </div>

          <div className="form-field">
            <label className="form-label" htmlFor="acc-status">
              Kondisi / Status Akun
            </label>
            <select
              id="acc-status"
              className="form-select"
              value={status}
              onChange={(e) => setStatus(e.target.value as AccountStatus)}
            >
              {PRIMARY_STATUS_OPTIONS.map((st) => (
                <option key={st} value={st}>
                  {ACCOUNT_STATUS_META[st].label}
                </option>
              ))}
            </select>
            <span className="form-help">Memudahkan filter akun cadangan, dipakai orang, atau sold.</span>
          </div>
        </div>

        <div className="form-grid-2">
          <div className="form-field">
            <label className="form-label" htmlFor="acc-pass-hint">
              Kode / Hint Password (Bukan Password Asli)
            </label>
            <input
              id="acc-pass-hint"
              type="text"
              className="form-input mono"
              placeholder="mis. Pola I, Pola E, Bitwarden, Dipegang ..."
              value={passwordHint}
              onChange={(e) => setPasswordHint(e.target.value)}
            />
          </div>

          <div className="form-field">
            <label className="form-label" htmlFor="acc-linked-phone">
              Kartu SIM Recovery Tertaut
            </label>
            <select
              id="acc-linked-phone"
              className="form-select"
              value={linkedPhoneId}
              onChange={(e) => setLinkedPhoneId(e.target.value)}
            >
              <option value="">— Belum ditautkan —</option>
              {phones.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.provider} · {p.phoneNumber}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Pemakai / Pembeli */}
        {(status === 'Shared' || status === 'Sold' || holderName || holderUntil) && (
          <div className="form-grid-2">
            <div className="form-field">
              <label className="form-label" htmlFor="acc-holder">
                {status === 'Sold' ? 'Nama Pembeli' : 'Dipakai Oleh (Pemegang)'}
              </label>
              <input
                id="acc-holder"
                type="text"
                className="form-input"
                placeholder="mis. Nama teman / klien / pembeli"
                value={holderName}
                onChange={(e) => setHolderName(e.target.value)}
              />
            </div>

            <div className="form-field">
              <label className="form-label" htmlFor="acc-holder-until">
                Batas Waktu Pemakaian (Opsional)
              </label>
              <input
                id="acc-holder-until"
                type="text"
                className="form-input"
                placeholder="mis. Juni 2027"
                value={holderUntil}
                onChange={(e) => setHolderUntil(e.target.value)}
              />
            </div>
          </div>
        )}

        {/* Quick Subscription & Belum Cancel */}
        <div
          style={{
            padding: 13,
            borderRadius: 12,
            background: 'var(--bg-subtle)',
            border: '1px solid var(--border-hairline)',
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
          }}
        >
          <div className="form-grid-2">
            <div className="form-field">
              <label className="form-label" htmlFor="acc-quick-sub">
                Subscription Utama (Ringkas)
              </label>
              <input
                id="acc-quick-sub"
                type="text"
                className="form-input"
                placeholder="mis. Google AI Pro, YouTube Premium"
                value={quickSubName}
                onChange={(e) => setQuickSubName(e.target.value)}
              />
            </div>

            <div className="form-field">
              <label className="form-label" htmlFor="acc-quick-period">
                Periode / Berakhir
              </label>
              <input
                id="acc-quick-period"
                type="text"
                className="form-input"
                placeholder="mis. Nov 2026 – Nov 2027"
                value={quickSubPeriod}
                onChange={(e) => setQuickSubPeriod(e.target.value)}
              />
            </div>
          </div>

          <label className="checkbox-row">
            <input
              type="checkbox"
              checked={quickSubNeedsCancel}
              onChange={(e) => setQuickSubNeedsCancel(e.target.checked)}
            />
            <span>
              Tandai <strong>Belum Cancel</strong> (muncul di pengingat &amp; filter khusus)
            </span>
          </label>
        </div>

        <div className="form-field">
          <label className="form-label" htmlFor="acc-notes">
            Catatan Singkat
          </label>
          <textarea
            id="acc-notes"
            className="form-textarea"
            style={{ minHeight: 62 }}
            placeholder="mis. perlu kartu Tri untuk recover, storage 5GB, kena refund, dll."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>

        {/* Bagian Lanjutan (Opsional — Progressive Disclosure) */}
        <details className="collapsible-section">
          <summary>
            <span>Opsi Lanjutan (Label, Profil Chrome, Recovery, Kuota Drive, Tags &amp; Custom Fields)</span>
            <ChevronDown size={15} />
          </summary>
          <div className="collapsible-body">
            <div className="form-grid-2">
              <div className="form-field">
                <label className="form-label" htmlFor="acc-alias">
                  Label / Nama Panggilan
                </label>
                <input
                  id="acc-alias"
                  type="text"
                  className="form-input"
                  placeholder="mis. Dev Cloud Utama"
                  value={aliasLabel}
                  onChange={(e) => setAliasLabel(e.target.value)}
                />
              </div>

              <div className="form-field">
                <label className="form-label" htmlFor="acc-purpose">
                  Kategori Kegunaan
                </label>
                <select
                  id="acc-purpose"
                  className="form-select"
                  value={primaryPurpose}
                  onChange={(e) => setPrimaryPurpose(e.target.value)}
                >
                  {ACCOUNT_PURPOSES.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-grid-2">
              <div className="form-field">
                <label className="form-label" htmlFor="acc-chrome">
                  Nama Profil Chrome
                </label>
                <input
                  id="acc-chrome"
                  type="text"
                  className="form-input"
                  placeholder="mis. Chrome — Dev (Hijau)"
                  value={chromeProfile}
                  onChange={(e) => setChromeProfile(e.target.value)}
                />
              </div>

              <div className="form-field">
                <span className="form-label">Warna Penanda</span>
                <div className="color-swatches" style={{ paddingTop: 4 }}>
                  {ACCOUNT_COLOR_PALETTE.map((swatch) => (
                    <button
                      key={swatch.hex}
                      type="button"
                      className={`color-swatch-btn${colorBadge === swatch.hex ? ' selected' : ''}`}
                      style={{ background: swatch.hex }}
                      title={swatch.label}
                      onClick={() => setColorBadge(swatch.hex)}
                      aria-label={`Pilih warna ${swatch.label}`}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="form-grid-2">
              <div className="form-field">
                <label className="form-label" htmlFor="acc-recovery">
                  Email Recovery (Akun Google Lain)
                </label>
                <select
                  id="acc-recovery"
                  className="form-select"
                  value={recoveryAccountId}
                  onChange={(e) => setRecoveryAccountId(e.target.value)}
                >
                  <option value="">— Tidak ada —</option>
                  {accounts
                    .filter((a) => a.id !== initial?.id)
                    .map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.email}
                      </option>
                    ))}
                </select>
              </div>

              <div className="form-field">
                <label className="form-label" htmlFor="acc-pw-ref">
                  Password Manager / Hint HP Recovery
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <input
                    id="acc-pw-ref"
                    type="text"
                    className="form-input"
                    placeholder="Bitwarden"
                    value={passwordManagerRef}
                    onChange={(e) => setPasswordManagerRef(e.target.value)}
                  />
                  <input
                    aria-label="Hint nomor pemulihan"
                    type="text"
                    className="form-input mono"
                    placeholder="HP ...8912"
                    value={recoveryPhoneHint}
                    onChange={(e) => setRecoveryPhoneHint(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className="form-grid-2">
              <div className="form-field">
                <label className="form-label" htmlFor="acc-drive-used">
                  Drive Terpakai / Kuota (GB)
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <input
                    id="acc-drive-used"
                    type="number"
                    step="0.1"
                    min="0"
                    className="form-input mono"
                    placeholder="Terpakai"
                    value={driveUsedGb}
                    onChange={(e) => setDriveUsedGb(e.target.value)}
                  />
                  <input
                    aria-label="Kuota total Drive"
                    type="number"
                    step="1"
                    min="1"
                    className="form-input mono"
                    placeholder="Total (15/200)"
                    value={driveLimitGb}
                    onChange={(e) => setDriveLimitGb(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-field">
                <label className="form-label" htmlFor="acc-tags">
                  Tags (pisahkan koma)
                </label>
                <input
                  id="acc-tags"
                  type="text"
                  className="form-input"
                  placeholder="gcp, ai, tumbal"
                  value={tagsText}
                  onChange={(e) => setTagsText(e.target.value)}
                />
              </div>
            </div>

            <label className="checkbox-row">
              <input
                type="checkbox"
                checked={has2FA}
                onChange={(e) => setHas2FA(e.target.checked)}
              />
              <span>2FA / Passkey aktif</span>
            </label>

            <CustomFieldsEditor fields={customFields} onChange={setCustomFields} />
          </div>
        </details>
      </form>
    </Modal>
  );
}

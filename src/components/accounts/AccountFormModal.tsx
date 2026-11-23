import { useState } from 'react';
import {
  ACCOUNT_COLOR_PALETTE,
  ACCOUNT_PURPOSES,
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

export function AccountFormModal({
  open,
  initial,
  accounts,
  phones,
  onClose,
  onSave,
}: AccountFormModalProps) {
  const [email, setEmail] = useState(() => initial?.email ?? '');
  const [aliasLabel, setAliasLabel] = useState(() => initial?.aliasLabel ?? '');
  const [primaryPurpose, setPrimaryPurpose] = useState<string>(
    () => initial?.primaryPurpose ?? ACCOUNT_PURPOSES[0]
  );
  const [colorBadge, setColorBadge] = useState<string>(
    () =>
      initial?.colorBadge ??
      ACCOUNT_COLOR_PALETTE[accounts.length % ACCOUNT_COLOR_PALETTE.length].hex
  );
  const [chromeProfile, setChromeProfile] = useState(() => initial?.chromeProfile ?? '');
  const [status, setStatus] = useState<AccountStatus>(() => initial?.status ?? 'Active');
  const [recoveryAccountId, setRecoveryAccountId] = useState(
    () => initial?.recoveryAccountId ?? ''
  );
  const [linkedPhoneId, setLinkedPhoneId] = useState(() => initial?.linkedPhoneId ?? '');
  const [recoveryPhoneHint, setRecoveryPhoneHint] = useState(
    () => initial?.recoveryPhoneHint ?? ''
  );
  const [has2FA, setHas2FA] = useState(() => initial?.has2FA ?? true);
  const [passwordManagerRef, setPasswordManagerRef] = useState(
    () => initial?.passwordManagerRef ?? 'Bitwarden'
  );
  const [driveUsedGb, setDriveUsedGb] = useState(() =>
    initial?.driveUsedGb !== null && initial?.driveUsedGb !== undefined
      ? String(initial.driveUsedGb)
      : ''
  );
  const [driveLimitGb, setDriveLimitGb] = useState(() =>
    initial?.driveLimitGb !== null && initial?.driveLimitGb !== undefined
      ? String(initial.driveLimitGb)
      : '15'
  );
  const [tagsText, setTagsText] = useState(() => initial?.tags.join(', ') ?? '');
  const [customFields, setCustomFields] = useState<CustomField[]>(
    () => initial?.customFields ?? []
  );
  const [notes, setNotes] = useState(() => initial?.notes ?? '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    const record: GoogleAccount = {
      id: initial?.id ?? generateId('acc'),
      email: email.trim(),
      aliasLabel: aliasLabel.trim() || email.trim().split('@')[0],
      primaryPurpose,
      colorBadge,
      chromeProfile: chromeProfile.trim(),
      status,
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
      title={initial ? 'Edit Akun Google' : 'Tambah Akun Google Baru'}
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
        <div className="form-grid-2">
          <div className="form-field">
            <label className="form-label" htmlFor="acc-email">
              Alamat Email Google *
            </label>
            <input
              id="acc-email"
              type="email"
              required
              className="form-input mono"
              placeholder="nama.akun@gmail.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="form-field">
            <label className="form-label" htmlFor="acc-alias">
              Label / Nama Panggilan
            </label>
            <input
              id="acc-alias"
              type="text"
              className="form-input"
              placeholder="mis. Dev Cloud Utama, Personal Banking"
              value={aliasLabel}
              onChange={(e) => setAliasLabel(e.target.value)}
            />
          </div>
        </div>

        <div className="form-grid-2">
          <div className="form-field">
            <label className="form-label" htmlFor="acc-purpose">
              Kegunaan Utama
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

          <div className="form-field">
            <label className="form-label" htmlFor="acc-status">
              Status Akun
            </label>
            <select
              id="acc-status"
              className="form-select"
              value={status}
              onChange={(e) => setStatus(e.target.value as AccountStatus)}
            >
              <option value="Active">Active</option>
              <option value="Rarely Used">Rarely Used (Jarang Dipakai)</option>
              <option value="Suspended">Suspended</option>
              <option value="Archived">Archived</option>
            </select>
          </div>
        </div>

        <div className="form-grid-2">
          <div className="form-field">
            <label className="form-label" htmlFor="acc-chrome">
              Nama Profil Browser / Chrome
            </label>
            <input
              id="acc-chrome"
              type="text"
              className="form-input"
              placeholder="mis. Chrome — Dev & Cloud (Hijau)"
              value={chromeProfile}
              onChange={(e) => setChromeProfile(e.target.value)}
            />
          </div>

          <div className="form-field">
            <span className="form-label">Warna Penanda (Samakan dengan Chrome)</span>
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
            <label className="form-label" htmlFor="acc-linked-phone">
              Kartu SIM / Nomor HP Tertaut (OTP &amp; Recovery)
            </label>
            <select
              id="acc-linked-phone"
              className="form-select"
              value={linkedPhoneId}
              onChange={(e) => setLinkedPhoneId(e.target.value)}
            >
              <option value="">— Belum ditautkan ke daftar SIM —</option>
              {phones.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.phoneNumber} ({p.provider} — {p.label || p.deviceSlot})
                </option>
              ))}
            </select>
          </div>

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
              <option value="">— Tidak ada / email eksternal —</option>
              {accounts
                .filter((a) => a.id !== initial?.id)
                .map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.email} ({a.aliasLabel})
                  </option>
                ))}
            </select>
          </div>
        </div>

        <div className="form-grid-2">
          <div className="form-field">
            <label className="form-label" htmlFor="acc-pw-ref">
              Lokasi Password (Bukan Password Asli!)
            </label>
            <input
              id="acc-pw-ref"
              type="text"
              className="form-input"
              placeholder="mis. Bitwarden, Apple Passwords, 1Password"
              value={passwordManagerRef}
              onChange={(e) => setPasswordManagerRef(e.target.value)}
            />
          </div>

          <div className="form-field">
            <label className="form-label" htmlFor="acc-phone-hint">
              Hint Nomor Pemulihan (Opsional)
            </label>
            <input
              id="acc-phone-hint"
              type="text"
              className="form-input mono"
              placeholder="mis. ...8912"
              value={recoveryPhoneHint}
              onChange={(e) => setRecoveryPhoneHint(e.target.value)}
            />
          </div>
        </div>

        <div className="form-grid-2">
          <div className="form-field">
            <label className="form-label" htmlFor="acc-drive-used">
              Google Drive Terpakai (GB)
            </label>
            <input
              id="acc-drive-used"
              type="number"
              step="0.1"
              min="0"
              className="form-input mono"
              placeholder="mis. 12.5"
              value={driveUsedGb}
              onChange={(e) => setDriveUsedGb(e.target.value)}
            />
          </div>

          <div className="form-field">
            <label className="form-label" htmlFor="acc-drive-limit">
              Kuota Total Drive (GB)
            </label>
            <input
              id="acc-drive-limit"
              type="number"
              step="1"
              min="1"
              className="form-input mono"
              placeholder="15 / 100 / 200 / 2000"
              value={driveLimitGb}
              onChange={(e) => setDriveLimitGb(e.target.value)}
            />
          </div>
        </div>

        <label className="checkbox-row">
          <input
            type="checkbox"
            checked={has2FA}
            onChange={(e) => setHas2FA(e.target.checked)}
          />
          <span>Verifikasi 2 Langkah (2FA / Passkey) sudah aktif pada akun ini</span>
        </label>

        <div className="form-field">
          <label className="form-label" htmlFor="acc-tags">
            Tags (pisahkan dengan koma)
          </label>
          <input
            id="acc-tags"
            type="text"
            className="form-input"
            placeholder="gcp, produksi, google-one, utama"
            value={tagsText}
            onChange={(e) => setTagsText(e.target.value)}
          />
        </div>

        <CustomFieldsEditor fields={customFields} onChange={setCustomFields} />

        <div className="form-field">
          <label className="form-label" htmlFor="acc-notes">
            Catatan Bebas
          </label>
          <textarea
            id="acc-notes"
            className="form-textarea"
            placeholder="Catatan tambahan mengenai kegunaan akun, proyek terkait, atau pengingat khusus..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>
      </form>
    </Modal>
  );
}

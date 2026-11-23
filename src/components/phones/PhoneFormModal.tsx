import { ChevronDown } from 'lucide-react';
import { useState } from 'react';
import {
  generateId,
  parseTagsInput,
  SIM_PROVIDERS,
  type CustomField,
  type PhoneNumber,
  type SimManualStatus,
  type SimType,
} from '../../types/models';
import { addDaysToIso, normalizePhoneNumber } from '../../utils/simStatus';
import { CustomFieldsEditor } from '../common/CustomFieldsEditor';
import { Modal } from '../common/Modal';

interface PhoneFormModalProps {
  open: boolean;
  initial?: PhoneNumber | null;
  onClose: () => void;
  onSave: (phone: PhoneNumber) => void;
}

export function PhoneFormModal({ open, initial, onClose, onSave }: PhoneFormModalProps) {
  const [provider, setProvider] = useState<string>(() => initial?.provider ?? SIM_PROVIDERS[0]);
  const [phoneNumber, setPhoneNumber] = useState(() => initial?.phoneNumber ?? '');
  const [noExpiry, setNoExpiry] = useState(() => initial?.noExpiry ?? false);
  const [activeUntil, setActiveUntil] = useState(() => initial?.activeUntil ?? '');
  const [graceUntil, setGraceUntil] = useState(() => initial?.graceUntil ?? '');

  // Optional / Advanced details (collapsed by default)
  const [label, setLabel] = useState(() => initial?.label ?? '');
  const [simType, setSimType] = useState<SimType>(() => initial?.simType ?? 'SIM Fisik');
  const [deviceSlot, setDeviceSlot] = useState(() => initial?.deviceSlot ?? '');
  const [usagePurpose, setUsagePurpose] = useState(() => initial?.usagePurpose ?? '');
  const [renewalTip, setRenewalTip] = useState(() => initial?.renewalTip ?? '');
  const [linkedServicesText, setLinkedServicesText] = useState(
    () => initial?.linkedServices.join(', ') ?? ''
  );
  const [manualStatus, setManualStatus] = useState<SimManualStatus>(
    () => initial?.manualStatus ?? 'Active'
  );
  const [tagsText, setTagsText] = useState(() => initial?.tags.join(', ') ?? '');
  const [customFields, setCustomFields] = useState<CustomField[]>(
    () => initial?.customFields ?? []
  );
  const [notes, setNotes] = useState(() => initial?.notes ?? '');

  const handleActiveDateChange = (nextDate: string) => {
    setActiveUntil(nextDate);
    if (nextDate && !graceUntil) {
      setGraceUntil(addDaysToIso(nextDate, 30));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const normalized = normalizePhoneNumber(phoneNumber);
    if (!normalized) return;

    const record: PhoneNumber = {
      id: initial?.id ?? generateId('sim'),
      phoneNumber: normalized,
      label: label.trim(),
      provider,
      simType,
      deviceSlot: deviceSlot.trim(),
      usagePurpose: usagePurpose.trim(),
      noExpiry,
      activeUntil: noExpiry ? '' : activeUntil,
      graceUntil: noExpiry ? '' : graceUntil,
      renewalTip: renewalTip.trim(),
      linkedServices: parseTagsInput(linkedServicesText),
      manualStatus,
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
      title={initial ? 'Edit Kartu SIM / Nomor HP' : 'Tambah Nomor HP Cepat'}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn" onClick={onClose}>
            Batal
          </button>
          <button type="submit" form="phone-form" className="btn btn-primary">
            Simpan Nomor HP
          </button>
        </>
      }
    >
      <form
        id="phone-form"
        onSubmit={handleSubmit}
        style={{ display: 'flex', flexDirection: 'column', gap: 14 }}
      >
        {/* 4 Field Inti — Seringkas Tab "nomor" */}
        <div className="form-grid-2">
          <div className="form-field">
            <label className="form-label" htmlFor="sim-provider">
              Kartu / Provider *
            </label>
            <select
              id="sim-provider"
              className="form-select"
              value={provider}
              onChange={(e) => {
                const next = e.target.value;
                setProvider(next);
                if ((next === 'XL Prio' || next === 'by.U') && !initial) {
                  setNoExpiry(true);
                }
              }}
            >
              {SIM_PROVIDERS.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>

          <div className="form-field">
            <label className="form-label" htmlFor="sim-number">
              Nomor HP *
            </label>
            <input
              id="sim-number"
              type="text"
              required
              className="form-input mono"
              placeholder="0812-3456-7890"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
            />
            <span className="form-help">Angka 0 di depan dijaga otomatis.</span>
          </div>
        </div>

        <label className="checkbox-row">
          <input
            type="checkbox"
            checked={noExpiry}
            onChange={(e) => setNoExpiry(e.target.checked)}
          />
          <span>Pascabayar / Tanpa masa tenggang (contoh: XL Prio, by.U)</span>
        </label>

        {!noExpiry && (
          <div className="form-grid-2">
            <div className="form-field">
              <label className="form-label" htmlFor="sim-active-until">
                Tanggal Masa Tenggang (Akhir Aktif)
              </label>
              <input
                id="sim-active-until"
                type="date"
                className="form-input mono"
                value={activeUntil}
                onChange={(e) => handleActiveDateChange(e.target.value)}
              />
            </div>

            <div className="form-field">
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <label className="form-label" htmlFor="sim-grace-until">
                  Tanggal Mati (Hangus)
                </label>
                {activeUntil && (
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    style={{ height: 22, padding: '0 6px', fontSize: 11 }}
                    onClick={() => setGraceUntil(addDaysToIso(activeUntil, 30))}
                  >
                    +30h
                  </button>
                )}
              </div>
              <input
                id="sim-grace-until"
                type="date"
                className="form-input mono"
                value={graceUntil}
                onChange={(e) => setGraceUntil(e.target.value)}
              />
            </div>
          </div>
        )}

        {/* Opsi Lanjutan — Dilipat Rapi */}
        <details className="collapsible-section">
          <summary>
            <span>Opsi Lanjutan (Label, Slot HP, Tips Perpanjangan, Layanan &amp; Catatan)</span>
            <ChevronDown size={15} />
          </summary>
          <div className="collapsible-body">
            <div className="form-grid-2">
              <div className="form-field">
                <label className="form-label" htmlFor="sim-label">
                  Label / Panggilan
                </label>
                <input
                  id="sim-label"
                  type="text"
                  className="form-input"
                  placeholder="mis. Utama, OTP Cloud"
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                />
              </div>

              <div className="form-field">
                <label className="form-label" htmlFor="sim-type">
                  Jenis SIM &amp; Status
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <select
                    id="sim-type"
                    className="form-select"
                    value={simType}
                    onChange={(e) => setSimType(e.target.value as SimType)}
                  >
                    <option value="SIM Fisik">SIM Fisik</option>
                    <option value="eSIM">eSIM</option>
                  </select>
                  <select
                    aria-label="Status manual kartu"
                    className="form-select"
                    value={manualStatus}
                    onChange={(e) => setManualStatus(e.target.value as SimManualStatus)}
                  >
                    <option value="Active">Aktif</option>
                    <option value="Suspended">Nonaktif</option>
                    <option value="Archived">Arsip</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="form-grid-2">
              <div className="form-field">
                <label className="form-label" htmlFor="sim-slot">
                  Lokasi HP / Slot SIM
                </label>
                <input
                  id="sim-slot"
                  type="text"
                  className="form-input"
                  placeholder="mis. HP Utama — SIM 1"
                  value={deviceSlot}
                  onChange={(e) => setDeviceSlot(e.target.value)}
                />
              </div>

              <div className="form-field">
                <label className="form-label" htmlFor="sim-usage">
                  Kegunaan
                </label>
                <input
                  id="sim-usage"
                  type="text"
                  className="form-input"
                  placeholder="mis. WhatsApp, Banking, OTP"
                  value={usagePurpose}
                  onChange={(e) => setUsagePurpose(e.target.value)}
                />
              </div>
            </div>

            <div className="form-field">
              <label className="form-label" htmlFor="sim-renewal-tip">
                Tips Perpanjangan
              </label>
              <input
                id="sim-renewal-tip"
                type="text"
                className="form-input"
                placeholder="mis. Isi pulsa Rp5.000 atau beli paket masa aktif"
                value={renewalTip}
                onChange={(e) => setRenewalTip(e.target.value)}
              />
            </div>

            <div className="form-grid-2">
              <div className="form-field">
                <label className="form-label" htmlFor="sim-services">
                  Layanan Non-Google (koma)
                </label>
                <input
                  id="sim-services"
                  type="text"
                  className="form-input"
                  placeholder="WhatsApp, BCA Mobile"
                  value={linkedServicesText}
                  onChange={(e) => setLinkedServicesText(e.target.value)}
                />
              </div>

              <div className="form-field">
                <label className="form-label" htmlFor="sim-tags">
                  Tags (koma)
                </label>
                <input
                  id="sim-tags"
                  type="text"
                  className="form-input"
                  placeholder="otp, utama"
                  value={tagsText}
                  onChange={(e) => setTagsText(e.target.value)}
                />
              </div>
            </div>

            <CustomFieldsEditor fields={customFields} onChange={setCustomFields} />

            <div className="form-field">
              <label className="form-label" htmlFor="sim-notes">
                Catatan
              </label>
              <textarea
                id="sim-notes"
                className="form-textarea"
                style={{ minHeight: 60 }}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>
        </details>
      </form>
    </Modal>
  );
}

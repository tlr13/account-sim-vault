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
import { addDaysToIso } from '../../utils/simStatus';
import { CustomFieldsEditor } from '../common/CustomFieldsEditor';
import { Modal } from '../common/Modal';

interface PhoneFormModalProps {
  open: boolean;
  initial?: PhoneNumber | null;
  onClose: () => void;
  onSave: (phone: PhoneNumber) => void;
}

export function PhoneFormModal({ open, initial, onClose, onSave }: PhoneFormModalProps) {
  const [phoneNumber, setPhoneNumber] = useState(() => initial?.phoneNumber ?? '');
  const [label, setLabel] = useState(() => initial?.label ?? '');
  const [provider, setProvider] = useState<string>(() => initial?.provider ?? SIM_PROVIDERS[0]);
  const [simType, setSimType] = useState<SimType>(() => initial?.simType ?? 'SIM Fisik');
  const [deviceSlot, setDeviceSlot] = useState(() => initial?.deviceSlot ?? '');
  const [usagePurpose, setUsagePurpose] = useState(() => initial?.usagePurpose ?? '');
  const [noExpiry, setNoExpiry] = useState(() => initial?.noExpiry ?? false);
  const [activeUntil, setActiveUntil] = useState(() => initial?.activeUntil ?? '');
  const [graceUntil, setGraceUntil] = useState(() => initial?.graceUntil ?? '');
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
    if (!phoneNumber.trim()) return;

    const record: PhoneNumber = {
      id: initial?.id ?? generateId('sim'),
      phoneNumber: phoneNumber.trim(),
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
      title={initial ? 'Edit Kartu SIM / Nomor HP' : 'Tambah Nomor HP & Kartu SIM'}
      onClose={onClose}
      wide
      footer={
        <>
          <button type="button" className="btn" onClick={onClose}>
            Batal
          </button>
          <button type="submit" form="phone-form" className="btn btn-primary">
            Simpan Kartu SIM
          </button>
        </>
      }
    >
      <form
        id="phone-form"
        onSubmit={handleSubmit}
        style={{ display: 'flex', flexDirection: 'column', gap: 14 }}
      >
        <div className="form-grid-2">
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
          </div>

          <div className="form-field">
            <label className="form-label" htmlFor="sim-label">
              Label / Nama Panggilan
            </label>
            <input
              id="sim-label"
              type="text"
              className="form-input"
              placeholder="mis. Utama Harian, Khusus OTP Cloud"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
            />
          </div>
        </div>

        <div className="form-grid-2">
          <div className="form-field">
            <label className="form-label" htmlFor="sim-provider">
              Provider Seluler
            </label>
            <select
              id="sim-provider"
              className="form-select"
              value={provider}
              onChange={(e) => {
                const next = e.target.value;
                setProvider(next);
                if (next === 'by.U' && !initial) setNoExpiry(true);
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
            <label className="form-label" htmlFor="sim-type">
              Jenis Kartu &amp; Status
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
                <option value="Suspended">Nonaktif Sementara</option>
                <option value="Archived">Arsip / Hangus</option>
              </select>
            </div>
          </div>
        </div>

        <div className="form-grid-2">
          <div className="form-field">
            <label className="form-label" htmlFor="sim-slot">
              Lokasi Perangkat / Slot SIM
            </label>
            <input
              id="sim-slot"
              type="text"
              className="form-input"
              placeholder="mis. HP Utama — SIM 1, HP Cadangan — SIM 2"
              value={deviceSlot}
              onChange={(e) => setDeviceSlot(e.target.value)}
            />
          </div>

          <div className="form-field">
            <label className="form-label" htmlFor="sim-usage">
              Kegunaan Utama
            </label>
            <input
              id="sim-usage"
              type="text"
              className="form-input"
              placeholder="mis. WhatsApp utama, Banking, OTP Akun Dev"
              value={usagePurpose}
              onChange={(e) => setUsagePurpose(e.target.value)}
            />
          </div>
        </div>

        <label className="checkbox-row">
          <input
            type="checkbox"
            checked={noExpiry}
            onChange={(e) => setNoExpiry(e.target.checked)}
          />
          <span>Kartu tanpa masa aktif tetap (contoh: by.U / pascabayar)</span>
        </label>

        {!noExpiry && (
          <div className="form-grid-2">
            <div className="form-field">
              <label className="form-label" htmlFor="sim-active-until">
                Akhir Masa Aktif
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
                  Akhir Masa Tenggang (Batas Hangus)
                </label>
                {activeUntil && (
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    style={{ height: 22, padding: '0 6px', fontSize: 11 }}
                    onClick={() => setGraceUntil(addDaysToIso(activeUntil, 30))}
                  >
                    +30h dari aktif
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

        <div className="form-field">
          <label className="form-label" htmlFor="sim-renewal-tip">
            Catatan Cara Perpanjangan Termurah / Tercepat
          </label>
          <input
            id="sim-renewal-tip"
            type="text"
            className="form-input"
            placeholder="mis. Beli paket Masa Aktif 90 hari di MyTelkomsel atau isi pulsa Rp5.000"
            value={renewalTip}
            onChange={(e) => setRenewalTip(e.target.value)}
          />
        </div>

        <div className="form-grid-2">
          <div className="form-field">
            <label className="form-label" htmlFor="sim-services">
              Layanan Non-Google Tertaut (pisahkan koma)
            </label>
            <input
              id="sim-services"
              type="text"
              className="form-input"
              placeholder="WhatsApp, BCA Mobile, GoPay, Telegram"
              value={linkedServicesText}
              onChange={(e) => setLinkedServicesText(e.target.value)}
            />
          </div>

          <div className="form-field">
            <label className="form-label" htmlFor="sim-tags">
              Tags (pisahkan koma)
            </label>
            <input
              id="sim-tags"
              type="text"
              className="form-input"
              placeholder="utama, otp, cadangan"
              value={tagsText}
              onChange={(e) => setTagsText(e.target.value)}
            />
          </div>
        </div>

        <CustomFieldsEditor fields={customFields} onChange={setCustomFields} />

        <div className="form-field">
          <label className="form-label" htmlFor="sim-notes">
            Catatan Tambahan
          </label>
          <textarea
            id="sim-notes"
            className="form-textarea"
            placeholder="Catatan paket, lokasi fisik SIM jika dilepas, dll."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>
      </form>
    </Modal>
  );
}

import { RefreshCw } from 'lucide-react';
import { useState } from 'react';
import type { PhoneNumber } from '../../types/models';
import { extendSimDates, formatDateID } from '../../utils/simStatus';
import { Modal } from '../common/Modal';

interface ExtendSimModalProps {
  phone: PhoneNumber;
  onClose: () => void;
  onConfirm: (phone: PhoneNumber, nextActiveUntil: string, nextGraceUntil: string) => void;
}

const PRESET_DAYS = [
  { label: '+30 Hari', days: 30 },
  { label: '+60 Hari', days: 60 },
  { label: '+90 Hari', days: 90 },
  { label: '+180 Hari', days: 180 },
  { label: '+365 Hari', days: 365 },
];

export function ExtendSimModal({ phone, onClose, onConfirm }: ExtendSimModalProps) {
  const initialPreview = extendSimDates(phone, 30, 30);
  const [activeUntil, setActiveUntil] = useState(initialPreview.activeUntil);
  const [graceUntil, setGraceUntil] = useState(initialPreview.graceUntil);
  const [graceDays, setGraceDays] = useState(30);

  const applyPreset = (days: number) => {
    const next = extendSimDates(phone, days, graceDays);
    setActiveUntil(next.activeUntil);
    setGraceUntil(next.graceUntil);
  };

  return (
    <Modal
      open={Boolean(phone)}
      title={`Perpanjang Masa Aktif — ${phone.provider}`}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn" onClick={onClose}>
            Batal
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => {
              onConfirm(phone, activeUntil, graceUntil);
              onClose();
            }}
          >
            <RefreshCw size={14} /> Simpan Tanggal Baru
          </button>
        </>
      }
    >
      <div className="callout-box">
        <div>
          <strong className="mono">{phone.phoneNumber}</strong> ({phone.label || phone.deviceSlot})
          <div style={{ fontSize: 12, marginTop: 3 }}>
            Saat ini — Masa Aktif: <strong>{formatDateID(phone.activeUntil)}</strong> · Masa
            Tenggang: <strong>{formatDateID(phone.graceUntil)}</strong>
          </div>
          {phone.renewalTip && (
            <div style={{ fontSize: 12, marginTop: 4 }}>Tips: {phone.renewalTip}</div>
          )}
        </div>
      </div>

      <div className="form-field">
        <span className="form-label">Tambah Cepat Masa Aktif</span>
        <div className="filter-bar">
          {PRESET_DAYS.map((preset) => (
            <button
              key={preset.days}
              type="button"
              className="btn btn-sm"
              onClick={() => applyPreset(preset.days)}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      <div className="form-grid-2">
        <div className="form-field">
          <label className="form-label" htmlFor="ext-active">
            Masa Aktif Baru Sampai
          </label>
          <input
            id="ext-active"
            type="date"
            className="form-input mono"
            value={activeUntil}
            onChange={(e) => setActiveUntil(e.target.value)}
          />
        </div>

        <div className="form-field">
          <label className="form-label" htmlFor="ext-grace">
            Masa Tenggang Baru Sampai
          </label>
          <input
            id="ext-grace"
            type="date"
            className="form-input mono"
            value={graceUntil}
            onChange={(e) => setGraceUntil(e.target.value)}
          />
        </div>
      </div>

      <div className="form-field">
        <label className="form-label" htmlFor="ext-grace-days">
          Durasi Masa Tenggang Default Provider (Hari setelah Masa Aktif)
        </label>
        <input
          id="ext-grace-days"
          type="number"
          min="7"
          max="90"
          className="form-input mono"
          style={{ maxWidth: 140 }}
          value={graceDays}
          onChange={(e) => setGraceDays(Number(e.target.value) || 30)}
        />
      </div>
    </Modal>
  );
}

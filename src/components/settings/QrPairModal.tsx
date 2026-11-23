import { Copy, QrCode, Smartphone } from 'lucide-react';
import QRCode from 'qrcode';
import { useEffect, useMemo, useState } from 'react';
import { buildPairingUrl } from '../../services/storage/GoogleSheetsStorageProvider';
import type { SyncSettings } from '../../types/models';
import { Modal } from '../common/Modal';

interface QrPairModalProps {
  open: boolean;
  settings: SyncSettings;
  onClose: () => void;
  onCopy: (text: string, label: string) => void;
}

export function QrPairModal({ open, settings, onClose, onCopy }: QrPairModalProps) {
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [renderError, setRenderError] = useState('');

  const pairing = useMemo(() => {
    try {
      return { url: buildPairingUrl(settings, window.location.href), error: '' };
    } catch (e) {
      return {
        url: '',
        error: e instanceof Error ? e.message : 'Konfigurasi belum lengkap.',
      };
    }
  }, [settings]);

  useEffect(() => {
    if (!open || !pairing.url) return;
    let active = true;
    QRCode.toDataURL(pairing.url, {
      width: 260,
      margin: 2,
      color: { dark: '#171717', light: '#FFFFFF' },
    })
      .then((img) => {
        if (!active) return;
        setQrDataUrl(img);
        setRenderError('');
      })
      .catch(() => {
        if (active) setRenderError('Gagal membuat gambar QR Code.');
      });
    return () => {
      active = false;
    };
  }, [open, pairing.url]);

  const err = pairing.error || renderError;

  return (
    <Modal
      open={open}
      title="Hubungkan HP dengan Scan QR"
      onClose={onClose}
      footer={
        <>
          {pairing.url && (
            <button
              type="button"
              className="btn"
              onClick={() => onCopy(pairing.url, 'Link Pairing disalin')}
            >
              <Copy size={14} /> Salin Link Pairing
            </button>
          )}
          <button type="button" className="btn btn-primary" onClick={onClose}>
            Selesai
          </button>
        </>
      }
    >
      <div className="callout-box">
        <Smartphone size={18} style={{ flexShrink: 0, marginTop: 2 }} />
        <div>
          Scan QR Code di bawah memakai kamera HP. AccVault di HP akan langsung terbuka dengan
          konfigurasi <strong>{settings.mode === 'gsheets' ? 'Google Sheets' : 'GitHub'}</strong>{' '}
          sudah terisi otomatis &amp; langsung menarik data terbaru.
        </div>
      </div>

      {err ? (
        <div
          className="callout-box"
          style={{
            background: 'var(--danger-soft)',
            borderColor: 'var(--danger-border)',
            color: 'var(--danger)',
          }}
        >
          {err}
        </div>
      ) : qrDataUrl ? (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 10,
            padding: '12px 0',
          }}
        >
          <div
            style={{
              padding: 12,
              background: '#FFFFFF',
              borderRadius: 16,
              border: '1px solid var(--border-hairline)',
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            <img
              src={qrDataUrl}
              alt="QR Code Hubungkan HP ke AccVault"
              width={240}
              height={240}
              style={{ display: 'block' }}
            />
          </div>
          <span style={{ fontSize: 12, color: 'var(--ink-muted)', textAlign: 'center' }}>
            QR dibuat 100% lokal di browser ini (tidak dikirim ke server luar).
          </span>
        </div>
      ) : (
        <div style={{ textAlign: 'center', padding: 24, color: 'var(--ink-muted)' }}>
          <QrCode size={28} />
          <div>Menyiapkan QR Code...</div>
        </div>
      )}
    </Modal>
  );
}

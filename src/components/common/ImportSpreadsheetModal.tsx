import { CheckCircle2, FileSpreadsheet, ShieldAlert, Upload } from 'lucide-react';
import { useRef, useState } from 'react';
import {
  parseSpreadsheetFile,
  type SpreadsheetImportSummary,
} from '../../utils/backupIO';
import { Modal } from './Modal';

interface ImportSpreadsheetModalProps {
  open: boolean;
  onClose: () => void;
  onConfirmImport: (summary: SpreadsheetImportSummary, mode: 'merge' | 'replace') => void;
}

export function ImportSpreadsheetModal({
  open,
  onClose,
  onConfirmImport,
}: ImportSpreadsheetModalProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fileName, setFileName] = useState('');
  const [preview, setPreview] = useState<SpreadsheetImportSummary | null>(null);
  const [mode, setMode] = useState<'merge' | 'replace'>('merge');

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    setError('');
    setFileName(file.name);
    try {
      const buffer = await file.arrayBuffer();
      const parsed = await parseSpreadsheetFile(buffer);
      if (parsed.accounts.length === 0 && parsed.phones.length === 0) {
        setError(
          'Tidak ditemukan sheet akun email atau nomor HP yang dikenali. Pastikan ada baris judul kolom "email" atau "Kartu" & "Nomor HP".'
        );
        setPreview(null);
      } else {
        setPreview(parsed);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal membaca file spreadsheet.');
      setPreview(null);
    } finally {
      setLoading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  return (
    <Modal
      open={open}
      title="Import dari Excel (.xlsx) atau CSV"
      onClose={onClose}
      wide
      footer={
        <>
          <button type="button" className="btn" onClick={onClose}>
            Batal
          </button>
          <button
            type="button"
            className="btn btn-primary"
            disabled={!preview}
            onClick={() => {
              if (!preview) return;
              onConfirmImport(preview, mode);
              onClose();
            }}
          >
            <CheckCircle2 size={15} /> Import Sekarang
          </button>
        </>
      }
    >
      <div className="callout-box">
        <FileSpreadsheet size={18} style={{ flexShrink: 0, marginTop: 2 }} />
        <div>
          <strong>Format yang didukung otomatis:</strong>
          <div style={{ marginTop: 4, fontSize: 12.5 }}>
            1) File <code>.xlsx</code> hasil export Google Sheets / Excel yang memiliki tab akun
            email (kolom <code>email</code>, <code>pass</code>, <code>kondisi</code>,{' '}
            <code>subscription</code>, <code>belum cancel</code>) dan/atau tab nomor HP (kolom{' '}
            <code>Kartu</code>, <code>Nomor HP</code>, <code>Masa Tenggang</code>, <code>Mati</code>
            ).
            <br />
            2) File <code>.xlsx</code> hasil backup AccVault atau file <code>.csv</code> tunggal.
          </div>
        </div>
      </div>

      <div>
        <input
          ref={fileRef}
          type="file"
          accept=".xlsx,.xls,.csv,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          style={{ display: 'none' }}
          onChange={handleFileChange}
        />
        <button
          type="button"
          className="btn"
          style={{ width: '100%', height: 48, borderStyle: 'dashed' }}
          disabled={loading}
          onClick={() => fileRef.current?.click()}
        >
          <Upload size={16} />
          {loading
            ? 'Membaca & menganalisis spreadsheet...'
            : fileName
              ? `Ganti File (${fileName})`
              : 'Pilih File Excel (.xlsx) atau CSV'}
        </button>
      </div>

      {error && (
        <div
          className="callout-box"
          style={{
            background: 'var(--danger-soft)',
            borderColor: 'var(--danger-border)',
            color: 'var(--danger)',
          }}
        >
          {error}
        </div>
      )}

      {preview && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="callout-box success">
            <CheckCircle2 size={18} style={{ flexShrink: 0, marginTop: 2 }} />
            <div>
              <strong>Terdeteksi dari sheet: {preview.detectedSheets.join(', ')}</strong>
              <div style={{ marginTop: 4 }}>
                • <strong>{preview.accounts.length} Akun Email</strong> (otomatis dilengkapi{' '}
                <code>@gmail.com</code>, status <em>Sold / Dipakai / Cadangan</em> &amp; tanda{' '}
                <em>Belum Cancel</em> terpetakan)
                <br />• <strong>{preview.phones.length} Kartu SIM / Nomor HP</strong> (otomatis
                diperbaiki angka <code>0</code> di depan &amp; mode pascabayar)
              </div>
            </div>
          </div>

          {preview.redactedSecretsCount > 0 && (
            <div className="callout-box warning">
              <ShieldAlert size={18} style={{ flexShrink: 0, marginTop: 2 }} />
              <div>
                <strong>Perlindungan Keamanan Aktif:</strong> {preview.redactedSecretsCount} baris
                berisi teks panjang yang tampak seperti password mentah{' '}
                <strong>otomatis disensor</strong> saat import (kode pola singkat seperti{' '}
                <code>i</code> / <code>e</code> tetap disimpan). Pastikan password aslinya disimpan
                di Password Manager.
              </div>
            </div>
          )}

          <div className="form-field">
            <span className="form-label">Cara Menggabungkan Data</span>
            <div className="filter-bar">
              <button
                type="button"
                className={`chip-filter${mode === 'merge' ? ' active' : ''}`}
                onClick={() => setMode('merge')}
              >
                Gabungkan (Tambahkan yang belum ada)
              </button>
              <button
                type="button"
                className={`chip-filter${mode === 'replace' ? ' active' : ''}`}
                onClick={() => setMode('replace')}
              >
                Ganti Semua Data Saat Ini
              </button>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}

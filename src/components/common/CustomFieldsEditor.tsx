import { Plus, Trash2 } from 'lucide-react';
import type { CustomField } from '../../types/models';

interface CustomFieldsEditorProps {
  fields: CustomField[];
  onChange: (next: CustomField[]) => void;
  label?: string;
}

export function CustomFieldsEditor({
  fields,
  onChange,
  label = 'Custom Fields (Atribut Bebas Tambahan)',
}: CustomFieldsEditorProps) {
  const addField = () => {
    onChange([...fields, { key: '', value: '' }]);
  };

  const updateField = (index: number, patch: Partial<CustomField>) => {
    const next = fields.map((item, idx) => (idx === index ? { ...item, ...patch } : item));
    onChange(next);
  };

  const removeField = (index: number) => {
    onChange(fields.filter((_, idx) => idx !== index));
  };

  return (
    <div className="form-field">
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
        }}
      >
        <span className="form-label">{label}</span>
        <button type="button" className="btn btn-sm" onClick={addField}>
          <Plus size={14} /> Tambah Field
        </button>
      </div>
      {fields.length === 0 ? (
        <span className="form-help">
          Belum ada field tambahan. Klik &ldquo;Tambah Field&rdquo; untuk info bebas (mis. Billing ID,
          Region, Atas Nama, dll.).
        </span>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {fields.map((field, index) => (
            <div
              key={index}
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1.3fr auto',
                gap: 8,
                alignItems: 'center',
              }}
            >
              <input
                type="text"
                className="form-input"
                placeholder="Nama label (mis. Region)"
                value={field.key}
                onChange={(e) => updateField(index, { key: e.target.value })}
              />
              <input
                type="text"
                className="form-input"
                placeholder="Nilai (mis. asia-southeast2)"
                value={field.value}
                onChange={(e) => updateField(index, { value: e.target.value })}
              />
              <button
                type="button"
                className="btn btn-ghost btn-icon-sm"
                onClick={() => removeField(index)}
                aria-label="Hapus custom field"
              >
                <Trash2 size={15} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

import {
  Check,
  Copy,
  Edit3,
  FolderKanban,
  GripVertical,
  Plus,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
import {
  generateId,
  reorderProjectList,
  type GoogleAccount,
  type ProjectItem,
  type VaultData,
} from '../../types/models';

interface ProjectsViewProps {
  vault: VaultData;
  onSaveProject: (project: ProjectItem) => void;
  onDeleteProject: (id: string) => void;
  onReorderProjects: (projects: ProjectItem[]) => void;
  onOpenAccount: (accountId: string) => void;
  onCopy: (text: string, label: string) => void;
}

const CUSTOM_EMAIL_SENTINEL = '__custom__';

export function ProjectsView({
  vault,
  onSaveProject,
  onDeleteProject,
  onReorderProjects,
  onOpenAccount,
  onCopy,
}: ProjectsViewProps) {
  const [nameInput, setNameInput] = useState('');
  const [selectedEmail, setSelectedEmail] = useState(
    () => vault.googleAccounts[0]?.email ?? CUSTOM_EMAIL_SENTINEL
  );
  const [customEmail, setCustomEmail] = useState('');

  const [query, setQuery] = useState('');
  const [emailFilter, setEmailFilter] = useState('all');

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editEmailChoice, setEditEmailChoice] = useState('');
  const [editCustomEmail, setEditCustomEmail] = useState('');
  const [editNotes, setEditNotes] = useState('');

  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<{
    id: string;
    position: 'before' | 'after';
  } | null>(null);
  const touchDragIdRef = useRef<string | null>(null);
  const dropTargetRef = useRef<{ id: string; position: 'before' | 'after' } | null>(null);

  const accountById = useMemo(
    () => new Map(vault.googleAccounts.map((a) => [a.id, a])),
    [vault.googleAccounts]
  );

  const accountByEmail = useMemo(() => {
    const map = new Map<string, GoogleAccount>();
    for (const acc of vault.googleAccounts) {
      if (acc.email.trim()) {
        map.set(acc.email.trim().toLowerCase(), acc);
      }
    }
    return map;
  }, [vault.googleAccounts]);

  const resolveProjectAccount = (prj: ProjectItem): GoogleAccount | undefined => {
    if (prj.accountId && accountById.has(prj.accountId)) {
      return accountById.get(prj.accountId);
    }
    if (prj.email.trim()) {
      return accountByEmail.get(prj.email.trim().toLowerCase());
    }
    return undefined;
  };

  const resolveProjectEmail = (prj: ProjectItem): string => {
    const matched = resolveProjectAccount(prj);
    return prj.email.trim() || matched?.email || '';
  };

  const uniqueEmails = useMemo(() => {
    const seen = new Set<string>();
    const list: string[] = [];
    for (const prj of vault.projects) {
      const em = resolveProjectEmail(prj);
      const key = em.toLowerCase();
      if (em && !seen.has(key)) {
        seen.add(key);
        list.push(em);
      }
    }
    return list.sort((a, b) => a.localeCompare(b));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vault.projects, vault.googleAccounts]);

  const filteredProjects = useMemo(() => {
    const q = query.trim().toLowerCase();
    return vault.projects.filter((prj) => {
      const em = resolveProjectEmail(prj);
      if (emailFilter !== 'all' && em.toLowerCase() !== emailFilter.toLowerCase()) {
        return false;
      }
      if (!q) return true;
      const acc = resolveProjectAccount(prj);
      return [prj.name, em, acc?.aliasLabel ?? '', prj.notes]
        .join(' ')
        .toLowerCase()
        .includes(q);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vault.projects, vault.googleAccounts, query, emailFilter]);

  const effectiveAddEmail =
    selectedEmail === CUSTOM_EMAIL_SENTINEL || vault.googleAccounts.length === 0
      ? customEmail.trim()
      : selectedEmail.trim();

  const handleQuickAdd = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = nameInput.trim();
    if (!cleanName) return;

    const cleanEmail = effectiveAddEmail;
    const matched = cleanEmail ? accountByEmail.get(cleanEmail.toLowerCase()) : undefined;

    onSaveProject({
      id: generateId('prj'),
      name: cleanName,
      email: matched?.email ?? cleanEmail,
      accountId: matched?.id ?? '',
      notes: '',
      updatedAt: new Date().toISOString(),
    });

    setNameInput('');
    if (selectedEmail === CUSTOM_EMAIL_SENTINEL) {
      setCustomEmail('');
    }
  };

  const startEditing = (prj: ProjectItem) => {
    const currentEmail = resolveProjectEmail(prj);
    const existsInAccounts = Boolean(
      currentEmail && accountByEmail.has(currentEmail.toLowerCase())
    );
    setEditingId(prj.id);
    setEditName(prj.name);
    if (existsInAccounts) {
      setEditEmailChoice(accountByEmail.get(currentEmail.toLowerCase())!.email);
      setEditCustomEmail('');
    } else if (!currentEmail && vault.googleAccounts.length > 0) {
      setEditEmailChoice(vault.googleAccounts[0].email);
      setEditCustomEmail('');
    } else {
      setEditEmailChoice(CUSTOM_EMAIL_SENTINEL);
      setEditCustomEmail(currentEmail);
    }
    setEditNotes(prj.notes);
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditName('');
    setEditEmailChoice('');
    setEditCustomEmail('');
    setEditNotes('');
  };

  const commitEditing = (prj: ProjectItem) => {
    const cleanName = editName.trim();
    if (!cleanName) return;

    const finalEmail =
      editEmailChoice === CUSTOM_EMAIL_SENTINEL
        ? editCustomEmail.trim()
        : editEmailChoice.trim();
    const matched = finalEmail ? accountByEmail.get(finalEmail.toLowerCase()) : undefined;

    onSaveProject({
      ...prj,
      name: cleanName,
      email: matched?.email ?? finalEmail,
      accountId: matched?.id ?? '',
      notes: editNotes.trim(),
      updatedAt: new Date().toISOString(),
    });
    cancelEditing();
  };

  const resetDragState = () => {
    setDraggedId(null);
    setDropTarget(null);
    touchDragIdRef.current = null;
    dropTargetRef.current = null;
  };

  const applyReorder = (sourceId: string, targetId: string, position: 'before' | 'after') => {
    const next = reorderProjectList(vault.projects, sourceId, targetId, position);
    if (next !== vault.projects) {
      onReorderProjects(next);
    }
  };

  const handleTouchStartHandle = (prjId: string) => {
    touchDragIdRef.current = prjId;
    setDraggedId(prjId);
  };

  const handleTouchMoveHandle = (e: React.TouchEvent) => {
    const sourceId = touchDragIdRef.current;
    if (!sourceId) return;
    const touch = e.touches[0];
    if (!touch) return;
    const el = document.elementFromPoint(touch.clientX, touch.clientY);
    const row = el?.closest('tr[data-project-row-id]') as HTMLTableRowElement | null;
    const targetId = row?.dataset.projectRowId;
    if (!row || !targetId || targetId === sourceId) {
      if (dropTargetRef.current !== null) {
        dropTargetRef.current = null;
        setDropTarget(null);
      }
      return;
    }
    const rect = row.getBoundingClientRect();
    const position: 'before' | 'after' =
      touch.clientY < rect.top + rect.height / 2 ? 'before' : 'after';
    if (
      dropTargetRef.current?.id !== targetId ||
      dropTargetRef.current?.position !== position
    ) {
      const nextTarget = { id: targetId, position };
      dropTargetRef.current = nextTarget;
      setDropTarget(nextTarget);
    }
  };

  const handleTouchEndHandle = () => {
    const sourceId = touchDragIdRef.current;
    const target = dropTargetRef.current;
    if (sourceId && target && sourceId !== target.id) {
      applyReorder(sourceId, target.id, target.position);
    }
    resetDragState();
  };

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Daftar Project ({vault.projects.length})</h1>
          <p className="page-subtitle">
            Catat project terlebih dahulu lalu pilih email Google yang dipakai. Tarik baris ke atas
            atau bawah untuk mengubah urutan — otomatis sinkron ke tab <strong>Projects</strong> di
            Google Sheets.
          </p>
        </div>
      </div>

      {/* Quick Add Bar */}
      <form className="surface-card project-quick-add" onSubmit={handleQuickAdd}>
        <div className="project-quick-add-grid">
          <div className="form-field">
            <label className="form-label" htmlFor="quick-project-name">
              Nama Project
            </label>
            <input
              id="quick-project-name"
              type="text"
              className="form-input"
              placeholder="Contoh: lamar kerja, ppid bapenda kubar, roblox..."
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
            />
          </div>

          <div className="form-field">
            <label className="form-label" htmlFor="quick-project-email">
              Email yang Dipakai
            </label>
            {vault.googleAccounts.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <select
                  id="quick-project-email"
                  className="form-select"
                  value={selectedEmail}
                  onChange={(e) => setSelectedEmail(e.target.value)}
                >
                  {vault.googleAccounts.map((acc) => (
                    <option key={acc.id} value={acc.email}>
                      {acc.email}
                      {acc.aliasLabel && acc.aliasLabel !== acc.email
                        ? ` (${acc.aliasLabel})`
                        : ''}
                    </option>
                  ))}
                  <option value={CUSTOM_EMAIL_SENTINEL}>+ Ketik email lain secara manual...</option>
                </select>
                {selectedEmail === CUSTOM_EMAIL_SENTINEL && (
                  <input
                    type="email"
                    className="form-input"
                    placeholder="Ketik alamat email..."
                    value={customEmail}
                    onChange={(e) => setCustomEmail(e.target.value)}
                  />
                )}
              </div>
            ) : (
              <input
                id="quick-project-email"
                type="email"
                className="form-input"
                placeholder="nama@gmail.com"
                value={customEmail}
                onChange={(e) => setCustomEmail(e.target.value)}
              />
            )}
          </div>

          <div className="project-quick-add-btn-wrap">
            <button
              id="quick-project-submit"
              type="submit"
              className="btn btn-primary"
              disabled={!nameInput.trim()}
              style={{ width: '100%', height: 38 }}
            >
              <Plus size={15} /> Tambah Project
            </button>
          </div>
        </div>
      </form>

      {/* Filter & Search Bar */}
      <div className="filter-bar" style={{ justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: '1 1 220px' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search
              size={14}
              style={{
                position: 'absolute',
                left: 11,
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--ink-muted)',
                pointerEvents: 'none',
              }}
            />
            <input
              type="text"
              className="form-input"
              style={{ paddingLeft: 32, height: 36 }}
              placeholder="Cari nama project atau email..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
        </div>

        <select
          className="form-select"
          aria-label="Filter berdasarkan email"
          style={{ width: 'auto', minWidth: 180, maxWidth: '100%', height: 36 }}
          value={emailFilter}
          onChange={(e) => setEmailFilter(e.target.value)}
        >
          <option value="all">Semua Email ({vault.projects.length})</option>
          {uniqueEmails.map((em) => (
            <option key={em} value={em}>
              {em}
            </option>
          ))}
        </select>
      </div>

      {/* Table: No | Project | Email */}
      {filteredProjects.length === 0 ? (
        <div className="empty-state">
          <FolderKanban size={28} color="var(--ink-muted)" />
          <div style={{ fontWeight: 600 }}>
            {vault.projects.length === 0
              ? 'Belum ada daftar project'
              : 'Tidak ada project yang cocok dengan pencarian'}
          </div>
          <div style={{ fontSize: 13, color: 'var(--ink-muted)', maxWidth: 420 }}>
            Isi nama project &amp; pilih email di atas — nanti otomatis tampil rapi seperti tabel{' '}
            <span className="mono">no | project | email</span>.
          </div>
        </div>
      ) : (
        <div className="data-table-wrap">
          <table className="data-table project-table">
            <thead>
              <tr>
                <th style={{ width: 66, textAlign: 'center' }}>No</th>
                <th>Project</th>
                <th>Email</th>
                <th style={{ width: 96, textAlign: 'right' }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {filteredProjects.map((prj, idx) => {
                const email = resolveProjectEmail(prj);
                const matchedAcc = resolveProjectAccount(prj);
                const isEditing = editingId === prj.id;
                const isDragging = draggedId === prj.id;
                const dropClass =
                  dropTarget?.id === prj.id
                    ? dropTarget.position === 'before'
                      ? ' drop-before'
                      : ' drop-after'
                    : '';

                if (isEditing) {
                  return (
                    <tr key={prj.id}>
                      <td style={{ textAlign: 'center', color: 'var(--ink-muted)' }}>{idx + 1}</td>
                      <td colSpan={3}>
                        <div className="project-inline-edit">
                          <div className="project-inline-edit-fields">
                            <input
                              type="text"
                              className="form-input"
                              placeholder="Nama project..."
                              value={editName}
                              onChange={(e) => setEditName(e.target.value)}
                              autoFocus
                            />
                            {vault.googleAccounts.length > 0 ? (
                              <>
                                <select
                                  className="form-select"
                                  value={editEmailChoice}
                                  onChange={(e) => setEditEmailChoice(e.target.value)}
                                >
                                  {vault.googleAccounts.map((acc) => (
                                    <option key={acc.id} value={acc.email}>
                                      {acc.email}
                                    </option>
                                  ))}
                                  <option value={CUSTOM_EMAIL_SENTINEL}>
                                    + Ketik email manual...
                                  </option>
                                </select>
                                {editEmailChoice === CUSTOM_EMAIL_SENTINEL && (
                                  <input
                                    type="email"
                                    className="form-input"
                                    placeholder="Ketik alamat email..."
                                    value={editCustomEmail}
                                    onChange={(e) => setEditCustomEmail(e.target.value)}
                                  />
                                )}
                              </>
                            ) : (
                              <input
                                type="email"
                                className="form-input"
                                placeholder="Ketik alamat email..."
                                value={editCustomEmail}
                                onChange={(e) => setEditCustomEmail(e.target.value)}
                              />
                            )}
                            <input
                              type="text"
                              className="form-input"
                              placeholder="Catatan singkat (opsional)..."
                              value={editNotes}
                              onChange={(e) => setEditNotes(e.target.value)}
                            />
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
                            <button type="button" className="btn btn-sm" onClick={cancelEditing}>
                              <X size={13} /> Batal
                            </button>
                            <button
                              type="button"
                              className="btn btn-sm btn-primary"
                              disabled={!editName.trim()}
                              onClick={() => commitEditing(prj)}
                            >
                              <Check size={13} /> Simpan
                            </button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                }

                return (
                  <tr
                    key={prj.id}
                    data-project-row-id={prj.id}
                    draggable
                    className={`project-row-draggable${isDragging ? ' is-dragging' : ''}${dropClass}`}
                    onDragStart={(e) => {
                      setDraggedId(prj.id);
                      e.dataTransfer.effectAllowed = 'move';
                      e.dataTransfer.setData('text/plain', prj.id);
                    }}
                    onDragOver={(e) => {
                      const activeSource = draggedId || e.dataTransfer.getData('text/plain');
                      if (!activeSource || activeSource === prj.id) {
                        if (dropTargetRef.current?.id === prj.id) {
                          dropTargetRef.current = null;
                          setDropTarget(null);
                        }
                        return;
                      }
                      e.preventDefault();
                      e.dataTransfer.dropEffect = 'move';
                      const rect = e.currentTarget.getBoundingClientRect();
                      const position: 'before' | 'after' =
                        e.clientY < rect.top + rect.height / 2 ? 'before' : 'after';
                      if (
                        dropTargetRef.current?.id !== prj.id ||
                        dropTargetRef.current?.position !== position
                      ) {
                        const nextTarget = { id: prj.id, position };
                        dropTargetRef.current = nextTarget;
                        setDropTarget(nextTarget);
                      }
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      const sourceId = draggedId || e.dataTransfer.getData('text/plain');
                      if (sourceId && sourceId !== prj.id) {
                        const rect = e.currentTarget.getBoundingClientRect();
                        const position: 'before' | 'after' =
                          dropTargetRef.current?.id === prj.id
                            ? dropTargetRef.current.position
                            : e.clientY < rect.top + rect.height / 2
                              ? 'before'
                              : 'after';
                        applyReorder(sourceId, prj.id, position);
                      }
                      resetDragState();
                    }}
                    onDragEnd={resetDragState}
                  >
                    <td
                      className="mono"
                      style={{ textAlign: 'center', color: 'var(--ink-muted)', fontSize: 12.5 }}
                    >
                      <div className="project-no-cell">
                        <span
                          className="project-drag-handle"
                          title="Tarik ke atas/bawah untuk ubah urutan"
                          aria-label={`Geser urutan ${prj.name}`}
                          onTouchStart={() => handleTouchStartHandle(prj.id)}
                          onTouchMove={handleTouchMoveHandle}
                          onTouchEnd={handleTouchEndHandle}
                          onTouchCancel={resetDragState}
                        >
                          <GripVertical size={14} />
                        </span>
                        <span>{idx + 1}</span>
                      </div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, color: 'var(--ink-primary)' }}>{prj.name}</div>
                      {prj.notes && (
                        <div style={{ fontSize: 12, color: 'var(--ink-muted)', marginTop: 2 }}>
                          {prj.notes}
                        </div>
                      )}
                    </td>
                    <td>
                      {email ? (
                        <div className="project-email-cell">
                          {matchedAcc ? (
                            <button
                              type="button"
                              className="project-email-link mono"
                              title={`Buka detail akun ${email}`}
                              onClick={() => onOpenAccount(matchedAcc.id)}
                            >
                              <span
                                className="project-email-dot"
                                style={{ background: matchedAcc.colorBadge }}
                              />
                              <span>{email}</span>
                            </button>
                          ) : (
                            <span className="mono" style={{ fontSize: 12.5 }}>
                              {email}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span style={{ color: 'var(--ink-muted)', fontSize: 12.5 }}>
                          — Belum dipilih
                        </span>
                      )}
                    </td>
                    <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                      {email && (
                        <button
                          type="button"
                          className="btn btn-ghost btn-icon-sm"
                          title="Salin email"
                          onClick={() => onCopy(email, 'Email disalin')}
                        >
                          <Copy size={13} />
                        </button>
                      )}
                      <button
                        type="button"
                        className="btn btn-ghost btn-icon-sm"
                        title="Edit project"
                        onClick={() => startEditing(prj)}
                      >
                        <Edit3 size={13} />
                      </button>
                      <button
                        type="button"
                        className="btn btn-ghost btn-icon-sm"
                        title="Hapus project"
                        onClick={() => {
                          if (window.confirm(`Hapus project "${prj.name}"?`)) {
                            onDeleteProject(prj.id);
                          }
                        }}
                      >
                        <Trash2 size={13} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

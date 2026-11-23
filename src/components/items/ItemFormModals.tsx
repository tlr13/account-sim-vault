import { useState } from 'react';
import {
  CLOUD_PROVIDERS,
  generateId,
  OTHER_ASSET_TYPES,
  parseTagsInput,
  WEBSITE_CATEGORIES,
  type BillingCycle,
  type CloudEnvironment,
  type CloudProject,
  type CloudStatus,
  type ConnectedWebsite,
  type CurrencyCode,
  type CustomField,
  type GoogleAccount,
  type ImportanceLevel,
  type LoginMethod,
  type OtherAsset,
  type Subscription,
  type SubscriptionStatus,
} from '../../types/models';
import { CustomFieldsEditor } from '../common/CustomFieldsEditor';
import { Modal } from '../common/Modal';

/* ---------------- Cloud Project Modal ---------------- */

interface CloudFormModalProps {
  open: boolean;
  initial?: CloudProject | null;
  defaultAccountId?: string;
  accounts: GoogleAccount[];
  onClose: () => void;
  onSave: (item: CloudProject) => void;
}

export function CloudFormModal({
  open,
  initial,
  defaultAccountId,
  accounts,
  onClose,
  onSave,
}: CloudFormModalProps) {
  const [accountId, setAccountId] = useState(
    () => initial?.accountId ?? defaultAccountId ?? accounts[0]?.id ?? ''
  );
  const [provider, setProvider] = useState<string>(
    () => initial?.provider ?? CLOUD_PROVIDERS[0]
  );
  const [projectName, setProjectName] = useState(() => initial?.projectName ?? '');
  const [projectIdRef, setProjectIdRef] = useState(() => initial?.projectIdRef ?? '');
  const [environment, setEnvironment] = useState<CloudEnvironment>(
    () => initial?.environment ?? 'Production'
  );
  const [status, setStatus] = useState<CloudStatus>(() => initial?.status ?? 'Active');
  const [billingTier, setBillingTier] = useState(() => initial?.billingTier ?? 'Free Tier');
  const [consoleUrl, setConsoleUrl] = useState(() => initial?.consoleUrl ?? '');
  const [relatedDomains, setRelatedDomains] = useState(() => initial?.relatedDomains ?? '');
  const [tagsText, setTagsText] = useState(() => initial?.tags.join(', ') ?? '');
  const [customFields, setCustomFields] = useState<CustomField[]>(
    () => initial?.customFields ?? []
  );
  const [notes, setNotes] = useState(() => initial?.notes ?? '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectName.trim() || !accountId) return;
    onSave({
      id: initial?.id ?? generateId('cld'),
      accountId,
      provider,
      projectName: projectName.trim(),
      projectIdRef: projectIdRef.trim(),
      environment,
      status,
      billingTier: billingTier.trim(),
      consoleUrl: consoleUrl.trim(),
      relatedDomains: relatedDomains.trim(),
      tags: parseTagsInput(tagsText),
      customFields: customFields.filter((f) => f.key.trim() || f.value.trim()),
      notes: notes.trim(),
      updatedAt: new Date().toISOString(),
    });
    onClose();
  };

  return (
    <Modal
      open={open}
      title={initial ? 'Edit Cloud Project' : 'Tambah Cloud Project'}
      onClose={onClose}
      wide
      footer={
        <>
          <button type="button" className="btn" onClick={onClose}>
            Batal
          </button>
          <button type="submit" form="cloud-form" className="btn btn-primary">
            Simpan Project
          </button>
        </>
      }
    >
      <form
        id="cloud-form"
        onSubmit={handleSubmit}
        style={{ display: 'flex', flexDirection: 'column', gap: 14 }}
      >
        <div className="form-grid-2">
          <div className="form-field">
            <label className="form-label" htmlFor="cld-account">
              Akun Google Pemilik *
            </label>
            <select
              id="cld-account"
              required
              className="form-select"
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
            >
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.email} ({a.aliasLabel})
                </option>
              ))}
            </select>
          </div>
          <div className="form-field">
            <label className="form-label" htmlFor="cld-provider">
              Cloud Provider
            </label>
            <select
              id="cld-provider"
              className="form-select"
              value={provider}
              onChange={(e) => setProvider(e.target.value)}
            >
              {CLOUD_PROVIDERS.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="form-grid-2">
          <div className="form-field">
            <label className="form-label" htmlFor="cld-name">
              Nama Project *
            </label>
            <input
              id="cld-name"
              required
              type="text"
              className="form-input"
              placeholder="mis. TokoKita Backend API"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
            />
          </div>
          <div className="form-field">
            <label className="form-label" htmlFor="cld-id">
              Project ID / Account Ref
            </label>
            <input
              id="cld-id"
              type="text"
              className="form-input mono"
              placeholder="mis. tokokita-prod-421908"
              value={projectIdRef}
              onChange={(e) => setProjectIdRef(e.target.value)}
            />
          </div>
        </div>

        <div className="form-grid-2">
          <div className="form-field">
            <label className="form-label" htmlFor="cld-env">
              Environment &amp; Status
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <select
                id="cld-env"
                className="form-select"
                value={environment}
                onChange={(e) => setEnvironment(e.target.value as CloudEnvironment)}
              >
                <option value="Production">Production</option>
                <option value="Staging">Staging</option>
                <option value="Dev">Dev</option>
                <option value="Sandbox">Sandbox</option>
                <option value="Archived">Archived</option>
              </select>
              <select
                aria-label="Status project cloud"
                className="form-select"
                value={status}
                onChange={(e) => setStatus(e.target.value as CloudStatus)}
              >
                <option value="Active">Active</option>
                <option value="Paused">Paused</option>
                <option value="Billing Issue">Billing Issue</option>
                <option value="Decommissioned">Decommissioned</option>
              </select>
            </div>
          </div>

          <div className="form-field">
            <label className="form-label" htmlFor="cld-billing">
              Billing / Tier
            </label>
            <input
              id="cld-billing"
              type="text"
              className="form-input"
              placeholder="Free Tier, Pay-as-you-go, Trial Credit"
              value={billingTier}
              onChange={(e) => setBillingTier(e.target.value)}
            />
          </div>
        </div>

        <div className="form-grid-2">
          <div className="form-field">
            <label className="form-label" htmlFor="cld-url">
              Console URL
            </label>
            <input
              id="cld-url"
              type="url"
              className="form-input mono"
              placeholder="https://console.cloud.google.com/..."
              value={consoleUrl}
              onChange={(e) => setConsoleUrl(e.target.value)}
            />
          </div>
          <div className="form-field">
            <label className="form-label" htmlFor="cld-domain">
              Domain / Repo Terkait
            </label>
            <input
              id="cld-domain"
              type="text"
              className="form-input mono"
              placeholder="api.domainku.id"
              value={relatedDomains}
              onChange={(e) => setRelatedDomains(e.target.value)}
            />
          </div>
        </div>

        <div className="form-field">
          <label className="form-label" htmlFor="cld-tags">
            Tags (pisahkan koma)
          </label>
          <input
            id="cld-tags"
            type="text"
            className="form-input"
            placeholder="cloud-run, firestore, api"
            value={tagsText}
            onChange={(e) => setTagsText(e.target.value)}
          />
        </div>

        <CustomFieldsEditor fields={customFields} onChange={setCustomFields} />

        <div className="form-field">
          <label className="form-label" htmlFor="cld-notes">
            Catatan
          </label>
          <textarea
            id="cld-notes"
            className="form-textarea"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>
      </form>
    </Modal>
  );
}

/* ---------------- Connected Website Modal ---------------- */

interface WebsiteFormModalProps {
  open: boolean;
  initial?: ConnectedWebsite | null;
  defaultAccountId?: string;
  accounts: GoogleAccount[];
  onClose: () => void;
  onSave: (item: ConnectedWebsite) => void;
}

export function WebsiteFormModal({
  open,
  initial,
  defaultAccountId,
  accounts,
  onClose,
  onSave,
}: WebsiteFormModalProps) {
  const [accountId, setAccountId] = useState(
    () => initial?.accountId ?? defaultAccountId ?? accounts[0]?.id ?? ''
  );
  const [serviceName, setServiceName] = useState(() => initial?.serviceName ?? '');
  const [url, setUrl] = useState(() => initial?.url ?? '');
  const [category, setCategory] = useState<string>(
    () => initial?.category ?? WEBSITE_CATEGORIES[0]
  );
  const [loginMethod, setLoginMethod] = useState<LoginMethod>(
    () => initial?.loginMethod ?? 'Google OAuth / SSO'
  );
  const [usernameHandle, setUsernameHandle] = useState(() => initial?.usernameHandle ?? '');
  const [importance, setImportance] = useState<ImportanceLevel>(
    () => initial?.importance ?? 'Normal'
  );
  const [tagsText, setTagsText] = useState(() => initial?.tags.join(', ') ?? '');
  const [customFields, setCustomFields] = useState<CustomField[]>(
    () => initial?.customFields ?? []
  );
  const [notes, setNotes] = useState(() => initial?.notes ?? '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!serviceName.trim() || !accountId) return;
    onSave({
      id: initial?.id ?? generateId('web'),
      accountId,
      serviceName: serviceName.trim(),
      url: url.trim(),
      category,
      loginMethod,
      usernameHandle: usernameHandle.trim(),
      importance,
      tags: parseTagsInput(tagsText),
      customFields: customFields.filter((f) => f.key.trim() || f.value.trim()),
      notes: notes.trim(),
      updatedAt: new Date().toISOString(),
    });
    onClose();
  };

  return (
    <Modal
      open={open}
      title={initial ? 'Edit Website Terhubung' : 'Tambah Website / Layanan Terhubung'}
      onClose={onClose}
      wide
      footer={
        <>
          <button type="button" className="btn" onClick={onClose}>
            Batal
          </button>
          <button type="submit" form="website-form" className="btn btn-primary">
            Simpan Website
          </button>
        </>
      }
    >
      <form
        id="website-form"
        onSubmit={handleSubmit}
        style={{ display: 'flex', flexDirection: 'column', gap: 14 }}
      >
        <div className="form-grid-2">
          <div className="form-field">
            <label className="form-label" htmlFor="web-account">
              Akun Google Pemilik *
            </label>
            <select
              id="web-account"
              required
              className="form-select"
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
            >
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.email} ({a.aliasLabel})
                </option>
              ))}
            </select>
          </div>
          <div className="form-field">
            <label className="form-label" htmlFor="web-name">
              Nama Website / Aplikasi *
            </label>
            <input
              id="web-name"
              required
              type="text"
              className="form-input"
              placeholder="mis. Vercel, Figma, Shopee, ChatGPT"
              value={serviceName}
              onChange={(e) => setServiceName(e.target.value)}
            />
          </div>
        </div>

        <div className="form-grid-2">
          <div className="form-field">
            <label className="form-label" htmlFor="web-url">
              URL Website
            </label>
            <input
              id="web-url"
              type="url"
              className="form-input mono"
              placeholder="https://vercel.com"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />
          </div>
          <div className="form-field">
            <label className="form-label" htmlFor="web-category">
              Kategori
            </label>
            <select
              id="web-category"
              className="form-select"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              {WEBSITE_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="form-grid-2">
          <div className="form-field">
            <label className="form-label" htmlFor="web-method">
              Metode Login
            </label>
            <select
              id="web-method"
              className="form-select"
              value={loginMethod}
              onChange={(e) => setLoginMethod(e.target.value as LoginMethod)}
            >
              <option value="Google OAuth / SSO">Google OAuth / SSO (Sign in with Google)</option>
              <option value="Email + Password">
                Email + Password (simpan password di Bitwarden)
              </option>
              <option value="Magic Link">Magic Link / OTP Email</option>
              <option value="Passkey">Passkey</option>
            </select>
          </div>
          <div className="form-field">
            <label className="form-label" htmlFor="web-handle">
              Username / Handle &amp; Prioritas
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: 8 }}>
              <input
                id="web-handle"
                type="text"
                className="form-input mono"
                placeholder="@username"
                value={usernameHandle}
                onChange={(e) => setUsernameHandle(e.target.value)}
              />
              <select
                aria-label="Tingkat kepentingan"
                className="form-select"
                value={importance}
                onChange={(e) => setImportance(e.target.value as ImportanceLevel)}
              >
                <option value="Normal">Normal</option>
                <option value="Critical">Penting</option>
                <option value="Low">Rendah</option>
              </select>
            </div>
          </div>
        </div>

        <div className="form-field">
          <label className="form-label" htmlFor="web-tags">
            Tags (pisahkan koma)
          </label>
          <input
            id="web-tags"
            type="text"
            className="form-input"
            placeholder="hosting, kerja, ai"
            value={tagsText}
            onChange={(e) => setTagsText(e.target.value)}
          />
        </div>

        <CustomFieldsEditor fields={customFields} onChange={setCustomFields} />

        <div className="form-field">
          <label className="form-label" htmlFor="web-notes">
            Catatan
          </label>
          <textarea
            id="web-notes"
            className="form-textarea"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>
      </form>
    </Modal>
  );
}

/* ---------------- Subscription Modal ---------------- */

interface SubscriptionFormModalProps {
  open: boolean;
  initial?: Subscription | null;
  defaultAccountId?: string;
  accounts: GoogleAccount[];
  onClose: () => void;
  onSave: (item: Subscription) => void;
}

export function SubscriptionFormModal({
  open,
  initial,
  defaultAccountId,
  accounts,
  onClose,
  onSave,
}: SubscriptionFormModalProps) {
  const [accountId, setAccountId] = useState(
    () => initial?.accountId ?? defaultAccountId ?? accounts[0]?.id ?? ''
  );
  const [serviceName, setServiceName] = useState(() => initial?.serviceName ?? '');
  const [planName, setPlanName] = useState(() => initial?.planName ?? '');
  const [status, setStatus] = useState<SubscriptionStatus>(() => initial?.status ?? 'Active');
  const [costAmount, setCostAmount] = useState(() =>
    initial ? String(initial.costAmount) : '0'
  );
  const [currency, setCurrency] = useState<CurrencyCode>(() => initial?.currency ?? 'IDR');
  const [billingCycle, setBillingCycle] = useState<BillingCycle>(
    () => initial?.billingCycle ?? 'Monthly'
  );
  const [nextRenewalDate, setNextRenewalDate] = useState(
    () => initial?.nextRenewalDate ?? ''
  );
  const [autoRenew, setAutoRenew] = useState(() => initial?.autoRenew ?? true);
  const [paymentMethodHint, setPaymentMethodHint] = useState(
    () => initial?.paymentMethodHint ?? ''
  );
  const [manageUrl, setManageUrl] = useState(() => initial?.manageUrl ?? '');
  const [tagsText, setTagsText] = useState(() => initial?.tags.join(', ') ?? '');
  const [notes, setNotes] = useState(() => initial?.notes ?? '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!serviceName.trim() || !accountId) return;
    onSave({
      id: initial?.id ?? generateId('sub'),
      accountId,
      serviceName: serviceName.trim(),
      planName: planName.trim(),
      status,
      costAmount: Number(costAmount) || 0,
      currency,
      billingCycle,
      nextRenewalDate,
      autoRenew,
      paymentMethodHint: paymentMethodHint.trim(),
      manageUrl: manageUrl.trim(),
      tags: parseTagsInput(tagsText),
      notes: notes.trim(),
      updatedAt: new Date().toISOString(),
    });
    onClose();
  };

  return (
    <Modal
      open={open}
      title={initial ? 'Edit Subscription' : 'Tambah Subscription / Langganan'}
      onClose={onClose}
      wide
      footer={
        <>
          <button type="button" className="btn" onClick={onClose}>
            Batal
          </button>
          <button type="submit" form="sub-form" className="btn btn-primary">
            Simpan Subscription
          </button>
        </>
      }
    >
      <form
        id="sub-form"
        onSubmit={handleSubmit}
        style={{ display: 'flex', flexDirection: 'column', gap: 14 }}
      >
        <div className="form-grid-2">
          <div className="form-field">
            <label className="form-label" htmlFor="sub-account">
              Akun Google Pemilik *
            </label>
            <select
              id="sub-account"
              required
              className="form-select"
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
            >
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.email} ({a.aliasLabel})
                </option>
              ))}
            </select>
          </div>
          <div className="form-field">
            <label className="form-label" htmlFor="sub-name">
              Nama Layanan *
            </label>
            <input
              id="sub-name"
              required
              type="text"
              className="form-input"
              placeholder="mis. Google One, YouTube Premium, ChatGPT Plus"
              value={serviceName}
              onChange={(e) => setServiceName(e.target.value)}
            />
          </div>
        </div>

        <div className="form-grid-2">
          <div className="form-field">
            <label className="form-label" htmlFor="sub-plan">
              Nama Paket / Plan
            </label>
            <input
              id="sub-plan"
              type="text"
              className="form-input"
              placeholder="mis. 200GB Family, Pro, Individual"
              value={planName}
              onChange={(e) => setPlanName(e.target.value)}
            />
          </div>
          <div className="form-field">
            <label className="form-label" htmlFor="sub-status">
              Status &amp; Siklus
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <select
                id="sub-status"
                className="form-select"
                value={status}
                onChange={(e) => setStatus(e.target.value as SubscriptionStatus)}
              >
                <option value="Active">Active</option>
                <option value="Trial">Trial</option>
                <option value="Cancelled">Cancelled</option>
                <option value="Expired">Expired</option>
              </select>
              <select
                aria-label="Siklus tagihan"
                className="form-select"
                value={billingCycle}
                onChange={(e) => setBillingCycle(e.target.value as BillingCycle)}
              >
                <option value="Monthly">Bulanan</option>
                <option value="Yearly">Tahunan</option>
                <option value="Weekly">Mingguan</option>
                <option value="One-time">Sekali Bayar</option>
              </select>
            </div>
          </div>
        </div>

        <div className="form-grid-2">
          <div className="form-field">
            <label className="form-label" htmlFor="sub-cost">
              Biaya &amp; Mata Uang
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '96px 1fr', gap: 8 }}>
              <select
                aria-label="Mata uang"
                className="form-select mono"
                value={currency}
                onChange={(e) => setCurrency(e.target.value as CurrencyCode)}
              >
                <option value="IDR">IDR</option>
                <option value="USD">USD</option>
              </select>
              <input
                id="sub-cost"
                type="number"
                step="any"
                min="0"
                className="form-input mono"
                value={costAmount}
                onChange={(e) => setCostAmount(e.target.value)}
              />
            </div>
          </div>

          <div className="form-field">
            <label className="form-label" htmlFor="sub-date">
              Tanggal Perpanjangan Berikutnya
            </label>
            <input
              id="sub-date"
              type="date"
              className="form-input mono"
              value={nextRenewalDate}
              onChange={(e) => setNextRenewalDate(e.target.value)}
            />
          </div>
        </div>

        <div className="form-grid-2">
          <div className="form-field">
            <label className="form-label" htmlFor="sub-pay">
              Hint Metode Bayar (Jangan nomor kartu penuh!)
            </label>
            <input
              id="sub-pay"
              type="text"
              className="form-input"
              placeholder="mis. Jago Visa ...4321, GoPay Autopay"
              value={paymentMethodHint}
              onChange={(e) => setPaymentMethodHint(e.target.value)}
            />
          </div>
          <div className="form-field">
            <label className="form-label" htmlFor="sub-url">
              URL Kelola / Batalkan Langganan
            </label>
            <input
              id="sub-url"
              type="url"
              className="form-input mono"
              placeholder="https://one.google.com/settings"
              value={manageUrl}
              onChange={(e) => setManageUrl(e.target.value)}
            />
          </div>
        </div>

        <label className="checkbox-row">
          <input
            type="checkbox"
            checked={autoRenew}
            onChange={(e) => setAutoRenew(e.target.checked)}
          />
          <span>Perpanjangan otomatis (Auto-renew) aktif</span>
        </label>

        <div className="form-field">
          <label className="form-label" htmlFor="sub-tags">
            Tags (pisahkan koma)
          </label>
          <input
            id="sub-tags"
            type="text"
            className="form-input"
            placeholder="ai, storage, hiburan"
            value={tagsText}
            onChange={(e) => setTagsText(e.target.value)}
          />
        </div>

        <div className="form-field">
          <label className="form-label" htmlFor="sub-notes">
            Catatan
          </label>
          <textarea
            id="sub-notes"
            className="form-textarea"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>
      </form>
    </Modal>
  );
}

/* ---------------- Other Asset Modal ---------------- */

interface OtherFormModalProps {
  open: boolean;
  initial?: OtherAsset | null;
  defaultAccountId?: string;
  accounts: GoogleAccount[];
  onClose: () => void;
  onSave: (item: OtherAsset) => void;
}

export function OtherFormModal({
  open,
  initial,
  defaultAccountId,
  accounts,
  onClose,
  onSave,
}: OtherFormModalProps) {
  const [accountId, setAccountId] = useState(
    () => initial?.accountId ?? defaultAccountId ?? accounts[0]?.id ?? ''
  );
  const [assetType, setAssetType] = useState<string>(
    () => initial?.assetType ?? OTHER_ASSET_TYPES[0]
  );
  const [title, setTitle] = useState(() => initial?.title ?? '');
  const [identifier, setIdentifier] = useState(() => initial?.identifier ?? '');
  const [url, setUrl] = useState(() => initial?.url ?? '');
  const [tagsText, setTagsText] = useState(() => initial?.tags.join(', ') ?? '');
  const [customFields, setCustomFields] = useState<CustomField[]>(
    () => initial?.customFields ?? []
  );
  const [notes, setNotes] = useState(() => initial?.notes ?? '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !accountId) return;
    onSave({
      id: initial?.id ?? generateId('oth'),
      accountId,
      assetType,
      title: title.trim(),
      identifier: identifier.trim(),
      url: url.trim(),
      tags: parseTagsInput(tagsText),
      customFields: customFields.filter((f) => f.key.trim() || f.value.trim()),
      notes: notes.trim(),
      updatedAt: new Date().toISOString(),
    });
    onClose();
  };

  return (
    <Modal
      open={open}
      title={initial ? 'Edit Aset Lainnya' : 'Tambah Aset / Catatan Lainnya'}
      onClose={onClose}
      wide
      footer={
        <>
          <button type="button" className="btn" onClick={onClose}>
            Batal
          </button>
          <button type="submit" form="other-form" className="btn btn-primary">
            Simpan Aset
          </button>
        </>
      }
    >
      <form
        id="other-form"
        onSubmit={handleSubmit}
        style={{ display: 'flex', flexDirection: 'column', gap: 14 }}
      >
        <div className="form-grid-2">
          <div className="form-field">
            <label className="form-label" htmlFor="oth-account">
              Akun Google Pemilik *
            </label>
            <select
              id="oth-account"
              required
              className="form-select"
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
            >
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.email} ({a.aliasLabel})
                </option>
              ))}
            </select>
          </div>
          <div className="form-field">
            <label className="form-label" htmlFor="oth-type">
              Tipe Aset
            </label>
            <select
              id="oth-type"
              className="form-select"
              value={assetType}
              onChange={(e) => setAssetType(e.target.value)}
            >
              {OTHER_ASSET_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="form-grid-2">
          <div className="form-field">
            <label className="form-label" htmlFor="oth-title">
              Judul / Nama Aset *
            </label>
            <input
              id="oth-title"
              required
              type="text"
              className="form-input"
              placeholder="mis. Channel YouTube, Folder Pajak, Akun Play Console"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <div className="form-field">
            <label className="form-label" htmlFor="oth-id">
              Identifier / Handle / Path
            </label>
            <input
              id="oth-id"
              type="text"
              className="form-input mono"
              placeholder="@handle, DEV-ID, atau /Folder/Path"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
            />
          </div>
        </div>

        <div className="form-grid-2">
          <div className="form-field">
            <label className="form-label" htmlFor="oth-url">
              URL Terkait
            </label>
            <input
              id="oth-url"
              type="url"
              className="form-input mono"
              placeholder="https://..."
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />
          </div>
          <div className="form-field">
            <label className="form-label" htmlFor="oth-tags">
              Tags (pisahkan koma)
            </label>
            <input
              id="oth-tags"
              type="text"
              className="form-input"
              placeholder="dokumen, konten, penting"
              value={tagsText}
              onChange={(e) => setTagsText(e.target.value)}
            />
          </div>
        </div>

        <CustomFieldsEditor fields={customFields} onChange={setCustomFields} />

        <div className="form-field">
          <label className="form-label" htmlFor="oth-notes">
            Catatan
          </label>
          <textarea
            id="oth-notes"
            className="form-textarea"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>
      </form>
    </Modal>
  );
}

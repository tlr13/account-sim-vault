import Fuse from 'fuse.js';
import type {
  CustomField,
  GlobalSearchResult,
  SearchCategory,
  VaultData,
} from '../../types/models';
import { formatCurrency, getSimHealth, maskPhoneNumber } from '../../utils/simStatus';

interface IndexedEntry {
  id: string;
  category: Exclude<SearchCategory, 'all'>;
  title: string;
  subtitle: string;
  detailLine: string;
  ownerAccountId?: string;
  ownerPhoneId?: string;
  ownerEmailText: string;
  copyValue: string;
  copyLabel: string;
  url?: string;
  badgeText?: string;
  badgeTone?: 'neutral' | 'success' | 'warning' | 'danger' | 'info';
  keywords: string;
  tagsText: string;
  customFieldsText: string;
  notes: string;
}

function flattenCustomFields(fields: CustomField[]): string {
  return fields.map((f) => `${f.key} ${f.value}`).join(' ');
}

function simBadgeTone(
  state: ReturnType<typeof getSimHealth>['state']
): GlobalSearchResult['badgeTone'] {
  if (state === 'grace_period' || state === 'expired') return 'danger';
  if (state === 'expiring_soon') return 'warning';
  if (state === 'active' || state === 'no_expiry') return 'success';
  return 'neutral';
}

export function buildSearchEntries(
  vault: VaultData,
  privacyMask: boolean = false
): IndexedEntry[] {
  const accountMap = new Map(vault.googleAccounts.map((a) => [a.id, a]));
  const phoneMap = new Map(vault.phoneNumbers.map((p) => [p.id, p]));
  const entries: IndexedEntry[] = [];

  for (const acc of vault.googleAccounts) {
    const linkedPhone = phoneMap.get(acc.linkedPhoneId);
    const statusLabel =
      acc.status === 'Spare'
        ? 'Cadangan'
        : acc.status === 'Shared'
          ? 'Dipakai Orang'
          : acc.status === 'Sold'
            ? 'Sold'
            : acc.status === 'Issue'
              ? 'Bermasalah'
              : acc.status;
    entries.push({
      id: acc.id,
      category: 'account',
      title: acc.aliasLabel || acc.email,
      subtitle: acc.email,
      detailLine: [
        acc.quickSubName
          ? `${acc.quickSubName}${acc.quickSubNeedsCancel ? ' (Belum Cancel)' : ''}`
          : '',
        acc.holderName ? `Pemakai: ${acc.holderName}` : '',
        acc.notes ? acc.notes.replace(/\s+/g, ' ').slice(0, 90) : acc.primaryPurpose,
        linkedPhone ? `SIM: ${linkedPhone.provider}` : '',
      ]
        .filter(Boolean)
        .join(' · '),
      ownerAccountId: acc.id,
      ownerPhoneId: linkedPhone?.id,
      ownerEmailText: acc.email,
      copyValue: acc.email,
      copyLabel: 'Salin Email',
      badgeText: acc.quickSubNeedsCancel ? 'Belum Cancel' : statusLabel,
      badgeTone: acc.quickSubNeedsCancel
        ? 'warning'
        : acc.status === 'Active'
          ? 'success'
          : acc.status === 'Issue' || acc.status === 'Suspended'
            ? 'danger'
            : acc.status === 'Shared'
              ? 'warning'
              : acc.status === 'Spare'
                ? 'info'
                : 'neutral',
      keywords: [
        acc.email,
        acc.aliasLabel,
        acc.primaryPurpose,
        acc.chromeProfile,
        acc.passwordHint,
        acc.holderName,
        acc.holderUntil,
        acc.quickSubName,
        acc.quickSubPeriod,
        acc.quickSubNeedsCancel ? 'belum cancel' : '',
        statusLabel,
        acc.passwordManagerRef,
        linkedPhone?.phoneNumber ?? '',
        linkedPhone?.provider ?? '',
      ].join(' '),
      tagsText: acc.tags.join(' '),
      customFieldsText: flattenCustomFields(acc.customFields),
      notes: acc.notes,
    });
  }

  for (const phone of vault.phoneNumbers) {
    const health = getSimHealth(phone);
    const linkedAccounts = vault.googleAccounts.filter((a) => a.linkedPhoneId === phone.id);
    const displayNum = privacyMask ? maskPhoneNumber(phone.phoneNumber) : phone.phoneNumber;
    const digitsOnly = phone.phoneNumber.replace(/\D/g, '');
    entries.push({
      id: phone.id,
      category: 'phone',
      title: `${displayNum} — ${phone.provider}`,
      subtitle: phone.label || phone.usagePurpose || phone.simType,
      detailLine: [
        phone.deviceSlot,
        linkedAccounts.length > 0 ? `${linkedAccounts.length} Akun Google tertaut` : '',
        phone.linkedServices.slice(0, 3).join(', '),
      ]
        .filter(Boolean)
        .join(' · '),
      ownerPhoneId: phone.id,
      ownerAccountId: linkedAccounts[0]?.id,
      ownerEmailText: linkedAccounts.map((a) => a.email).join(' '),
      copyValue: phone.phoneNumber,
      copyLabel: 'Salin Nomor',
      badgeText: health.shortLabel,
      badgeTone: simBadgeTone(health.state),
      keywords: [
        phone.phoneNumber,
        digitsOnly,
        phone.label,
        phone.provider,
        phone.simType,
        phone.deviceSlot,
        phone.usagePurpose,
        phone.renewalTip,
        phone.linkedServices.join(' '),
        linkedAccounts.map((a) => `${a.email} ${a.aliasLabel}`).join(' '),
      ].join(' '),
      tagsText: phone.tags.join(' '),
      customFieldsText: flattenCustomFields(phone.customFields),
      notes: phone.notes,
    });
  }

  for (const cloud of vault.cloudProjects) {
    const owner = accountMap.get(cloud.accountId);
    entries.push({
      id: cloud.id,
      category: 'cloud',
      title: cloud.projectName,
      subtitle: `${cloud.provider} · ${cloud.projectIdRef || cloud.environment}`,
      detailLine: [cloud.environment, cloud.billingTier, cloud.relatedDomains]
        .filter(Boolean)
        .join(' · '),
      ownerAccountId: cloud.accountId,
      ownerEmailText: owner?.email ?? '',
      copyValue: owner?.email ?? cloud.projectIdRef,
      copyLabel: owner ? 'Salin Email' : 'Salin Project ID',
      url: cloud.consoleUrl || undefined,
      badgeText: cloud.provider,
      badgeTone:
        cloud.status === 'Billing Issue'
          ? 'danger'
          : cloud.status === 'Active'
            ? 'info'
            : 'neutral',
      keywords: [
        cloud.projectName,
        cloud.projectIdRef,
        cloud.provider,
        cloud.environment,
        cloud.billingTier,
        cloud.relatedDomains,
        owner?.email ?? '',
        owner?.aliasLabel ?? '',
      ].join(' '),
      tagsText: cloud.tags.join(' '),
      customFieldsText: flattenCustomFields(cloud.customFields),
      notes: cloud.notes,
    });
  }

  for (const web of vault.connectedWebsites) {
    const owner = accountMap.get(web.accountId);
    entries.push({
      id: web.id,
      category: 'website',
      title: web.serviceName,
      subtitle: `${web.category} · ${web.loginMethod}`,
      detailLine: [web.usernameHandle, web.url.replace(/^https?:\/\//, '')]
        .filter(Boolean)
        .join(' · '),
      ownerAccountId: web.accountId,
      ownerEmailText: owner?.email ?? '',
      copyValue: owner?.email ?? web.serviceName,
      copyLabel: 'Salin Email',
      url: web.url || undefined,
      badgeText: web.loginMethod === 'Google OAuth / SSO' ? 'Google SSO' : web.loginMethod,
      badgeTone: web.importance === 'Critical' ? 'warning' : 'neutral',
      keywords: [
        web.serviceName,
        web.url,
        web.category,
        web.loginMethod,
        web.usernameHandle,
        owner?.email ?? '',
        owner?.aliasLabel ?? '',
      ].join(' '),
      tagsText: web.tags.join(' '),
      customFieldsText: flattenCustomFields(web.customFields),
      notes: web.notes,
    });
  }

  for (const sub of vault.subscriptions) {
    const owner = accountMap.get(sub.accountId);
    entries.push({
      id: sub.id,
      category: 'subscription',
      title: sub.serviceName,
      subtitle: `${sub.planName || sub.billingCycle} · ${formatCurrency(sub.costAmount, sub.currency)}`,
      detailLine: [
        sub.nextRenewalDate ? `Perpanjangan: ${sub.nextRenewalDate}` : '',
        sub.paymentMethodHint,
      ]
        .filter(Boolean)
        .join(' · '),
      ownerAccountId: sub.accountId,
      ownerEmailText: owner?.email ?? '',
      copyValue: owner?.email ?? sub.serviceName,
      copyLabel: 'Salin Email',
      url: sub.manageUrl || undefined,
      badgeText: sub.status,
      badgeTone: sub.status === 'Active' ? 'success' : sub.status === 'Trial' ? 'warning' : 'neutral',
      keywords: [
        sub.serviceName,
        sub.planName,
        sub.currency,
        sub.billingCycle,
        sub.paymentMethodHint,
        owner?.email ?? '',
        owner?.aliasLabel ?? '',
      ].join(' '),
      tagsText: sub.tags.join(' '),
      customFieldsText: '',
      notes: sub.notes,
    });
  }

  for (const asset of vault.otherAssets) {
    const owner = accountMap.get(asset.accountId);
    entries.push({
      id: asset.id,
      category: 'other',
      title: asset.title,
      subtitle: `${asset.assetType}${asset.identifier ? ` · ${asset.identifier}` : ''}`,
      detailLine: asset.url ? asset.url.replace(/^https?:\/\//, '') : asset.notes.slice(0, 70),
      ownerAccountId: asset.accountId,
      ownerEmailText: owner?.email ?? '',
      copyValue: owner?.email ?? asset.identifier,
      copyLabel: 'Salin Email',
      url: asset.url || undefined,
      badgeText: asset.assetType,
      badgeTone: 'neutral',
      keywords: [
        asset.title,
        asset.assetType,
        asset.identifier,
        asset.url,
        owner?.email ?? '',
        owner?.aliasLabel ?? '',
      ].join(' '),
      tagsText: asset.tags.join(' '),
      customFieldsText: flattenCustomFields(asset.customFields),
      notes: asset.notes,
    });
  }

  return entries;
}

export function searchVault(
  vault: VaultData,
  query: string,
  category: SearchCategory = 'all',
  privacyMask: boolean = false
): GlobalSearchResult[] {
  const accountMap = new Map(vault.googleAccounts.map((a) => [a.id, a]));
  const phoneMap = new Map(vault.phoneNumbers.map((p) => [p.id, p]));
  const entries = buildSearchEntries(vault, privacyMask).filter((item) =>
    category === 'all' ? true : item.category === category
  );

  const trimmed = query.trim();
  if (!trimmed) {
    return entries.slice(0, 12).map((item) => ({
      id: item.id,
      category: item.category,
      title: item.title,
      subtitle: item.subtitle,
      detailLine: item.detailLine,
      ownerAccount: item.ownerAccountId ? accountMap.get(item.ownerAccountId) : undefined,
      ownerPhone: item.ownerPhoneId ? phoneMap.get(item.ownerPhoneId) : undefined,
      copyValue: item.copyValue,
      copyLabel: item.copyLabel,
      url: item.url,
      badgeText: item.badgeText,
      badgeTone: item.badgeTone,
      score: 0,
    }));
  }

  const fuse = new Fuse(entries, {
    includeScore: true,
    threshold: 0.28,
    ignoreLocation: true,
    minMatchCharLength: 2,
    keys: [
      { name: 'title', weight: 0.3 },
      { name: 'keywords', weight: 0.24 },
      { name: 'notes', weight: 0.24 },
      { name: 'ownerEmailText', weight: 0.1 },
      { name: 'tagsText', weight: 0.07 },
      { name: 'customFieldsText', weight: 0.05 },
    ],
  });

  return fuse.search(trimmed, { limit: 30 }).map((res) => ({
    id: res.item.id,
    category: res.item.category,
    title: res.item.title,
    subtitle: res.item.subtitle,
    detailLine: res.item.detailLine,
    ownerAccount: res.item.ownerAccountId
      ? accountMap.get(res.item.ownerAccountId)
      : undefined,
    ownerPhone: res.item.ownerPhoneId ? phoneMap.get(res.item.ownerPhoneId) : undefined,
    copyValue: res.item.copyValue,
    copyLabel: res.item.copyLabel,
    url: res.item.url,
    badgeText: res.item.badgeText,
    badgeTone: res.item.badgeTone,
    score: res.score ?? 1,
  }));
}

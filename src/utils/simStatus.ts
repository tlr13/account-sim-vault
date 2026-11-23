import type {
  CurrencyCode,
  PhoneNumber,
  SimHealthState,
  Subscription,
} from '../types/models';

export interface SimHealthInfo {
  state: SimHealthState;
  label: string;
  shortLabel: string;
  daysUntilActiveEnd: number | null;
  daysUntilGraceEnd: number | null;
  urgencyRank: number; // Lower = more urgent
  progressPercent: number;
  needsAttention: boolean;
}

export interface SubscriptionHealthInfo {
  daysUntilRenewal: number | null;
  isUpcoming: boolean;
  isOverdue: boolean;
  label: string;
  monthlyNormalized: number;
}

export interface SubscriptionCostSummary {
  currency: CurrencyCode;
  monthlyTotal: number;
  yearlyTotal: number;
  activeCount: number;
}

const MS_PER_DAY = 1000 * 60 * 60 * 24;

export function toIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function parseLocalDate(isoDate: string): Date | null {
  if (!isoDate || !/^\d{4}-\d{2}-\d{2}$/.test(isoDate.trim())) {
    return null;
  }
  const [y, m, d] = isoDate.trim().split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function diffDaysFromToday(isoDate: string, referenceDate: Date = new Date()): number | null {
  const target = parseLocalDate(isoDate);
  if (!target) return null;
  const today = new Date(
    referenceDate.getFullYear(),
    referenceDate.getMonth(),
    referenceDate.getDate()
  );
  return Math.round((target.getTime() - today.getTime()) / MS_PER_DAY);
}

export function addDaysToIso(isoDate: string, days: number): string {
  const base = parseLocalDate(isoDate) ?? new Date();
  const next = new Date(base.getFullYear(), base.getMonth(), base.getDate() + days);
  return toIsoDate(next);
}

export function getSimHealth(
  phone: PhoneNumber,
  referenceDate: Date = new Date()
): SimHealthInfo {
  if (phone.manualStatus === 'Archived') {
    return {
      state: 'archived',
      label: 'Diarsipkan',
      shortLabel: 'Arsip',
      daysUntilActiveEnd: null,
      daysUntilGraceEnd: null,
      urgencyRank: 50,
      progressPercent: 0,
      needsAttention: false,
    };
  }

  if (phone.noExpiry) {
    return {
      state: 'no_expiry',
      label: 'Aktif (Tanpa Masa Aktif)',
      shortLabel: 'Tanpa Expired',
      daysUntilActiveEnd: null,
      daysUntilGraceEnd: null,
      urgencyRank: 40,
      progressPercent: 100,
      needsAttention: false,
    };
  }

  const daysActive = diffDaysFromToday(phone.activeUntil, referenceDate);
  const daysGrace = diffDaysFromToday(phone.graceUntil, referenceDate);

  if (daysActive === null && daysGrace === null) {
    return {
      state: 'active',
      label: 'Tanggal belum diatur',
      shortLabel: 'Belum diatur',
      daysUntilActiveEnd: null,
      daysUntilGraceEnd: null,
      urgencyRank: 35,
      progressPercent: 50,
      needsAttention: false,
    };
  }

  // Case 1: Active period still ongoing
  if (daysActive !== null && daysActive >= 0) {
    const progress = Math.max(5, Math.min(100, Math.round((daysActive / 30) * 100)));
    if (daysActive <= 14) {
      return {
        state: 'expiring_soon',
        label:
          daysActive === 0
            ? 'Masa aktif berakhir HARI INI'
            : `Masa aktif sisa ${daysActive} hari`,
        shortLabel: daysActive === 0 ? 'Habis hari ini' : `Aktif ${daysActive}h lagi`,
        daysUntilActiveEnd: daysActive,
        daysUntilGraceEnd: daysGrace,
        urgencyRank: 10 + daysActive,
        progressPercent: progress,
        needsAttention: true,
      };
    }

    return {
      state: 'active',
      label: `Aktif — sisa ${daysActive} hari`,
      shortLabel: `Aktif ${daysActive}h`,
      daysUntilActiveEnd: daysActive,
      daysUntilGraceEnd: daysGrace,
      urgencyRank: 30,
      progressPercent: progress,
      needsAttention: false,
    };
  }

  // Case 2: Active period ended, check grace period
  if (daysGrace !== null && daysGrace >= 0) {
    const graceProgress = Math.max(5, Math.min(100, Math.round((daysGrace / 30) * 100)));
    return {
      state: 'grace_period',
      label:
        daysGrace === 0
          ? 'DARURAT: Masa tenggang berakhir HARI INI!'
          : `MASA TENGGANG — sisa ${daysGrace} hari!`,
      shortLabel: daysGrace === 0 ? 'Tenggang hari ini!' : `Tenggang ${daysGrace}h`,
      daysUntilActiveEnd: daysActive,
      daysUntilGraceEnd: daysGrace,
      urgencyRank: Math.max(0, daysGrace),
      progressPercent: graceProgress,
      needsAttention: true,
    };
  }

  // Case 3: Past grace period (or past active with no grace set)
  const overdueDays = Math.abs(daysGrace ?? daysActive ?? 0);
  return {
    state: 'expired',
    label: `Hangus / lewat tenggang (${overdueDays} hari lalu)`,
    shortLabel: 'Hangus',
    daysUntilActiveEnd: daysActive,
    daysUntilGraceEnd: daysGrace,
    urgencyRank: 5,
    progressPercent: 0,
    needsAttention: true,
  };
}

export function extendSimDates(
  phone: PhoneNumber,
  addActiveDays: number,
  graceDurationDays: number = 30,
  referenceDate: Date = new Date()
): { activeUntil: string; graceUntil: string } {
  const todayIso = toIsoDate(referenceDate);
  const currentActive = parseLocalDate(phone.activeUntil);
  const today = new Date(
    referenceDate.getFullYear(),
    referenceDate.getMonth(),
    referenceDate.getDate()
  );

  // If the card is already past active or in grace period, start extension from today;
  // otherwise extend from existing activeUntil.
  const baseIso =
    currentActive && currentActive.getTime() > today.getTime()
      ? phone.activeUntil
      : todayIso;

  const newActiveUntil = addDaysToIso(baseIso, addActiveDays);
  const newGraceUntil = addDaysToIso(newActiveUntil, graceDurationDays);

  return {
    activeUntil: newActiveUntil,
    graceUntil: newGraceUntil,
  };
}

export function maskPhoneNumber(rawPhone: string): string {
  const trimmed = rawPhone.trim();
  if (!trimmed) return '';
  const digits = trimmed.replace(/\D/g, '');
  if (digits.length <= 6) {
    return trimmed.slice(0, 2) + '••••';
  }
  const prefix = digits.slice(0, 4);
  const suffix = digits.slice(-4);
  return `${prefix}-••••-${suffix}`;
}

export function getProviderAccent(provider: string): string {
  const key = provider.toLowerCase();
  if (key.includes('telkomsel')) return '#DC2626';
  if (key.includes('by.u') || key.includes('byu')) return '#EA580C';
  if (key.includes('indosat') || key.includes('im3')) return '#D97706';
  if (key.includes('xl')) return '#1D4ED8';
  if (key.includes('axis')) return '#0F766E';
  if (key.includes('tri') || key.includes('(3)')) return '#0284C7';
  if (key.includes('smartfren')) return '#BE123C';
  return '#475569';
}

export function getSubscriptionHealth(
  sub: Subscription,
  referenceDate: Date = new Date()
): SubscriptionHealthInfo {
  const days = diffDaysFromToday(sub.nextRenewalDate, referenceDate);

  let monthlyNormalized = 0;
  if (sub.status === 'Active' || sub.status === 'Trial') {
    if (sub.billingCycle === 'Monthly') monthlyNormalized = sub.costAmount;
    else if (sub.billingCycle === 'Yearly') monthlyNormalized = sub.costAmount / 12;
    else if (sub.billingCycle === 'Weekly') monthlyNormalized = sub.costAmount * 4.33;
    else monthlyNormalized = 0;
  }

  if (sub.status !== 'Active' && sub.status !== 'Trial') {
    return {
      daysUntilRenewal: days,
      isUpcoming: false,
      isOverdue: false,
      label: sub.status === 'Cancelled' ? 'Dibatalkan' : 'Berakhir',
      monthlyNormalized: 0,
    };
  }

  if (days === null) {
    return {
      daysUntilRenewal: null,
      isUpcoming: false,
      isOverdue: false,
      label: 'Tanggal tagihan belum diatur',
      monthlyNormalized,
    };
  }

  if (days < 0) {
    return {
      daysUntilRenewal: days,
      isUpcoming: false,
      isOverdue: true,
      label: `Lewat jatuh tempo (${Math.abs(days)} hari lalu)`,
      monthlyNormalized,
    };
  }

  if (days <= 14) {
    return {
      daysUntilRenewal: days,
      isUpcoming: true,
      isOverdue: false,
      label: days === 0 ? 'Tagihan HARI INI' : `Perpanjangan ${days} hari lagi`,
      monthlyNormalized,
    };
  }

  return {
    daysUntilRenewal: days,
    isUpcoming: false,
    isOverdue: false,
    label: `Perpanjangan ${days} hari lagi`,
    monthlyNormalized,
  };
}

export function summarizeSubscriptionCosts(
  subscriptions: Subscription[]
): SubscriptionCostSummary[] {
  const buckets = new Map<CurrencyCode, SubscriptionCostSummary>();

  for (const sub of subscriptions) {
    if (sub.status !== 'Active' && sub.status !== 'Trial') continue;
    const { monthlyNormalized } = getSubscriptionHealth(sub);
    const existing = buckets.get(sub.currency) ?? {
      currency: sub.currency,
      monthlyTotal: 0,
      yearlyTotal: 0,
      activeCount: 0,
    };
    existing.monthlyTotal += monthlyNormalized;
    existing.yearlyTotal += monthlyNormalized * 12;
    existing.activeCount += 1;
    buckets.set(sub.currency, existing);
  }

  return Array.from(buckets.values()).sort((a, b) =>
    a.currency === 'IDR' ? -1 : b.currency === 'IDR' ? 1 : 0
  );
}

export function formatCurrency(amount: number, currency: CurrencyCode): string {
  if (currency === 'IDR') {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(Math.round(amount));
  }
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: amount % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatDateID(isoDate: string): string {
  const d = parseLocalDate(isoDate);
  if (!d) return '—';
  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(d);
}

import { describe, expect, it } from 'vitest';
import type { PhoneNumber, Subscription } from '../types/models';
import {
  extendSimDates,
  formatDaysCountdown,
  getSimHealth,
  getSubscriptionHealth,
  maskPhoneNumber,
  normalizePhoneNumber,
  summarizeSubscriptionCosts,
} from '../utils/simStatus';

function makePhone(overrides: Partial<PhoneNumber>): PhoneNumber {
  return {
    id: 'sim_test',
    phoneNumber: '0812-8840-2190',
    label: 'Utama',
    provider: 'Telkomsel',
    simType: 'SIM Fisik',
    deviceSlot: 'HP Utama',
    usagePurpose: 'OTP',
    noExpiry: false,
    activeUntil: '2026-12-20',
    graceUntil: '2027-01-19',
    renewalTip: '',
    linkedServices: [],
    manualStatus: 'Active',
    tags: [],
    customFields: [],
    notes: '',
    updatedAt: '2026-11-23T00:00:00Z',
    ...overrides,
  };
}

describe('simStatus utilities', () => {
  const refDate = new Date(2026, 10, 23); // 2026-11-23

  it('classifies healthy active SIM (> 14 days remaining)', () => {
    const health = getSimHealth(
      makePhone({ activeUntil: '2026-12-23', graceUntil: '2027-01-22' }),
      refDate
    );
    expect(health.state).toBe('active');
    expect(health.daysUntilActiveEnd).toBe(30);
    expect(health.needsAttention).toBe(false);
  });

  it('classifies SIM expiring within 14 days as expiring_soon', () => {
    const health = getSimHealth(
      makePhone({ activeUntil: '2026-12-03', graceUntil: '2027-01-02' }),
      refDate
    );
    expect(health.state).toBe('expiring_soon');
    expect(health.daysUntilActiveEnd).toBe(10);
    expect(health.needsAttention).toBe(true);
  });

  it('classifies SIM past activeUntil but inside graceUntil as grace_period', () => {
    const health = getSimHealth(
      makePhone({ activeUntil: '2026-11-18', graceUntil: '2026-11-28' }),
      refDate
    );
    expect(health.state).toBe('grace_period');
    expect(health.daysUntilGraceEnd).toBe(5);
    expect(health.needsAttention).toBe(true);
    expect(health.urgencyRank).toBeLessThan(10);
  });

  it('classifies SIM past graceUntil as expired', () => {
    const health = getSimHealth(
      makePhone({ activeUntil: '2026-10-01', graceUntil: '2026-11-01' }),
      refDate
    );
    expect(health.state).toBe('expired');
    expect(health.needsAttention).toBe(true);
  });

  it('handles no_expiry cards such as by.U', () => {
    const health = getSimHealth(
      makePhone({ provider: 'by.U', noExpiry: true, activeUntil: '', graceUntil: '' }),
      refDate
    );
    expect(health.state).toBe('no_expiry');
    expect(health.needsAttention).toBe(false);
  });

  it('extends SIM active period from existing future date or from today if in grace period', () => {
    const futureExt = extendSimDates(
      makePhone({ activeUntil: '2026-12-03', graceUntil: '2027-01-02' }),
      30,
      30,
      refDate
    );
    expect(futureExt.activeUntil).toBe('2027-01-02');
    expect(futureExt.graceUntil).toBe('2027-02-01');

    const graceExt = extendSimDates(
      makePhone({ activeUntil: '2026-11-10', graceUntil: '2026-12-10' }),
      30,
      30,
      refDate
    );
    expect(graceExt.activeUntil).toBe('2026-12-23');
    expect(graceExt.graceUntil).toBe('2027-01-22');
  });

  it('masks middle digits of phone numbers and restores leading 0 stripped by Excel', () => {
    expect(maskPhoneNumber('0812-8840-2190')).toBe('0812-••••-2190');
    expect(maskPhoneNumber('085744109832')).toBe('0857-••••-9832');
    expect(normalizePhoneNumber('82322362446')).toBe('082322362446');
    expect(normalizePhoneNumber('0812-8840-2190')).toBe('0812-8840-2190');
    expect(formatDaysCountdown('', refDate).text).toBe('—');
    expect(formatDaysCountdown('2026-12-13', refDate).days).toBe(20);
  });

  it('summarizes active subscriptions grouped by currency and detects upcoming renewals', () => {
    const subs: Subscription[] = [
      {
        id: 's1',
        accountId: 'a1',
        serviceName: 'Google One',
        planName: '200GB',
        status: 'Active',
        costAmount: 43000,
        currency: 'IDR',
        billingCycle: 'Monthly',
        nextRenewalDate: '2026-11-29',
        autoRenew: true,
        paymentMethodHint: '',
        manageUrl: '',
        tags: [],
        notes: '',
        updatedAt: '2026-11-23T00:00:00Z',
      },
      {
        id: 's2',
        accountId: 'a1',
        serviceName: 'Domain',
        planName: '.id',
        status: 'Active',
        costAmount: 240000,
        currency: 'IDR',
        billingCycle: 'Yearly',
        nextRenewalDate: '2027-06-01',
        autoRenew: true,
        paymentMethodHint: '',
        manageUrl: '',
        tags: [],
        notes: '',
        updatedAt: '2026-11-23T00:00:00Z',
      },
      {
        id: 's3',
        accountId: 'a2',
        serviceName: 'ChatGPT Plus',
        planName: 'Plus',
        status: 'Active',
        costAmount: 20,
        currency: 'USD',
        billingCycle: 'Monthly',
        nextRenewalDate: '2026-12-01',
        autoRenew: true,
        paymentMethodHint: '',
        manageUrl: '',
        tags: [],
        notes: '',
        updatedAt: '2026-11-23T00:00:00Z',
      },
      {
        id: 's4',
        accountId: 'a2',
        serviceName: 'Old App',
        planName: 'Pro',
        status: 'Cancelled',
        costAmount: 99,
        currency: 'USD',
        billingCycle: 'Monthly',
        nextRenewalDate: '2026-10-01',
        autoRenew: false,
        paymentMethodHint: '',
        manageUrl: '',
        tags: [],
        notes: '',
        updatedAt: '2026-11-23T00:00:00Z',
      },
    ];

    expect(getSubscriptionHealth(subs[0], refDate).isUpcoming).toBe(true);
    expect(getSubscriptionHealth(subs[1], refDate).isUpcoming).toBe(false);

    const summary = summarizeSubscriptionCosts(subs);
    expect(summary).toHaveLength(2);
    expect(summary[0].currency).toBe('IDR');
    expect(summary[0].monthlyTotal).toBe(63000);
    expect(summary[1].currency).toBe('USD');
    expect(summary[1].monthlyTotal).toBe(20);
  });
});

import type { GoogleAccount, PhoneNumber, Subscription } from '../types/models';
import { addDaysToIso, parseLocalDate } from './simStatus';

function toIcsDate(isoDate: string): string {
  return isoDate.replace(/-/g, '');
}

function escapeIcsText(input: string): string {
  return input
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');
}

function buildAllDayEvent(params: {
  uid: string;
  startIso: string;
  summary: string;
  description: string;
  alarmDaysBefore?: number;
}): string {
  const dtStart = toIcsDate(params.startIso);
  const dtEnd = toIcsDate(addDaysToIso(params.startIso, 1));
  const dtStamp = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

  const lines = [
    'BEGIN:VEVENT',
    `UID:${params.uid}`,
    `DTSTAMP:${dtStamp}`,
    `DTSTART;VALUE=DATE:${dtStart}`,
    `DTEND;VALUE=DATE:${dtEnd}`,
    `SUMMARY:${escapeIcsText(params.summary)}`,
    `DESCRIPTION:${escapeIcsText(params.description)}`,
  ];

  if (params.alarmDaysBefore && params.alarmDaysBefore > 0) {
    lines.push(
      'BEGIN:VALARM',
      'ACTION:DISPLAY',
      `TRIGGER:-P${params.alarmDaysBefore}D`,
      `DESCRIPTION:${escapeIcsText(params.summary)}`,
      'END:VALARM'
    );
  }

  lines.push('END:VEVENT');
  return lines.join('\r\n');
}

export function generateSimReminderIcs(
  phone: PhoneNumber,
  linkedAccounts: GoogleAccount[]
): string {
  const events: string[] = [];
  const accountList =
    linkedAccounts.length > 0
      ? `Akun Google tertaut: ${linkedAccounts.map((a) => a.email).join(', ')}`
      : 'Belum ada akun Google yang ditautkan.';
  const tipLine = phone.renewalTip ? `Cara perpanjang: ${phone.renewalTip}` : '';

  if (parseLocalDate(phone.activeUntil)) {
    events.push(
      buildAllDayEvent({
        uid: `sim-active-${phone.id}@accvault.local`,
        startIso: phone.activeUntil,
        summary: `[SIM] Masa Aktif Habis: ${phone.provider} ${phone.phoneNumber} (${phone.label || phone.deviceSlot})`,
        description: [
          `Kartu ${phone.provider} (${phone.phoneNumber}) memasuki batas akhir masa aktif.`,
          `Posisi: ${phone.deviceSlot || '-'}`,
          accountList,
          tipLine,
        ]
          .filter(Boolean)
          .join('\n'),
        alarmDaysBefore: 7,
      })
    );
  }

  if (parseLocalDate(phone.graceUntil)) {
    events.push(
      buildAllDayEvent({
        uid: `sim-grace-${phone.id}@accvault.local`,
        startIso: phone.graceUntil,
        summary: `[DARURAT SIM] Batas Masa Tenggang: ${phone.provider} ${phone.phoneNumber}`,
        description: [
          `PERINGATAN: Kartu ${phone.provider} (${phone.phoneNumber}) akan HANGUS jika tidak diperpanjang sebelum tanggal ini!`,
          `Posisi: ${phone.deviceSlot || '-'}`,
          accountList,
          tipLine,
        ]
          .filter(Boolean)
          .join('\n'),
        alarmDaysBefore: 3,
      })
    );
  }

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//AccVault//Account & SIM Vault//ID',
    'CALSCALE:GREGORIAN',
    ...events,
    'END:VCALENDAR',
  ].join('\r\n');
}

export function generateSubscriptionReminderIcs(
  sub: Subscription,
  ownerAccount?: GoogleAccount
): string {
  const events: string[] = [];

  if (parseLocalDate(sub.nextRenewalDate)) {
    events.push(
      buildAllDayEvent({
        uid: `sub-renew-${sub.id}@accvault.local`,
        startIso: sub.nextRenewalDate,
        summary: `[Subscription] Perpanjangan ${sub.serviceName} (${sub.planName || sub.billingCycle})`,
        description: [
          `Akun Google: ${ownerAccount?.email ?? '-'}`,
          `Biaya: ${sub.currency} ${sub.costAmount} (${sub.billingCycle})`,
          `Auto-renew: ${sub.autoRenew ? 'Ya' : 'Tidak'}`,
          sub.paymentMethodHint ? `Metode bayar: ${sub.paymentMethodHint}` : '',
          sub.manageUrl ? `Kelola: ${sub.manageUrl}` : '',
        ]
          .filter(Boolean)
          .join('\n'),
        alarmDaysBefore: 7,
      })
    );
  }

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//AccVault//Account & SIM Vault//ID',
    'CALSCALE:GREGORIAN',
    ...events,
    'END:VCALENDAR',
  ].join('\r\n');
}

export function downloadTextFile(filename: string, content: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

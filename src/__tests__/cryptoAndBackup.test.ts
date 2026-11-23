import { describe, expect, it } from 'vitest';
import * as XLSX from 'xlsx';
import { buildSampleVault } from '../data/sampleData';
import {
  buildExcelWorkbook,
  mergeImportedSpreadsheet,
  parseSpreadsheetFile,
  parseVaultFromJson,
  sanitizePasswordHint,
  serializeVaultToJson,
} from '../utils/backupIO';
import {
  generateSimReminderIcs,
  generateSubscriptionReminderIcs,
} from '../utils/calendarIcs';
import {
  decryptJsonPayload,
  encryptJsonPayload,
  isEncryptedEnvelope,
} from '../utils/crypto';

describe('Crypto, Backup IO, Smart Excel Import, and Calendar ICS', () => {
  const vault = buildSampleVault(new Date(2026, 10, 23));

  it('round-trips JSON serialization and parsing without losing records', () => {
    const json = serializeVaultToJson(vault);
    const restored = parseVaultFromJson(json);

    expect(restored.googleAccounts).toHaveLength(vault.googleAccounts.length);
    expect(restored.phoneNumbers).toHaveLength(vault.phoneNumbers.length);
    expect(restored.cloudProjects).toHaveLength(vault.cloudProjects.length);
    expect(restored.connectedWebsites).toHaveLength(vault.connectedWebsites.length);
    expect(restored.subscriptions).toHaveLength(vault.subscriptions.length);
    expect(restored.otherAssets).toHaveLength(vault.otherAssets.length);
  });

  it('builds a 6-sheet Excel workbook containing all entity tabs', async () => {
    const wb = await buildExcelWorkbook(vault);
    expect(wb.SheetNames).toEqual([
      'Google_Accounts',
      'Phone_Numbers',
      'Cloud_Projects',
      'Connected_Websites',
      'Subscriptions',
      'Other_Assets',
    ]);
  });

  it('sanitizes raw passwords while keeping safe short pattern hints and references', () => {
    expect(sanitizePasswordHint('i')).toEqual({ hint: 'i', wasRedacted: false });
    expect(sanitizePasswordHint('!e')).toEqual({ hint: '!e', wasRedacted: false });
    expect(sanitizePasswordHint('password ada di rekan')).toEqual({
      hint: 'password ada di rekan',
      wasRedacted: false,
    });
    expect(sanitizePasswordHint('supersecretpassword99')).toEqual({
      hint: '[Pindahkan ke Password Manager]',
      wasRedacted: true,
    });
  });

  it('imports simple email & nomor sheets with @gmail.com normalization, leading 0 fix, Belum Cancel detection, and secret redaction', async () => {
    const wb = XLSX.utils.book_new();
    const emailSheet = XLSX.utils.aoa_to_sheet([
      ['No', 'email', 'pass', 'kondisi', 'subscription', '', ''],
      [1, 'akunutama', 'i', '', 'google ai pro nov 2026-2027', '', 'belum cancel'],
      [2, 'akunpinjam', 'e', 'dipake Rekan sampe Juni 2027', 'google ai pro', '', ''],
      [3, 'akunjual', 'rawpassword123', 'dijual ke Pembeli A', 'google ai pro', '', ''],
      [4, 'akuncadangan', '', '', '', 'storage cuma 5gb', ''],
    ]);
    const nomorSheet = XLSX.utils.aoa_to_sheet([
      ['Kartu', 'Nomor HP', 'Masa Tenggang', 'countdown', 'Mati', 'countdown'],
      ['Telkom', 82322362446, '2026-12-13', 20, '', -46349],
      ['XL Prio', 81776349497, '', -46349, '', -46349],
    ]);
    XLSX.utils.book_append_sheet(wb, emailSheet, 'email');
    XLSX.utils.book_append_sheet(wb, nomorSheet, 'nomor');

    const arr = XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer;
    const summary = await parseSpreadsheetFile(arr);

    expect(summary.detectedSheets).toEqual(['email', 'nomor']);
    expect(summary.accounts).toHaveLength(4);
    expect(summary.phones).toHaveLength(2);
    expect(summary.redactedSecretsCount).toBe(1);

    // Row 1: auto @gmail.com, quickSub split, belum cancel
    expect(summary.accounts[0].email).toBe('akunutama@gmail.com');
    expect(summary.accounts[0].passwordHint).toBe('i');
    expect(summary.accounts[0].quickSubName).toBe('google ai pro');
    expect(summary.accounts[0].quickSubNeedsCancel).toBe(true);

    // Row 2: Shared status + holder + until
    expect(summary.accounts[1].status).toBe('Shared');
    expect(summary.accounts[1].holderName).toBe('Rekan');
    expect(summary.accounts[1].holderUntil).toBe('Juni 2027');

    // Row 3: Sold status + redacted raw password
    expect(summary.accounts[2].status).toBe('Sold');
    expect(summary.accounts[2].holderName).toBe('Pembeli A');
    expect(summary.accounts[2].passwordHint).toBe('[Pindahkan ke Password Manager]');

    // Row 4: Spare + extra note preserved
    expect(summary.accounts[3].status).toBe('Spare');
    expect(summary.accounts[3].notes).toContain('storage cuma 5gb');

    // Phones: leading 0 restored & XL Prio postpaid auto-detected
    expect(summary.phones[0].provider).toBe('Telkomsel');
    expect(summary.phones[0].phoneNumber).toBe('082322362446');
    expect(summary.phones[0].activeUntil).toBe('2026-12-13');
    expect(summary.phones[0].graceUntil).toBe('');

    expect(summary.phones[1].provider).toBe('XL Prio');
    expect(summary.phones[1].phoneNumber).toBe('081776349497');
    expect(summary.phones[1].noExpiry).toBe(true);

    // Merge avoids duplicates
    const mergedOnce = mergeImportedSpreadsheet(vault, summary, 'merge');
    const mergedTwice = mergeImportedSpreadsheet(mergedOnce, summary, 'merge');
    expect(mergedTwice.googleAccounts.length).toBe(mergedOnce.googleAccounts.length);
    expect(mergedTwice.phoneNumbers.length).toBe(mergedOnce.phoneNumbers.length);
  });

  it('encrypts and decrypts payloads with AES-GCM 256-bit and rejects wrong passphrase', async () => {
    const plaintext = serializeVaultToJson(vault);
    const envelope = await encryptJsonPayload(plaintext, 'rahasia-kuat-123');
    expect(isEncryptedEnvelope(envelope)).toBe(true);
    expect(envelope.ciphertext).not.toContain('rafi.personal@gmail.com');

    const decrypted = await decryptJsonPayload(envelope, 'rahasia-kuat-123');
    expect(decrypted).toBe(plaintext);

    await expect(decryptJsonPayload(envelope, 'passphrase-salah')).rejects.toThrow();
  });

  it('generates valid RFC 5545 .ics calendar events for SIM active/grace dates and subscriptions', () => {
    const sim = vault.phoneNumbers[0];
    const linkedAccounts = vault.googleAccounts.filter((a) => a.linkedPhoneId === sim.id);
    const simIcs = generateSimReminderIcs(sim, linkedAccounts);

    expect(simIcs).toContain('BEGIN:VCALENDAR');
    expect(simIcs).toContain('END:VCALENDAR');
    expect(simIcs).toContain('TRIGGER:-P7D');
    expect(simIcs).toContain('TRIGGER:-P3D');
    expect(simIcs).toContain('rafi.personal@gmail.com');

    const sub = vault.subscriptions[0];
    const subOwner = vault.googleAccounts.find((a) => a.id === sub.accountId);
    const subIcs = generateSubscriptionReminderIcs(sub, subOwner);
    expect(subIcs).toContain('BEGIN:VEVENT');
    expect(subIcs).toContain('Google One');
  });
});

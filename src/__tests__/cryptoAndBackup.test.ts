import { describe, expect, it } from 'vitest';
import { buildSampleVault } from '../data/sampleData';
import {
  buildExcelWorkbook,
  parseVaultFromJson,
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

describe('Crypto, Backup IO, and Calendar ICS', () => {
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

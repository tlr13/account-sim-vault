import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildSampleVault } from '../data/sampleData';
import {
  buildPairingUrl,
  parsePairingHash,
  pullVaultFromGoogleSheets,
  pushVaultToGoogleSheets,
  testGoogleSheetsConnection,
} from '../services/storage/GoogleSheetsStorageProvider';
import { getDefaultSyncSettings } from '../services/storage/LocalStorageProvider';

describe('GoogleSheetsStorageProvider & QR Pairing', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  const sampleConfig = {
    scriptUrl: 'https://script.google.com/macros/s/AKfycb_test_deploy/exec',
    apiKey: '123456',
    autoSync: true,
    autoPull: true,
  };

  it('pings Apps Script Web App with action=ping and api key', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          ok: true,
          spreadsheetName: 'AccVault - Peta Akun Email & Kartu SIM',
        }),
        { status: 200 }
      )
    );

    const msg = await testGoogleSheetsConnection(sampleConfig);
    expect(msg).toContain('AccVault - Peta Akun Email & Kartu SIM');
    const calledUrl = String(fetchMock.mock.calls[0][0]);
    expect(calledUrl).toContain('action=ping');
    expect(calledUrl).toContain('key=123456');
  });

  it('pulls vault data and normalizes phone leading zero and account fields', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          ok: true,
          spreadsheetName: 'AccVault Sheet',
          vault: {
            phoneNumbers: [
              {
                id: 'sim_1',
                provider: 'Telkomsel',
                phoneNumber: '82322362446',
                label: 'Utama',
                simType: 'SIM Fisik',
                deviceSlot: '',
                usagePurpose: '',
                noExpiry: false,
                activeUntil: '2026-12-13',
                graceUntil: '',
                renewalTip: '',
                linkedServices: [],
                manualStatus: 'Active',
                tags: [],
                customFields: [],
                notes: '',
                updatedAt: '2026-11-23T00:00:00Z',
              },
            ],
            googleAccounts: [
              {
                id: 'acc_1',
                email: 'demo@gmail.com',
                quickSubNeedsCancel: true,
              },
            ],
          },
        }),
        { status: 200 }
      )
    );

    const res = await pullVaultFromGoogleSheets(sampleConfig);
    expect(res.vault.phoneNumbers[0].phoneNumber).toBe('082322362446');
    expect(res.vault.googleAccounts[0].email).toBe('demo@gmail.com');
    expect(res.vault.googleAccounts[0].quickSubNeedsCancel).toBe(true);
    expect(res.vault.googleAccounts[0].tags).toEqual([]);
  });

  it('pushes vault using CORS-safe text/plain POST content-type', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          ok: true,
          spreadsheetName: 'AccVault Sheet',
          updatedAt: '2026-11-23T12:00:00Z',
        }),
        { status: 200 }
      )
    );

    const vault = buildSampleVault();
    const res = await pushVaultToGoogleSheets(sampleConfig, vault);
    expect(res.spreadsheetName).toBe('AccVault Sheet');

    const init = fetchMock.mock.calls[0][1] as RequestInit;
    expect(init.method).toBe('POST');
    expect((init.headers as Record<string, string>)['Content-Type']).toBe(
      'text/plain;charset=utf-8'
    );
    const sentBody = JSON.parse(String(init.body));
    expect(sentBody.action).toBe('push');
    expect(sentBody.key).toBe('123456');
    expect(sentBody.vault.googleAccounts.length).toBe(vault.googleAccounts.length);
  });

  it('encodes and decodes QR pairing URLs cleanly for Google Sheets mode', () => {
    const settings = getDefaultSyncSettings();
    settings.mode = 'gsheets';
    settings.gsheets.scriptUrl = sampleConfig.scriptUrl;
    settings.gsheets.apiKey = 'pin999';

    const pairUrl = buildPairingUrl(settings, 'https://tlr13.github.io/account-sim-vault/');
    expect(pairUrl).toContain('#pair=');

    const parsed = parsePairingHash(new URL(pairUrl).hash);
    expect(parsed?.mode).toBe('gsheets');
    expect(parsed?.gsheets?.scriptUrl).toBe(sampleConfig.scriptUrl);
    expect(parsed?.gsheets?.apiKey).toBe('pin999');
  });
});

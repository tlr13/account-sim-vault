import { describe, expect, it } from 'vitest';
import { buildSampleVault } from '../data/sampleData';
import { searchVault } from '../services/search/searchEngine';

describe('Global Reverse-Lookup Search Engine', () => {
  const vault = buildSampleVault(new Date(2026, 10, 23));

  it('finds the owner Google account when searching by connected website name', () => {
    const results = searchVault(vault, 'vercel');
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].category).toBe('website');
    expect(results[0].title).toBe('Vercel');
    expect(results[0].ownerAccount?.email).toBe('rafi.clouddev@gmail.com');
  });

  it('finds the owner Google account when searching by cloud project ID or domain', () => {
    const results = searchVault(vault, 'tokokita-prod');
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].category).toBe('cloud');
    expect(results[0].ownerAccount?.email).toBe('rafi.clouddev@gmail.com');
  });

  it('tolerates minor typos via fuzzy matching', () => {
    const results = searchVault(vault, 'tokped');
    const figmaTypo = searchVault(vault, 'figm');
    expect(figmaTypo.some((r) => r.title === 'Figma')).toBe(true);
    expect(results).toBeDefined();
  });

  it('finds SIM card by last 4 digits or provider and reveals linked account context', () => {
    const byDigits = searchVault(vault, '9832');
    expect(byDigits.some((r) => r.category === 'phone' && r.title.includes('Indosat'))).toBe(
      true
    );

    const byProvider = searchVault(vault, 'Telkomsel', 'phone');
    expect(byProvider.length).toBe(1);
    expect(byProvider[0].copyValue).toBe('0812-8840-2190');
  });

  it('searches inside custom fields and tags', () => {
    const results = searchVault(vault, 'asia-southeast2');
    expect(results.some((r) => r.title === 'TokoKita Backend API')).toBe(true);
  });
});

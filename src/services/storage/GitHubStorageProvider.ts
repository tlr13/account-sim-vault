import type { GitHubSyncConfig, VaultData } from '../../types/models';
import { parseVaultFromJson, serializeVaultToJson } from '../../utils/backupIO';
import {
  decryptJsonPayload,
  encryptJsonPayload,
  isEncryptedEnvelope,
} from '../../utils/crypto';

export interface GitHubPullResult {
  vault: VaultData | null;
  sha: string;
  wasEmpty: boolean;
}

export interface GitHubPushResult {
  sha: string;
}

function utf8ToBase64(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let binary = '';
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToUtf8(base64: string): string {
  const clean = base64.replace(/\s+/g, '');
  const binary = atob(clean);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new TextDecoder().decode(bytes);
}

function validateGitHubConfig(config: GitHubSyncConfig): void {
  if (!config.owner.trim() || !config.repo.trim()) {
    throw new Error('Isi Username GitHub (Owner) dan Nama Repository Private terlebih dahulu.');
  }
  if (!config.token.trim()) {
    throw new Error('Masukkan Fine-grained Personal Access Token (PAT) GitHub terlebih dahulu.');
  }
}

function buildContentsUrl(config: GitHubSyncConfig): string {
  const owner = encodeURIComponent(config.owner.trim());
  const repo = encodeURIComponent(config.repo.trim());
  const path = config.filePath
    .trim()
    .replace(/^\/+/, '')
    .split('/')
    .map(encodeURIComponent)
    .join('/');
  return `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;
}

function buildHeaders(token: string): HeadersInit {
  return {
    Authorization: `Bearer ${token.trim()}`,
    Accept: 'application/vnd.github+json',
    'Content-Type': 'application/json',
    'X-GitHub-Api-Version': '2022-11-28',
  };
}

export async function testGitHubConnection(config: GitHubSyncConfig): Promise<string> {
  validateGitHubConfig(config);
  const url = `https://api.github.com/repos/${encodeURIComponent(config.owner.trim())}/${encodeURIComponent(config.repo.trim())}`;
  const res = await fetch(url, { headers: buildHeaders(config.token) });
  if (!res.ok) {
    if (res.status === 401) throw new Error('Token GitHub tidak valid atau sudah kedaluwarsa.');
    if (res.status === 404) {
      throw new Error('Repository tidak ditemukan atau token belum diberi izin Contents pada repo ini.');
    }
    throw new Error(`Gagal menghubungi GitHub (HTTP ${res.status}).`);
  }
  const repoInfo = (await res.json()) as { full_name: string; private: boolean };
  return `Terhubung ke ${repoInfo.full_name} (${repoInfo.private ? 'Private' : 'Public'})`;
}

export async function pullVaultFromGitHub(
  config: GitHubSyncConfig
): Promise<GitHubPullResult> {
  validateGitHubConfig(config);
  const branch = config.branch.trim() || 'main';
  const url = `${buildContentsUrl(config)}?ref=${encodeURIComponent(branch)}`;

  const res = await fetch(url, {
    headers: buildHeaders(config.token),
    cache: 'no-store',
  });

  if (res.status === 404) {
    return { vault: null, sha: '', wasEmpty: true };
  }

  if (!res.ok) {
    throw new Error(`Gagal mengambil data dari GitHub (HTTP ${res.status}).`);
  }

  const data = (await res.json()) as { content: string; sha: string };
  const decodedText = base64ToUtf8(data.content);

  let rawJson = decodedText;
  const parsedProbe: unknown = JSON.parse(decodedText);
  if (isEncryptedEnvelope(parsedProbe)) {
    rawJson = await decryptJsonPayload(parsedProbe, config.passphrase);
  }

  return {
    vault: parseVaultFromJson(rawJson),
    sha: data.sha,
    wasEmpty: false,
  };
}

export async function pushVaultToGitHub(
  config: GitHubSyncConfig,
  vault: VaultData
): Promise<GitHubPushResult> {
  validateGitHubConfig(config);
  const branch = config.branch.trim() || 'main';
  const url = buildContentsUrl(config);

  // Fetch latest sha if we don't have one yet so updates succeed smoothly
  let sha = config.lastSha?.trim() || '';
  if (!sha) {
    const probe = await fetch(`${url}?ref=${encodeURIComponent(branch)}`, {
      headers: buildHeaders(config.token),
      cache: 'no-store',
    });
    if (probe.ok) {
      const existing = (await probe.json()) as { sha?: string };
      sha = existing.sha ?? '';
    }
  }

  const plaintext = serializeVaultToJson(vault);
  const payloadToWrite = config.encryptData
    ? JSON.stringify(await encryptJsonPayload(plaintext, config.passphrase), null, 2)
    : plaintext;

  const body: Record<string, string> = {
    message: `sync(accvault): update data (${new Date().toISOString()})`,
    content: utf8ToBase64(payloadToWrite),
    branch,
  };
  if (sha) {
    body.sha = sha;
  }

  const res = await fetch(url, {
    method: 'PUT',
    headers: buildHeaders(config.token),
    body: JSON.stringify(body),
  });

  if (res.status === 409) {
    throw new Error(
      'Terdeteksi versi data lebih baru di GitHub. Klik "Tarik Data (Pull)" terlebih dahulu agar perubahan perangkat lain tidak tertimpa.'
    );
  }

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`Gagal menyimpan ke GitHub (HTTP ${res.status}): ${errText.slice(0, 140)}`);
  }

  const saved = (await res.json()) as { content?: { sha?: string } };
  return {
    sha: saved.content?.sha ?? sha,
  };
}

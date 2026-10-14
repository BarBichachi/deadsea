import type { ScheduleItem } from './types.ts';

// Per-person encrypted schedule files for the static mirror (GitHub Pages), which has no server to hide the list.
// The 5 digits are stretched with PBKDF2 into an AES key plus a file name, so the published files reveal neither
// IDs nor schedules without guessing digits. This is obfuscation against browsing, not strong secrecy: there are
// only 100,000 possible IDs, so a determined attacker can enumerate them (as with the rate-limited API).

export interface SealedMeta {
  version: number;
  updatedAt: string;
  salt: string;
  iterations: number;
}

export interface SealedFile {
  /** base64 AES-GCM IV. */
  iv: string;
  /** base64 AES-GCM ciphertext of the JSON payload. */
  data: string;
}

export interface SealedPayload {
  id: string;
  items: ScheduleItem[];
}

export interface Access {
  /** Hex file name (without extension) holding this person's schedule. */
  name: string;
  key: CryptoKey;
}

/** Slow enough to make each guess cost a fraction of a second, fast enough for an old phone. */
export const SEAL_ITERATIONS = 150_000;

const encoder = new TextEncoder();
const decoder = new TextDecoder();

const toHex = (bytes: Uint8Array) => [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('');

function toBase64(bytes: Uint8Array): string {
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary);
}

function fromBase64(text: string): Uint8Array<ArrayBuffer> {
  const binary = atob(text);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

// One PBKDF2 run yields 384 bits: the first 256 are the AES key, the last 128 the file name
export async function deriveAccess(id: string, salt: string, iterations: number): Promise<Access> {
  const base = await crypto.subtle.importKey('raw', encoder.encode(id), 'PBKDF2', false, ['deriveBits']);
  const bits = new Uint8Array(
    await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: encoder.encode(salt), iterations }, base, 384),
  );
  const key = await crypto.subtle.importKey('raw', bits.slice(0, 32), 'AES-GCM', false, ['encrypt', 'decrypt']);
  return { name: toHex(bits.slice(32)), key };
}

export async function sealSchedule(payload: SealedPayload, access: Access): Promise<SealedFile> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const data = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, access.key, encoder.encode(JSON.stringify(payload)));
  return { iv: toBase64(iv), data: toBase64(new Uint8Array(data)) };
}

// Throws if the key is wrong or the file was altered (AES-GCM authentication)
export async function openSchedule(file: SealedFile, access: Access): Promise<SealedPayload> {
  const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: fromBase64(file.iv) }, access.key, fromBase64(file.data));
  return JSON.parse(decoder.decode(plain)) as SealedPayload;
}

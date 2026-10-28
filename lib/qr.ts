// The QR code carries ONLY a secret, unguessable token (never event details),
// so a QR code cannot be forged on the phone. The server decides what it means.
const PREFIX = 'QRATT:';
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function buildQRPayload(token: string): string {
  return `${PREFIX}${token}`;
}

export type ParseQRResult = { ok: true; token: string } | { ok: false; message: string };

export function parseQRPayload(raw: string): ParseQRResult {
  const value = (raw ?? '').trim();
  if (!value.startsWith(PREFIX)) {
    return { ok: false, message: 'This is not an attendance QR code.' };
  }
  const token = value.slice(PREFIX.length);
  if (!UUID_RE.test(token)) {
    return { ok: false, message: 'This QR code is damaged or invalid.' };
  }
  return { ok: true, token };
}

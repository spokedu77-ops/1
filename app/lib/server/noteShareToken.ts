import { randomBytes } from 'crypto';

export function generateNoteShareToken(): string {
  return randomBytes(18).toString('base64url');
}

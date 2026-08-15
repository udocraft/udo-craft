import { isValid } from '@tma.js/init-data-node';

export function validateInitData(initData: string, botToken: string): boolean {
  try {
    return isValid(initData, botToken);
  } catch (error) {
    console.error('Failed to validate initData:', error);
    return false;
  }
}

export function extractAuthHeader(request: Request): string | null {
  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.substring(7);
}

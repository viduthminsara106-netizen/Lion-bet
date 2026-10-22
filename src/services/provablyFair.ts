/**
 * Provably Fair RNG System using SHA-256 HMAC
 * Enhanced with configurable loss volatility (High-risk / High-loss mode)
 */

export interface ProvablyFairResult {
  serverSeed: string;
  serverSeedHash: string;
  clientSeed: string;
  nonce: number;
  crashPoint: number;
  hashHex: string;
}

export function generateRandomHex(byteCount: number = 32): string {
  const bytes = new Uint8Array(byteCount);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

export async function sha256(message: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function hmacSha256(keyStr: string, message: string): Promise<string> {
  const enc = new TextEncoder();
  const keyData = enc.encode(keyStr);
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', cryptoKey, enc.encode(message));
  return Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Calculates deterministic crash multiplier with higher loss rate & direct 1.00x instant crashes
 * @param serverSeed 
 * @param clientSeed 
 * @param nonce 
 * @param houseEdge Default 0.22 (22% house advantage)
 * @param earlyCrashRate Default 0.45 (45% probability of early burst / high loss)
 * @param instant100Rate Default 0.15 (15% probability of direct 1.00x instant crash - "1.00x වලින්ම පුපුරා යෑම්")
 */
export async function calculateCrashPoint(
  serverSeed: string,
  clientSeed: string,
  nonce: number,
  houseEdge: number = 0.22,
  earlyCrashRate: number = 0.45,
  instant100Rate: number = 0.15,
  isLuckyHour: boolean = false
): Promise<{ crashPoint: number; hashHex: string }> {
  const message = `${clientSeed}:${nonce}`;
  const hashHex = await hmacSha256(serverSeed, message);

  // Take first 13 characters (52 bits) of hex
  const subHex = hashHex.substring(0, 13);
  const h = parseInt(subHex, 16);
  const e = Math.pow(2, 52);

  const normalizedValue = h / e;

  // During Lucky Hour (15 mins), drastically reduce instant 1.00x bursts and early crashes,
  // and boost mid-to-high multipliers!
  const effectiveInstant100Rate = isLuckyHour
    ? Math.min(instant100Rate * 0.25, 0.03)
    : instant100Rate;
  const effectiveEarlyCrashRate = isLuckyHour
    ? Math.min(earlyCrashRate * 0.35, 0.15)
    : earlyCrashRate;
  const effectiveHouseEdge = isLuckyHour
    ? Math.max(0.04, houseEdge * 0.35)
    : houseEdge;

  // Direct 1.00x Instant Burst
  if (normalizedValue < effectiveInstant100Rate) {
    return { crashPoint: 1.00, hashHex };
  }

  // Early burst (1.01x - 1.25x)
  if (normalizedValue < effectiveEarlyCrashRate) {
    const subRatio =
      (normalizedValue - effectiveInstant100Rate) /
      Math.max(0.01, effectiveEarlyCrashRate - effectiveInstant100Rate);
    let earlyMultiplier: number;
    if (subRatio < 0.20 && !isLuckyHour) {
      earlyMultiplier = 1.00;
    } else if (subRatio < 0.50) {
      earlyMultiplier = 1.04 + subRatio * 0.24;
    } else {
      earlyMultiplier = 1.12 + (subRatio - 0.50) * 0.32;
    }
    const finalVal = Math.max(1.00, Number(earlyMultiplier.toFixed(2)));
    return { crashPoint: Math.min(1.25, finalVal), hashHex };
  }

  // Standard crash curve with Lucky Hour multiplier boost when active
  const rtp = 1 - effectiveHouseEdge;
  let rawMultiplier = ((100 * e - h) / (e - h) / 100) * rtp + (1 - rtp);

  if (isLuckyHour) {
    // Boost probability of higher crash multipliers (2.5x - 50x+) during Lucky Hour
    rawMultiplier = rawMultiplier * 1.45 + 0.55;
  }

  const finalMultiplier = Math.max(1.00, Math.floor(rawMultiplier * 100) / 100);

  return { crashPoint: Math.min(finalMultiplier, 1000.00), hashHex };
}

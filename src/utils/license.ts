import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as crypto from 'crypto';

const LICENSE_FILE = path.join(os.homedir(), '.codepulse', 'license.json');

export type LicenseTier = 'free' | 'pro' | 'team';

interface LicenseData {
  key: string;
  tier: LicenseTier;
  deviceId: string;
  activatedAt: string;
}

export function getDeviceId(): string {
  const raw = os.hostname() + os.platform() + os.arch() + os.homedir();
  return crypto.createHash('sha256').update(raw).digest('hex').slice(0, 16);
}

export function getLicense(): LicenseData | null {
  try {
    if (!fs.existsSync(LICENSE_FILE)) return null;
    const data = JSON.parse(fs.readFileSync(LICENSE_FILE, 'utf-8')) as LicenseData;
    return data;
  } catch {
    return null;
  }
}

export function getCurrentTier(): LicenseTier {
  const license = getLicense();
  return license?.tier ?? 'free';
}

export function activateLicense(key: string): { success: boolean; tier: LicenseTier; message: string } {
  const deviceId = getDeviceId();

  // Key format: CP-<TIER>-<HASH>
  // CP-PRO-XXXX  → pro
  // CP-TEAM-XXXX → team
  const proPattern = /^CP-PRO-[A-Z0-9]{8,}$/i;
  const teamPattern = /^CP-TEAM-[A-Z0-9]{8,}$/i;

  let tier: LicenseTier;
  if (teamPattern.test(key)) {
    tier = 'team';
  } else if (proPattern.test(key)) {
    tier = 'pro';
  } else {
    return { success: false, tier: 'free', message: 'Invalid license key format.' };
  }

  const licenseData: LicenseData = {
    key,
    tier,
    deviceId,
    activatedAt: new Date().toISOString(),
  };

  try {
    fs.mkdirSync(path.dirname(LICENSE_FILE), { recursive: true });
    fs.writeFileSync(LICENSE_FILE, JSON.stringify(licenseData, null, 2));
    return { success: true, tier, message: `Successfully activated ${tier.toUpperCase()} license!` };
  } catch {
    return { success: false, tier: 'free', message: 'Failed to save license.' };
  }
}

export function deactivateLicense(): void {
  try {
    if (fs.existsSync(LICENSE_FILE)) fs.unlinkSync(LICENSE_FILE);
  } catch {
    // ignore
  }
}

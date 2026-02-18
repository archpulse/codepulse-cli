export type LicenseTier = 'free' | 'pro' | 'team';
interface LicenseData {
    key: string;
    tier: LicenseTier;
    deviceId: string;
    activatedAt: string;
}
export declare function getDeviceId(): string;
export declare function getLicense(): LicenseData | null;
export declare function getCurrentTier(): LicenseTier;
export declare function activateLicense(key: string): {
    success: boolean;
    tier: LicenseTier;
    message: string;
};
export declare function deactivateLicense(): void;
export {};

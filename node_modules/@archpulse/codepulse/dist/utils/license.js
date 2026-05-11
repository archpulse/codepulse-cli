"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDeviceId = getDeviceId;
exports.getLicense = getLicense;
exports.getCurrentTier = getCurrentTier;
exports.activateLicense = activateLicense;
exports.deactivateLicense = deactivateLicense;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const os = __importStar(require("os"));
const crypto = __importStar(require("crypto"));
const LICENSE_FILE = path.join(os.homedir(), '.codepulse', 'license.json');
function getDeviceId() {
    const raw = os.hostname() + os.platform() + os.arch() + os.homedir();
    return crypto.createHash('sha256').update(raw).digest('hex').slice(0, 16);
}
function getLicense() {
    try {
        if (!fs.existsSync(LICENSE_FILE))
            return null;
        const data = JSON.parse(fs.readFileSync(LICENSE_FILE, 'utf-8'));
        return data;
    }
    catch {
        return null;
    }
}
function getCurrentTier() {
    const license = getLicense();
    return license?.tier ?? 'free';
}
function activateLicense(key) {
    const deviceId = getDeviceId();
    // Key format: CP-<TIER>-<HASH>
    // CP-PRO-XXXX  → pro
    // CP-TEAM-XXXX → team
    const proPattern = /^CP-PRO-[A-Z0-9]{8,}$/i;
    const teamPattern = /^CP-TEAM-[A-Z0-9]{8,}$/i;
    let tier;
    if (teamPattern.test(key)) {
        tier = 'team';
    }
    else if (proPattern.test(key)) {
        tier = 'pro';
    }
    else {
        return { success: false, tier: 'free', message: 'Invalid license key format.' };
    }
    const licenseData = {
        key,
        tier,
        deviceId,
        activatedAt: new Date().toISOString(),
    };
    try {
        fs.mkdirSync(path.dirname(LICENSE_FILE), { recursive: true });
        fs.writeFileSync(LICENSE_FILE, JSON.stringify(licenseData, null, 2));
        return { success: true, tier, message: `Successfully activated ${tier.toUpperCase()} license!` };
    }
    catch {
        return { success: false, tier: 'free', message: 'Failed to save license.' };
    }
}
function deactivateLicense() {
    try {
        if (fs.existsSync(LICENSE_FILE))
            fs.unlinkSync(LICENSE_FILE);
    }
    catch {
        // ignore
    }
}
//# sourceMappingURL=license.js.map
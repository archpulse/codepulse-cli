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
exports.SCARule = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
class SCARule {
    constructor() {
        this.name = 'software-composition-analysis';
        // Local-first vulnerability database (subset of common issues)
        this.db = {
            'lodash': { version: '4.17.21', message: 'Vulnerable to ReDoS. Upgrade to 4.17.21+' },
            'express': { version: '4.17.3', message: 'Vulnerable to Open Redirect. Upgrade to 4.17.3+' },
            'axios': { version: '0.21.1', message: 'Vulnerable to SSRF. Upgrade to 0.21.1+' },
            'moment': { version: '2.29.4', message: 'Vulnerable to ReDoS. Upgrade to 2.29.4+ or use date-fns' },
            'shelljs': { version: '0.8.5', message: 'Vulnerable to Command Injection. Upgrade to 0.8.5+' },
            'qs': { version: '6.7.3', message: 'Vulnerable to Prototype Pollution. Upgrade to 6.7.3+' },
            'trim': { version: '0.0.3', message: 'Vulnerable to ReDoS. Upgrade to 0.0.3+' },
            'node-fetch': { version: '2.6.7', message: 'Vulnerable to Information Exposure. Upgrade to 2.6.7+' },
        };
    }
    run(context) {
        const issues = [];
        const pkgPath = path.join(process.cwd(), 'package.json');
        if (fs.existsSync(pkgPath)) {
            try {
                const content = fs.readFileSync(pkgPath, 'utf-8');
                const pkg = JSON.parse(content);
                const deps = { ...pkg.dependencies, ...pkg.devDependencies };
                for (const [name, version] of Object.entries(deps)) {
                    const v = this.db[name];
                    if (v && this.isVulnerable(String(version), v.version)) {
                        issues.push({
                            type: 'dependency-vulnerability',
                            severity: 'error',
                            file: 'package.json',
                            message: `${name}@${version}: ${v.message}`,
                            suggestion: `Run 'npm install ${name}@latest' to fix.`,
                        });
                    }
                }
            }
            catch (err) {
                // Log error silently
            }
        }
        return issues;
    }
    isVulnerable(current, fixed) {
        const clean = (v) => v.replace(/[^0-9.]/g, '').split('.').map(Number);
        const currParts = clean(current);
        const fixedParts = clean(fixed);
        for (let i = 0; i < Math.max(currParts.length, fixedParts.length); i++) {
            const c = currParts[i] || 0;
            const f = fixedParts[i] || 0;
            if (c < f)
                return true;
            if (c > f)
                return false;
        }
        return false;
    }
}
exports.SCARule = SCARule;
//# sourceMappingURL=sca.rule.js.map
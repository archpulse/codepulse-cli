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
exports.DuplicationRule = void 0;
const fs = __importStar(require("fs"));
const crypto = __importStar(require("crypto"));
class DuplicationRule {
    constructor() {
        this.name = 'code-duplication';
    }
    run(context) {
        const issues = [];
        const threshold = context.config.duplicationThreshold || 15;
        const fingerprints = new Map();
        for (const file of context.files) {
            try {
                const content = fs.readFileSync(file.path, 'utf-8');
                const lines = content.split('\n');
                for (let i = 0; i <= lines.length - threshold; i++) {
                    const block = lines.slice(i, i + threshold)
                        .map(l => l.trim())
                        .filter(l => l.length > 0)
                        .join('\n');
                    if (block.length < 50)
                        continue;
                    const hash = crypto.createHash('md5').update(block).digest('hex');
                    if (fingerprints.has(hash)) {
                        const original = fingerprints.get(hash);
                        if (original.file !== file.relativePath) {
                            issues.push({
                                type: 'duplication',
                                severity: 'warning',
                                file: file.relativePath,
                                line: i + 1,
                                message: `Identical code block (${threshold} lines) found.`,
                                suggestion: `Consider refactoring shared logic with ${original.file}.`,
                            });
                            i += threshold;
                        }
                    }
                    else {
                        fingerprints.set(hash, { file: file.relativePath, line: i + 1 });
                    }
                }
            }
            catch {
            }
        }
        return issues;
    }
}
exports.DuplicationRule = DuplicationRule;
//# sourceMappingURL=duplication.rule.js.map
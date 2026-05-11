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
exports.CriticalNodeRule = void 0;
const path = __importStar(require("path"));
class CriticalNodeRule {
    constructor() {
        this.name = 'critical-node';
    }
    run(context) {
        const issues = [];
        for (const [filePath, node] of context.graph) {
            if (!node.isCritical)
                continue;
            const file = context.files.find(f => f.path === filePath);
            const rel = file?.relativePath ?? path.basename(filePath);
            issues.push({
                type: 'critical-node',
                severity: 'error',
                file: rel,
                message: `Critical module — imported by ${node.inDegree} files, centrality score ${node.centrality}.`,
                suggestion: 'Removing or breaking this file will cascade failures. Add tests and document it.',
            });
        }
        return issues;
    }
}
exports.CriticalNodeRule = CriticalNodeRule;
//# sourceMappingURL=criticalNode.rule.js.map
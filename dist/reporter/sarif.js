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
exports.generateSarif = generateSarif;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
function generateSarif(result, baseDir) {
    const sarif = {
        $schema: 'https://schemastore.azurewebsites.net/schemas/json/sarif-2.1.0-rtm.5.json',
        version: '2.1.0',
        runs: [
            {
                tool: {
                    driver: {
                        name: 'CodePulse',
                        version: '1.0.3',
                        informationUri: 'https://github.com/archpulse/codepulse-cli',
                        rules: [
                            { id: 'dead-export', name: 'DeadExport', shortDescription: { text: 'Unused exported symbol' } },
                            { id: 'high-complexity', name: 'HighComplexity', shortDescription: { text: 'Function is too complex' } },
                            { id: 'god-file', name: 'GodFile', shortDescription: { text: 'File is too large or has too many imports' } },
                            { id: 'critical-node', name: 'CriticalNode', shortDescription: { text: 'Highly depended-upon module' } },
                            { id: 'vulnerability', name: 'Vulnerability', shortDescription: { text: 'Security vulnerability' } },
                            { id: 'duplication', name: 'Duplication', shortDescription: { text: 'Duplicate code detected' } },
                            { id: 'dependency-vulnerability', name: 'DependencyVulnerability', shortDescription: { text: 'Vulnerable dependency in package.json' } },
                        ]
                    }
                },
                results: result.issues.map(issue => ({
                    ruleId: issue.type,
                    level: issue.severity === 'error' ? 'error' : 'warning',
                    message: { text: issue.message },
                    locations: [
                        {
                            physicalLocation: {
                                artifactLocation: { uri: issue.file },
                                region: { startLine: issue.line || 1 }
                            }
                        }
                    ]
                }))
            }
        ]
    };
    const outputPath = path.join(baseDir, '.codepulse-report', 'results.sarif');
    fs.writeFileSync(outputPath, JSON.stringify(sarif, null, 2));
    return outputPath;
}
//# sourceMappingURL=sarif.js.map
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
exports.runMcpServer = runMcpServer;
const index_js_1 = require("@modelcontextprotocol/sdk/server/index.js");
const stdio_js_1 = require("@modelcontextprotocol/sdk/server/stdio.js");
const types_js_1 = require("@modelcontextprotocol/sdk/types.js");
const path = __importStar(require("path"));
const analyzer_1 = require("../analyzer");
async function runMcpServer() {
    const server = new index_js_1.Server({
        name: 'codepulse',
        version: '2.0.1',
    }, {
        capabilities: {
            tools: {},
        },
    });
    server.setRequestHandler(types_js_1.ListToolsRequestSchema, async () => {
        return {
            tools: [
                {
                    name: 'analyze_project',
                    description: 'Runs CodePulse static analysis on a directory to find complexity, dead code, and hotspots.',
                    inputSchema: {
                        type: 'object',
                        properties: {
                            dir: {
                                type: 'string',
                                description: 'The directory path to analyze. Defaults to current directory if empty.',
                            },
                        },
                    },
                },
            ],
        };
    });
    server.setRequestHandler(types_js_1.CallToolRequestSchema, async (request) => {
        if (request.params.name === 'analyze_project') {
            const dir = request.params.arguments?.dir || process.cwd();
            const absDir = path.resolve(dir);
            try {
                const result = await (0, analyzer_1.analyze)(absDir);
                const summary = `
CodePulse Analysis Results for ${absDir}
----------------------------------------
Files Analyzed: ${result.totalFiles}
Total Lines: ${result.totalLines}
Avg Complexity: ${result.avgComplexity.toFixed(1)}

Hotspots Detected: ${result.hotspots.length}
God Files Detected: ${result.godFiles.length}
Dead Exports: ${result.deadExports.length}

Issues Found: ${result.issues.length}
${result.issues.slice(0, 10).map(i => `- [${i.severity.toUpperCase()}] ${i.file}: ${i.message}`).join('\n')}
${result.issues.length > 10 ? '... (and more)' : ''}
        `;
                return {
                    content: [
                        {
                            type: 'text',
                            text: summary.trim(),
                        },
                    ],
                };
            }
            catch (err) {
                return {
                    content: [
                        {
                            type: 'text',
                            text: `Error analyzing project: ${err.message}`,
                        },
                    ],
                    isError: true,
                };
            }
        }
        throw new Error(`Tool not found: ${request.params.name}`);
    });
    const transport = new stdio_js_1.StdioServerTransport();
    await server.connect(transport);
}
//# sourceMappingURL=mcp.js.map
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
exports.generateBadge = generateBadge;
exports.saveBadge = saveBadge;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
function generateBadge(result, score) {
    const color = score > 90 ? '#10B981' : score > 70 ? '#F59E0B' : '#EF4444';
    const label = 'CodePulse';
    const value = `${score}/100`;
    return `<svg xmlns="http://www.w3.org/2000/svg" width="130" height="20">
    <linearGradient id="b" x2="0" y2="100%">
      <stop offset="0" stop-color="#bbb" stop-opacity=".1"/>
      <stop offset="1" stop-opacity=".1"/>
    </linearGradient>
    <mask id="a">
      <rect width="130" height="20" rx="3" fill="#fff"/>
    </mask>
    <g mask="url(#a)">
      <path fill="#555" d="M0 0h70v20H0z"/>
      <path fill="${color}" d="M70 0h60v20H70z"/>
      <path fill="url(#b)" d="M0 0h130v20H0z"/>
    </g>
    <g fill="#fff" text-anchor="middle" font-family="DejaVu Sans,Verdana,Geneva,sans-serif" font-size="11">
      <text x="35" y="15" fill="#010101" fill-opacity=".3">${label}</text>
      <text x="35" y="14">${label}</text>
      <text x="100" y="15" fill="#010101" fill-opacity=".3">${value}</text>
      <text x="100" y="14">${value}</text>
    </g>
  </svg>`;
}
function saveBadge(svg, dir) {
    const outputPath = path.join(dir, '.codepulse-report', 'badge.svg');
    fs.writeFileSync(outputPath, svg);
    return outputPath;
}
//# sourceMappingURL=badge.js.map
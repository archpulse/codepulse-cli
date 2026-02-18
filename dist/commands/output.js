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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.printStats = printStats;
exports.printDeadCode = printDeadCode;
exports.printGodFiles = printGodFiles;
const chalk_1 = __importDefault(require("chalk"));
const path = __importStar(require("path"));
function printStats(result, dir) {
    console.log('\n' + chalk_1.default.bold.cyan('━'.repeat(52)));
    console.log(chalk_1.default.bold.white('  CodePulse') + chalk_1.default.bold.cyan(' CLI') + chalk_1.default.gray(' — Project Stats'));
    console.log(chalk_1.default.bold.cyan('━'.repeat(52)));
    console.log(`\n  ${chalk_1.default.gray('Directory:')}    ${chalk_1.default.white(path.resolve(dir))}`);
    console.log(`  ${chalk_1.default.gray('Files:')}        ${chalk_1.default.white(result.totalFiles)}`);
    console.log(`  ${chalk_1.default.gray('Lines:')}        ${chalk_1.default.white(result.totalLines.toLocaleString())}`);
    console.log(`  ${chalk_1.default.gray('Avg Complexity:')} ${complexityColor(result.avgComplexity)}`);
    console.log(`  ${chalk_1.default.gray('Dependencies:')} ${chalk_1.default.white(result.edges.length + ' edges')}`);
    console.log('\n' + chalk_1.default.bold.yellow('  Issues Found'));
    console.log('  ' + chalk_1.default.gray('─'.repeat(30)));
    if (result.deadExports.length > 0) {
        console.log(`  ${chalk_1.default.red('✗')} Dead exports:    ${chalk_1.default.red(result.deadExports.length)}`);
    }
    else {
        console.log(`  ${chalk_1.default.green('✓')} Dead exports:    ${chalk_1.default.green('none')}`);
    }
    if (result.godFiles.length > 0) {
        console.log(`  ${chalk_1.default.yellow('⚠')} God files:       ${chalk_1.default.yellow(result.godFiles.length)}`);
    }
    else {
        console.log(`  ${chalk_1.default.green('✓')} God files:       ${chalk_1.default.green('none')}`);
    }
    if (result.criticalFiles.length > 0) {
        console.log(`  ${chalk_1.default.red('!')} Critical nodes:  ${chalk_1.default.red(result.criticalFiles.length)}`);
    }
    else {
        console.log(`  ${chalk_1.default.green('✓')} Critical nodes:  ${chalk_1.default.green('none')}`);
    }
    console.log('\n' + chalk_1.default.cyan('━'.repeat(52)) + '\n');
}
function printDeadCode(result) {
    console.log('\n' + chalk_1.default.bold.red('Dead Code — Unused Exports'));
    console.log(chalk_1.default.gray('─'.repeat(50)));
    if (result.deadExports.length === 0) {
        console.log(chalk_1.default.green('  ✓ No dead exports found!'));
        return;
    }
    for (const d of result.deadExports) {
        console.log(`  ${chalk_1.default.gray(d.file)}  ${chalk_1.default.red(d.name)}`);
    }
    console.log(chalk_1.default.gray(`\n  Total: ${result.deadExports.length} unused exports\n`));
}
function printGodFiles(result) {
    console.log('\n' + chalk_1.default.bold.yellow('God Files — Oversized Modules'));
    console.log(chalk_1.default.gray('─'.repeat(50)));
    if (result.godFiles.length === 0) {
        console.log(chalk_1.default.green('  ✓ No god files found!'));
        return;
    }
    for (const f of result.godFiles) {
        console.log(`  ${chalk_1.default.yellow(f.relativePath)}\n` +
            `    Lines: ${f.lines}  Imports: ${f.imports.length}  Complexity: ${f.complexity}\n`);
    }
}
function complexityColor(value) {
    const v = Math.round(value * 10) / 10;
    if (v > 15)
        return chalk_1.default.red(v);
    if (v > 8)
        return chalk_1.default.yellow(v);
    return chalk_1.default.green(v);
}
//# sourceMappingURL=output.js.map
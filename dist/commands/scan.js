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
exports.runScan = runScan;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const chalk_1 = __importDefault(require("chalk"));
const ora_1 = __importDefault(require("ora"));
const analyzer_1 = require("../analyzer");
const html_1 = require("../reporter/html");
const sarif_1 = require("../reporter/sarif");
const badge_1 = require("./badge");
const output_1 = require("./output");
function filterIssues(issues, opts) {
    let result = [...issues];
    if (opts.strict) {
        result = result.map(i => {
            if (i.type === 'dead-export' || i.type === 'god-file')
                return { ...i, severity: 'error' };
            return i;
        });
    }
    if (opts.focus) {
        result = result.filter(i => i.type === opts.focus);
    }
    if (opts.severity) {
        result = result.filter(i => i.severity === opts.severity);
    }
    if (opts.maxIssues) {
        result = result.slice(0, Number(opts.maxIssues));
    }
    return result;
}
function exitWithCode(issues, opts) {
    const failOn = opts.failOn;
    if (failOn && issues.some(i => i.severity === failOn)) {
        process.exit(1);
    }
    if (opts.strict && issues.some(i => i.severity === 'error')) {
        process.exit(1);
    }
}
function printIssues(issues) {
    if (issues.length === 0) {
        console.log(chalk_1.default.green('  ✓ No issues found.\n'));
        return;
    }
    console.log(chalk_1.default.bold('\n  Issues\n  ' + '─'.repeat(50)));
    for (const issue of issues) {
        const color = severityColor(issue.severity);
        const line = issue.line ? chalk_1.default.gray(' line ' + issue.line) : '';
        const sym = issue.symbol ? chalk_1.default.gray('  ❯ ') + chalk_1.default.white(issue.symbol) : '';
        console.log(`\n  ${color(`[${issue.severity.toUpperCase()}]`)} ${chalk_1.default.bold(issue.type)}` +
            `\n  ${chalk_1.default.cyan(issue.file)}${line}${sym}` +
            `\n  ${issue.message}` +
            (issue.suggestion ? `\n  ${chalk_1.default.gray('→')} ${chalk_1.default.italic(issue.suggestion)}` : ''));
    }
    console.log('');
}
function printGrouped(issues, groupBy) {
    if (issues.length === 0) {
        console.log(chalk_1.default.green('  ✓ No issues found.\n'));
        return;
    }
    const groups = new Map();
    for (const issue of issues) {
        const key = groupBy === 'file' ? issue.file
            : groupBy === 'type' ? issue.type
                : groupBy === 'severity' ? issue.severity
                    : issue.file;
        if (!groups.has(key))
            groups.set(key, []);
        groups.get(key).push(issue);
    }
    console.log(chalk_1.default.bold(`\n  Issues grouped by ${groupBy}\n  ` + '─'.repeat(50)));
    for (const [key, groupIssues] of groups) {
        console.log(`\n  ${chalk_1.default.bold.cyan(key)}`);
        for (const issue of groupIssues) {
            const color = severityColor(issue.severity);
            const line = issue.line ? `:${issue.line}` : '';
            const sym = issue.symbol ? chalk_1.default.gray(' ❯ ') + issue.symbol : '';
            console.log(`    ${color(`[${issue.severity.toUpperCase()}]`)} ${issue.type}${line}${sym}` +
                (issue.suggestion ? `\n    ${chalk_1.default.gray('→')} ${chalk_1.default.italic(issue.suggestion)}` : ''));
        }
    }
    console.log('');
}
function severityColor(severity) {
    if (severity === 'error')
        return chalk_1.default.red;
    if (severity === 'warning')
        return chalk_1.default.yellow;
    return chalk_1.default.blue;
}
async function runScan(dir, opts) {
    const absDir = path.resolve(dir);
    if (!fs.existsSync(absDir)) {
        console.error(chalk_1.default.red(`Directory not found: ${absDir}`));
        process.exit(1);
    }
    if (opts.json) {
        try {
            const result = await (0, analyzer_1.analyze)(absDir, { strict: opts.strict });
            const issues = filterIssues(result.issues, opts);
            console.log(JSON.stringify(issues, null, 2));
            exitWithCode(issues, opts);
        }
        catch (err) {
            console.error(JSON.stringify({ error: String(err) }));
            process.exit(1);
        }
        return;
    }
    console.log('\n' + chalk_1.default.bold.cyan('  ◆ CodePulse CLI'));
    console.log(chalk_1.default.gray(`  Scanning ${absDir}\n`));
    const spinner = (0, ora_1.default)({ text: 'Scanning files...', color: 'cyan' }).start();
    try {
        const result = await (0, analyzer_1.analyze)(absDir, { strict: opts.strict });
        spinner.text = 'Generating report...';
        const reportPath = (0, html_1.generateReport)(result, absDir);
        const healthStats = {
            vulnerabilities: result.issues.filter(i => i.type === 'vulnerability').length,
            deadExports: result.deadExports.length,
            godFiles: result.godFiles.length,
            criticalFiles: result.criticalFiles.length,
            hotspots: result.hotspots,
            avgComplexity: result.avgComplexity
        };
        const score = (0, html_1.calculateHealthScore)(healthStats, result);
        const badgeSvg = (0, badge_1.generateBadge)(result, score);
        const badgePath = (0, badge_1.saveBadge)(badgeSvg, absDir);
        if (opts.sarif) {
            const sarifPath = (0, sarif_1.generateSarif)(result, absDir);
            console.log(`\n  ${chalk_1.default.bold('SARIF:')}  ${chalk_1.default.cyan(sarifPath)}`);
        }
        spinner.succeed(chalk_1.default.green('Analysis complete!'));
        console.log(`\n  ${chalk_1.default.bold('Report:')} ${chalk_1.default.cyan(path.join(reportPath, 'index.html'))}`);
        console.log(`  ${chalk_1.default.bold('Badge:')}  ${chalk_1.default.cyan(badgePath)}`);
        (0, output_1.printStats)(result, absDir);
        const issues = filterIssues(result.issues, opts);
        const errors = issues.filter(i => i.severity === 'error').length;
        const warnings = issues.filter(i => i.severity === 'warning').length;
        const filters = [];
        if (opts.focus)
            filters.push(`focus: ${opts.focus}`);
        if (opts.severity)
            filters.push(`severity: ${opts.severity}`);
        if (opts.maxIssues)
            filters.push(`max: ${opts.maxIssues}`);
        if (opts.strict)
            filters.push('strict mode');
        if (filters.length)
            console.log(chalk_1.default.gray(`  Filters: ${filters.join('  ')}`));
        console.log(`  ${chalk_1.default.bold('Issues:')} ${chalk_1.default.red(errors + ' errors')}  ${chalk_1.default.yellow(warnings + ' warnings')}  ${chalk_1.default.gray('(' + issues.length + ' total)')}\n`);
        if (opts.debug || opts.focus || opts.severity) {
            if (opts.groupBy) {
                printGrouped(issues, opts.groupBy);
            }
            else {
                printIssues(issues);
            }
        }
        if (opts.open) {
            const { exec } = require('child_process');
            const reportFile = path.join(reportPath, 'index.html');
            const openCmd = process.platform === 'win32' ? `start ${reportFile}`
                : process.platform === 'darwin' ? `open ${reportFile}`
                    : `xdg-open ${reportFile}`;
            exec(openCmd);
        }
        exitWithCode(issues, opts);
    }
    catch (err) {
        spinner.fail(chalk_1.default.red('Analysis failed'));
        console.error(err);
        process.exit(1);
    }
}
//# sourceMappingURL=scan.js.map
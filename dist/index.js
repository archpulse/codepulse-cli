#!/usr/bin/env node
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
const commander_1 = require("commander");
const chalk_1 = __importDefault(require("chalk"));
const ora_1 = __importDefault(require("ora"));
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const analyzer_1 = require("./analyzer");
const html_1 = require("./reporter/html");
const output_1 = require("./commands/output");
const explain_1 = require("./explain");
const program = new commander_1.Command();
program
    .name('codepulse')
    .description('Deep code analysis for JS/TS/Python and more')
    .version('1.0.0');
// ─── codepulse scan ───────────────────────────────────────────
program
    .command('scan [dir]')
    .description('Analyze project and generate full HTML report')
    .option('--pro', 'Enable Pro mode (no file limit)')
    .option('--open', 'Open report in browser after generation')
    .option('-d, --debug', 'Show detailed issues list')
    .option('--json', 'Output issues as JSON (CI-friendly)')
    .option('--focus <type>', 'Filter by issue type (dead-export|high-complexity|god-file|critical-node)')
    .option('--severity <level>', 'Filter by severity (info|warning|error)')
    .option('--max-issues <number>', 'Limit number of issues shown')
    .option('--fail-on <level>', 'Exit with code 1 if issues of this severity exist')
    .option('--group-by <field>', 'Group output by field (file|type|severity)')
    .option('--strict', 'Strict mode: treat warnings as errors, lower thresholds')
    .action(async (dir = '.', opts) => {
    const absDir = path.resolve(dir);
    if (!fs.existsSync(absDir)) {
        console.error(chalk_1.default.red(`Directory not found: ${absDir}`));
        process.exit(1);
    }
    if (opts.json) {
        try {
            const result = await (0, analyzer_1.analyze)(absDir, { pro: opts.pro, strict: opts.strict });
            let issues = filterIssues(result.issues, opts);
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
        const result = await (0, analyzer_1.analyze)(absDir, { pro: opts.pro, strict: opts.strict });
        spinner.text = 'Generating report...';
        const reportPath = (0, html_1.generateReport)(result, absDir);
        spinner.succeed(chalk_1.default.green('Analysis complete!'));
        console.log(`\n  ${chalk_1.default.bold('Report:')} ${chalk_1.default.cyan(path.join(reportPath, 'index.html'))}`);
        (0, output_1.printStats)(result, absDir);
        let issues = filterIssues(result.issues, opts);
        const errors = issues.filter(i => i.severity === 'error').length;
        const warnings = issues.filter(i => i.severity === 'warning').length;
        // Active filters summary
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
        if (!opts.pro && result.totalFiles >= 200) {
            console.log(chalk_1.default.yellow('  ⚡ Free tier: scanned 200 files.'));
            console.log(chalk_1.default.gray('     Upgrade to Pro: codepulse.dev/pro\n'));
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
});
// ─── codepulse stats ──────────────────────────────────────────
program
    .command('stats [dir]')
    .description('Print quick stats to console')
    .option('--json', 'Output as JSON')
    .action(async (dir = '.', opts) => {
    const absDir = path.resolve(dir);
    const spinner = (0, ora_1.default)('Analyzing...').start();
    try {
        const result = await (0, analyzer_1.analyze)(absDir);
        spinner.stop();
        if (opts.json) {
            console.log(JSON.stringify({
                totalFiles: result.totalFiles,
                totalLines: result.totalLines,
                avgComplexity: result.avgComplexity,
                issues: result.issues.length,
                errors: result.issues.filter(i => i.severity === 'error').length,
                warnings: result.issues.filter(i => i.severity === 'warning').length,
            }, null, 2));
        }
        else {
            (0, output_1.printStats)(result, absDir);
        }
    }
    catch (err) {
        spinner.fail('Failed');
        console.error(err);
    }
});
// ─── codepulse dead ───────────────────────────────────────────
program
    .command('dead [dir]')
    .description('Show unused exports')
    .option('--json', 'Output as JSON')
    .action(async (dir = '.', opts) => {
    const absDir = path.resolve(dir);
    const spinner = (0, ora_1.default)('Detecting dead code...').start();
    try {
        const result = await (0, analyzer_1.analyze)(absDir);
        spinner.stop();
        if (opts.json) {
            const dead = result.issues.filter(i => i.type === 'dead-export');
            console.log(JSON.stringify(dead, null, 2));
        }
        else {
            (0, output_1.printDeadCode)(result);
        }
    }
    catch (err) {
        spinner.fail('Failed');
        console.error(err);
    }
});
// ─── codepulse graph ─────────────────────────────────────────
program
    .command('graph [dir]')
    .description('Generate only the dependency graph SVG')
    .action(async (dir = '.') => {
    const absDir = path.resolve(dir);
    const spinner = (0, ora_1.default)('Building graph...').start();
    try {
        const result = await (0, analyzer_1.analyze)(absDir);
        const reportPath = (0, html_1.generateReport)(result, absDir);
        spinner.succeed(chalk_1.default.green('Graph saved!'));
        console.log(`  ${chalk_1.default.cyan(path.join(reportPath, 'graph.svg'))}\n`);
    }
    catch (err) {
        spinner.fail('Failed');
        console.error(err);
    }
});
// ─── codepulse explain ───────────────────────────────────────
program
    .command('explain [topic]')
    .description('Explain what a detected issue means and how to fix it')
    .action((topic) => {
    const topics = Object.keys(explain_1.EXPLANATIONS);
    if (!topic) {
        console.log('\n' + chalk_1.default.bold.cyan('  CodePulse — Available Topics'));
        console.log(chalk_1.default.gray('  ─────────────────────────────\n'));
        for (const key of topics) {
            const e = explain_1.EXPLANATIONS[key];
            console.log(`  ${chalk_1.default.cyan(key)}`);
            console.log(`    ${chalk_1.default.gray(e.short)}\n`);
        }
        console.log(chalk_1.default.gray(`  Usage: ${chalk_1.default.white('codepulse explain <topic>')}\n`));
        return;
    }
    const key = topic.toLowerCase();
    const entry = explain_1.EXPLANATIONS[key];
    if (!entry) {
        console.log(chalk_1.default.red(`\n  Unknown topic: "${topic}"`));
        console.log(chalk_1.default.gray(`  Available: ${topics.join(', ')}\n`));
        process.exit(1);
    }
    const { full } = entry;
    console.log('\n' + chalk_1.default.bold.cyan('─'.repeat(52)));
    console.log(chalk_1.default.bold.white(`  ${key.toUpperCase().replace(/-/g, ' ')}`));
    console.log(chalk_1.default.cyan('─'.repeat(52)) + '\n');
    console.log(`  ${chalk_1.default.white(full.description)}\n`);
    console.log(chalk_1.default.bold.yellow('  Detected when:'));
    for (const c of full.criteria) {
        console.log(`    ${chalk_1.default.gray('•')} ${c}`);
    }
    console.log('\n' + chalk_1.default.bold.red('  Risks:'));
    for (const r of full.risks) {
        console.log(`    ${chalk_1.default.red('✗')} ${r}`);
    }
    console.log('\n' + chalk_1.default.bold.green('  Recommended fixes:'));
    for (const f of full.fix) {
        console.log(`    ${chalk_1.default.green('✓')} ${f}`);
    }
    console.log('\n' + chalk_1.default.gray('─'.repeat(52)) + '\n');
});
// ─── codepulse activate ───────────────────────────────────────
program
    .command('activate <key>')
    .description('Activate a Pro or Team license key')
    .action((key) => {
    const { activateLicense } = require('./utils/license');
    const result = activateLicense(key);
    if (result.success) {
        console.log(chalk_1.default.green('\n  ✓ ' + result.message));
        console.log(chalk_1.default.gray(`  Tier: ${result.tier.toUpperCase()}\n`));
    }
    else {
        console.log(chalk_1.default.red('\n  ✗ ' + result.message + '\n'));
        process.exit(1);
    }
});
// ─── codepulse license ───────────────────────────────────────
program
    .command('license')
    .description('Show current license status')
    .action(() => {
    const { getLicense, getDeviceId } = require('./utils/license');
    const license = getLicense();
    const deviceId = getDeviceId();
    console.log('\n' + chalk_1.default.bold.cyan('  CodePulse License'));
    console.log(chalk_1.default.gray('  ─────────────────────────────'));
    console.log(`  Device ID: ${chalk_1.default.cyan(deviceId)}`);
    if (license) {
        console.log(`  Tier:      ${chalk_1.default.green(license.tier.toUpperCase())}`);
        console.log(`  Key:       ${chalk_1.default.gray(license.key)}`);
        console.log(`  Activated: ${chalk_1.default.gray(new Date(license.activatedAt).toLocaleDateString())}`);
    }
    else {
        console.log(`  Tier:      ${chalk_1.default.yellow('FREE')} (up to 200 files)`);
        console.log(chalk_1.default.gray('\n  Upgrade: codepulse.dev/pro\n'));
    }
    console.log('');
});
// ─── filter / output helpers ─────────────────────────────────
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
program.parse(process.argv);
//# sourceMappingURL=index.js.map
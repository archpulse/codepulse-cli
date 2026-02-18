#!/usr/bin/env node
import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import * as path from 'path';
import * as fs from 'fs';
import { analyze } from './analyzer';
import { generateReport } from './reporter/html';
import { printStats, printDeadCode } from './commands/output';
import { Issue, IssueSeverity, IssueType } from './types';

const program = new Command();

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
      console.error(chalk.red(`Directory not found: ${absDir}`));
      process.exit(1);
    }

    if (opts.json) {
      try {
        const result = await analyze(absDir, { pro: opts.pro, strict: opts.strict });
        let issues = filterIssues(result.issues, opts);
        console.log(JSON.stringify(issues, null, 2));
        exitWithCode(issues, opts);
      } catch (err) {
        console.error(JSON.stringify({ error: String(err) }));
        process.exit(1);
      }
      return;
    }

    console.log('\n' + chalk.bold.cyan('  ◆ CodePulse CLI'));
    console.log(chalk.gray(`  Scanning ${absDir}\n`));

    const spinner = ora({ text: 'Scanning files...', color: 'cyan' }).start();

    try {
      const result = await analyze(absDir, { pro: opts.pro, strict: opts.strict });
      spinner.text = 'Generating report...';
      const reportPath = generateReport(result, absDir);
      spinner.succeed(chalk.green('Analysis complete!'));

      console.log(`\n  ${chalk.bold('Report:')} ${chalk.cyan(path.join(reportPath, 'index.html'))}`);
      printStats(result, absDir);

      let issues = filterIssues(result.issues, opts);

      const errors = issues.filter(i => i.severity === 'error').length;
      const warnings = issues.filter(i => i.severity === 'warning').length;

      // Active filters summary
      const filters: string[] = [];
      if (opts.focus) filters.push(`focus: ${opts.focus}`);
      if (opts.severity) filters.push(`severity: ${opts.severity}`);
      if (opts.maxIssues) filters.push(`max: ${opts.maxIssues}`);
      if (opts.strict) filters.push('strict mode');
      if (filters.length) console.log(chalk.gray(`  Filters: ${filters.join('  ')}`));

      console.log(`  ${chalk.bold('Issues:')} ${chalk.red(errors + ' errors')}  ${chalk.yellow(warnings + ' warnings')}  ${chalk.gray('(' + issues.length + ' total)')}\n`);

      if (opts.debug || opts.focus || opts.severity) {
        if (opts.groupBy) {
          printGrouped(issues, opts.groupBy);
        } else {
          printIssues(issues);
        }
      }

      if (!opts.pro && result.totalFiles >= 200) {
        console.log(chalk.yellow('  ⚡ Free tier: scanned 200 files.'));
        console.log(chalk.gray('     Upgrade to Pro: codepulse.dev/pro\n'));
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

    } catch (err) {
      spinner.fail(chalk.red('Analysis failed'));
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
    const spinner = ora('Analyzing...').start();
    try {
      const result = await analyze(absDir);
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
      } else {
        printStats(result, absDir);
      }
    } catch (err) {
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
    const spinner = ora('Detecting dead code...').start();
    try {
      const result = await analyze(absDir);
      spinner.stop();
      if (opts.json) {
        const dead = result.issues.filter(i => i.type === 'dead-export');
        console.log(JSON.stringify(dead, null, 2));
      } else {
        printDeadCode(result);
      }
    } catch (err) {
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
    const spinner = ora('Building graph...').start();
    try {
      const result = await analyze(absDir);
      const reportPath = generateReport(result, absDir);
      spinner.succeed(chalk.green('Graph saved!'));
      console.log(`  ${chalk.cyan(path.join(reportPath, 'graph.svg'))}\n`);
    } catch (err) {
      spinner.fail('Failed');
      console.error(err);
    }
  });

// ─── codepulse activate ───────────────────────────────────────
program
  .command('activate <key>')
  .description('Activate a Pro or Team license key')
  .action((key: string) => {
    const { activateLicense } = require('./utils/license');
    const result = activateLicense(key);
    if (result.success) {
      console.log(chalk.green('\n  ✓ ' + result.message));
      console.log(chalk.gray(`  Tier: ${result.tier.toUpperCase()}\n`));
    } else {
      console.log(chalk.red('\n  ✗ ' + result.message + '\n'));
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
    console.log('\n' + chalk.bold.cyan('  CodePulse License'));
    console.log(chalk.gray('  ─────────────────────────────'));
    console.log(`  Device ID: ${chalk.cyan(deviceId)}`);
    if (license) {
      console.log(`  Tier:      ${chalk.green(license.tier.toUpperCase())}`);
      console.log(`  Key:       ${chalk.gray(license.key)}`);
      console.log(`  Activated: ${chalk.gray(new Date(license.activatedAt).toLocaleDateString())}`);
    } else {
      console.log(`  Tier:      ${chalk.yellow('FREE')} (up to 200 files)`);
      console.log(chalk.gray('\n  Upgrade: codepulse.dev/pro\n'));
    }
    console.log('');
  });

// ─── filter / output helpers ─────────────────────────────────

function filterIssues(issues: Issue[], opts: any): Issue[] {
  let result = [...issues];

  if (opts.strict) {
    // In strict mode: lower complexity threshold (>15 = error), dead-export = error
    result = result.map(i => {
      if (i.type === 'dead-export' || i.type === 'god-file') return { ...i, severity: 'error' as IssueSeverity };
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

function exitWithCode(issues: Issue[], opts: any): void {
  const failOn: IssueSeverity | undefined = opts.failOn;
  if (failOn && issues.some(i => i.severity === failOn)) {
    process.exit(1);
  }
  if (opts.strict && issues.some(i => i.severity === 'error')) {
    process.exit(1);
  }
}

function printIssues(issues: Issue[]): void {
  if (issues.length === 0) {
    console.log(chalk.green('  ✓ No issues found.\n'));
    return;
  }

  console.log(chalk.bold('\n  Issues\n  ' + '─'.repeat(50)));

  for (const issue of issues) {
    const color = severityColor(issue.severity);
    const line = issue.line ? chalk.gray(' line ' + issue.line) : '';
    const sym = issue.symbol ? chalk.gray('  ❯ ') + chalk.white(issue.symbol) : '';
    console.log(
      `\n  ${color(`[${issue.severity.toUpperCase()}]`)} ${chalk.bold(issue.type)}` +
      `\n  ${chalk.cyan(issue.file)}${line}${sym}` +
      `\n  ${issue.message}` +
      (issue.suggestion ? `\n  ${chalk.gray('→')} ${chalk.italic(issue.suggestion)}` : '')
    );
  }
  console.log('');
}

function printGrouped(issues: Issue[], groupBy: string): void {
  if (issues.length === 0) {
    console.log(chalk.green('  ✓ No issues found.\n'));
    return;
  }

  const groups = new Map<string, Issue[]>();

  for (const issue of issues) {
    const key = groupBy === 'file' ? issue.file
      : groupBy === 'type' ? issue.type
      : groupBy === 'severity' ? issue.severity
      : issue.file;

    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(issue);
  }

  console.log(chalk.bold(`\n  Issues grouped by ${groupBy}\n  ` + '─'.repeat(50)));

  for (const [key, groupIssues] of groups) {
    console.log(`\n  ${chalk.bold.cyan(key)}`);
    for (const issue of groupIssues) {
      const color = severityColor(issue.severity);
      const line = issue.line ? `:${issue.line}` : '';
      const sym = issue.symbol ? chalk.gray(' ❯ ') + issue.symbol : '';
      console.log(
        `    ${color(`[${issue.severity.toUpperCase()}]`)} ${issue.type}${line}${sym}` +
        (issue.suggestion ? `\n    ${chalk.gray('→')} ${chalk.italic(issue.suggestion)}` : '')
      );
    }
  }
  console.log('');
}

function severityColor(severity: IssueSeverity): (s: string) => string {
  if (severity === 'error') return chalk.red;
  if (severity === 'warning') return chalk.yellow;
  return chalk.blue;
}

program.parse(process.argv);

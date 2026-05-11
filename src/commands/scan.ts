import * as fs from 'fs';
import * as path from 'path';
import chalk from 'chalk';
import ora from 'ora';
import { analyze } from '../analyzer';
import { generateReport, calculateHealthScore } from '../reporter/html';
import { generateSarif } from '../reporter/sarif';
import { generateBadge, saveBadge } from './badge';
import { printStats } from './output';
import { Issue, IssueSeverity } from '../types';

function filterIssues(issues: Issue[], opts: any): Issue[] {
  let result = [...issues];

  if (opts.strict) {
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

export async function runScan(dir: string, opts: any) {
  const absDir = path.resolve(dir);

  if (!fs.existsSync(absDir)) {
    console.error(chalk.red(`Directory not found: ${absDir}`));
    process.exit(1);
  }

  if (opts.json) {
    try {
      const result = await analyze(absDir, { strict: opts.strict });
      const issues = filterIssues(result.issues, opts);
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
    const result = await analyze(absDir, { strict: opts.strict });
    spinner.text = 'Generating report...';
    const reportPath = generateReport(result, absDir);

    const healthStats = {
      vulnerabilities: result.issues.filter(i => i.type === 'vulnerability').length,
      deadExports: result.deadExports.length,
      godFiles: result.godFiles.length,
      criticalFiles: result.criticalFiles.length,
      hotspots: result.hotspots,
      avgComplexity: result.avgComplexity
    };
    const score = calculateHealthScore(healthStats, result);
    const badgeSvg = generateBadge(result, score);
    const badgePath = saveBadge(badgeSvg, absDir);

    if (opts.sarif) {
      const sarifPath = generateSarif(result, absDir);
      console.log(`\n  ${chalk.bold('SARIF:')}  ${chalk.cyan(sarifPath)}`);
    }

    spinner.succeed(chalk.green('Analysis complete!'));

    console.log(`\n  ${chalk.bold('Report:')} ${chalk.cyan(path.join(reportPath, 'index.html'))}`);
    console.log(`  ${chalk.bold('Badge:')}  ${chalk.cyan(badgePath)}`);
    printStats(result, absDir);

    const issues = filterIssues(result.issues, opts);
    const errors = issues.filter(i => i.severity === 'error').length;
    const warnings = issues.filter(i => i.severity === 'warning').length;

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
}
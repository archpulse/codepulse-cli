#!/usr/bin/env node
import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import * as path from 'path';
import * as fs from 'fs';
import updateNotifier from 'update-notifier';
import { analyze } from './analyzer';
import { generateReport, calculateHealthScore } from './reporter/html';
import { generateSarif } from './reporter/sarif';
import { generateBadge, saveBadge } from './commands/badge';
import { printStats, printDeadCode } from './commands/output';
import { EXPLANATIONS, ExplainKey } from './explain';
import { shouldRunMcpSetup, setupMcpConfigs } from './mcp-setup';
import { runMcpServer } from './commands/mcp';
import { runScan } from './commands/scan';

const program = new Command();

// Read package.json for version and name
const pkgPath = path.resolve(__dirname, '../package.json');
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));

// Check for updates
updateNotifier({ 
  pkg,
  updateCheckInterval: 1000 * 60 * 60 * 24 // 1 day
}).notify();

// Auto-configure MCP on first run
if (shouldRunMcpSetup()) {
  const count = setupMcpConfigs();
  if (count > 0) {
    console.log(chalk.green(`\n  ✓ Automatically configured CodePulse as an MCP server for ${count} AI agent(s) on your PC!\n`));
  }
}

program
  .name('codepulse')
  .description('Deep code analysis for JS/TS/Python and more')
  .version(pkg.version);

program.configureHelp({
  subcommandTerm: (cmd) => chalk.cyan(cmd.name()),
  subcommandDescription: (cmd) => chalk.gray(cmd.description()),
  optionTerm: (option) => chalk.yellow(option.flags),
  optionDescription: (option) => chalk.gray(option.description),
  commandUsage: (command) => chalk.magenta(command.name() + ' ' + command.usage()),
  commandDescription: (command) => chalk.italic(command.description()),
});

program.addHelpText('before', `
${chalk.bold.blue('  ____           _      ____       _               ')}
${chalk.bold.blue(' / ___|___   __| | ___|  _ \\ _   _| |___  ___      ')}
${chalk.bold.blue('| |   / _ \\ / _` |/ _ \\ |_) | | | | / __|/ _ \\     ')}
${chalk.bold.blue('| |__| (_) | (_| |  __/  __/| |_| | \\__ \\  __/     ')}
${chalk.bold.blue(' \\____\\___/ \\__,_|\\___|_|    \\__,_|_|___/\\___|     ')}
`);

program.addHelpText('after', `
${chalk.bold('Examples:')}
  ${chalk.gray('$')} codepulse scan .
  ${chalk.gray('$')} codepulse stats src --json
  ${chalk.gray('$')} codepulse explain complexity
`);

program
  .command('mcp')
  .description('Start the Model Context Protocol (MCP) server for AI agents')
  .action(async () => {
    try {
      await runMcpServer();
    } catch (err) {
      console.error(chalk.red('MCP Server failed to start:'), err);
      process.exit(1);
    }
  });

program
  .command('setup-mcp')
  .description('Manually trigger automatic MCP configuration for AI agents')
  .action(() => {
    const count = setupMcpConfigs();
    if (count > 0) {
      console.log(chalk.green(`\n  ✓ Successfully configured CodePulse as an MCP server for ${count} AI agent(s)!\n`));
    } else {
      console.log(chalk.yellow('\n  ! No supported AI agent configurations found on this system.\n'));
    }
  });

program
  .command('scan [dir]')
  .description('Analyze project and generate full HTML report')
  .option('--open', 'Open report in browser after generation')
  .option('--sarif', 'Generate SARIF report for CI/CD')
  .option('-d, --debug', 'Show detailed issues list')
  .option('--json', 'Output issues as JSON (CI-friendly)')
  .option('--focus <type>', 'Filter by issue type (dead-export|high-complexity|god-file|critical-node)')
  .option('--severity <level>', 'Filter by severity (info|warning|error)')
  .option('--max-issues <number>', 'Limit number of issues shown')
  .option('--fail-on <level>', 'Exit with code 1 if issues of this severity exist')
  .option('--group-by <field>', 'Group output by field (file|type|severity)')
  .option('--strict', 'Strict mode: treat warnings as errors, lower thresholds')
  .action(runScan);

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

program
  .command('badge [dir]')
  .description('Generate a quality badge SVG')
  .action(async (dir = '.') => {
    const absDir = path.resolve(dir);
    try {
      const result = await analyze(absDir);
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
      console.log(chalk.green(`\n  ✓ Badge generated: ${badgePath}`));
      console.log(chalk.gray(`    Score: ${score}/100\n`));
    } catch (err) {
      console.error(chalk.red('Failed to generate badge'), err);
    }
  });

program
  .command('explain [topic]')
  .description('Explain what a detected issue means and how to fix it')
  .action((topic?: string) => {
    const topics = Object.keys(EXPLANATIONS) as ExplainKey[];

    if (!topic) {
      console.log('\n' + chalk.bold.cyan('  CodePulse — Available Topics'));
      console.log(chalk.gray('  ─────────────────────────────\n'));
      for (const key of topics) {
        const e = EXPLANATIONS[key];
        console.log(`  ${chalk.cyan(key)}`);
        console.log(`    ${chalk.gray(e.short)}\n`);
      }
      console.log(chalk.gray(`  Usage: ${chalk.white('codepulse explain <topic>')}\n`));
      return;
    }

    const key = topic.toLowerCase() as ExplainKey;
    const entry = EXPLANATIONS[key];

    if (!entry) {
      console.log(chalk.red(`\n  Unknown topic: "${topic}"`));
      console.log(chalk.gray(`  Available: ${topics.join(', ')}\n`));
      process.exit(1);
    }

    const { full } = entry;

    console.log('\n' + chalk.bold.cyan('─'.repeat(52)));
    console.log(chalk.bold.white(`  ${key.toUpperCase().replace(/-/g, ' ')}`));
    console.log(chalk.cyan('─'.repeat(52)) + '\n');

    console.log(`  ${chalk.white(full.description)}\n`);

    console.log(chalk.bold.yellow('  Detected when:'));
    for (const c of full.criteria) {
      console.log(`    ${chalk.gray('•')} ${c}`);
    }

    console.log('\n' + chalk.bold.red('  Risks:'));
    for (const r of full.risks) {
      console.log(`    ${chalk.red('✗')} ${r}`);
    }

    console.log('\n' + chalk.bold.green('  Recommended fixes:'));
    for (const f of full.fix) {
      console.log(`    ${chalk.green('✓')} ${f}`);
    }

    console.log('\n' + chalk.gray('─'.repeat(52)) + '\n');
  });

program.parse(process.argv);

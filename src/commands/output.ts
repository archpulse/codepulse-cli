import chalk from 'chalk';
import * as path from 'path';
import { AnalysisResult } from '../types';

const isWin = process.platform === 'win32';

const SYMBOLS = {
  line: isWin ? '=' : '━',
  thinLine: isWin ? '-' : '─',
  check: isWin ? 'v' : '✓',
  cross: isWin ? 'x' : '✗',
  warn: isWin ? '!' : '⚠',
  fire: isWin ? '*' : '🔥',
  radio: isWin ? '[!]' : '☢',
  info: isWin ? 'i' : 'ℹ'
};

export function printStats(result: AnalysisResult, dir: string): void {
  console.log('\n' + chalk.bold.cyan(SYMBOLS.line.repeat(52)));
  console.log(chalk.bold.white('  CodePulse') + chalk.bold.cyan(' CLI') + chalk.gray(' — Project Stats'));
  console.log(chalk.bold.cyan(SYMBOLS.line.repeat(52)));

  console.log(`\n  ${chalk.gray('Directory:')}    ${chalk.white(path.resolve(dir))}`);
  console.log(`  ${chalk.gray('Files:')}        ${chalk.white(result.totalFiles)}`);
  console.log(`  ${chalk.gray('Lines:')}        ${chalk.white(result.totalLines.toLocaleString())}`);
  console.log(`  ${chalk.gray('Avg Complexity:')} ${complexityColor(result.avgComplexity)}`);
  console.log(`  ${chalk.gray('Dependencies:')} ${chalk.white(result.edges.length + ' edges')}`);

  console.log('\n' + chalk.bold.yellow('  Issues Found'));
  console.log('  ' + chalk.gray(SYMBOLS.thinLine.repeat(30)));

  if (result.deadExports.length > 0) {
    console.log(`  ${chalk.red(SYMBOLS.cross)} Dead exports:    ${chalk.red(result.deadExports.length)}`);
  } else {
    console.log(`  ${chalk.green(SYMBOLS.check)} Dead exports:    ${chalk.green('none')}`);
  }

  if (result.godFiles.length > 0) {
    console.log(`  ${chalk.yellow(SYMBOLS.warn)} God files:       ${chalk.yellow(result.godFiles.length)}`);
  } else {
    console.log(`  ${chalk.green(SYMBOLS.check)} God files:       ${chalk.green('none')}`);
  }

  if (result.criticalFiles.length > 0) {
    console.log(`  ${chalk.red('!')} Critical nodes:  ${chalk.red(result.criticalFiles.length)}`);
  } else {
    console.log(`  ${chalk.green(SYMBOLS.check)} Critical nodes:  ${chalk.green('none')}`);
  }

  if (result.hotspots.length > 0) {
    console.log(`  ${chalk.magenta(SYMBOLS.fire)} Hotspots:        ${chalk.magenta(result.hotspots.length)}`);
  } else {
    console.log(`  ${chalk.green(SYMBOLS.check)} Hotspots:        ${chalk.green('none')}`);
  }

  const vulnerabilities = result.issues.filter(i => i.type === 'vulnerability');
  if (vulnerabilities.length > 0) {
    console.log(`  ${chalk.red(SYMBOLS.radio)} Vulnerabilities: ${chalk.red.bold(vulnerabilities.length)}`);
  } else {
    console.log(`  ${chalk.green(SYMBOLS.check)} Vulnerabilities: ${chalk.green('none')}`);
  }

  console.log('\n' + chalk.cyan(SYMBOLS.line.repeat(52)) + '\n');
}

export function printDeadCode(result: AnalysisResult): void {
  console.log('\n' + chalk.bold.red('Dead Code — Unused Exports'));
  console.log(chalk.gray(SYMBOLS.thinLine.repeat(50)));

  if (result.deadExports.length === 0) {
    console.log(chalk.green(`  ${SYMBOLS.check} No dead exports found!`));
    return;
  }

  for (const d of result.deadExports) {
    console.log(`  ${chalk.gray(d.file)}  ${chalk.red(d.name)}`);
  }
  console.log(chalk.gray(`\n  Total: ${result.deadExports.length} unused exports\n`));
}

export function printGodFiles(result: AnalysisResult): void {
  console.log('\n' + chalk.bold.yellow('God Files — Oversized Modules'));
  console.log(chalk.gray(SYMBOLS.thinLine.repeat(50)));

  if (result.godFiles.length === 0) {
    console.log(chalk.green(`  ${SYMBOLS.check} No god files found!`));
    return;
  }

  for (const f of result.godFiles) {
    console.log(
      `  ${chalk.yellow(f.relativePath)}\n` +
      `    Lines: ${f.lines}  Imports: ${f.imports.length}  Complexity: ${f.complexity}\n`
    );
  }
}

function complexityColor(value: number): string {
  const v = Math.round(value * 10) / 10;
  if (v > 15) return chalk.red(v);
  if (v > 8) return chalk.yellow(v);
  return chalk.green(v);
}

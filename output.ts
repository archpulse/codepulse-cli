import chalk from 'chalk';
import * as path from 'path';
import { AnalysisResult } from '../types';
import { EXPLANATIONS } from '../explain';

export function printStats(result: AnalysisResult, dir: string): void {
  console.log('\n' + chalk.bold.cyan('─'.repeat(52)));
  console.log(chalk.bold.white('  CodePulse') + chalk.bold.cyan(' CLI') + chalk.gray(' — Project Stats'));
  console.log(chalk.bold.cyan('─'.repeat(52)));

  console.log(`\n  ${chalk.gray('Directory:')}    ${chalk.white(path.resolve(dir))}`);
  console.log(`  ${chalk.gray('Files:')}        ${chalk.white(result.totalFiles)}`);
  console.log(`  ${chalk.gray('Lines:')}        ${chalk.white(result.totalLines.toLocaleString())}`);
  console.log(`  ${chalk.gray('Avg Complexity:')} ${complexityColor(result.avgComplexity)}`);
  console.log(`  ${chalk.gray('Dependencies:')} ${chalk.white(result.edges.length + ' edges')}`);

  console.log('\n' + chalk.bold.yellow('  Issues Found'));
  console.log('  ' + chalk.gray('─'.repeat(30)));

  if (result.deadExports.length > 0) {
    console.log(`  ${chalk.red('✗')} Dead exports:    ${chalk.red(result.deadExports.length)}`);
  } else {
    console.log(`  ${chalk.green('✓')} Dead exports:    ${chalk.green('none')}`);
  }

  if (result.godFiles.length > 0) {
    console.log(`  ${chalk.yellow('⚠')} God files:       ${chalk.yellow(result.godFiles.length)}`);
  } else {
    console.log(`  ${chalk.green('✓')} God files:       ${chalk.green('none')}`);
  }

  if (result.criticalFiles.length > 0) {
    console.log(`  ${chalk.red('!')} Critical nodes:  ${chalk.red(result.criticalFiles.length)}`);
  } else {
    console.log(`  ${chalk.green('✓')} Critical nodes:  ${chalk.green('none')}`);
  }

  console.log('\n' + chalk.cyan('─'.repeat(52)) + '\n');
}

export function printDeadCode(result: AnalysisResult): void {
  console.log('\n' + chalk.bold.red('Dead Code — Unused Exports'));
  console.log(chalk.gray('─'.repeat(50)));

  if (result.deadExports.length === 0) {
    console.log(chalk.green('  ✓ No dead exports found!'));
    return;
  }

  const e = EXPLANATIONS['dead-export'];

  for (const d of result.deadExports) {
    console.log(
      `  ${chalk.red('✗')} ${chalk.white(d.name)}  ${chalk.gray(d.file)}\n` +
      `    ${chalk.gray('→')} ${e.short}\n` +
      `    ${chalk.gray('→')} ${chalk.italic(e.hint)}\n`
    );
  }

  console.log(chalk.gray(`  Total: ${result.deadExports.length} unused exports`));
  console.log(chalk.gray(`  Run ${chalk.white('codepulse explain dead-export')} to learn more.\n`));
}

export function printGodFiles(result: AnalysisResult): void {
  console.log('\n' + chalk.bold.yellow('God Files — Oversized Modules'));
  console.log(chalk.gray('─'.repeat(50)));

  if (result.godFiles.length === 0) {
    console.log(chalk.green('  ✓ No god files found!'));
    return;
  }

  const e = EXPLANATIONS['god-file'];

  for (const f of result.godFiles) {
    console.log(
      `  ${chalk.yellow('⚠')} ${chalk.yellow(f.relativePath)}\n` +
      `    Lines: ${chalk.white(f.lines)}  Imports: ${chalk.white(f.imports.length)}  Complexity: ${complexityColor(f.complexity)}\n` +
      `    ${chalk.gray('→')} ${e.short}\n` +
      `    ${chalk.gray('→')} ${chalk.italic(e.hint)}\n`
    );
  }

  console.log(chalk.gray(`  Run ${chalk.white('codepulse explain god-file')} to learn more.\n`));
}

export function printCriticalNodes(result: AnalysisResult): void {
  console.log('\n' + chalk.bold.red('Critical Nodes — High Centrality'));
  console.log(chalk.gray('─'.repeat(50)));

  if (result.criticalFiles.length === 0) {
    console.log(chalk.green('  ✓ No critical nodes found!'));
    return;
  }

  const e = EXPLANATIONS['critical-node'];

  for (const node of result.criticalFiles.slice(0, 10)) {
    const file = result.files.find(f => f.path === node.id);
    const rel = file?.relativePath ?? node.id;

    console.log(
      `  ${chalk.red('!')} ${chalk.white(rel)}\n` +
      `    Imported by: ${chalk.red(node.inDegree)} files  Centrality: ${chalk.red(node.centrality)}\n` +
      `    ${chalk.gray('→')} ${e.short}\n` +
      `    ${chalk.gray('→')} ${chalk.italic(e.hint)}\n`
    );
  }

  console.log(chalk.gray(`  Run ${chalk.white('codepulse explain critical-node')} to learn more.\n`));
}

function complexityColor(value: number): string {
  const v = Math.round(value * 10) / 10;
  if (v > 15) return chalk.red(String(v));
  if (v > 8) return chalk.yellow(String(v));
  return chalk.green(String(v));
}

import * as fs from 'fs';
import * as path from 'path';
import { ScanOptions } from '../types';

function getCustomExcludes(dir: string, baseExclude: string[]): string[] {
  const customExclude = [...baseExclude];
  const ignoreFilePath = path.join(dir, '.codepulseignore');
  if (fs.existsSync(ignoreFilePath)) {
    const ignoreContent = fs.readFileSync(ignoreFilePath, 'utf-8');
    const ignoreLines = ignoreContent.split('\n')
      .map(l => l.trim())
      .filter(l => l && !l.startsWith('#'));
    customExclude.push(...ignoreLines);
  }
  return customExclude;
}

function shouldExcludeFile(entryName: string, relPath: string, customExclude: string[]): boolean {
  return customExclude.some(ex => {
    if (ex.startsWith('*')) return entryName.includes(ex.slice(1));
    return relPath === ex || relPath.startsWith(ex + path.sep) || entryName === ex;
  });
}

function processDirectoryEntry(
  entry: fs.Dirent,
  currentDir: string,
  baseDir: string,
  customExclude: string[],
  extensions: string[],
  files: string[],
  walkFn: (d: string) => void
) {
  const fullPath = path.join(currentDir, entry.name);
  const relPath = path.relative(baseDir, fullPath);

  if (shouldExcludeFile(entry.name, relPath, customExclude)) return;

  if (entry.isDirectory()) {
    walkFn(fullPath);
  } else if (entry.isFile()) {
    const ext = path.extname(entry.name).toLowerCase();
    if (extensions.includes(ext)) {
      files.push(fullPath);
    }
  }
}

export function scanFiles(options: ScanOptions): string[] {
  const { dir, extensions, exclude } = options;
  const files: string[] = [];
  const customExclude = getCustomExcludes(dir, exclude);

  function walk(currentDir: string): void {
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(currentDir, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      processDirectoryEntry(entry, currentDir, dir, customExclude, extensions, files, walk);
    }
  }

  walk(dir);
  return files;
}

export function readFile(filePath: string): string {
  try {
    return fs.readFileSync(filePath, 'utf-8');
  } catch {
    return '';
  }
}

export function countLines(content: string): number {
  return content.split('\n').length;
}

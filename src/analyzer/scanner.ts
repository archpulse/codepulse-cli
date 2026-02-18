import * as fs from 'fs';
import * as path from 'path';
import { ScanOptions } from '../types';

export function scanFiles(options: ScanOptions): string[] {
  const { dir, extensions, exclude, maxFiles } = options;
  const files: string[] = [];

  function walk(currentDir: string): void {
    if (maxFiles && files.length >= maxFiles) return;

    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(currentDir, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      if (maxFiles && files.length >= maxFiles) break;

      const fullPath = path.join(currentDir, entry.name);
      const relPath = path.relative(dir, fullPath);

      // Check exclusions
      const shouldExclude = exclude.some(ex => {
        if (ex.startsWith('*')) return entry.name.includes(ex.slice(1));
        return relPath.includes(ex) || entry.name === ex;
      });

      if (shouldExclude) continue;

      if (entry.isDirectory()) {
        walk(fullPath);
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase();
        if (extensions.includes(ext)) {
          files.push(fullPath);
        }
      }
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

import { FileNode, Hotspot } from '../types';
export declare function getGitChurn(dir: string): Map<string, number>;
export declare function calculateHotspots(files: FileNode[]): Hotspot[];

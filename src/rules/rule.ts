import { Issue, AnalysisContext } from '../types';

export interface Rule {
  name: string;
  description?: string;
  version?: string;
  author?: string;
  category?: string;
  enabled?: boolean;
  run(context: AnalysisContext): Issue[];
}

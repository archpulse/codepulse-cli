import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import * as path from 'path';
import { analyze } from '../analyzer';

export async function runMcpServer() {
  const server = new Server(
    {
      name: 'codepulse',
      version: '2.0.1',
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: [
        {
          name: 'analyze_project',
          description: 'Runs CodePulse static analysis on a directory to find complexity, dead code, and hotspots.',
          inputSchema: {
            type: 'object',
            properties: {
              dir: {
                type: 'string',
                description: 'The directory path to analyze. Defaults to current directory if empty.',
              },
            },
          },
        },
      ],
    };
  });

  server.setRequestHandler(CallToolRequestSchema, async (request: any) => {
    if (request.params.name === 'analyze_project') {
      const dir = request.params.arguments?.dir || process.cwd();
      const absDir = path.resolve(dir);
      
      try {
        const result = await analyze(absDir);
        
        const summary = `
CodePulse Analysis Results for ${absDir}
----------------------------------------
Files Analyzed: ${result.totalFiles}
Total Lines: ${result.totalLines}
Avg Complexity: ${result.avgComplexity.toFixed(1)}

Hotspots Detected: ${result.hotspots.length}
God Files Detected: ${result.godFiles.length}
Dead Exports: ${result.deadExports.length}

Issues Found: ${result.issues.length}
${result.issues.slice(0, 10).map(i => `- [${i.severity.toUpperCase()}] ${i.file}: ${i.message}`).join('\n')}
${result.issues.length > 10 ? '... (and more)' : ''}
        `;
        
        return {
          content: [
            {
              type: 'text',
              text: summary.trim(),
            },
          ],
        };
      } catch (err: any) {
        return {
          content: [
            {
              type: 'text',
              text: `Error analyzing project: ${err.message}`,
            },
          ],
          isError: true,
        };
      }
    }
    
    throw new Error(`Tool not found: ${request.params.name}`);
  });

  const transport = new StdioServerTransport();
  await server.connect(transport);
}

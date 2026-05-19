const fs = require('fs');
const code = fs.readFileSync('src/mcp/handlers.ts', 'utf-8');

const splitToken = '\tfind_similar_functions: async (args, absDir) => {';
const parts = code.split(splitToken);

const prefixMatch = parts[0].match(/([\s\S]*?)export const TOOL_HANDLERS[\s\S]*?> = \{\n([\s\S]*)/);
const imports = prefixMatch[1];
const healthCode = prefixMatch[2];
const archCode = splitToken + parts[1];

const archCodeClean = archCode.replace(/\n\};\n?$/, '\n'); // remove last };

const typeDef = `Record<string, (args: any, absDir: string) => Promise<any>>`;

fs.writeFileSync('src/mcp/handlers-health.ts', `${imports}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const HEALTH_HANDLERS: ${typeDef} = {
${healthCode}};
`);

fs.writeFileSync('src/mcp/handlers-architecture.ts', `${imports}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const ARCHITECTURE_HANDLERS: ${typeDef} = {
${archCodeClean}};
`);

fs.writeFileSync('src/mcp/handlers.ts', `import { HEALTH_HANDLERS } from "./handlers-health";
import { ARCHITECTURE_HANDLERS } from "./handlers-architecture";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const TOOL_HANDLERS: Record<string, (args: any, absDir: string) => Promise<any>> = {
    ...HEALTH_HANDLERS,
    ...ARCHITECTURE_HANDLERS,
};
`);

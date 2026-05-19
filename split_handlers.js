const fs = require('fs');
const content = fs.readFileSync('src/mcp/handlers.ts', 'utf-8');

// We will just rename handlers.ts to handlers-main.ts, but export everything through handlers.ts
fs.writeFileSync('src/mcp/handlers-core.ts', content);
// Wait, that doesn't split it. We need to actually parse and split.

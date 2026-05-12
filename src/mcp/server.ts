import * as path from "node:path";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
	CallToolRequestSchema,
	ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { TOOL_DEFINITIONS } from "./definitions";
import { TOOL_HANDLERS } from "./handlers";

async function handleMcpToolCall(name: string, args: any) {
	const dir = args?.dir || process.cwd();
	const absDir = path.resolve(dir);

	const handler = TOOL_HANDLERS[name];
	if (!handler) {
		throw new Error(`Tool not found: ${name}`);
	}

	return await handler(args, absDir);
}

export async function runMcpServer() {
	const server = new Server(
		{
			name: "codepulse",
			version: "3.0.0",
		},
		{
			capabilities: {
				tools: {},
			},
		},
	);

	server.setRequestHandler(ListToolsRequestSchema, async () => {
		return { tools: TOOL_DEFINITIONS };
	});

	server.setRequestHandler(CallToolRequestSchema, async (request: any) => {
		try {
			const { name, arguments: args } = request.params;
			return await handleMcpToolCall(name, args);
		} catch (err: any) {
			return {
				content: [{ type: "text", text: `Error: ${err.message}` }],
				isError: true,
			};
		}
	});

	const transport = new StdioServerTransport();
	await server.connect(transport);
}

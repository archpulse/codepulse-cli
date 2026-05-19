import * as path from "node:path";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
	CallToolRequestSchema,
	ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { TOOL_DEFINITIONS } from "./definitions";
import { TOOL_HANDLERS } from "./handlers";

async function handleMcpToolCall(name: string, args: Record<string, unknown>) {
	const dir = (args?.dir as string) || process.cwd();
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

	server.setRequestHandler(CallToolRequestSchema, async (request) => {
		try {
			const { name, arguments: args } = request.params as { name: string, arguments: Record<string, unknown> };
			return await handleMcpToolCall(name, args);
		} catch (err: unknown) {
			const message = err instanceof Error ? err.message : String(err);
			return {
				content: [{ type: "text", text: `Error: ${message}` }],
				isError: true,
			};
		}
	});

	const transport = new StdioServerTransport();
	await server.connect(transport);
}

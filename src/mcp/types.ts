export type McpHandlerResponse = {
	content: Array<{ type: "text"; text: string }>;
	isError?: boolean;
};

export type McpHandler = (
	args: any,
	absDir: string,
) => Promise<McpHandlerResponse>;

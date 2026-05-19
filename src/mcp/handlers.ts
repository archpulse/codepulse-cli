import { HEALTH_HANDLERS } from "./handlers-health";
import { ARCHITECTURE_HANDLERS } from "./handlers-architecture";
import { AGENT_HANDLERS } from "./handlers-agent";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const TOOL_HANDLERS: Record<string, (args: any, absDir: string) => Promise<any>> = {
    ...HEALTH_HANDLERS,
    ...ARCHITECTURE_HANDLERS,
    ...AGENT_HANDLERS,
};

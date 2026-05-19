import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import chalk from "chalk";
import inquirer from "inquirer";
import {
	SUPPORTED_AGENTS,
	CODEPULSE_AGENT_RULES,
} from "../rules/agents/registry";
import { SYMBOLS } from "../utils/terminal";
import { t } from "../utils/i18n";

const CONFIG_DIR = path.join(os.homedir(), ".gemini", "tmp", "codepulse-cli");
const PROMPTS_FILE = path.join(CONFIG_DIR, "prompts.json");

interface PromptConfig {
	name: string;
	content: string;
}

interface AppConfig {
	prompts: PromptConfig[];
	defaultPromptName: string;
}

const DEFAULT_PROMPTS: PromptConfig[] = [
	{
		name: "creative",
		content: `# Creative Architect Mode

You are a creative and visionary architect. 

## Workflow for New Features

When the user asks to "add new features" or similar broad requests:
1. **Fantasize & Brainstorm**: Do not start implementing immediately. Instead, brainstorm at least 3-5 different innovative ways to solve the problem or expand the project.
2. **Analyze & Sort**: Evaluate these options based on impact, scalability, and long-term vision. Present the best options to the user with pros/cons.
3. **Wait for Approval**: Only after the user selects a direction and gives explicit approval should you proceed with the implementation.

## Guiding Vision
Imagine how this project could evolve in the long term. Focus on creating something exceptional, not just functional.`,
	},
	{
		name: "productivity",
		content: `# Productivity Mode

You are a highly efficient and focused developer. Your goal is to deliver working code as quickly as possible. 

- **Direct Action**: Prioritize simple, direct solutions.
- **No Over-engineering**: Avoid unnecessary abstractions or complex patterns unless explicitly required.
- **Focus**: Complete the current task thoroughly and move to the next one without distraction.`,
	},
	{
		name: "default",
		content: CODEPULSE_AGENT_RULES,
	},
];

function loadConfig(): AppConfig {
	if (!fs.existsSync(PROMPTS_FILE)) {
		return { prompts: [], defaultPromptName: "default" };
	}
	try {
		const data = JSON.parse(fs.readFileSync(PROMPTS_FILE, "utf-8"));
		if (Array.isArray(data)) {
			return { prompts: data, defaultPromptName: "default" };
		}
		return {
			prompts: data.prompts || [],
			defaultPromptName: data.defaultPromptName || "default"
		};
	} catch {
		return { prompts: [], defaultPromptName: "default" };
	}
}

function saveConfig(config: AppConfig) {
	if (!fs.existsSync(CONFIG_DIR)) {
		fs.mkdirSync(CONFIG_DIR, { recursive: true });
	}
	fs.writeFileSync(PROMPTS_FILE, JSON.stringify(config, null, 2), "utf-8");
}

function findRobust<T extends { name: string; filename?: string }>(
	items: T[],
	searchValue: string,
): T | undefined {
	const search = String(searchValue).toLowerCase().trim();
	if (!search) return undefined;

	// 1. Exact match (case-insensitive) on name or filename
	let found = items.find(
		(i) =>
			i.name.toLowerCase() === search ||
			(i.filename && i.filename.toLowerCase() === search),
	);
	if (found) return found;

	// 2. Partial match on name
	found = items.find((i) => i.name.toLowerCase().includes(search));
	if (found) return found;

	// 3. Partial match on filename
	if (items.some((i) => i.filename)) {
		found = items.find((i) => i.filename?.toLowerCase().includes(search));
	}

	return found;
}

function resolvePrompt(promptNameOrFlag: string | undefined, allPrompts: PromptConfig[], config: AppConfig): PromptConfig | undefined {
	if (promptNameOrFlag === "-D" || promptNameOrFlag === "--default") {
		return allPrompts.find(p => p.name === config.defaultPromptName) || DEFAULT_PROMPTS.find(p => p.name === "default");
	}
	if (promptNameOrFlag) {
		return findRobust(allPrompts, promptNameOrFlag);
	}
	return undefined;
}

export async function runAgentCommand(
	agentNameOrCommand?: string,
	promptNameOrFlag?: string,
) {
	const config = loadConfig();
	const allPrompts = [...DEFAULT_PROMPTS, ...config.prompts];

	if (agentNameOrCommand === "config") {
		await runTuiConfig();
		return;
	}

	if (agentNameOrCommand === "prompt" && promptNameOrFlag === "config") {
		await runAddPrompt();
		return;
	}

	if (!agentNameOrCommand) {
		console.log(chalk.cyan(`\n  ${SYMBOLS.info} ${t("agent.usage")}`));
		console.log(chalk.gray(`  ${t("agent.example")}`));
		console.log(chalk.gray(`  ${t("agent.config_hint")}\n`));
		return;
	}

	const agent = findRobust(SUPPORTED_AGENTS, agentNameOrCommand);
	if (!agent) {
		console.error(chalk.red(`\n  ${SYMBOLS.error} ${t("agent.unknown_agent", { name: agentNameOrCommand })}`));
		console.log(chalk.gray(`  Available agents: ${SUPPORTED_AGENTS.map((a) => a.name).join(", ")}\n`));
		return;
	}

	const selectedPrompt = resolvePrompt(promptNameOrFlag, allPrompts, config);

	if (!selectedPrompt) {
		if (promptNameOrFlag) {
			console.error(chalk.red(`\n  ${SYMBOLS.error} ${t("agent.unknown_prompt", { name: promptNameOrFlag })}`));
		}
		console.log(chalk.gray(`  Available prompts: ${allPrompts.map((p) => p.name).join(", ")}\n`));
		return;
	}

	const filePath = path.join(process.cwd(), agent.filename);
	const parentDir = path.dirname(filePath);
	if (!fs.existsSync(parentDir)) fs.mkdirSync(parentDir, { recursive: true });

	fs.writeFileSync(filePath, selectedPrompt.content, "utf-8");
	console.log(chalk.green(`\n  ${SYMBOLS.check} ${t("agent.success", { file: agent.filename, agent: agent.name, location: t("agent.location.cwd"), prompt: selectedPrompt.name })}\n`));
}

export async function runAddPrompt() {
	console.log(chalk.bold.cyan(`\n  ${SYMBOLS.plus} Adding New Prompt\n`));
	
	const { name } = await inquirer.prompt([
		{
			type: "input",
			name: "name",
			message: t("agent.q.prompt_name"),
			validate: (input) => {
				if (!input.trim()) return t("agent.q.empty_error") as string;
				const all = [...DEFAULT_PROMPTS, ...loadConfig().prompts];
				if (all.some((p) => p.name === input.trim()))
					return t("agent.q.name_exists") as string;
				return true;
			},
		},
	]);

	const { content } = await inquirer.prompt([
		{
			type: "editor",
			name: "content",
			message: t("agent.q.prompt_content"),
			validate: (input) =>
				input.trim() !== "" || (t("agent.q.empty_error") as string),
		},
	]);

	const config = loadConfig();
	config.prompts.push({ name: name.trim(), content });
	saveConfig(config);
	
	console.log(
		chalk.green(`\n  ${SYMBOLS.check} ${t("agent.success_save", { name: name.trim() })}\n`),
	);
}

async function handlePromptAction(action: string, prompt: any, config: any, isBuiltIn: boolean) {
	if (action === "set_default") {
		config.defaultPromptName = prompt.name;
		saveConfig(config);
		console.log(chalk.green(`\n  ${SYMBOLS.check} '${prompt.name}' set as default!`));
		await new Promise(r => setTimeout(r, 1000));
	} else if (action === "edit") {
		await handleEditPrompt(prompt, config, isBuiltIn);
	} else if (action === "delete" && !isBuiltIn) {
		await handleDeletePrompt(prompt, config);
	} else if (action === "apply") {
		await handleApplyToAgent(prompt);
	}
}

async function handleEditPrompt(prompt: any, config: any, isBuiltIn: boolean) {
	const { content } = await inquirer.prompt([
		{
			type: "editor",
			name: "content",
			message: "Edit prompt content:",
			default: prompt.content,
		},
	]);

	if (isBuiltIn) {
		const newName = `${prompt.name}_custom`;
		config.prompts.push({ name: newName, content });
		console.log(chalk.green(`\n  ${SYMBOLS.check} Built-in prompt edited and saved as '${newName}'`));
	} else {
		const idx = config.prompts.findIndex((p: any) => p.name === prompt.name);
		if (idx !== -1) {
			config.prompts[idx].content = content;
			console.log(chalk.green(`\n  ${SYMBOLS.check} Prompt '${prompt.name}' updated!`));
		}
	}
	saveConfig(config);
	await new Promise(r => setTimeout(r, 1000));
}

async function handleDeletePrompt(prompt: any, config: any) {
	const { confirm } = await inquirer.prompt([
		{ type: "confirm", name: "confirm", message: `Are you sure you want to delete '${prompt.name}'?` }
	]);
	if (confirm) {
		config.prompts = config.prompts.filter((p: any) => p.name !== prompt.name);
		if (config.defaultPromptName === prompt.name) {
			config.defaultPromptName = "default";
		}
		saveConfig(config);
		console.log(chalk.green(`\n  ${SYMBOLS.check} Prompt '${prompt.name}' deleted.`));
		await new Promise(r => setTimeout(r, 1000));
	}
}

async function handleApplyToAgent(prompt: any) {
	const { selectedAgentId } = await inquirer.prompt([
		{
			type: "list",
			name: "selectedAgentId",
			message: "Apply to which agent?",
			choices: SUPPORTED_AGENTS.map((a) => ({
				name: `${a.name} ${chalk.gray(`(${a.filename})`)}`,
				value: a.filename,
			})),
		}
	]);

	const agent = SUPPORTED_AGENTS.find(a => a.filename === selectedAgentId);
	if (agent) {
		const filePath = path.join(process.cwd(), agent.filename);
		const parentDir = path.dirname(filePath);
		if (!fs.existsSync(parentDir)) fs.mkdirSync(parentDir, { recursive: true });
		fs.writeFileSync(filePath, prompt.content, "utf-8");
		console.log(chalk.green(`\n  ${SYMBOLS.check} Configured ${agent.name} with '${prompt.name}'!`));
		console.log(chalk.gray(`    File: ${filePath}`));
		await new Promise(r => setTimeout(r, 2000));
	}
}

export async function runTuiConfig() {
	let exit = false;

	while (!exit) {
		console.clear();
		console.log(chalk.bold.cyan(`\n  ${SYMBOLS.gear} CodePulse Agents Config\n`));

		const config = loadConfig();
		const allPrompts = [...DEFAULT_PROMPTS, ...config.prompts];

		const { selectedPromptName } = await inquirer.prompt([
			{
				type: "list",
				name: "selectedPromptName",
				message: "Select a prompt to manage:",
				choices: [
					...allPrompts.map((p) => ({
						name: `${p.name} ${p.name === config.defaultPromptName ? chalk.yellow("(Default)") : ""}`,
						value: p.name,
					})),
					new inquirer.Separator(),
					{ name: `👋 ${t("agent.exit")}`, value: "exit" },
				],
			},
		]);

		if (selectedPromptName === "exit") {
			exit = true;
			continue;
		}

		const prompt = allPrompts.find(p => p.name === selectedPromptName);
		if (!prompt) continue;

		const isBuiltIn = DEFAULT_PROMPTS.some(p => p.name === prompt.name);

		const { action } = await inquirer.prompt([
			{
				type: "list",
				name: "action",
				message: `What would you like to do with '${prompt.name}'?`,
				choices: [
					{ name: "⭐ Set as Default", value: "set_default" },
					{ name: "📝 Change/Edit", value: "edit" },
					{ name: "🗑️  Delete", value: "delete", disabled: isBuiltIn ? "Built-in prompts cannot be deleted" : false },
					{ name: "🚀 Apply to Agent", value: "apply" },
					{ name: "↩ Back", value: "back" },
				],
			},
		]);

		if (action === "back") continue;
		await handlePromptAction(action, prompt, config, isBuiltIn);
	}
}

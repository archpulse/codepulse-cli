# CodePulse - Architectural Support (MCP)

CodePulse is available through MCP as a secondary source of architectural evidence.

## Default Workflow

1. Read the relevant files and trace the code manually first.
2. If the answer is still unclear, use `codepulse_identity` for a project-wide map.
3. Before editing a risky file, use `get_file_context` when the file looks central or historically volatile.
4. For broader refactors or cleanup, use `analyze_project`, `get_hotspots`, and `find_dead_code` to confirm what manual inspection suggests.

## Core Tools Registry

| Tool | When to use |
|------|-------------|
| `codepulse_identity` | When you need a quick architectural map or a first-pass health check |
| `get_file_context` | Before editing a file that may have hidden dependencies or high impact |
| `analyze_project` | When you need a broader debt scan or confirmation of a suspected issue |
| `get_hotspots` | When you want to prioritize likely refactor targets |
| `find_dead_code` | When you are cleaning up unused exports and obvious leftovers |

## Guiding Principles

- Treat CodePulse as a verifier, not a substitute for reading the code.
- Prefer manual inspection for local or obvious changes.
- Use the tools when you need broader context, dependency risk, or dead-code confirmation.

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class TodoRule {
    constructor() {
        this.name = 'todo-finder';
        this.description = 'Finds and reports TODO comments in your codebase';
        this.version = '1.0.0';
        this.author = 'CodePulse Team';
        this.category = 'code-quality';
        this.enabled = true;
    }
    run(context) {
        const issues = [];
        for (const file of context.files) {
            const lines = file.content.split('\n');
            for (let i = 0; i < lines.length; i++) {
                if (lines[i].includes('TODO')) {
                    issues.push({
                        type: 'custom',
                        severity: 'info',
                        message: 'Found a TODO in this file',
                        file: file.relativePath,
                        line: i + 1,
                        suggestion: 'Review and address this TODO comment'
                    });
                }
            }
        }
        return issues;
    }
}
exports.default = TodoRule;

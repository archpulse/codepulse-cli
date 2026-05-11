"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EXPLANATIONS = void 0;
exports.EXPLANATIONS = {
    'god-file': {
        short: 'A file that accumulates too many responsibilities.',
        hint: 'Hard to maintain and refactor. Consider splitting by domain.',
        full: {
            description: 'A God File is a file that has grown too large and complex.',
            criteria: [
                'More than 500 lines of code, OR',
                'More than 15 imported modules',
            ],
            risks: [
                'Hidden coupling between unrelated logic',
                'High cognitive load for developers',
                'Painful refactoring — changes have unpredictable side effects',
            ],
            fix: [
                'Split by responsibility (one module = one concern)',
                'Extract utility functions into separate files',
                'Reduce imports by introducing barrel files or facades',
            ],
        },
    },
    'dead-export': {
        short: 'Exported but never imported anywhere.',
        hint: 'Likely unused or legacy code. Safe to remove if not part of public API.',
        full: {
            description: 'A Dead Export is a symbol exported from a file but never used by any other module.',
            criteria: [
                'Function/class/const is exported',
                'No other file in the project imports it',
            ],
            risks: [
                'Increases bundle size',
                'Creates false API surface — others may start using it',
                'Signals forgotten or abandoned code',
            ],
            fix: [
                'Remove the export keyword if used only internally',
                'Delete entirely if the code is unused',
                'Move to a dedicated legacy/ folder if intentional',
            ],
        },
    },
    'critical-node': {
        short: 'Imported by many modules across the project.',
        hint: 'Changes here may cause cascading failures. Treat with care.',
        full: {
            description: 'A Critical Node is a file that acts as a hub — many other modules depend on it.',
            criteria: [
                'Imported by 10+ other files (configurable)',
            ],
            risks: [
                'A bug here breaks many parts of the app simultaneously',
                'Refactoring is risky and requires touching many files',
                'Creates tight coupling across the codebase',
            ],
            fix: [
                'Avoid adding new logic to this file',
                'Consider splitting into smaller, focused modules',
                'Add thorough unit tests as a safety net',
            ],
        },
    },
    'high-complexity': {
        short: 'This function has too many branches and decision points.',
        hint: 'High cyclomatic complexity → hard to test and reason about.',
        full: {
            description: 'Cyclomatic complexity measures the number of linearly independent paths through code.',
            criteria: [
                'Complexity > 10 per function',
            ],
            risks: [
                'Each branch needs a test — high complexity means poor coverage',
                'Hard to understand at a glance',
                'Bug-prone: edge cases are easy to miss',
            ],
            fix: [
                'Extract nested conditions into named functions',
                'Use early returns to reduce nesting',
                'Replace complex conditionals with lookup tables or strategy pattern',
            ],
        },
    },
    'vulnerability': {
        short: 'Critical security issue like hardcoded secrets or code injection.',
        hint: 'Must be fixed immediately to prevent security breaches.',
        full: {
            description: 'A vulnerability is a flaw that could be exploited by an attacker.',
            criteria: [
                'Hardcoded passwords or secrets',
                'Use of dangerous functions like eval()',
                'Potential code injection points',
            ],
            risks: [
                'Data breaches and unauthorized access',
                'Remote code execution (RCE)',
                'Compromised application state',
            ],
            fix: [
                'Use environment variables for secrets (.env)',
                'Use safe APIs instead of eval()',
                'Implement proper input validation and sanitization',
            ],
        },
    },
    'duplication': {
        short: 'Identical code blocks detected in different files.',
        hint: 'Violates DRY (Don\'t Repeat Yourself) principle. Harder to fix bugs globally.',
        full: {
            description: 'Code duplication occurs when the same or very similar logic exists in multiple places.',
            criteria: [
                '15+ lines of identical code (configurable)',
            ],
            risks: [
                'Bug fixes must be applied multiple times',
                'Inconsistent behavior if one copy is updated but not the others',
                'Increases codebase size and cognitive load',
            ],
            fix: [
                'Extract shared logic into a common utility function or class',
                'Use composition or inheritance where appropriate',
                'Centralize configuration and constants',
            ],
        },
    },
    'dependency-vulnerability': {
        short: 'Project uses a library with known security flaws.',
        hint: 'Check package.json and run npm audit fix.',
        full: {
            description: 'Software Composition Analysis (SCA) detected libraries with public CVEs.',
            criteria: [
                'Dependency version matches known vulnerable range',
            ],
            risks: [
                'Application is vulnerable even if your own code is perfect',
                'Data breaches, XSS, or DoS through third-party code',
                'Compliance failures',
            ],
            fix: [
                'Upgrade the dependency to the suggested secure version',
                'If no fix exists, look for alternative libraries',
                'Use a lockfile to ensure reproducible and safe builds',
            ],
        },
    },
};
//# sourceMappingURL=explain.js.map
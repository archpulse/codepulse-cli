export declare const EXPLANATIONS: {
    readonly 'god-file': {
        readonly short: "A file that accumulates too many responsibilities.";
        readonly hint: "Hard to maintain and refactor. Consider splitting by domain.";
        readonly full: {
            readonly description: "A God File is a file that has grown too large and complex.";
            readonly criteria: readonly ["More than 500 lines of code, OR", "More than 15 imported modules"];
            readonly risks: readonly ["Hidden coupling between unrelated logic", "High cognitive load for developers", "Painful refactoring — changes have unpredictable side effects"];
            readonly fix: readonly ["Split by responsibility (one module = one concern)", "Extract utility functions into separate files", "Reduce imports by introducing barrel files or facades"];
        };
    };
    readonly 'dead-export': {
        readonly short: "Exported but never imported anywhere.";
        readonly hint: "Likely unused or legacy code. Safe to remove if not part of public API.";
        readonly full: {
            readonly description: "A Dead Export is a symbol exported from a file but never used by any other module.";
            readonly criteria: readonly ["Function/class/const is exported", "No other file in the project imports it"];
            readonly risks: readonly ["Increases bundle size", "Creates false API surface — others may start using it", "Signals forgotten or abandoned code"];
            readonly fix: readonly ["Remove the export keyword if used only internally", "Delete entirely if the code is unused", "Move to a dedicated legacy/ folder if intentional"];
        };
    };
    readonly 'critical-node': {
        readonly short: "Imported by many modules across the project.";
        readonly hint: "Changes here may cause cascading failures. Treat with care.";
        readonly full: {
            readonly description: "A Critical Node is a file that acts as a hub — many other modules depend on it.";
            readonly criteria: readonly ["Imported by 10+ other files (configurable)"];
            readonly risks: readonly ["A bug here breaks many parts of the app simultaneously", "Refactoring is risky and requires touching many files", "Creates tight coupling across the codebase"];
            readonly fix: readonly ["Avoid adding new logic to this file", "Consider splitting into smaller, focused modules", "Add thorough unit tests as a safety net"];
        };
    };
    readonly 'high-complexity': {
        readonly short: "This function has too many branches and decision points.";
        readonly hint: "High cyclomatic complexity → hard to test and reason about.";
        readonly full: {
            readonly description: "Cyclomatic complexity measures the number of linearly independent paths through code.";
            readonly criteria: readonly ["Complexity > 10 per function"];
            readonly risks: readonly ["Each branch needs a test — high complexity means poor coverage", "Hard to understand at a glance", "Bug-prone: edge cases are easy to miss"];
            readonly fix: readonly ["Extract nested conditions into named functions", "Use early returns to reduce nesting", "Replace complex conditionals with lookup tables or strategy pattern"];
        };
    };
};
export type ExplainKey = keyof typeof EXPLANATIONS;

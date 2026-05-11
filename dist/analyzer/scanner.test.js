"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const scanner_1 = require("./scanner");
(0, vitest_1.describe)('Scanner Utils', () => {
    (0, vitest_1.it)('should count lines correctly', () => {
        (0, vitest_1.expect)((0, scanner_1.countLines)('one\ntwo\nthree')).toBe(3);
        (0, vitest_1.expect)((0, scanner_1.countLines)('')).toBe(1);
    });
});
//# sourceMappingURL=scanner.test.js.map
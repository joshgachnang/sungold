"use strict";
var _a, _b;
Object.defineProperty(exports, "__esModule", { value: true });
exports.WEB_ORIGIN = exports.API_URL = exports.TEST_USER = void 0;
exports.TEST_USER = {
    email: "e2e-focus@example.com",
    name: "E2E Focus",
    password: "testpassword123",
};
exports.API_URL = (_a = process.env.E2E_API_URL) !== null && _a !== void 0 ? _a : "http://localhost:4093";
exports.WEB_ORIGIN = (_b = process.env.E2E_BASE_URL) !== null && _b !== void 0 ? _b : "http://localhost:8093";

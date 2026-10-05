"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var test_1 = require("@playwright/test");
var focusSessions_1 = require("./helpers/focusSessions");
var login_1 = require("./helpers/login");
test_1.test.describe("Focus sessions", function () {
    test_1.test.beforeEach(function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
        var page = _b.page, request = _b.request;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0: return [4 /*yield*/, (0, focusSessions_1.endActiveSessions)(request)];
                case 1:
                    _c.sent();
                    return [4 /*yield*/, (0, login_1.loginAs)(page)];
                case 2:
                    _c.sent();
                    return [4 /*yield*/, page.goto("/focus")];
                case 3:
                    _c.sent();
                    return [4 /*yield*/, page.getByTestId("focus-screen").waitFor({ state: "visible" })];
                case 4:
                    _c.sent();
                    return [4 /*yield*/, page.getByTestId("focus-start-button").waitFor({ state: "visible" })];
                case 5:
                    _c.sent();
                    return [2 /*return*/];
            }
        });
    }); });
    (0, test_1.test)("user can start a session, peek, and see the countdown", function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
        var countdown;
        var page = _b.page;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0: return [4 /*yield*/, page.getByTestId("focus-domain-input").fill("https://www.YouTube.com/feed, x.com")];
                case 1:
                    _c.sent();
                    return [4 /*yield*/, page.getByTestId("focus-intention-input").fill("Finish the auth migration")];
                case 2:
                    _c.sent();
                    return [4 /*yield*/, page.getByTestId("focus-start-button").click()];
                case 3:
                    _c.sent();
                    return [4 /*yield*/, page.getByTestId("focus-active-session").waitFor({ state: "visible" })];
                case 4:
                    _c.sent();
                    return [4 /*yield*/, (0, test_1.expect)(page.getByTestId("focus-intention")).toContainText("Finish the auth migration")];
                case 5:
                    _c.sent();
                    // The server normalizes domains; wait for its copy to sync back.
                    return [4 /*yield*/, (0, test_1.expect)(page.getByTestId("focus-blocked-domains")).toContainText("youtube.com, x.com")];
                case 6:
                    // The server normalizes domains; wait for its copy to sync back.
                    _c.sent();
                    return [4 /*yield*/, page.getByTestId("focus-peek-button").click()];
                case 7:
                    _c.sent();
                    countdown = page.getByTestId("focus-grant-countdown");
                    return [4 /*yield*/, countdown.waitFor({ state: "visible" })];
                case 8:
                    _c.sent();
                    return [4 /*yield*/, (0, test_1.expect)(countdown).toContainText(/Unblocked for [45]:\d\d/)];
                case 9:
                    _c.sent();
                    return [4 /*yield*/, (0, test_1.expect)(page.getByTestId("focus-peek-button")).toBeHidden()];
                case 10:
                    _c.sent();
                    return [2 /*return*/];
            }
        });
    }); });
    (0, test_1.test)("user cannot request a second peek while the first grant is on its way", function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
        var grantIssued;
        var page = _b.page;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0: 
                // Hold back grant deltas so the issued grant has not reached the screen yet.
                return [4 /*yield*/, page.routeWebSocket(/localhost:4093\/socket\.io/, function (ws) {
                        var server = ws.connectToServer();
                        server.onMessage(function (message) {
                            if (typeof message === "string" && message.includes('"collection":"unlockGrants"')) {
                                return;
                            }
                            ws.send(message);
                        });
                    })];
                case 1:
                    // Hold back grant deltas so the issued grant has not reached the screen yet.
                    _c.sent();
                    return [4 /*yield*/, page.reload()];
                case 2:
                    _c.sent();
                    return [4 /*yield*/, page.getByTestId("focus-start-button").waitFor({ state: "visible" })];
                case 3:
                    _c.sent();
                    return [4 /*yield*/, page.getByTestId("focus-domain-input").fill("x.com")];
                case 4:
                    _c.sent();
                    return [4 /*yield*/, page.getByTestId("focus-start-button").click()];
                case 5:
                    _c.sent();
                    return [4 /*yield*/, page.getByTestId("focus-active-session").waitFor({ state: "visible" })];
                case 6:
                    _c.sent();
                    grantIssued = page.waitForResponse(function (response) { return response.url().endsWith("/grants") && response.status() === 200; });
                    return [4 /*yield*/, page.getByTestId("focus-peek-button").click()];
                case 7:
                    _c.sent();
                    return [4 /*yield*/, grantIssued];
                case 8:
                    _c.sent();
                    // The request has finished; the screen waits for the grant instead of re-enabling Peek.
                    return [4 /*yield*/, (0, test_1.expect)(page.getByTestId("focus-peek-pending")).toBeVisible()];
                case 9:
                    // The request has finished; the screen waits for the grant instead of re-enabling Peek.
                    _c.sent();
                    return [4 /*yield*/, (0, test_1.expect)(page.getByTestId("focus-peek-button")).toBeDisabled()];
                case 10:
                    _c.sent();
                    return [4 /*yield*/, (0, test_1.expect)(page.getByTestId("focus-grant-countdown")).toBeHidden()];
                case 11:
                    _c.sent();
                    return [2 /*return*/];
            }
        });
    }); });
    (0, test_1.test)("user can end a session and start again", function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
        var page = _b.page;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0: return [4 /*yield*/, page.getByTestId("focus-domain-input").fill("reddit.com")];
                case 1:
                    _c.sent();
                    return [4 /*yield*/, page.getByTestId("focus-start-button").click()];
                case 2:
                    _c.sent();
                    return [4 /*yield*/, page.getByTestId("focus-active-session").waitFor({ state: "visible" })];
                case 3:
                    _c.sent();
                    return [4 /*yield*/, page.getByTestId("focus-end-button").click()];
                case 4:
                    _c.sent();
                    return [4 /*yield*/, page.getByTestId("focus-start-button").waitFor({ state: "visible" })];
                case 5:
                    _c.sent();
                    return [4 /*yield*/, (0, test_1.expect)(page.getByTestId("focus-active-session")).toBeHidden()];
                case 6:
                    _c.sent();
                    return [2 /*return*/];
            }
        });
    }); });
    (0, test_1.test)("user with a session from another device never sees the start form", function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
        var sawStartForm;
        var page = _b.page, request = _b.request;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0: return [4 /*yield*/, (0, focusSessions_1.startSessionViaApi)(request, ["news.ycombinator.com"])];
                case 1:
                    _c.sent();
                    // Record whether the start form renders at any point during the reload.
                    return [4 /*yield*/, page.addInitScript(function () {
                            var record = function () {
                                if (document.querySelector('[data-testid="focus-start-button"]')) {
                                    window.sawStartForm = true;
                                }
                            };
                            new MutationObserver(record).observe(document, { childList: true, subtree: true });
                        })];
                case 2:
                    // Record whether the start form renders at any point during the reload.
                    _c.sent();
                    // Start from an empty local store, like a device opening the app for the first time.
                    return [4 /*yield*/, page.goto("/login")];
                case 3:
                    // Start from an empty local store, like a device opening the app for the first time.
                    _c.sent();
                    return [4 /*yield*/, page.evaluate(function () { return __awaiter(void 0, void 0, void 0, function () {
                            var _i, _a, database;
                            return __generator(this, function (_b) {
                                switch (_b.label) {
                                    case 0:
                                        _i = 0;
                                        return [4 /*yield*/, indexedDB.databases()];
                                    case 1:
                                        _a = _b.sent();
                                        _b.label = 2;
                                    case 2:
                                        if (!(_i < _a.length)) return [3 /*break*/, 4];
                                        database = _a[_i];
                                        if (database.name) {
                                            indexedDB.deleteDatabase(database.name);
                                        }
                                        _b.label = 3;
                                    case 3:
                                        _i++;
                                        return [3 /*break*/, 2];
                                    case 4: return [2 /*return*/];
                                }
                            });
                        }); })];
                case 4:
                    _c.sent();
                    return [4 /*yield*/, page.goto("/focus")];
                case 5:
                    _c.sent();
                    return [4 /*yield*/, page.getByTestId("focus-active-session").waitFor({ state: "visible" })];
                case 6:
                    _c.sent();
                    return [4 /*yield*/, (0, test_1.expect)(page.getByTestId("focus-blocked-domains")).toContainText("news.ycombinator.com")];
                case 7:
                    _c.sent();
                    return [4 /*yield*/, page.evaluate(function () { return window.sawStartForm === true; })];
                case 8:
                    sawStartForm = _c.sent();
                    (0, test_1.expect)(sawStartForm).toBe(false);
                    return [2 /*return*/];
            }
        });
    }); });
    (0, test_1.test)("user sees the server's error for an invalid domain", function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
        var page = _b.page;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0: return [4 /*yield*/, page.getByTestId("focus-domain-input").fill("localhost")];
                case 1:
                    _c.sent();
                    return [4 /*yield*/, page.getByTestId("focus-start-button").click()];
                case 2:
                    _c.sent();
                    return [4 /*yield*/, (0, test_1.expect)(page.getByTestId("focus-domain-error")).toContainText("Invalid domains: localhost")];
                case 3:
                    _c.sent();
                    return [4 /*yield*/, (0, test_1.expect)(page.getByTestId("focus-active-session")).toBeHidden()];
                case 4:
                    _c.sent();
                    return [2 /*return*/];
            }
        });
    }); });
    (0, test_1.test)("user sees an error when starting without domains", function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
        var page = _b.page;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0: return [4 /*yield*/, page.getByTestId("focus-start-button").click()];
                case 1:
                    _c.sent();
                    return [4 /*yield*/, (0, test_1.expect)(page.getByTestId("focus-domain-error")).toContainText("at least one domain")];
                case 2:
                    _c.sent();
                    return [4 /*yield*/, (0, test_1.expect)(page.getByTestId("focus-active-session")).toBeHidden()];
                case 3:
                    _c.sent();
                    return [2 /*return*/];
            }
        });
    }); });
});

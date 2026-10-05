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
var testUsers_1 = require("./fixtures/testUsers");
var focusSessions_1 = require("./helpers/focusSessions");
var login_1 = require("./helpers/login");
// A name no real device uses, so cleanup only revokes sessions these tests created.
var TEST_DEVICE_NAME = "Sungold e2e test device";
var DEVICE_LOGIN_PATH = "/device-login?client=mac&redirect=sungold-mac%3A%2F%2Fauth&state=e2e-state-123&name=Sungold%20e2e%20test%20device";
// Chromium does not navigate to sungold-mac://, but DevTools reports the attempt.
var captureAppRedirect = function (page) { return __awaiter(void 0, void 0, void 0, function () {
    var cdp, resolveUrl, redirect;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, page.context().newCDPSession(page)];
            case 1:
                cdp = _a.sent();
                return [4 /*yield*/, cdp.send("Page.enable")];
            case 2:
                _a.sent();
                resolveUrl = function () { return undefined; };
                redirect = new Promise(function (resolve) {
                    resolveUrl = resolve;
                });
                cdp.on("Page.frameRequestedNavigation", function (event) {
                    if (event.url.startsWith("sungold-mac://")) {
                        resolveUrl(event.url);
                    }
                });
                return [2 /*return*/, function () { return redirect; }];
        }
    });
}); };
test_1.test.describe("Device sign-in", function () {
    test_1.test.afterEach(function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
        var request = _b.request;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0: return [4 /*yield*/, (0, focusSessions_1.revokeDeviceSessions)(request, TEST_DEVICE_NAME)];
                case 1:
                    _c.sent();
                    return [2 /*return*/];
            }
        });
    }); });
    (0, test_1.test)("signed-in user can approve the Mac and it receives a working token", function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
        var waitForRedirect, redirectUrl, _c, me;
        var page = _b.page, request = _b.request;
        return __generator(this, function (_d) {
            switch (_d.label) {
                case 0: return [4 /*yield*/, (0, login_1.loginAs)(page)];
                case 1:
                    _d.sent();
                    return [4 /*yield*/, captureAppRedirect(page)];
                case 2:
                    waitForRedirect = _d.sent();
                    return [4 /*yield*/, page.goto(DEVICE_LOGIN_PATH)];
                case 3:
                    _d.sent();
                    return [4 /*yield*/, page.getByTestId("device-login-approve").waitFor({ state: "visible" })];
                case 4:
                    _d.sent();
                    return [4 /*yield*/, (0, test_1.expect)(page.getByTestId("device-login-approve")).toContainText(TEST_DEVICE_NAME)];
                case 5:
                    _d.sent();
                    return [4 /*yield*/, page.getByTestId("device-login-approve-button").click()];
                case 6:
                    _d.sent();
                    _c = URL.bind;
                    return [4 /*yield*/, waitForRedirect()];
                case 7:
                    redirectUrl = new (_c.apply(URL, [void 0, _d.sent()]))();
                    (0, test_1.expect)("".concat(redirectUrl.protocol, "//").concat(redirectUrl.host)).toBe("sungold-mac://auth");
                    (0, test_1.expect)(redirectUrl.searchParams.get("state")).toBe("e2e-state-123");
                    return [4 /*yield*/, page.getByTestId("device-login-done").waitFor({ state: "visible" })];
                case 8:
                    _d.sent();
                    return [4 /*yield*/, request.get("".concat(testUsers_1.API_URL, "/auth/me"), {
                            headers: { authorization: "Bearer ".concat(redirectUrl.searchParams.get("token")) },
                        })];
                case 9:
                    me = _d.sent();
                    (0, test_1.expect)(me.status()).toBe(200);
                    return [2 /*return*/];
            }
        });
    }); });
    (0, test_1.test)("signed-out user signs in and returns to the approval step", function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
        var page = _b.page;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0: return [4 /*yield*/, page.goto(DEVICE_LOGIN_PATH)];
                case 1:
                    _c.sent();
                    return [4 /*yield*/, page.getByTestId("device-login-signin-button").click()];
                case 2:
                    _c.sent();
                    return [4 /*yield*/, page.getByTestId("login-screen").waitFor({ state: "visible" })];
                case 3:
                    _c.sent();
                    return [4 /*yield*/, page.getByTestId("login-screen-email-input").fill("e2e-focus@example.com")];
                case 4:
                    _c.sent();
                    return [4 /*yield*/, page.getByTestId("login-screen-password-input").fill("testpassword123")];
                case 5:
                    _c.sent();
                    return [4 /*yield*/, page.getByTestId("login-screen-submit-button").click()];
                case 6:
                    _c.sent();
                    return [4 /*yield*/, page.getByTestId("device-login-approve").waitFor({ state: "visible" })];
                case 7:
                    _c.sent();
                    return [4 /*yield*/, (0, test_1.expect)(page).toHaveURL(/state=e2e-state-123/)];
                case 8:
                    _c.sent();
                    return [2 /*return*/];
            }
        });
    }); });
    (0, test_1.test)("user sees an error for an incomplete sign-in link", function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
        var page = _b.page;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0: return [4 /*yield*/, (0, login_1.loginAs)(page)];
                case 1:
                    _c.sent();
                    return [4 /*yield*/, page.goto("/device-login?client=mac")];
                case 2:
                    _c.sent();
                    return [4 /*yield*/, (0, test_1.expect)(page.getByTestId("device-login-invalid")).toBeVisible()];
                case 3:
                    _c.sent();
                    return [2 /*return*/];
            }
        });
    }); });
});

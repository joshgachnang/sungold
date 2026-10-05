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
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.revokeDeviceSessions = exports.endActiveSessions = exports.startSessionViaApi = void 0;
var test_1 = require("@playwright/test");
var testUsers_1 = require("../fixtures/testUsers");
// Ends every active focus session for the user through the API, so each test starts from
// "no active session" regardless of what a previous test or run left behind.
var authorizationFor = function (request, user) { return __awaiter(void 0, void 0, void 0, function () {
    var signIn, _a, _b;
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0: return [4 /*yield*/, request.post("".concat(testUsers_1.API_URL, "/api/auth/sign-in/email"), {
                    data: { email: user.email, password: user.password },
                    headers: { origin: testUsers_1.WEB_ORIGIN },
                })];
            case 1:
                signIn = _c.sent();
                _a = test_1.expect;
                _b = [signIn.ok()];
                return [4 /*yield*/, signIn.text()];
            case 2:
                _a.apply(void 0, _b.concat([_c.sent()])).toBe(true);
                return [2 /*return*/, "Bearer ".concat(signIn.headers()["set-auth-token"])];
        }
    });
}); };
// Starts a session through the API, as another device would.
var startSessionViaApi = function (request_1, blockedDomains_1) {
    var args_1 = [];
    for (var _i = 2; _i < arguments.length; _i++) {
        args_1[_i - 2] = arguments[_i];
    }
    return __awaiter(void 0, __spreadArray([request_1, blockedDomains_1], args_1, true), void 0, function (request, blockedDomains, user) {
        var created, _a, _b, _c, _d, _e;
        var _f, _g;
        if (user === void 0) { user = testUsers_1.TEST_USER; }
        return __generator(this, function (_h) {
            switch (_h.label) {
                case 0:
                    _b = (_a = request).post;
                    _c = ["".concat(testUsers_1.API_URL, "/focusSessions")];
                    _f = {
                        data: { blockedDomains: blockedDomains }
                    };
                    _g = {};
                    return [4 /*yield*/, authorizationFor(request, user)];
                case 1: return [4 /*yield*/, _b.apply(_a, _c.concat([(_f.headers = (_g.authorization = _h.sent(), _g),
                            _f)]))];
                case 2:
                    created = _h.sent();
                    _d = test_1.expect;
                    _e = [created.status()];
                    return [4 /*yield*/, created.text()];
                case 3:
                    _d.apply(void 0, _e.concat([_h.sent()])).toBe(201);
                    return [2 /*return*/];
            }
        });
    });
};
exports.startSessionViaApi = startSessionViaApi;
var endActiveSessions = function (request_1) {
    var args_1 = [];
    for (var _i = 1; _i < arguments.length; _i++) {
        args_1[_i - 1] = arguments[_i];
    }
    return __awaiter(void 0, __spreadArray([request_1], args_1, true), void 0, function (request, user) {
        var authorization, list, _a, _b, data, _c, data_1, session, ended, _d, _e;
        if (user === void 0) { user = testUsers_1.TEST_USER; }
        return __generator(this, function (_f) {
            switch (_f.label) {
                case 0: return [4 /*yield*/, authorizationFor(request, user)];
                case 1:
                    authorization = _f.sent();
                    return [4 /*yield*/, request.get("".concat(testUsers_1.API_URL, "/focusSessions?status=active"), {
                            headers: { authorization: authorization },
                        })];
                case 2:
                    list = _f.sent();
                    _a = test_1.expect;
                    _b = [list.ok()];
                    return [4 /*yield*/, list.text()];
                case 3:
                    _a.apply(void 0, _b.concat([_f.sent()])).toBe(true);
                    return [4 /*yield*/, list.json()];
                case 4:
                    data = (_f.sent()).data;
                    _c = 0, data_1 = data;
                    _f.label = 5;
                case 5:
                    if (!(_c < data_1.length)) return [3 /*break*/, 9];
                    session = data_1[_c];
                    return [4 /*yield*/, request.post("".concat(testUsers_1.API_URL, "/focusSessions/").concat(session._id, "/end"), {
                            headers: { authorization: authorization },
                        })];
                case 6:
                    ended = _f.sent();
                    _d = test_1.expect;
                    _e = [ended.ok()];
                    return [4 /*yield*/, ended.text()];
                case 7:
                    _d.apply(void 0, _e.concat([_f.sent()])).toBe(true);
                    _f.label = 8;
                case 8:
                    _c++;
                    return [3 /*break*/, 5];
                case 9: return [2 /*return*/];
            }
        });
    });
};
exports.endActiveSessions = endActiveSessions;
// Revokes the device sessions a test created (matched by the device name it signed in with),
// so e2e runs leave no live tokens behind without touching real devices on the same account.
var revokeDeviceSessions = function (request_1, deviceName_1) {
    var args_1 = [];
    for (var _i = 2; _i < arguments.length; _i++) {
        args_1[_i - 2] = arguments[_i];
    }
    return __awaiter(void 0, __spreadArray([request_1, deviceName_1], args_1, true), void 0, function (request, deviceName, user) {
        var authorization, list, _a, _b, data, _c, _d, device, revoked, _e, _f;
        if (user === void 0) { user = testUsers_1.TEST_USER; }
        return __generator(this, function (_g) {
            switch (_g.label) {
                case 0: return [4 /*yield*/, authorizationFor(request, user)];
                case 1:
                    authorization = _g.sent();
                    return [4 /*yield*/, request.get("".concat(testUsers_1.API_URL, "/deviceSessions"), { headers: { authorization: authorization } })];
                case 2:
                    list = _g.sent();
                    _a = test_1.expect;
                    _b = [list.ok()];
                    return [4 /*yield*/, list.text()];
                case 3:
                    _a.apply(void 0, _b.concat([_g.sent()])).toBe(true);
                    return [4 /*yield*/, list.json()];
                case 4:
                    data = (_g.sent()).data;
                    _c = 0, _d = data.filter(function (item) { return !item.revokedAt && item.name === deviceName; });
                    _g.label = 5;
                case 5:
                    if (!(_c < _d.length)) return [3 /*break*/, 9];
                    device = _d[_c];
                    return [4 /*yield*/, request.post("".concat(testUsers_1.API_URL, "/deviceSessions/").concat(device._id, "/revoke"), {
                            headers: { authorization: authorization },
                        })];
                case 6:
                    revoked = _g.sent();
                    _e = test_1.expect;
                    _f = [revoked.ok()];
                    return [4 /*yield*/, revoked.text()];
                case 7:
                    _e.apply(void 0, _f.concat([_g.sent()])).toBe(true);
                    _g.label = 8;
                case 8:
                    _c++;
                    return [3 /*break*/, 5];
                case 9: return [2 /*return*/];
            }
        });
    });
};
exports.revokeDeviceSessions = revokeDeviceSessions;

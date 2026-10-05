import XCTest
@testable import Sungold

final class AuthCallbackTests: XCTestCase {
    func testReturnsTokenWhenStateMatches() throws {
        let url = URL(string: "sungold-mac://auth?state=abc123&token=tok-1")!
        XCTAssertEqual(try AuthCallback.token(from: url, expectedState: "abc123"), "tok-1")
    }

    func testDecodesPercentEncodedState() throws {
        let url = URL(string: "sungold-mac://auth?state=a%7Eb&token=tok-2")!
        XCTAssertEqual(try AuthCallback.token(from: url, expectedState: "a~b"), "tok-2")
    }

    func testRejectsMismatchedOrMissingState() {
        let wrong = URL(string: "sungold-mac://auth?state=other&token=tok")!
        XCTAssertThrowsError(try AuthCallback.token(from: wrong, expectedState: "abc")) {
            XCTAssertEqual($0 as? AuthCallback.ParseError, .stateMismatch)
        }
        let missing = URL(string: "sungold-mac://auth?token=tok")!
        XCTAssertThrowsError(try AuthCallback.token(from: missing, expectedState: "abc")) {
            XCTAssertEqual($0 as? AuthCallback.ParseError, .stateMismatch)
        }
    }

    func testRejectsMissingTokenAndOtherDestinations() {
        let noToken = URL(string: "sungold-mac://auth?state=abc")!
        XCTAssertThrowsError(try AuthCallback.token(from: noToken, expectedState: "abc")) {
            XCTAssertEqual($0 as? AuthCallback.ParseError, .missingToken)
        }
        for value in ["sungold-mac://other?state=abc&token=t", "https://auth?state=abc&token=t",
                      "sungold-mac://auth/extra?state=abc&token=t"] {
            XCTAssertThrowsError(try AuthCallback.token(from: URL(string: value)!, expectedState: "abc")) {
                XCTAssertEqual($0 as? AuthCallback.ParseError, .wrongDestination, value)
            }
        }
    }

    func testBuildsDeviceLoginURLTheBackendAccepts() {
        let url = AuthCallback.signInURL(
            webURL: URL(string: "https://app.example.com")!, state: "s-1", deviceName: "Josh's Mac")
        let items = URLComponents(url: url, resolvingAgainstBaseURL: false)!.queryItems!
        XCTAssertEqual(url.path, "/device-login")
        XCTAssertEqual(items.first { $0.name == "client" }?.value, "mac")
        XCTAssertEqual(items.first { $0.name == "redirect" }?.value, "sungold-mac://auth")
        XCTAssertEqual(items.first { $0.name == "state" }?.value, "s-1")
        XCTAssertEqual(items.first { $0.name == "name" }?.value, "Josh's Mac")
    }

    func testStateIsURLSafeAndUnique() {
        let state = AuthCallback.makeState()
        XCTAssertNotNil(state.range(of: "^[A-Za-z0-9._~-]{16,256}$", options: .regularExpression))
        XCTAssertNotEqual(state, AuthCallback.makeState())
    }
}

final class KeychainTokenStoreTests: XCTestCase {
    // A fresh item per run: this process creates it, so the Keychain never asks, even though
    // ad-hoc test builds change signature every build.
    private let store = KeychainTokenStore(
        service: "app.sungold.mac.tests.\(UUID().uuidString)", account: "deviceToken")

    override func tearDown() {
        store.delete()
    }

    func testSavesLoadsReplacesAndDeletesToken() throws {
        XCTAssertNil(store.load())
        try store.save("first")
        XCTAssertEqual(store.load(), "first")
        try store.save("second")
        XCTAssertEqual(store.load(), "second")
        store.delete()
        XCTAssertNil(store.load())
    }
}

final class FileTokenStoreTests: XCTestCase {
    private var directory: URL!
    private var store: FileTokenStore!

    override func setUpWithError() throws {
        directory = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString)
        store = FileTokenStore(fileURL: directory.appendingPathComponent("nested/dev-device-token"))
    }

    override func tearDownWithError() throws {
        try? FileManager.default.removeItem(at: directory)
    }

    func testSavesLoadsReplacesAndDeletesTokenWithUserOnlyPermissions() throws {
        XCTAssertNil(store.load())
        try store.save("first")
        XCTAssertEqual(store.load(), "first")
        try store.save("second")
        XCTAssertEqual(store.load(), "second")
        let attributes = try FileManager.default.attributesOfItem(atPath: store.fileURL.path)
        XCTAssertEqual((attributes[.posixPermissions] as? NSNumber)?.intValue, 0o600)
        store.delete()
        XCTAssertNil(store.load())
    }
}

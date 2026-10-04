import XCTest
@testable import Sungold

final class DomainMatcherTests: XCTestCase {
    func testBlocksDomainAndSubdomainsOnly() {
        let matcher = DomainMatcher(domains: ["youtube.com", "X.com."])
        XCTAssertTrue(matcher.blocks(host: "youtube.com"))
        XCTAssertTrue(matcher.blocks(host: "www.youtube.com"))
        XCTAssertTrue(matcher.blocks(host: "M.YouTube.com."))
        XCTAssertTrue(matcher.blocks(host: "x.com"))
        XCTAssertFalse(matcher.blocks(host: "notyoutube.com"))
        XCTAssertFalse(matcher.blocks(host: "youtube.com.evil.net"))
        XCTAssertFalse(matcher.blocks(host: ""))
    }

    func testEmptyListBlocksNothing() {
        XCTAssertFalse(DomainMatcher(domains: []).blocks(host: "youtube.com"))
        XCTAssertFalse(DomainMatcher(domains: ["", " "]).blocks(host: "youtube.com"))
    }
}

final class TLSClientHelloTests: XCTestCase {
    /// A ClientHello captured from `curl https://www.youtube.com` against a local listener.
    private let curlClientHello = Data(base64Encoded: "FgMBAUABAAE8AwNyiesmWzDtmdIZfoLtrNbye00JaDnvZGQc/FLswPlsSiBQEHwuE/lRdHX4aEwlMsGbt4FwABHhLppd1oknsscmxwBiEwMTAhMBzKnMqMyqwDDALMAowCTAFMAKAJ8AawA5/4UAxACIAIEAnQA9ADUAwACEwC/AK8AnwCPAE8AJAJ4AZwAzAL4ARQCcADwALwC6AEHAEcAHAAUABMASwAgAFgAKAP8BAACRACsACQgDBAMDAwIDAQAzACYAJAAdACC+r2ZB4hqNCLpzsuqnXFKbwFMHZXwtvvZ0cC0xeCoqDgAAABQAEgAAD3d3dy55b3V0dWJlLmNvbQALAAIBAAAKAAoACAAdABcAGAAZAA0AGAAWCAYGAQYDCAUFAQUDCAQEAQQDAgECAwAQAA4ADAJoMghodHRwLzEuMQ==")!

    func testReadsServerNameFromARealClientHello() {
        XCTAssertEqual(TLSClientHello.serverName(in: curlClientHello), "www.youtube.com")
    }

    func testReturnsNilForTruncatedOrNonTLSData() {
        XCTAssertNil(TLSClientHello.serverName(in: curlClientHello.prefix(40)))
        XCTAssertNil(TLSClientHello.serverName(in: Data("GET / HTTP/1.1\r\nHost: x.com\r\n\r\n".utf8)))
        XCTAssertNil(TLSClientHello.serverName(in: Data()))
    }

    func testReturnsNilWithoutServerNameExtension() {
        // Minimal ClientHello: no session id, one cipher, null compression, no extensions.
        var hello: [UInt8] = [0x03, 0x03] + [UInt8](repeating: 0, count: 32) + [0x00, 0x00, 0x02, 0x13, 0x01, 0x01, 0x00, 0x00, 0x00]
        hello = [0x01, 0x00, 0x00, UInt8(hello.count)] + hello
        let record: [UInt8] = [0x16, 0x03, 0x01, 0x00, UInt8(hello.count)] + hello
        XCTAssertNil(TLSClientHello.serverName(in: Data(record)))
    }
}

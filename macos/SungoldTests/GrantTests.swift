import CryptoKit
import XCTest
@testable import Sungold

private enum NodeFixture {
    // Signed by backend/src/utils/grantSigning.ts (Node crypto) with a throwaway key.
    static let publicKey = "_fBfFLQh97PeqbVP_x7anjfQCITm3Fupb8J4AaRtCK4"
    static let grant = SignedGrant(
        payload: "eyJleHBpcmVzQXQiOiIyMDI2LTEwLTA0VDEyOjA1OjAwLjAwMFoiLCJncmFudElkIjoiZy1maXh0dXJlIiwiaXNzdWVkQXQiOiIyMDI2LTEwLTA0VDEyOjAwOjAwLjAwMFoiLCJzY29wZSI6ImFsbCIsInNlc3Npb25JZCI6InMtZml4dHVyZSIsInVzZXJJZCI6InUtZml4dHVyZSIsInYiOjF9",
        signature: "lVrDFJWdzC2RYaU34vcxstYWbsBo2lMrZOYoo-2SsZ_EVrzuiGXIEbOk1RDsFy895Y75CPiNEhw1CMsOIejpBQ")
    static let issuedAt = ISODate.parse("2026-10-04T12:00:00.000Z")!
    static let expiresAt = ISODate.parse("2026-10-04T12:05:00.000Z")!
}

private func base64URL(_ data: Data) -> String {
    data.base64EncodedString().replacingOccurrences(of: "+", with: "-")
        .replacingOccurrences(of: "/", with: "_").replacingOccurrences(of: "=", with: "")
}

/// Signs an arbitrary payload object with a test key, the way the server does.
private func sign(_ object: [String: Any], with key: Curve25519.Signing.PrivateKey) throws -> SignedGrant {
    let bytes = try JSONSerialization.data(withJSONObject: object, options: [.sortedKeys])
    return SignedGrant(payload: base64URL(bytes), signature: base64URL(try key.signature(for: bytes)))
}

final class GrantVerifierTests: XCTestCase {
    private let verifier = GrantVerifier(publicKeyBase64URL: NodeFixture.publicKey)!

    func testVerifiesAGrantSignedByTheBackend() {
        let payload = verifier.verify(NodeFixture.grant)
        XCTAssertEqual(payload, GrantPayload(grantId: "g-fixture", userId: "u-fixture", sessionId: "s-fixture",
                                             issuedAt: NodeFixture.issuedAt, expiresAt: NodeFixture.expiresAt))
    }

    func testRejectsATamperedPayload() throws {
        var object = try JSONSerialization.jsonObject(with: Base64URL.decode(NodeFixture.grant.payload)!) as! [String: Any]
        object["expiresAt"] = "2026-10-05T12:05:00.000Z"
        let forged = base64URL(try JSONSerialization.data(withJSONObject: object, options: [.sortedKeys]))
        XCTAssertNil(verifier.verify(SignedGrant(payload: forged, signature: NodeFixture.grant.signature)))
    }

    func testRejectsAGrantSignedWithAnotherKey() throws {
        let other = Curve25519.Signing.PrivateKey()
        let bytes = Base64URL.decode(NodeFixture.grant.payload)!
        let grant = SignedGrant(payload: NodeFixture.grant.payload, signature: base64URL(try other.signature(for: bytes)))
        XCTAssertNil(verifier.verify(grant))
    }

    func testRejectsUnknownVersionScopeAndMalformedInput() throws {
        let key = Curve25519.Signing.PrivateKey()
        let ownVerifier = GrantVerifier(publicKeyBase64URL: base64URL(key.publicKey.rawRepresentation))!
        let base: [String: Any] = ["v": 1, "grantId": "g", "userId": "u", "sessionId": "s", "scope": "all",
                                   "issuedAt": "2026-10-04T12:00:00.000Z", "expiresAt": "2026-10-04T12:05:00.000Z"]
        XCTAssertNotNil(ownVerifier.verify(try sign(base, with: key)))
        XCTAssertNil(ownVerifier.verify(try sign(base.merging(["v": 2]) { $1 }, with: key)))
        XCTAssertNil(ownVerifier.verify(try sign(base.merging(["v": true]) { $1 }, with: key)))
        XCTAssertNil(ownVerifier.verify(try sign(base.merging(["v": 1.5]) { $1 }, with: key)))
        XCTAssertNil(ownVerifier.verify(try sign(base.merging(["scope": "domains"]) { $1 }, with: key)))
        XCTAssertNil(ownVerifier.verify(try sign(base.merging(["expiresAt": "2026-10-04T11:00:00.000Z"]) { $1 }, with: key)))
        XCTAssertNil(ownVerifier.verify(SignedGrant(payload: "not base64!", signature: "x")))
        XCTAssertNil(GrantVerifier(publicKeyBase64URL: "too-short"))
    }

    func testFilterRulesRoundTripThroughVendorConfiguration() {
        let rules = FilterRules(domains: ["x.com", "a.com"], sessionId: "s", userId: "u", grants: [NodeFixture.grant])
        XCTAssertEqual(FilterRules(vendorConfiguration: rules.vendorConfiguration), rules)
        XCTAssertEqual(rules.domains, ["a.com", "x.com"])
        XCTAssertEqual(FilterRules(vendorConfiguration: nil), .none)
        // A configuration from before grants existed still reads its domains.
        XCTAssertEqual(FilterRules(vendorConfiguration: ["blockedDomains": ["x.com"]]).domains, ["x.com"])
    }
}

final class UnlockTrackerTests: XCTestCase {
    private let verifier = GrantVerifier(publicKeyBase64URL: NodeFixture.publicKey)!
    private let rules = FilterRules(domains: ["x.com"], sessionId: "s-fixture", userId: "u-fixture",
                                    grants: [NodeFixture.grant])
    private let oneMinuteIn = NodeFixture.issuedAt.addingTimeInterval(60)

    func testUnlocksDuringTheGrantAndRelocksAtExpiry() {
        let tracker = UnlockTracker()
        XCTAssertNotNil(tracker.unlockingGrant(rules: rules, verifier: verifier, now: oneMinuteIn, uptime: 1000))
        XCTAssertNotNil(tracker.unlockingGrant(rules: rules, verifier: verifier,
                                               now: NodeFixture.expiresAt.addingTimeInterval(-1), uptime: 1239))
        XCTAssertNil(tracker.unlockingGrant(rules: rules, verifier: verifier,
                                            now: NodeFixture.expiresAt, uptime: 1240))
    }

    func testSettingTheClockBackDoesNotExtendAGrant() {
        let tracker = UnlockTracker()
        XCTAssertNotNil(tracker.unlockingGrant(rules: rules, verifier: verifier, now: oneMinuteIn, uptime: 1000))
        // Four real minutes later (uptime +240 s) the wall clock has been set back to the start.
        XCTAssertNil(tracker.unlockingGrant(rules: rules, verifier: verifier, now: oneMinuteIn, uptime: 1240))
    }

    func testRejectsGrantsForAnotherSessionOrUserOrWithoutAKey() {
        let tracker = UnlockTracker()
        var otherSession = rules
        otherSession.sessionId = "s-other"
        XCTAssertNil(tracker.unlockingGrant(rules: otherSession, verifier: verifier, now: oneMinuteIn, uptime: 0))
        var otherUser = rules
        otherUser.userId = "u-other"
        XCTAssertNil(tracker.unlockingGrant(rules: otherUser, verifier: verifier, now: oneMinuteIn, uptime: 0))
        XCTAssertNil(tracker.unlockingGrant(rules: rules, verifier: nil, now: oneMinuteIn, uptime: 0))
    }

    func testRejectsAGrantWhenTheClockIsFarBeforeItWasIssued() {
        let tracker = UnlockTracker()
        let longBefore = NodeFixture.issuedAt.addingTimeInterval(-UnlockTracker.allowedSkew - 1)
        XCTAssertNil(tracker.unlockingGrant(rules: rules, verifier: verifier, now: longBefore, uptime: 0))
    }
}

final class FilterRulesFromStateTests: XCTestCase {
    private func sessionDelta(_ id: String, status: String, seq: Int) throws -> SyncDelta {
        let object: [String: Any] = [
            "collection": "focusSessions", "stream": "focusSessions|owner:u1", "id": id, "seq": seq,
            "method": "update",
            "data": ["_id": id, "status": status, "blockedDomains": ["x.com"], "startedAt": "2026-10-04T12:00:00.000Z"],
        ]
        return try JSONDecoder().decode(SyncDelta.self, from: JSONSerialization.data(withJSONObject: object))
    }

    func testRulesFollowTheGivenStateNotAPreviousOne() throws {
        let user = try JSONDecoder().decode(CurrentUser.self, from: Data(#"{"_id":"u1","email":"a@b.c"}"#.utf8))
        var state = SyncState()
        XCTAssertEqual(SessionStore.filterRules(state: state, user: user), .none)
        state.apply(try sessionDelta("s1", status: "active", seq: 1))
        let active = SessionStore.filterRules(state: state, user: user)
        XCTAssertEqual(active.domains, ["x.com"])
        XCTAssertEqual(active.sessionId, "s1")
        XCTAssertEqual(active.userId, "u1")
        state.apply(try sessionDelta("s1", status: "ended", seq: 2))
        XCTAssertEqual(SessionStore.filterRules(state: state, user: user), .none)
        XCTAssertEqual(SessionStore.filterRules(state: state, user: nil), .none)
    }
}

final class CachingGrantVerifierTests: XCTestCase {
    func testReturnsTheSameResultAsTheVerifier() {
        let verifier = GrantVerifier(publicKeyBase64URL: NodeFixture.publicKey)!
        let caching = CachingGrantVerifier(verifier)
        XCTAssertEqual(caching.verify(NodeFixture.grant), verifier.verify(NodeFixture.grant))
        XCTAssertEqual(caching.verify(NodeFixture.grant)?.grantId, "g-fixture")
        let bad = SignedGrant(payload: NodeFixture.grant.payload, signature: "AAAA")
        XCTAssertNil(caching.verify(bad))
        XCTAssertNil(caching.verify(bad))
    }

    func testAFreshTrackerRejectsAnAlreadyExpiredGrant() {
        let verifier = GrantVerifier(publicKeyBase64URL: NodeFixture.publicKey)!
        let rules = FilterRules(domains: ["x.com"], sessionId: "s-fixture", userId: "u-fixture", grants: [NodeFixture.grant])
        XCTAssertNil(UnlockTracker().unlockingGrant(rules: rules, verifier: verifier,
                                                    now: NodeFixture.expiresAt.addingTimeInterval(1), uptime: 0))
    }
}

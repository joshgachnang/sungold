import XCTest
@testable import Sungold

final class SyncStateTests: XCTestCase {
    private let sessionStream = "focusSessions|owner:u1"
    private let grantStream = "unlockGrants|owner:u1"

    private func json(_ object: [String: Any]) -> Data {
        try! JSONSerialization.data(withJSONObject: object)
    }

    private func session(_ id: String, status: String, domains: [String] = ["x.com"]) -> Data {
        json(["_id": id, "status": status, "blockedDomains": domains,
              "startedAt": "2026-09-26T18:28:23.402Z", "ownerId": "u1", "_syncSeq": 1])
    }

    private func delta(_ id: String, seq: Int, status: String, frontier: Int? = nil, method: String = "update") -> SyncDelta {
        var object: [String: Any] = ["collection": "focusSessions", "stream": sessionStream, "id": id, "seq": seq,
                                     "method": method]
        if method != "delete" {
            object["data"] = try! JSONSerialization.jsonObject(with: session(id, status: status))
        }
        if let frontier { object["frontierSeq"] = frontier }
        return try! JSONDecoder().decode(SyncDelta.self, from: json(object))
    }

    func testAppliesCreateThenUpdate() {
        var state = SyncState()
        state.apply(delta("s1", seq: 5, status: "active", method: "create"))
        XCTAssertEqual(state.activeSession?.id, "s1")
        XCTAssertEqual(state.cursor(for: sessionStream), 5)
        state.apply(delta("s1", seq: 6, status: "ended"))
        XCTAssertNil(state.activeSession)
        XCTAssertEqual(state.cursor(for: sessionStream), 6)
    }

    func testIgnoresStaleOrReplayedSeq() {
        var state = SyncState()
        state.apply(delta("s1", seq: 6, status: "ended"))
        state.apply(delta("s1", seq: 5, status: "active"))
        XCTAssertNil(state.activeSession)
        XCTAssertFalse(state.applyEntity(collection: "focusSessions", id: "s1", seq: 6, deleted: false,
                                         data: session("s1", status: "active")))
    }

    func testLegacySeqZeroRowsAlwaysApply() {
        var state = SyncState()
        XCTAssertTrue(state.applyEntity(collection: "focusSessions", id: "s1", seq: 0, deleted: false,
                                        data: session("s1", status: "ended")))
        XCTAssertTrue(state.applyEntity(collection: "focusSessions", id: "s1", seq: 0, deleted: false,
                                        data: session("s1", status: "active")))
        XCTAssertEqual(state.activeSession?.id, "s1")
    }

    func testDeltaCursorNeverPassesTheFrontier() {
        var state = SyncState()
        state.apply(delta("s1", seq: 10, status: "active", frontier: 8))
        XCTAssertEqual(state.cursor(for: sessionStream), 8)
        XCTAssertEqual(state.activeSession?.id, "s1")
    }

    func testDeleteRemovesEntity() {
        var state = SyncState()
        state.apply(delta("s1", seq: 1, status: "active", method: "create"))
        state.apply(delta("s1", seq: 2, status: "", method: "delete"))
        XCTAssertNil(state.activeSession)
        XCTAssertTrue(state.sessions.isEmpty)
    }

    func testPurgeClearsOnlyThatCollection() {
        var state = SyncState()
        state.apply(delta("s1", seq: 3, status: "active", method: "create"))
        state.applyEntity(collection: "unlockGrants", id: "g1", seq: 1, deleted: false,
                          data: json(["_id": "g1", "sessionId": "s1", "expiresAt": "2026-09-26T18:35:00.000Z",
                                      "payload": "p", "signature": "s"]))
        state.purge(collection: "focusSessions", stream: sessionStream)
        XCTAssertTrue(state.sessions.isEmpty)
        XCTAssertEqual(state.cursor(for: sessionStream), 0)
        XCTAssertEqual(state.grants.count, 1)
        // A purged entity can be applied again at the same seq.
        XCTAssertTrue(state.applyEntity(collection: "focusSessions", id: "s1", seq: 3, deleted: false,
                                        data: session("s1", status: "active")))
    }

    func testUnexpiredGrantsFiltersBySessionAndExpiry() {
        var state = SyncState()
        let now = SungoldJSON.parseDate("2026-09-26T18:30:00.000Z")!
        let grants: [(String, String, String)] = [
            ("g1", "s1", "2026-09-26T18:35:00.000Z"),
            ("g2", "s1", "2026-09-26T18:29:00.000Z"),
            ("g3", "s2", "2026-09-26T18:40:00.000Z"),
        ]
        for (index, grant) in grants.enumerated() {
            state.applyEntity(collection: "unlockGrants", id: grant.0, seq: index + 1, deleted: false,
                              data: json(["_id": grant.0, "sessionId": grant.1, "expiresAt": grant.2,
                                          "payload": "p", "signature": "s"]))
        }
        XCTAssertEqual(state.unexpiredGrants(for: "s1", now: now).map(\.id), ["g1"])
    }

    func testDecodesServerSnapshotAndDeltaShapes() throws {
        let page = """
        {"cursor":4,"entities":[{"data":{"_id":"s1","blockedDomains":["youtube.com"],"ownerId":"u1",\
        "startedAt":"2026-09-26T17:31:41.937Z","status":"active","_syncSeq":2},"deleted":false,"id":"s1","seq":2}],\
        "frontierSeq":4,"hasMore":false,"oldestRetainedSeq":0,"stream":"focusSessions|owner:u1"}
        """
        let decoded = try JSONDecoder().decode(SnapshotPage.self, from: Data(page.utf8))
        XCTAssertEqual(decoded.cursor, 4)
        XCTAssertEqual(decoded.frontierSeq, 4)
        XCTAssertEqual(decoded.oldestRetainedSeq, 0)
        XCTAssertNil(decoded.legacyCursor)
        var state = SyncState()
        let entity = decoded.entities[0]
        state.applyEntity(collection: "focusSessions", id: entity.id, seq: entity.seq,
                          deleted: entity.deleted, data: entity.data?.data)
        XCTAssertEqual(state.activeSession?.blockedDomains, ["youtube.com"])

        let raw = """
        {"collection":"unlockGrants","frontierSeq":82,"id":"g1","method":"create","seq":82,\
        "stream":"unlockGrants|owner:u1","data":{"_id":"g1","expiresAt":"2026-09-26T18:29:23.424Z",\
        "issuedAt":"2026-09-26T18:28:23.424Z","payload":"eyJ2IjoxfQ","reason":"peek","sessionId":"s1","signature":"c2ln"}}
        """
        state.apply(try JSONDecoder().decode(SyncDelta.self, from: Data(raw.utf8)))
        XCTAssertEqual(state.grants["g1"]?.sessionId, "s1")
        XCTAssertEqual(state.cursor(for: grantStream), 82)
    }
}

@MainActor
final class SnapshotPagerTests: XCTestCase {
    private func page(cursor: Int, hasMore: Bool, frontier: Int? = nil, oldest: Int? = 0,
                      legacy: String? = nil, ids: [String] = []) -> SnapshotPage {
        var object: [String: Any] = ["cursor": cursor, "hasMore": hasMore,
                                     "entities": ids.map { ["id": $0, "seq": 1, "deleted": false, "data": NSNull()] }]
        object["frontierSeq"] = frontier ?? cursor
        if let oldest { object["oldestRetainedSeq"] = oldest }
        if let legacy { object["legacyCursor"] = legacy }
        return try! JSONDecoder().decode(SnapshotPage.self, from: JSONSerialization.data(withJSONObject: object))
    }

    /// Runs a pager against scripted pages keyed by "cursor|legacy" and records what it did.
    private func run(start: Int, pages: [String: SnapshotPage], current: Bool = true) async throws
        -> (requests: [String], cursor: Int, purged: Int, applied: [String]) {
        var cursor = start
        var requests: [String] = []
        var purged = 0
        var applied: [String] = []
        let pager = SnapshotPager(
            fetch: { requestCursor, legacy in
                let key = "\(requestCursor)|\(legacy ?? "-")"
                requests.append(key)
                guard let page = pages[key] else { throw URLError(.badServerResponse) }
                return page
            },
            currentCursor: { cursor },
            applyPage: { page, advanceTo in
                applied += page.entities.map(\.id)
                if let advanceTo { cursor = advanceTo }
            },
            purge: { purged += 1; cursor = 0 },
            isCurrent: { current })
        try await pager.run()
        return (requests, cursor, purged, applied)
    }

    func testPagesUntilTheServerHasNoMore() async throws {
        let result = try await run(start: 0, pages: [
            "0|-": page(cursor: 5, hasMore: true, ids: ["a"]),
            "5|-": page(cursor: 9, hasMore: false, ids: ["b"]),
        ])
        XCTAssertEqual(result.requests, ["0|-", "5|-"])
        XCTAssertEqual(result.cursor, 9)
        XCTAssertEqual(result.applied, ["a", "b"])
    }

    func testNeverAdvancesPastTheFrontierAndStopsWithoutProgress() async throws {
        let result = try await run(start: 0, pages: [
            "0|-": page(cursor: 10, hasMore: true, frontier: 6),
            "6|-": page(cursor: 10, hasMore: true, frontier: 6),
        ])
        XCTAssertEqual(result.requests, ["0|-", "6|-"])
        XCTAssertEqual(result.cursor, 6)
    }

    func testEchoesLegacyCursorBeforeSeqPaging() async throws {
        let result = try await run(start: 0, pages: [
            "0|-": page(cursor: 0, hasMore: true, legacy: "L1", ids: ["old1"]),
            "0|L1": page(cursor: 0, hasMore: true, legacy: "L2", ids: ["old2"]),
            "0|L2": page(cursor: 3, hasMore: false, ids: ["new"]),
        ])
        XCTAssertEqual(result.requests, ["0|-", "0|L1", "0|L2"])
        XCTAssertEqual(result.applied, ["old1", "old2", "new"])
        XCTAssertEqual(result.cursor, 3)
    }

    func testStopsWhenLegacyCursorRepeats() async throws {
        let result = try await run(start: 0, pages: [
            "0|-": page(cursor: 0, hasMore: true, legacy: "L1"),
            "0|L1": page(cursor: 0, hasMore: true, legacy: "L1"),
        ])
        XCTAssertEqual(result.requests, ["0|-", "0|L1"])
    }

    func testRestartsFromZeroOnceWhenBelowRetainedFloor() async throws {
        let result = try await run(start: 4, pages: [
            "4|-": page(cursor: 20, hasMore: false, oldest: 10),
            "0|-": page(cursor: 20, hasMore: false, oldest: 10, ids: ["fresh"]),
        ])
        XCTAssertEqual(result.requests, ["4|-", "0|-"])
        XCTAssertEqual(result.purged, 1)
        XCTAssertEqual(result.cursor, 20)
        XCTAssertEqual(result.applied, ["fresh"])
    }

    func testStopsWithoutApplyingOnceSuperseded() async {
        do {
            _ = try await run(start: 0, pages: ["0|-": page(cursor: 5, hasMore: false, ids: ["a"])], current: false)
            XCTFail("expected Superseded")
        } catch {
            XCTAssertTrue(error is SnapshotPager.Superseded)
        }
    }
}

final class EngineIOTests: XCTestCase {
    func testParsesFramesTheServerSends() {
        XCTAssertEqual(EngineIOPacket.parse("2"), .ping)
        XCTAssertEqual(EngineIOPacket.parse("40{\"sid\":\"abc\"}"), .socketConnected)
        XCTAssertEqual(EngineIOPacket.parse("41"), .socketDisconnected)
        guard case .open(let open) = EngineIOPacket.parse("0{\"sid\":\"x\",\"pingInterval\":25000,\"pingTimeout\":20000}") else {
            return XCTFail("expected open")
        }
        let heartbeat = EngineIOPacket.heartbeat(fromOpen: open)
        XCTAssertEqual(heartbeat?.interval, 25)
        XCTAssertEqual(heartbeat?.timeout, 20)
        if case .socketConnectError(let body) = EngineIOPacket.parse("44{\"message\":\"unauthorized\"}") {
            XCTAssertTrue(body.contains("unauthorized"))
        } else {
            XCTFail("expected connect error")
        }
        guard case .socketEvent(let name, let payload) = EngineIOPacket.parse(
            "42[\"sync:delta\",{\"collection\":\"focusSessions\",\"seq\":3}]") else {
            return XCTFail("expected event")
        }
        XCTAssertEqual(name, "sync:delta")
        let object = try? JSONSerialization.jsonObject(with: payload ?? Data()) as? [String: Any]
        XCTAssertEqual(object?["seq"] as? Int, 3)
    }

    func testBuildsFramesTheServerExpects() {
        XCTAssertEqual(EngineIOPacket.connectFrame(token: "t1"), "40{\"token\":\"Bearer t1\"}")
        let frame = EngineIOPacket.eventFrame(name: "sync:subscribe", payload: ["collections": ["focusSessions"]])
        XCTAssertEqual(frame, "42[\"sync:subscribe\",{\"collections\":[\"focusSessions\"]}]")
        XCTAssertEqual(EngineIOPacket.pongFrame, "3")
    }
}

final class ReconnectDelayTests: XCTestCase {
    @MainActor func testDoublesFromOneSecondAndCapsAtThirty() {
        XCTAssertEqual((1...7).map(SessionStore.reconnectDelay(attempt:)), [1, 2, 4, 8, 16, 30, 30])
    }
}

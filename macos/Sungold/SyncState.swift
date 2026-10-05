import Foundation

/// Local copy of the user's synced sessions and grants, built from snapshot pages and
/// socket deltas. Mirrors @terreno/syncdb: entities are guarded by their own seq, and a
/// stream's cursor only moves forward and never past the server's committed frontier.
struct SyncState: Equatable {
    static let sessionCollection = "focusSessions"
    static let grantCollection = "unlockGrants"

    private(set) var sessions: [String: FocusSession] = [:]
    private(set) var grants: [String: UnlockGrant] = [:]
    private(set) var cursors: [String: Int] = [:]
    private var entitySeq: [String: Int] = [:]

    var activeSession: FocusSession? {
        sessions.values.filter(\.isActive)
            .sorted { ($0.startedAt ?? .distantPast) > ($1.startedAt ?? .distantPast) }.first
    }

    /// Grants for a session whose expiry is still ahead of `now`, latest first.
    /// Display only: enforcement must verify the signature first (a later task).
    func unexpiredGrants(for sessionId: String, now: Date) -> [UnlockGrant] {
        grants.values
            .filter { $0.sessionId == sessionId && $0.expiresAt > now }
            .sorted { $0.expiresAt > $1.expiresAt }
    }

    func cursor(for stream: String) -> Int { cursors[stream] ?? 0 }

    /// Applies one entity. Returns false when it was a stale or duplicate write.
    /// Seq 0 marks legacy (unstamped) rows, which always apply.
    @discardableResult
    mutating func applyEntity(collection: String, id: String, seq: Int, deleted: Bool, data: Data?) -> Bool {
        let key = "\(collection)/\(id)"
        if seq > 0, let known = entitySeq[key], seq <= known {
            return false
        }
        entitySeq[key] = seq
        let decoder = SungoldJSON.decoder()
        switch collection {
        case Self.sessionCollection:
            sessions[id] = deleted ? nil : data.flatMap { try? decoder.decode(FocusSession.self, from: $0) }
        case Self.grantCollection:
            grants[id] = deleted ? nil : data.flatMap { try? decoder.decode(UnlockGrant.self, from: $0) }
        default:
            return false
        }
        return true
    }

    /// Moves a stream's cursor forward; never backwards.
    mutating func advanceCursor(stream: String, to seq: Int) {
        cursors[stream] = max(cursors[stream] ?? 0, seq)
    }

    /// Applies a socket delta. The cursor moves to min(seq, frontierSeq) so a reconnect never
    /// skips a seq the server had not committed yet.
    @discardableResult
    mutating func apply(_ delta: SyncDelta) -> Bool {
        let applied = applyEntity(collection: delta.collection, id: delta.id, seq: delta.seq,
                    deleted: delta.method == "delete" || delta.deleted == true, data: delta.data?.data)
        advanceCursor(stream: delta.stream, to: min(delta.seq, delta.frontierSeq ?? delta.seq))
        return applied
    }

    /// Drops everything for a stream so it can be re-bootstrapped from 0 (retention gap).
    mutating func purge(collection: String, stream: String) {
        switch collection {
        case Self.sessionCollection: sessions = [:]
        case Self.grantCollection: grants = [:]
        default: break
        }
        entitySeq = entitySeq.filter { !$0.key.hasPrefix("\(collection)/") }
        cursors[stream] = nil
    }
}

/// One page of GET /sync/snapshot.
struct SnapshotPage: Decodable {
    struct Entity: Decodable {
        let id: String
        let seq: Int
        let deleted: Bool
        let data: RawJSON?
    }
    let entities: [Entity]
    let cursor: Int
    let hasMore: Bool
    /// Highest committed seq; the cursor must not advance past it.
    let frontierSeq: Int?
    /// Tombstones below this were compacted; a cursor under it must re-bootstrap from 0.
    let oldestRetainedSeq: Int?
    /// Present while the server drains legacy seq-0 rows; echo it back until it stops.
    let legacyCursor: String?
}

/// A sync:delta socket event.
struct SyncDelta: Decodable {
    let collection: String
    let stream: String
    let id: String
    let seq: Int
    let method: String
    let data: RawJSON?
    var deleted: Bool? = nil
    var frontierSeq: Int? = nil
}

/// Keeps an arbitrary JSON value as bytes so it can be decoded later into the right type.
struct RawJSON: Decodable, Equatable {
    let data: Data

    init(from decoder: Decoder) throws {
        let value = try decoder.singleValueContainer().decode(JSONValue.self)
        data = try JSONSerialization.data(withJSONObject: value.foundation, options: [.fragmentsAllowed])
    }
}

private enum JSONValue: Decodable {
    case null, bool(Bool), number(Double), string(String), array([JSONValue]), object([String: JSONValue])

    init(from decoder: Decoder) throws {
        let container = try decoder.singleValueContainer()
        if container.decodeNil() { self = .null }
        else if let value = try? container.decode(Bool.self) { self = .bool(value) }
        else if let value = try? container.decode(Double.self) { self = .number(value) }
        else if let value = try? container.decode(String.self) { self = .string(value) }
        else if let value = try? container.decode([JSONValue].self) { self = .array(value) }
        else { self = .object(try container.decode([String: JSONValue].self)) }
    }

    var foundation: Any {
        switch self {
        case .null: return NSNull()
        case .bool(let value): return value
        case .number(let value): return value
        case .string(let value): return value
        case .array(let values): return values.map(\.foundation)
        case .object(let values): return values.mapValues(\.foundation)
        }
    }
}

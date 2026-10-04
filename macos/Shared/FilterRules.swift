import Foundation

/// What the app hands the filter: the active session's domains and the grants issued for it.
/// The filter verifies grants itself, so relocking needs neither the app nor the network.
struct FilterRules: Equatable {
    var domains: [String]
    var sessionId: String?
    var userId: String?
    var grants: [SignedGrant]

    static let none = FilterRules(domains: [], sessionId: nil, userId: nil, grants: [])

    private enum Key {
        static let domains = FilterConfigurationKey.blockedDomains
        static let sessionId = "sessionId"
        static let userId = "userId"
        static let grants = "grants"
    }

    var vendorConfiguration: [String: Any] {
        var configuration: [String: Any] = [
            Key.domains: domains,
            Key.grants: grants.map { ["payload": $0.payload, "signature": $0.signature] },
        ]
        configuration[Key.sessionId] = sessionId
        configuration[Key.userId] = userId
        return configuration
    }

    init(domains: [String], sessionId: String?, userId: String?, grants: [SignedGrant]) {
        self.domains = domains.sorted()
        self.sessionId = sessionId
        self.userId = userId
        self.grants = grants.sorted { $0.payload < $1.payload }
    }

    init(vendorConfiguration: [String: Any]?) {
        let grants = (vendorConfiguration?[Key.grants] as? [[String: String]] ?? []).compactMap { entry in
            entry["payload"].flatMap { payload in entry["signature"].map { SignedGrant(payload: payload, signature: $0) } }
        }
        self.init(domains: vendorConfiguration?[Key.domains] as? [String] ?? [],
                  sessionId: vendorConfiguration?[Key.sessionId] as? String,
                  userId: vendorConfiguration?[Key.userId] as? String,
                  grants: grants)
    }
}

/// Decides whether a verified grant currently lifts the block.
///
/// Wall-clock time alone could be extended by setting the clock back, so each grant's
/// remaining time is also measured on the monotonic uptime clock from the moment this
/// process first saw it: the grant ends at whichever deadline comes first. (After a reboot
/// the uptime baseline restarts; see the architecture doc.)
final class UnlockTracker {
    /// Tolerated clock difference between this Mac and the server when a grant arrives.
    static let allowedSkew: TimeInterval = 5 * 60

    private struct Sighting {
        let uptime: TimeInterval
        let remaining: TimeInterval
    }

    private var sightings: [String: Sighting] = [:]
    private let lock = NSLock()

    func unlockingGrant(rules: FilterRules, verifier: GrantVerifier?, now: Date,
                        uptime: TimeInterval) -> GrantPayload? {
        guard let verifier, let sessionId = rules.sessionId, let userId = rules.userId else { return nil }
        lock.lock()
        defer { lock.unlock() }
        for grant in rules.grants {
            guard let payload = verifier.verify(grant),
                payload.sessionId == sessionId, payload.userId == userId,
                now < payload.expiresAt,
                now >= payload.issuedAt.addingTimeInterval(-Self.allowedSkew)
            else { continue }
            let sighting = sightings[payload.grantId]
                ?? Sighting(uptime: uptime, remaining: payload.expiresAt.timeIntervalSince(now))
            sightings[payload.grantId] = sighting
            if uptime - sighting.uptime < sighting.remaining {
                return payload
            }
        }
        return nil
    }
}

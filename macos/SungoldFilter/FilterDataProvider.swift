import Foundation
import NetworkExtension
import os
import Security

/// Drops connections to the active session's blocked domains unless a verified, unexpired
/// unlock grant for that session is present. The app writes the rules into the filter's
/// vendor configuration; grants are checked here against the pinned key, so a peek ends at
/// its expiry even if the app has quit or the Mac is offline.
final class FilterDataProvider: NEFilterDataProvider {
    private let logger = Logger(subsystem: "app.sungold.mac.filter", category: "filter")
    private let verifier = GrantVerifier.pinned()
    private let tracker = UnlockTracker()

    override func startFilter(completionHandler: @escaping (Error?) -> Void) {
        // Inspect every flow; the verdict below decides per connection.
        let settings = NEFilterSettings(rules: [], defaultAction: .filterData)
        apply(settings) { [logger] error in
            if let error {
                logger.error("apply settings failed: \(error.localizedDescription, privacy: .public)")
            } else {
                logger.info("filter started")
            }
            completionHandler(error)
        }
    }

    override func stopFilter(with reason: NEProviderStopReason, completionHandler: @escaping () -> Void) {
        logger.info("filter stopped: \(reason.rawValue)")
        completionHandler()
    }

    /// The domains to block right now: none while a verified grant is in effect.
    private var activeMatcher: DomainMatcher {
        let rules = FilterRules(vendorConfiguration: filterConfiguration.vendorConfiguration)
        if rules.domains.isEmpty { return DomainMatcher(domains: []) }
        if tracker.unlockingGrant(rules: rules, verifier: verifier, now: Date(),
                                  uptime: ProcessInfo.processInfo.systemUptime) != nil {
            return DomainMatcher(domains: [])
        }
        return DomainMatcher(domains: rules.domains)
    }

    /// The system DNS service. Its flows are long-lived sockets that carry lookups for many
    /// names; dropping one keeps it dropped for the socket's lifetime, so lookups would keep
    /// failing after a peek unlocks or a session ends. Blocking happens on the connection to
    /// the site instead, so DNS itself is never filtered.
    static let dnsServiceIdentifier = "com.apple.mDNSResponder"

    /// Signing identifier of the process that opened a flow, from its audit token.
    static func signingIdentifier(of flow: NEFilterFlow) -> String? {
        guard let token = flow.sourceAppAuditToken else { return nil }
        var code: SecCode?
        let attributes = [kSecGuestAttributeAudit: token] as CFDictionary
        guard SecCodeCopyGuestWithAttributes(nil, attributes, [], &code) == errSecSuccess, let code else { return nil }
        var staticCode: SecStaticCode?
        guard SecCodeCopyStaticCode(code, [], &staticCode) == errSecSuccess, let staticCode else { return nil }
        var info: CFDictionary?
        guard SecCodeCopySigningInformation(staticCode, [], &info) == errSecSuccess,
            let dictionary = info as? [String: Any]
        else { return nil }
        return dictionary[kSecCodeInfoIdentifier as String] as? String
    }

    override func handleNewFlow(_ flow: NEFilterFlow) -> NEFilterNewFlowVerdict {
        let matcher = activeMatcher
        guard !matcher.domains.isEmpty, let socketFlow = flow as? NEFilterSocketFlow else {
            return .allow()
        }
        for host in [socketFlow.remoteHostname, flow.url?.host].compactMap({ $0 }) where matcher.blocks(host: host) {
            // Looked up only for flows that would be blocked, to keep normal traffic cheap.
            if Self.signingIdentifier(of: flow) == Self.dnsServiceIdentifier {
                return .allow()
            }
            logger.info("blocked \(host, privacy: .public)")
            return .drop()
        }
        // Apps that resolve DNS themselves connect by IP; read the TLS server name or HTTP
        // Host header from the first outbound bytes instead.
        guard socketFlow.socketType == SOCK_STREAM else { return .allow() }
        return .filterDataVerdict(withFilterInbound: false, peekInboundBytes: 0,
                                  filterOutbound: true, peekOutboundBytes: 2048)
    }

    override func handleOutboundData(from flow: NEFilterFlow, readBytesStartOffset offset: Int,
                                     readBytes: Data) -> NEFilterDataVerdict {
        if let host = TLSClientHello.serverName(in: readBytes) ?? Self.httpHost(in: readBytes),
           activeMatcher.blocks(host: host) {
            logger.info("blocked \(host, privacy: .public) (from connection data)")
            return .drop()
        }
        return .allow()
    }

    /// Host header of a plain HTTP request, if the bytes start one.
    static func httpHost(in data: Data) -> String? {
        guard let text = String(data: data.prefix(2048), encoding: .ascii) else { return nil }
        for line in text.split(separator: "\r\n") where line.lowercased().hasPrefix("host:") {
            let value = line.dropFirst(5).trimmingCharacters(in: .whitespaces)
            return value.split(separator: ":").first.map(String.init)
        }
        return nil
    }
}

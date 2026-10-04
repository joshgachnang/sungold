import Foundation
import NetworkExtension
import os

/// Drops connections to the active session's blocked domains. The app writes the list into
/// the filter's vendor configuration; the system keeps it when the app quits, so a block
/// stays in force until the app (or a later grant) changes it.
final class FilterDataProvider: NEFilterDataProvider {
    private let logger = Logger(subsystem: "app.sungold.mac.filter", category: "filter")

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

    private var matcher: DomainMatcher {
        let domains = filterConfiguration.vendorConfiguration?[FilterConfigurationKey.blockedDomains] as? [String]
        return DomainMatcher(domains: domains ?? [])
    }

    override func handleNewFlow(_ flow: NEFilterFlow) -> NEFilterNewFlowVerdict {
        let matcher = self.matcher
        guard !matcher.domains.isEmpty, let socketFlow = flow as? NEFilterSocketFlow else {
            return .allow()
        }
        for host in [socketFlow.remoteHostname, flow.url?.host].compactMap({ $0 }) where matcher.blocks(host: host) {
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
           matcher.blocks(host: host) {
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

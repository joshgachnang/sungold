import Foundation

/// Decides whether a hostname falls under any blocked domain. `youtube.com` blocks
/// `youtube.com` and every subdomain (`m.youtube.com`), but not `notyoutube.com`.
/// Shared by the app and the filter extension.
struct DomainMatcher: Equatable {
    let domains: [String]

    init(domains: [String]) {
        self.domains = domains.map(DomainMatcher.normalize).filter { !$0.isEmpty }
    }

    static func normalize(_ host: String) -> String {
        var value = host.lowercased().trimmingCharacters(in: .whitespaces)
        while value.hasSuffix(".") { value.removeLast() }
        return value
    }

    func blocks(host: String) -> Bool {
        let host = Self.normalize(host)
        guard !host.isEmpty else { return false }
        return domains.contains { host == $0 || host.hasSuffix("." + $0) }
    }
}

/// Keys the app and the filter use in the filter's vendor configuration.
enum FilterConfigurationKey {
    static let blockedDomains = "blockedDomains"
}

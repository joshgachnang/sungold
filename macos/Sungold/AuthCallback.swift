import Foundation

/// Parses the browser handoff callback: sungold-mac://auth?state=<state>&token=<token>.
enum AuthCallback {
    static let scheme = "sungold-mac"
    static let host = "auth"

    enum ParseError: Error, Equatable {
        case wrongDestination
        case stateMismatch
        case missingToken
    }

    static func token(from url: URL, expectedState: String) throws -> String {
        guard url.scheme == scheme, url.host == host, url.path.isEmpty || url.path == "/" else {
            throw ParseError.wrongDestination
        }
        let items = URLComponents(url: url, resolvingAgainstBaseURL: false)?.queryItems ?? []
        let value = { (name: String) in items.first(where: { $0.name == name })?.value }
        // The state ties the callback to the sign-in this app started; reject anything else,
        // including a token planted by another app that registered the same scheme.
        guard value("state") == expectedState else {
            throw ParseError.stateMismatch
        }
        guard let token = value("token"), !token.isEmpty else {
            throw ParseError.missingToken
        }
        return token
    }

    /// The web page that runs the handoff, e.g. https://app.sungoldapp.com/device-login?...
    static func signInURL(webURL: URL, state: String, deviceName: String) -> URL {
        var components = URLComponents(
            url: webURL.appendingPathComponent("device-login"), resolvingAgainstBaseURL: false)!
        components.queryItems = [
            URLQueryItem(name: "client", value: "mac"),
            URLQueryItem(name: "redirect", value: "\(scheme)://\(host)"),
            URLQueryItem(name: "state", value: state),
            URLQueryItem(name: "name", value: deviceName),
        ]
        return components.url!
    }

    /// URL-safe random state, matching the backend's [A-Za-z0-9._~-]{1,256} rule.
    static func makeState() -> String {
        var bytes = [UInt8](repeating: 0, count: 24)
        _ = SecRandomCopyBytes(kSecRandomDefault, bytes.count, &bytes)
        return Data(bytes).base64EncodedString()
            .replacingOccurrences(of: "+", with: "-")
            .replacingOccurrences(of: "/", with: "_")
            .replacingOccurrences(of: "=", with: "")
    }
}

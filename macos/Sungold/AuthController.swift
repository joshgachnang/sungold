import AppKit
import AuthenticationServices

/// Runs the browser sign-in handoff in ASWebAuthenticationSession.
@MainActor
final class AuthController: NSObject, ASWebAuthenticationPresentationContextProviding {
    private var session: ASWebAuthenticationSession?

    func signIn(webURL: URL) async throws -> String {
        let state = AuthCallback.makeState()
        let deviceName = Host.current().localizedName ?? "Mac"
        let url = AuthCallback.signInURL(webURL: webURL, state: state, deviceName: deviceName)
        let callbackURL: URL = try await withCheckedThrowingContinuation { continuation in
            let session = ASWebAuthenticationSession(url: url, callbackURLScheme: AuthCallback.scheme) { url, error in
                if let url {
                    continuation.resume(returning: url)
                } else {
                    continuation.resume(throwing: error ?? ASWebAuthenticationSessionError(.canceledLogin))
                }
            }
            session.presentationContextProvider = self
            session.prefersEphemeralWebBrowserSession = false
            self.session = session
            session.start()
        }
        return try AuthCallback.token(from: callbackURL, expectedState: state)
    }

    nonisolated func presentationAnchor(for session: ASWebAuthenticationSession) -> ASPresentationAnchor {
        MainActor.assumeIsolated {
            NSApp.keyWindow ?? NSApp.windows.first ?? NSWindow()
        }
    }
}

import Combine
import SwiftUI

/// Owns the session store so syncing (and later, enforcement) starts at launch, not when
/// the menu is first opened: MenuBarExtra content is only built on demand.
final class AppDelegate: NSObject, NSApplicationDelegate {
    @MainActor let store = SessionStore()
    @MainActor let auth = AuthController()
    @MainActor let filter = FilterController()
    private var subscriptions: Set<AnyCancellable> = []

    func applicationDidFinishLaunching(_ notification: Notification) {
        // When the app is only hosting unit tests, do not sign in or open network connections.
        guard ProcessInfo.processInfo.environment["XCTestConfigurationFilePath"] == nil else { return }
        MainActor.assumeIsolated {
            // The filter blocks exactly the active session's domains; no session, no blocking.
            store.$state
                .map { $0.activeSession?.blockedDomains ?? [] }
                .removeDuplicates()
                .sink { [filter] domains in MainActor.assumeIsolated { filter.setBlockedDomains(domains) } }
                .store(in: &subscriptions)
            filter.refresh()
            store.resume()
        }
    }
}

@main
struct SungoldApp: App {
    @NSApplicationDelegateAdaptor(AppDelegate.self) private var appDelegate

    var body: some Scene {
        MenuBarExtra {
            MenuView(store: appDelegate.store, auth: appDelegate.auth, filter: appDelegate.filter)
        } label: {
            MenuBarIcon(store: appDelegate.store)
        }
        .menuBarExtraStyle(.window)
    }
}

struct MenuBarIcon: View {
    @ObservedObject var store: SessionStore

    var body: some View {
        Image(systemName: store.activeSession == nil ? "sun.max" : "sun.max.fill")
    }
}

struct MenuView: View {
    @ObservedObject var store: SessionStore
    let auth: AuthController
    @ObservedObject var filter: FilterController
    @State private var signInError: String?

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            switch store.status {
            case .signedOut:
                Text("Sungold").font(.headline)
                Button("Sign in…") { signIn() }
                if let signInError {
                    Text(signInError).font(.caption).foregroundStyle(.red)
                }
            default:
                if let user = store.user {
                    Text(user.email).font(.caption).foregroundStyle(.secondary)
                }
                SessionSummary(store: store)
                statusLine
                filterLine
                Divider()
                Button("Sign out") { store.signOut() }
            }
            Divider()
            Button("Quit Sungold") { NSApplication.shared.terminate(nil) }
        }
        .padding(12)
        .frame(width: 280)
    }

    @ViewBuilder private var statusLine: some View {
        switch store.status {
        case .live: Label("Live", systemImage: "circle.fill").font(.caption).foregroundStyle(.green)
        case .connecting: Label("Connecting…", systemImage: "circle.dotted").font(.caption)
        case .offline: Label("Offline — reconnecting", systemImage: "wifi.slash").font(.caption).foregroundStyle(.orange)
        case .signedOut: EmptyView()
        }
    }

    @ViewBuilder private var filterLine: some View {
        switch filter.status {
        case .enabled:
            Label("Website blocking on", systemImage: "checkmark.shield").font(.caption)
        case .waitingForApproval:
            VStack(alignment: .leading, spacing: 6) {
                Text("Turn on Sungold under Network Extensions to start blocking.")
                    .font(.caption).foregroundStyle(.orange)
                Button("Open Login Items & Extensions…") { FilterController.openApprovalSettings() }
            }
        case .notInstalled, .disabled:
            Button("Turn on website blocking…") { filter.install() }
        case .failed(let message):
            VStack(alignment: .leading) {
                Text("Blocking unavailable: \(message)").font(.caption).foregroundStyle(.red)
                Button("Try again") { filter.install() }
            }
        }
    }

    private func signIn() {
        signInError = nil
        Task {
            do {
                let token = try await auth.signIn(webURL: AppConfig.current.webURL)
                try store.signIn(token: token)
            } catch {
                signInError = "Sign-in did not complete."
            }
        }
    }
}

struct SessionSummary: View {
    @ObservedObject var store: SessionStore

    var body: some View {
        TimelineView(.periodic(from: .now, by: 1)) { context in
            if let session = store.activeSession {
                VStack(alignment: .leading, spacing: 4) {
                    Text("Focusing").font(.headline)
                    if let intention = session.intention {
                        Text(intention)
                    }
                    Text("Blocking: \(session.blockedDomains.joined(separator: ", "))")
                        .font(.caption).foregroundStyle(.secondary)
                    if let grant = store.state.unexpiredGrants(for: session.id, now: context.date).first {
                        Text("Peek ends in \(Self.remaining(until: grant.expiresAt, now: context.date))")
                            .font(.caption)
                    }
                }
            } else {
                Text("No focus session").foregroundStyle(.secondary)
            }
        }
    }

    static func remaining(until end: Date, now: Date) -> String {
        let seconds = max(0, Int(end.timeIntervalSince(now)))
        return String(format: "%d:%02d", seconds / 60, seconds % 60)
    }
}

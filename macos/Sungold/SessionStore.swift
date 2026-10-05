import Foundation
import os

/// Keeps the signed-in user's sessions and grants in sync with the backend:
/// snapshot catch-up for each stream, then live socket deltas, reconnecting with backoff.
@MainActor
final class SessionStore: ObservableObject {
    enum Status: Equatable {
        case signedOut
        case connecting
        case live
        case offline
    }

    static let collections = [SyncState.sessionCollection, SyncState.grantCollection]

    @Published private(set) var status: Status = .signedOut
    @Published private(set) var user: CurrentUser?
    @Published private(set) var state = SyncState()
    /// True once this sign-in has finished its first catch-up, i.e. `state` reflects the
    /// server. Until then the app does not know whether a session is active.
    @Published private(set) var hasSynced = false

    private let logger = Logger(subsystem: "app.sungold.mac", category: "sync")
    private let config: AppConfig
    private let tokenStore: TokenStore
    private var socket: SyncSocket?
    private var reconnectAttempt = 0
    /// Bumped on every start/stop; async work from an older generation must not touch state.
    private var generation = 0
    private var subscribedCollections: Set<String> = []

    init(config: AppConfig = .current, tokenStore: TokenStore = TokenStores.default) {
        self.config = config
        self.tokenStore = tokenStore
    }

    var activeSession: FocusSession? { state.activeSession }

    /// What the filter should enforce: the active session's domains and every grant synced
    /// for it. The filter verifies grants itself; unverifiable ones simply never unlock.
    var filterRules: FilterRules { Self.filterRules(state: state, user: user) }

    /// Pure form for subscribers: `@Published` emits before the property changes, so they
    /// must build rules from the emitted values rather than reading the store.
    nonisolated static func filterRules(state: SyncState, user: CurrentUser?) -> FilterRules {
        guard let session = state.activeSession, let user else { return .none }
        let grants = state.grants.values
            .filter { $0.sessionId == session.id }
            .map { SignedGrant(payload: $0.payload, signature: $0.signature) }
        return FilterRules(domains: session.blockedDomains, sessionId: session.id, userId: user.id, grants: grants)
    }

    /// Starts syncing with a stored token, if there is one.
    func resume() {
        #if DEBUG
        // Local verification hook: lets scripts start the app already signed in.
        if let devToken = ProcessInfo.processInfo.environment["SUNGOLD_DEV_TOKEN"], !devToken.isEmpty {
            try? tokenStore.save(devToken)
        }
        #endif
        if let token = tokenStore.load() {
            start(token: token)
        }
    }

    func signIn(token: String) throws {
        try tokenStore.save(token)
        logger.info("signed in through the browser handoff")
        state = SyncState()
        start(token: token)
    }

    func signOut() {
        let token = tokenStore.load()
        stop()
        tokenStore.delete()
        user = nil
        state = SyncState()
        status = .signedOut
        if let token {
            Task { await APIClient(baseURL: config.apiURL, token: token).signOut() }
        }
    }

    private func stop() {
        generation += 1
        hasSynced = false
        socket?.close()
        socket = nil
        subscribedCollections = []
    }

    private func isCurrent(_ myGeneration: Int) -> Bool { myGeneration == generation }

    private func start(token: String) {
        stop()
        let myGeneration = generation
        status = .connecting
        Task {
            let api = APIClient(baseURL: config.apiURL, token: token)
            do {
                let me = try await api.currentUser()
                guard isCurrent(myGeneration) else { return }
                user = me
                try await catchUp(api: api, userId: me.id, generation: myGeneration)
                guard isCurrent(myGeneration) else { return }
                hasSynced = true
                openSocket(token: token, api: api, userId: me.id, generation: myGeneration)
            } catch APIClient.APIError.unauthorized {
                guard isCurrent(myGeneration) else { return }
                await handleRejection(token: token, generation: myGeneration)
            } catch is SnapshotPager.Superseded {
                return
            } catch {
                guard isCurrent(myGeneration) else { return }
                logger.error("sync start failed: \(error.localizedDescription, privacy: .public)")
                status = .offline
                scheduleReconnect(token: token, generation: myGeneration)
            }
        }
    }

    private func catchUp(api: APIClient, userId: String, generation myGeneration: Int) async throws {
        for collection in Self.collections {
            let stream = "\(collection)|owner:\(userId)"
            let pager = SnapshotPager(
                fetch: { cursor, legacyCursor in
                    try await api.snapshot(collection: collection, stream: stream, cursor: cursor, legacyCursor: legacyCursor)
                },
                currentCursor: { [unowned self] in state.cursor(for: stream) },
                applyPage: { [unowned self] page, advanceTo in
                    let before = state.activeSession
                    for entity in page.entities {
                        let applied = state.applyEntity(collection: collection, id: entity.id, seq: entity.seq,
                                                        deleted: entity.deleted, data: entity.data?.data)
                        if applied { logIfGrant(collection: collection, id: entity.id, deleted: entity.deleted) }
                    }
                    if let advanceTo { state.advanceCursor(stream: stream, to: advanceTo) }
                    logSessionChange(from: before)
                },
                purge: { [unowned self] in state.purge(collection: collection, stream: stream) },
                isCurrent: { [unowned self] in isCurrent(myGeneration) })
            try await pager.run()
        }
    }

    private func openSocket(token: String, api: APIClient, userId: String, generation myGeneration: Int) {
        subscribedCollections = []
        let socket = SyncSocket(apiURL: config.apiURL, token: token, collections: Self.collections) { [weak self] event in
            guard let self, self.isCurrent(myGeneration) else { return }
            switch event {
            case .subscribed(let collection):
                subscribedCollections.insert(collection)
                guard subscribedCollections.isSuperset(of: Self.collections) else { return }
                reconnectAttempt = 0
                status = .live
                logger.info("sync live")
                // Deltas that landed between the snapshot and the subscription are caught here.
                Task { try? await self.catchUp(api: api, userId: userId, generation: myGeneration) }
            case .delta(let delta):
                let before = state.activeSession
                if state.apply(delta) {
                    logIfGrant(collection: delta.collection, id: delta.id, deleted: delta.method == "delete")
                }
                logSessionChange(from: before)
            case .resyncRequired:
                Task { try? await self.catchUp(api: api, userId: userId, generation: myGeneration) }
            case .disconnected(let unauthorized):
                if unauthorized {
                    Task { await self.handleRejection(token: token, generation: myGeneration) }
                    return
                }
                status = .offline
                logger.info("sync disconnected; reconnecting")
                scheduleReconnect(token: token, generation: myGeneration)
            }
        }
        self.socket = socket
        socket.connect()
    }

    /// Delays between re-checks of a rejected token before signing out.
    static let rejectionRecheckDelays: [TimeInterval] = [2, 3, 5]

    /// A 401 can be transient (a backend that is still starting up rejects valid sessions for
    /// a moment), and signing out deletes the device token. So re-check /auth/me a few times
    /// and sign out only if the token is still refused; otherwise reconnect.
    private func handleRejection(token: String, generation myGeneration: Int) async {
        let api = APIClient(baseURL: config.apiURL, token: token)
        for delay in Self.rejectionRecheckDelays {
            try? await Task.sleep(nanoseconds: UInt64(delay * 1_000_000_000))
            guard isCurrent(myGeneration) else { return }
            do {
                _ = try await api.currentUser()
                logger.info("token accepted on re-check; reconnecting")
                start(token: token)
                return
            } catch APIClient.APIError.unauthorized {
                continue
            } catch {
                // Offline or server error: not a rejection. Keep the token and retry later.
                status = .offline
                scheduleReconnect(token: token, generation: myGeneration)
                return
            }
        }
        guard isCurrent(myGeneration) else { return }
        logger.error("device token rejected; signing out")
        signOut()
    }

    /// Doubling backoff capped at 30 s: 1, 2, 4, 8, 16, 30, 30, ...
    static func reconnectDelay(attempt: Int) -> TimeInterval {
        min(30, pow(2, Double(max(0, attempt - 1))))
    }

    private func scheduleReconnect(token: String, generation myGeneration: Int) {
        reconnectAttempt += 1
        let delay = Self.reconnectDelay(attempt: reconnectAttempt)
        Task {
            try? await Task.sleep(nanoseconds: UInt64(delay * 1_000_000_000))
            guard isCurrent(myGeneration) else { return }
            start(token: token)
        }
    }

    private func logSessionChange(from before: FocusSession?) {
        let after = state.activeSession
        guard before != after else { return }
        if let after {
            logger.info("session active id=\(after.id, privacy: .public) domains=\(after.blockedDomains.joined(separator: ","), privacy: .public)")
        } else {
            logger.info("no active session")
        }
    }

    private func logIfGrant(collection: String, id: String, deleted: Bool) {
        if collection == SyncState.grantCollection, !deleted {
            logger.info("grant received id=\(id, privacy: .public)")
        }
    }
}

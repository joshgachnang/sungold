import Foundation
import os

/// Socket.IO connection used only to receive sync events for the user's streams.
/// All state lives on the main actor: URLSession delivers delegate and receive callbacks on
/// the main queue, so callers and callbacks never race.
@MainActor
final class SyncSocket: NSObject {
    enum Event {
        case subscribed(collection: String)
        case delta(SyncDelta)
        case resyncRequired
        case disconnected(unauthorized: Bool)
    }

    private let logger = Logger(subsystem: "app.sungold.mac", category: "socket")
    private let url: URL
    private let token: String
    private let collections: [String]
    private var session: URLSession?
    private var task: URLSessionWebSocketTask?
    private var heartbeatDeadline: TimeInterval = 45
    private var watchdog: Timer?
    private var finished = false
    private let onEvent: (Event) -> Void

    init(apiURL: URL, token: String, collections: [String], onEvent: @escaping (Event) -> Void) {
        var components = URLComponents(url: apiURL, resolvingAgainstBaseURL: false)!
        components.scheme = apiURL.scheme == "https" ? "wss" : "ws"
        components.path = "/socket.io/"
        components.queryItems = [URLQueryItem(name: "EIO", value: "4"), URLQueryItem(name: "transport", value: "websocket")]
        self.url = components.url!
        self.token = token
        self.collections = collections
        self.onEvent = onEvent
    }

    func connect() {
        let session = URLSession(configuration: .default, delegate: nil, delegateQueue: .main)
        self.session = session
        let task = session.webSocketTask(with: url)
        self.task = task
        task.resume()
        resetWatchdog()
        receive()
    }

    /// Closes the connection without reporting a disconnect (the caller asked for it).
    func close() {
        finished = true
        teardown()
    }

    private func teardown() {
        watchdog?.invalidate()
        watchdog = nil
        task?.cancel(with: .normalClosure, reason: nil)
        task = nil
        // URLSession retains its tasks until invalidated; without this every reconnect leaks.
        session?.invalidateAndCancel()
        session = nil
    }

    /// Reports the disconnect exactly once, however many signals (receive error, close,
    /// heartbeat timeout) arrive for the same connection.
    private func finish(unauthorized: Bool) {
        guard !finished else { return }
        finished = true
        teardown()
        onEvent(.disconnected(unauthorized: unauthorized))
    }

    private func resetWatchdog() {
        watchdog?.invalidate()
        watchdog = Timer.scheduledTimer(withTimeInterval: heartbeatDeadline, repeats: false) { [weak self] _ in
            MainActor.assumeIsolated {
                self?.logger.info("no heartbeat; treating connection as dead")
                self?.finish(unauthorized: false)
            }
        }
    }

    private func send(_ frame: String) {
        task?.send(.string(frame)) { [weak self] error in
            guard let error else { return }
            MainActor.assumeIsolated { self?.logger.error("send failed: \(error.localizedDescription)") }
        }
    }

    private func receive() {
        task?.receive { [weak self] result in
            MainActor.assumeIsolated {
                guard let self, !self.finished else { return }
                switch result {
                case .failure:
                    self.finish(unauthorized: false)
                case .success(let message):
                    if case .string(let frame) = message { self.handle(frame) }
                    self.receive()
                }
            }
        }
    }

    private func handle(_ frame: String) {
        resetWatchdog()
        switch EngineIOPacket.parse(frame) {
        case .open(let data):
            if let heartbeat = EngineIOPacket.heartbeat(fromOpen: data) {
                heartbeatDeadline = heartbeat.interval + heartbeat.timeout
                resetWatchdog()
            }
            send(EngineIOPacket.connectFrame(token: token))
        case .ping:
            send(EngineIOPacket.pongFrame)
        case .socketConnected:
            send(EngineIOPacket.eventFrame(name: "sync:subscribe", payload: ["collections": collections]))
        case .socketConnectError(let body):
            logger.error("socket auth rejected: \(body, privacy: .public)")
            finish(unauthorized: true)
        case .socketDisconnected, .close:
            finish(unauthorized: false)
        case .socketEvent(let name, let payload):
            handleEvent(name: name, payload: payload)
        case .pong, .other:
            break
        }
    }

    private func handleEvent(name: String, payload: Data?) {
        switch name {
        case "sync:subscribed":
            let object = payload.flatMap { try? JSONSerialization.jsonObject(with: $0) as? [String: Any] }
            onEvent(.subscribed(collection: object?["collection"] as? String ?? ""))
        case "sync:delta":
            if let payload, let delta = try? JSONDecoder().decode(SyncDelta.self, from: payload) {
                onEvent(.delta(delta))
            }
        case "sync:resync-required":
            onEvent(.resyncRequired)
        case "sync:error":
            let body = payload.map { String(decoding: $0, as: UTF8.self) } ?? ""
            logger.error("sync error: \(body, privacy: .public)")
        default:
            break
        }
    }
}

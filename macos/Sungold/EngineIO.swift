import Foundation

/// Minimal Engine.IO v4 / Socket.IO v5 framing over a WebSocket, enough for Terreno sync:
/// connect with auth, receive events, answer pings, emit events.
enum EngineIOPacket: Equatable {
    case open(Data)
    case close
    case ping
    case pong
    case socketConnected
    case socketDisconnected
    case socketConnectError(String)
    case socketEvent(name: String, payload: Data?)
    case other(String)

    static func parse(_ frame: String) -> EngineIOPacket {
        guard let first = frame.first else { return .other(frame) }
        let rest = String(frame.dropFirst())
        switch first {
        case "0": return .open(Data(rest.utf8))
        case "1": return .close
        case "2": return .ping
        case "3": return .pong
        case "4": return parseSocketIO(rest)
        default: return .other(frame)
        }
    }

    private static func parseSocketIO(_ packet: String) -> EngineIOPacket {
        guard let type = packet.first else { return .other(packet) }
        let body = String(packet.dropFirst())
        switch type {
        case "0": return .socketConnected
        case "1": return .socketDisconnected
        case "4": return .socketConnectError(body)
        case "2":
            // Event: optional ack id digits, then a JSON array ["name", payload].
            let json = body.drop(while: { $0.isNumber })
            guard let array = try? JSONSerialization.jsonObject(with: Data(json.utf8)) as? [Any],
                let name = array.first as? String
            else { return .other(packet) }
            let payload = array.count > 1
                ? try? JSONSerialization.data(withJSONObject: array[1], options: [.fragmentsAllowed])
                : nil
            return .socketEvent(name: name, payload: payload)
        default: return .other(packet)
        }
    }

    static func connectFrame(token: String) -> String {
        let auth = try! JSONSerialization.data(withJSONObject: ["token": "Bearer \(token)"])
        return "40" + String(decoding: auth, as: UTF8.self)
    }

    static func eventFrame(name: String, payload: [String: Any]) -> String {
        let data = try! JSONSerialization.data(withJSONObject: [name, payload])
        return "42" + String(decoding: data, as: UTF8.self)
    }

    static let pongFrame = "3"

    /// Heartbeat settings from the open packet: the server pings every `interval` and drops
    /// a client that has not answered within `timeout`; a client that hears nothing for
    /// interval + timeout should treat the connection as dead.
    static func heartbeat(fromOpen data: Data) -> (interval: TimeInterval, timeout: TimeInterval)? {
        guard let object = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
            let interval = object["pingInterval"] as? Double,
            let timeout = object["pingTimeout"] as? Double
        else { return nil }
        return (interval / 1000, timeout / 1000)
    }
}

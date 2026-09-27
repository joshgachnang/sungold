import Foundation

/// A focus session as synced from the backend (`focusSessions` collection).
struct FocusSession: Decodable, Equatable, Identifiable {
    let id: String
    let status: String
    let blockedDomains: [String]
    let intention: String?
    let startedAt: Date?

    var isActive: Bool { status == "active" }

    private enum CodingKeys: String, CodingKey {
        case id = "_id", status, blockedDomains, intention, startedAt
    }
}

/// An unlock grant as synced from the backend (`unlockGrants` collection).
/// `payload` and `signature` must be verified before a grant lifts a block (a later task).
struct UnlockGrant: Decodable, Equatable, Identifiable {
    let id: String
    let sessionId: String
    let expiresAt: Date
    let payload: String
    let signature: String

    private enum CodingKeys: String, CodingKey {
        case id = "_id", sessionId, expiresAt, payload, signature
    }
}

struct CurrentUser: Decodable, Equatable {
    let id: String
    let email: String

    private enum CodingKeys: String, CodingKey {
        case id = "_id", email
    }
}

enum SungoldJSON {
    /// The backend sends ISO 8601 dates with milliseconds, e.g. 2026-09-26T18:28:23.402Z.
    static func decoder() -> JSONDecoder {
        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .custom { decoder in
            let container = try decoder.singleValueContainer()
            let value = try container.decode(String.self)
            if let date = parseDate(value) {
                return date
            }
            throw DecodingError.dataCorruptedError(
                in: container, debugDescription: "Invalid date: \(value)")
        }
        return decoder
    }

    static func parseDate(_ value: String) -> Date? {
        let withFraction = ISO8601DateFormatter()
        withFraction.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        if let date = withFraction.date(from: value) {
            return date
        }
        return ISO8601DateFormatter().date(from: value)
    }
}

import CryptoKit
import Foundation

/// A grant as the server signed it: `payload` is base64url of canonical JSON (contract v1),
/// `signature` is Ed25519 over those exact bytes, base64url.
struct SignedGrant: Codable, Hashable {
    let payload: String
    let signature: String
}

/// The fields of a verified grant (docs/explanation/architecture.md, "Grant contract (v1)").
struct GrantPayload: Equatable {
    let grantId: String
    let userId: String
    let sessionId: String
    let issuedAt: Date
    let expiresAt: Date
}

/// Verifies grants against the public key pinned in this build. Anything that fails
/// verification, has an unknown version or scope, or is malformed is rejected.
struct GrantVerifier {
    private let publicKey: Curve25519.Signing.PublicKey

    init?(publicKeyBase64URL: String) {
        guard let raw = Base64URL.decode(publicKeyBase64URL),
            let key = try? Curve25519.Signing.PublicKey(rawRepresentation: raw)
        else { return nil }
        publicKey = key
    }

    /// The pinned key from the bundle's `SungoldGrantPublicKey` Info.plist entry.
    static func pinned(in bundle: Bundle = .main) -> GrantVerifier? {
        (bundle.object(forInfoDictionaryKey: "SungoldGrantPublicKey") as? String).flatMap(GrantVerifier.init)
    }

    func verify(_ grant: SignedGrant) -> GrantPayload? {
        guard let payloadBytes = Base64URL.decode(grant.payload),
            let signature = Base64URL.decode(grant.signature),
            publicKey.isValidSignature(signature, for: payloadBytes),
            let object = try? JSONSerialization.jsonObject(with: payloadBytes) as? [String: Any],
            Self.isInteger(object["v"], equalTo: 1),
            object["scope"] as? String == "all",
            let grantId = object["grantId"] as? String,
            let userId = object["userId"] as? String,
            let sessionId = object["sessionId"] as? String,
            let issuedAt = (object["issuedAt"] as? String).flatMap(ISODate.parse),
            let expiresAt = (object["expiresAt"] as? String).flatMap(ISODate.parse),
            expiresAt > issuedAt
        else { return nil }
        return GrantPayload(grantId: grantId, userId: userId, sessionId: sessionId,
                            issuedAt: issuedAt, expiresAt: expiresAt)
    }

    /// JSONSerialization returns NSNumber for true, 1 and 1.0 alike; only an integer counts.
    static func isInteger(_ value: Any?, equalTo expected: Int) -> Bool {
        guard let number = value as? NSNumber, CFGetTypeID(number) != CFBooleanGetTypeID(),
            ["c", "s", "i", "l", "q", "C", "S", "I", "L", "Q"].contains(String(cString: number.objCType))
        else { return false }
        return number.intValue == expected
    }
}

/// Verifies each distinct grant once; the filter checks grants on every new connection.
final class CachingGrantVerifier {
    private let verifier: GrantVerifier
    private var cache: [SignedGrant: GrantPayload?] = [:]
    private let lock = NSLock()

    init(_ verifier: GrantVerifier) { self.verifier = verifier }

    func verify(_ grant: SignedGrant) -> GrantPayload? {
        lock.lock()
        defer { lock.unlock() }
        if let cached = cache[grant] { return cached }
        let payload = verifier.verify(grant)
        cache[grant] = payload
        return payload
    }
}

enum Base64URL {
    static func decode(_ value: String) -> Data? {
        var base64 = value.replacingOccurrences(of: "-", with: "+").replacingOccurrences(of: "_", with: "/")
        base64 += String(repeating: "=", count: (4 - base64.count % 4) % 4)
        return Data(base64Encoded: base64)
    }
}

enum ISODate {
    static func parse(_ value: String) -> Date? {
        let withFraction = ISO8601DateFormatter()
        withFraction.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        return withFraction.date(from: value) ?? ISO8601DateFormatter().date(from: value)
    }
}

import Foundation
import Security

protocol TokenStore {
    func load() -> String?
    func save(_ token: String) throws
    func delete()
}

/// Stores the device bearer token as a generic password in the user's login Keychain.
struct KeychainTokenStore: TokenStore {
    var service = "app.sungold.mac"
    var account = "deviceToken"

    enum KeychainError: Error { case status(OSStatus) }

    private var baseQuery: [String: Any] {
        [kSecClass as String: kSecClassGenericPassword,
         kSecAttrService as String: service,
         kSecAttrAccount as String: account]
    }

    func load() -> String? {
        var query = baseQuery
        query[kSecReturnData as String] = true
        query[kSecMatchLimit as String] = kSecMatchLimitOne
        var result: AnyObject?
        guard SecItemCopyMatching(query as CFDictionary, &result) == errSecSuccess,
            let data = result as? Data
        else { return nil }
        return String(data: data, encoding: .utf8)
    }

    func save(_ token: String) throws {
        delete()
        var query = baseQuery
        query[kSecValueData as String] = Data(token.utf8)
        query[kSecAttrAccessible as String] = kSecAttrAccessibleAfterFirstUnlock
        let status = SecItemAdd(query as CFDictionary, nil)
        guard status == errSecSuccess else { throw KeychainError.status(status) }
    }

    func delete() {
        SecItemDelete(baseQuery as CFDictionary)
    }
}

/// Debug builds only: keeps the token in a file readable by the current user alone.
/// Ad-hoc signed builds change signature on every build, so a Keychain item would prompt
/// after each rebuild; a real Developer ID build uses KeychainTokenStore.
struct FileTokenStore: TokenStore {
    var fileURL: URL = FileManager.default
        .urls(for: .applicationSupportDirectory, in: .userDomainMask)[0]
        .appendingPathComponent("app.sungold.mac", isDirectory: true)
        .appendingPathComponent("dev-device-token")

    func load() -> String? {
        guard let data = try? Data(contentsOf: fileURL) else { return nil }
        let token = String(decoding: data, as: UTF8.self)
        return token.isEmpty ? nil : token
    }

    func save(_ token: String) throws {
        let directory = fileURL.deletingLastPathComponent()
        try FileManager.default.createDirectory(
            at: directory, withIntermediateDirectories: true, attributes: [.posixPermissions: 0o700])
        delete()
        guard FileManager.default.createFile(
            atPath: fileURL.path, contents: Data(token.utf8), attributes: [.posixPermissions: 0o600])
        else { throw CocoaError(.fileWriteUnknown) }
    }

    func delete() {
        try? FileManager.default.removeItem(at: fileURL)
    }
}

enum TokenStores {
    /// The store the app uses for its device token in this build configuration.
    static var `default`: TokenStore {
        #if DEBUG
        // Scripts point this at their own file so they never touch the developer's sign-in.
        if let path = ProcessInfo.processInfo.environment["SUNGOLD_TOKEN_FILE"], !path.isEmpty {
            return FileTokenStore(fileURL: URL(fileURLWithPath: path))
        }
        return FileTokenStore()
        #else
        return KeychainTokenStore()
        #endif
    }
}

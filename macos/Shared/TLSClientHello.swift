import Foundation

/// Extracts the server name (SNI) from the first bytes of a TLS connection, so the filter can
/// see which site an HTTPS connection is for even when the app connected by IP address.
enum TLSClientHello {
    static func serverName(in data: Data) -> String? {
        let bytes = [UInt8](data)
        var index = 0

        func read(_ count: Int) -> ArraySlice<UInt8>? {
            guard count >= 0, index + count <= bytes.count else { return nil }
            defer { index += count }
            return bytes[index..<(index + count)]
        }
        func readUInt(_ count: Int) -> Int? {
            read(count)?.reduce(0) { ($0 << 8) | Int($1) }
        }

        // TLS record header: type 22 (handshake), version, length.
        guard readUInt(1) == 22, read(2) != nil, readUInt(2) != nil else { return nil }
        // Handshake header: type 1 (ClientHello), 3-byte length.
        guard readUInt(1) == 1, readUInt(3) != nil else { return nil }
        // client_version + random.
        guard read(2 + 32) != nil else { return nil }
        guard let sessionIdLength = readUInt(1), read(sessionIdLength) != nil else { return nil }
        guard let cipherLength = readUInt(2), read(cipherLength) != nil else { return nil }
        guard let compressionLength = readUInt(1), read(compressionLength) != nil else { return nil }
        guard let extensionsLength = readUInt(2) else { return nil }
        let extensionsEnd = index + extensionsLength

        while index + 4 <= min(extensionsEnd, bytes.count) {
            guard let type = readUInt(2), let length = readUInt(2) else { return nil }
            guard type == 0 else {
                guard read(length) != nil else { return nil }
                continue
            }
            // server_name extension: list length, then entries of (type, length, name).
            guard let listLength = readUInt(2) else { return nil }
            let listEnd = index + listLength
            while index + 3 <= min(listEnd, bytes.count) {
                guard let nameType = readUInt(1), let nameLength = readUInt(2),
                    let name = read(nameLength)
                else { return nil }
                if nameType == 0 {
                    return String(bytes: name, encoding: .ascii)
                }
            }
            return nil
        }
        return nil
    }
}

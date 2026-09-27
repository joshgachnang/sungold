import Foundation

/// REST calls the Mac app makes with its device bearer token.
struct APIClient {
    let baseURL: URL
    let token: String
    var session: URLSession = .shared

    enum APIError: Error, Equatable {
        case unauthorized
        case http(Int)
    }

    private struct Envelope<T: Decodable>: Decodable { let data: T }

    private func request(_ path: String, method: String = "GET", query: [URLQueryItem] = []) -> URLRequest {
        var components = URLComponents(url: baseURL.appendingPathComponent(path), resolvingAgainstBaseURL: false)!
        if !query.isEmpty { components.queryItems = query }
        var request = URLRequest(url: components.url!)
        request.httpMethod = method
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        return request
    }

    private func send(_ request: URLRequest) async throws -> Data {
        let (data, response) = try await session.data(for: request)
        let status = (response as? HTTPURLResponse)?.statusCode ?? 0
        if status == 401 { throw APIError.unauthorized }
        guard (200..<300).contains(status) else { throw APIError.http(status) }
        return data
    }

    func currentUser() async throws -> CurrentUser {
        let data = try await send(request("auth/me"))
        return try SungoldJSON.decoder().decode(Envelope<CurrentUser>.self, from: data).data
    }

    func snapshot(collection: String, stream: String, cursor: Int, legacyCursor: String?) async throws -> SnapshotPage {
        var query = [
            URLQueryItem(name: "collection", value: collection),
            URLQueryItem(name: "stream", value: stream),
            URLQueryItem(name: "cursor", value: String(cursor)),
        ]
        if let legacyCursor { query.append(URLQueryItem(name: "legacyCursor", value: legacyCursor)) }
        let data = try await send(request("sync/snapshot", query: query))
        return try JSONDecoder().decode(SnapshotPage.self, from: data)
    }

    /// Ends this device's Better Auth session so the token stops working.
    func signOut() async {
        var request = request("api/auth/sign-out", method: "POST")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = Data("{}".utf8)
        _ = try? await send(request)
    }
}

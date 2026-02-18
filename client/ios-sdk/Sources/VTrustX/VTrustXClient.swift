import Foundation

/// Main entry point for the VTrustX iOS SDK.
///
/// All methods are `async throws`. Call them with `try await` inside a `Task` or
/// `async` function.
///
/// Example:
/// ```swift
/// let client = VTrustXClient()
/// let user = try await client.login(username: "admin", password: "password")
/// ```
@available(iOS 15.0, *)
public class VTrustXClient {

    private let baseURL: String
    private let authManager: AuthManager
    private let decoder: JSONDecoder = {
        let d = JSONDecoder()
        d.keyDecodingStrategy = .convertFromSnakeCase
        return d
    }()
    private let encoder: JSONEncoder = JSONEncoder()

    public init(
        baseURL: String = "https://api.rayix.app/api",
        authManager: AuthManager = AuthManager()
    ) {
        self.baseURL = baseURL.hasSuffix("/") ? String(baseURL.dropLast()) : baseURL
        self.authManager = authManager
    }

    // MARK: - Request Builder

    private func buildRequest(
        _ path: String,
        method: String = "GET",
        body: Data? = nil
    ) throws -> URLRequest {
        guard let url = URL(string: "\(baseURL)/\(path)") else {
            throw APIError(error: "Invalid URL: \(baseURL)/\(path)", code: nil)
        }
        var request = URLRequest(url: url)
        request.httpMethod = method
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        if let token = authManager.getToken() {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }
        request.httpBody = body
        return request
    }

    // MARK: - Generic Executor

    private func perform<T: Decodable>(_ request: URLRequest) async throws -> T {
        let (data, response) = try await URLSession.shared.data(for: request)
        guard let http = response as? HTTPURLResponse else {
            throw APIError(error: "Invalid response", code: nil)
        }
        guard (200...299).contains(http.statusCode) else {
            // Attempt to decode structured API error
            if let apiError = try? decoder.decode(APIError.self, from: data) {
                throw apiError
            }
            throw APIError(error: "HTTP \(http.statusCode)", code: http.statusCode)
        }
        return try decoder.decode(T.self, from: data)
    }

    // MARK: - Auth

    /// Login with username and password.
    /// Saves the token to Keychain if the server returns one in the response body
    /// (Bearer-token / API-key auth). Browser cookie auth does not return a token.
    @discardableResult
    public func login(username: String, password: String) async throws -> APIUser {
        let body = try encoder.encode(LoginRequest(username: username, password: password))
        let request = try buildRequest("auth/login", method: "POST", body: body)
        let response: LoginResponse = try await perform(request)
        if let token = response.token {
            authManager.saveToken(token)
        }
        return response.user
    }

    public func logout() async throws {
        let request = try buildRequest("auth/logout", method: "POST")
        let _: [String: String] = (try? await perform(request)) ?? [:]
        authManager.clearToken()
    }

    public func getMe() async throws -> APIUser {
        let request = try buildRequest("auth/me")
        return try await perform(request)
    }

    // MARK: - Forms

    public func listForms() async throws -> [APIForm] {
        return try await perform(try buildRequest("forms"))
    }

    public func getForm(id: String) async throws -> APIForm {
        return try await perform(try buildRequest("forms/\(id)"))
    }

    public func getFormBySlug(slug: String) async throws -> APIForm {
        return try await perform(try buildRequest("forms/slug/\(slug)"))
    }

    // MARK: - Submissions

    public func listSubmissions(
        formId: String? = nil,
        page: Int? = nil,
        limit: Int? = nil
    ) async throws -> [APISubmission] {
        var components = URLComponents(string: "\(baseURL)/submissions")!
        var queryItems: [URLQueryItem] = []
        if let fid = formId { queryItems.append(URLQueryItem(name: "formId", value: fid)) }
        if let p = page { queryItems.append(URLQueryItem(name: "page", value: "\(p)")) }
        if let l = limit { queryItems.append(URLQueryItem(name: "limit", value: "\(l)")) }
        if !queryItems.isEmpty { components.queryItems = queryItems }

        guard let url = components.url else {
            throw APIError(error: "Invalid URL for /submissions", code: nil)
        }
        var request = URLRequest(url: url)
        request.httpMethod = "GET"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        if let token = authManager.getToken() {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }
        return try await perform(request)
    }

    public func createSubmission(
        formId: String,
        data: [String: Any],
        metadata: [String: Any] = [:]
    ) async throws -> APISubmission {
        let body = try encoder.encode(CreateSubmissionRequest(formId: formId, data: data, metadata: metadata))
        let request = try buildRequest("submissions", method: "POST", body: body)
        return try await perform(request)
    }

    // MARK: - Notifications

    public func listNotifications() async throws -> [APINotification] {
        return try await perform(try buildRequest("notifications"))
    }

    public func markNotificationRead(id: String) async throws {
        var request = try buildRequest("notifications/\(id)/read", method: "PATCH")
        request.httpBody = Data()
        let _: [String: String] = (try? await perform(request)) ?? [:]
    }

    // MARK: - Convenience: Survey

    /// Load a NativeSurveyDefinition by form slug.
    /// Returns `nil` if the form has no native definition (legacy form-builder format).
    public func loadSurveyBySlug(slug: String) async throws -> NativeSurveyDefinition? {
        let form = try await getFormBySlug(slug: slug)
        return form.definition
    }

    // MARK: - State helpers

    public var isAuthenticated: Bool {
        authManager.isAuthenticated
    }

    public func clearToken() {
        authManager.clearToken()
    }
}

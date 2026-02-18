import Foundation

// MARK: - Auth

public struct LoginRequest: Encodable {
    public let username: String
    public let password: String
    public init(username: String, password: String) {
        self.username = username
        self.password = password
    }
}

public struct LoginResponse: Decodable {
    public let user: APIUser
    /// Only present in Bearer-token / API-key auth.
    /// Browser cookie auth does NOT include a token in the response body.
    public let token: String?
}

public struct APIUser: Decodable {
    public let id: String
    public let username: String
    public let email: String?
    public let role: String
    public let tenantId: String
    public let status: String

    enum CodingKeys: String, CodingKey {
        case id, username, email, role, status
        case tenantId = "tenant_id"
    }
}

// MARK: - Forms

public struct APIForm: Decodable {
    public let id: String
    public let slug: String
    public let title: String
    public let definition: NativeSurveyDefinition?
    public let status: String
    public let isPublished: Bool?
    public let createdAt: String

    enum CodingKeys: String, CodingKey {
        case id, slug, title, definition, status
        case isPublished = "is_published"
        case createdAt = "created_at"
    }
}

// MARK: - Submissions

public struct APISubmission: Decodable {
    public let id: String
    public let formId: String
    public let data: [String: AnyCodable]
    public let metadata: [String: AnyCodable]?
    public let createdAt: String

    enum CodingKeys: String, CodingKey {
        case id, data, metadata
        case formId = "form_id"
        case createdAt = "created_at"
    }
}

public struct CreateSubmissionRequest: Encodable {
    public let formId: String
    public let data: [String: AnyCodable]
    public let metadata: [String: AnyCodable]

    enum CodingKeys: String, CodingKey {
        case formId = "form_id"
        case data, metadata
    }

    /// Convenience init from [String: Any] dictionaries.
    public init(formId: String, data: [String: Any], metadata: [String: Any] = [:]) {
        self.formId = formId
        self.data = data.mapValues { AnyCodable($0) }
        var meta: [String: Any] = ["sdk": "ios", "version": "1.0.0"]
        meta.merge(metadata) { _, new in new }
        self.metadata = meta.mapValues { AnyCodable($0) }
    }
}

// MARK: - API Error

public struct APIError: Codable, Error, LocalizedError {
    public let error: String
    public let code: Int?

    public var errorDescription: String? { error }
}

// MARK: - Notifications

public struct APINotification: Decodable {
    public let id: String
    public let type: String
    public let title: String
    public let message: String
    public let isRead: Bool
    public let createdAt: String

    enum CodingKeys: String, CodingKey {
        case id, type, title, message
        case isRead = "is_read"
        case createdAt = "created_at"
    }
}

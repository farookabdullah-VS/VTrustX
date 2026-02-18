import Foundation
import Security

/// Secure token storage using the iOS Keychain.
public class AuthManager {

    private let service = "com.vtrustx.sdk"
    private let account = "access_token"

    public init() {}

    public func saveToken(_ token: String) {
        guard let data = token.data(using: .utf8) else { return }
        // Remove existing item first to avoid duplicate-item errors
        clearToken()
        let query: [String: Any] = [
            kSecClass as String:            kSecClassGenericPassword,
            kSecAttrService as String:      service,
            kSecAttrAccount as String:      account,
            kSecValueData as String:        data,
            kSecAttrAccessible as String:   kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly,
        ]
        SecItemAdd(query as CFDictionary, nil)
    }

    public func getToken() -> String? {
        let query: [String: Any] = [
            kSecClass as String:            kSecClassGenericPassword,
            kSecAttrService as String:      service,
            kSecAttrAccount as String:      account,
            kSecReturnData as String:       true,
            kSecMatchLimit as String:       kSecMatchLimitOne,
        ]
        var result: AnyObject?
        let status = SecItemCopyMatching(query as CFDictionary, &result)
        guard status == errSecSuccess,
              let data = result as? Data,
              let token = String(data: data, encoding: .utf8) else {
            return nil
        }
        return token
    }

    public func clearToken() {
        let query: [String: Any] = [
            kSecClass as String:        kSecClassGenericPassword,
            kSecAttrService as String:  service,
            kSecAttrAccount as String:  account,
        ]
        SecItemDelete(query as CFDictionary)
    }

    public var isAuthenticated: Bool {
        getToken() != nil
    }
}

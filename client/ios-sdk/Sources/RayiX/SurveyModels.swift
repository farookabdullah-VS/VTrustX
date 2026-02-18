import Foundation

// MARK: - Core Survey Definition

public struct NativeSurveyDefinition: Codable {
    public let id: String
    public let title: String
    public let description: String?
    public let theme: SurveyTheme
    public let screens: [SurveyScreen]
    public let logic: [LogicRule]?
    
    public init(id: String, title: String, description: String?, theme: SurveyTheme, screens: [SurveyScreen], logic: [LogicRule]?) {
        self.id = id
        self.title = title
        self.description = description
        self.theme = theme
        self.screens = screens
        self.logic = logic
    }
}

// MARK: - Theme

public struct SurveyTheme: Codable {
    public let primaryColor: String
    public let backgroundColor: String
    public let typography: TypographyType?
    public let borderRadius: Double?
    public let darkMode: Bool?
    
    public enum TypographyType: String, Codable {
        case system
        case serif
        case sansSerif = "sans-serif"
        case monospace
    }
}

// MARK: - Screens & Components

public struct SurveyScreen: Codable, Identifiable {
    public let id: String
    public let title: String?
    public let components: [SurveyComponent]
}

public struct SurveyComponent: Codable, Identifiable {
    public let id: String
    public let type: ComponentType
    public let label: String
    public let required: Bool?
    public let options: [ChoiceOption]?
    public let min: Double?
    public let max: Double?
    public let step: Double?
    public let placeholder: String?
    
    public enum ComponentType: String, Codable {
        case text
        case rating
        case nps
        case singleChoice = "single_choice"
        case multipleChoice = "multiple_choice"
        case date
        case multilineText = "multiline_text"
        case number
        case slider
        case fileUpload = "file_upload"
    }
}

public struct ChoiceOption: Codable {
    public let value: String
    public let label: String
}

// MARK: - Logic

public struct LogicRule: Codable {
    public let trigger: LogicTrigger
    public let action: LogicAction
    public let target: String
    
    public enum LogicAction: String, Codable {
        case skipTo = "skip_to"
        case hide
        case show
        case endSurvey = "end_survey"
    }
}

public struct LogicTrigger: Codable {
    public let questionId: String
    public let operatorType: LogicOperator
    public let value: AnyCodable
    
    enum CodingKeys: String, CodingKey {
        case questionId
        case operatorType = "operator"
        case value
    }
}

public enum LogicOperator: String, Codable {
    case equals
    case notEquals = "not_equals"
    case contains
    case greaterThan = "greater_than"
    case lessThan = "less_than"
}

// MARK: - Helper for Mixed Type JSON

public struct AnyCodable: Codable {
    public let value: Any
    
    public init(_ value: Any) {
        self.value = value
    }
    
    public init(from decoder: Decoder) throws {
        let container = try decoder.singleValueContainer()
        if let x = try? container.decode(Int.self) {
            value = x
        } else if let x = try? container.decode(Double.self) {
            value = x
        } else if let x = try? container.decode(Bool.self) {
            value = x
        } else if let x = try? container.decode(String.self) {
            value = x
        } else {
            throw DecodingError.typeMismatch(AnyCodable.self, DecodingError.Context(codingPath: decoder.codingPath, debugDescription: "Wrong type for AnyCodable"))
        }
    }
    
    public func encode(to encoder: Encoder) throws {
        var container = encoder.singleValueContainer()
        switch value {
        case let x as Int:
            try container.encode(x)
        case let x as Double:
            try container.encode(x)
        case let x as Bool:
            try container.encode(x)
        case let x as String:
            try container.encode(x)
        default:
            throw EncodingError.invalidValue(value, EncodingError.Context(codingPath: encoder.codingPath, debugDescription: "Invalid type for AnyCodable"))
        }
    }
}

import Foundation

public class SurveyEngine {

    private let definition: NativeSurveyDefinition

    public init(definition: NativeSurveyDefinition) {
        self.definition = definition
    }

    // MARK: - Core Logic Translation

    /// Determines the next screen ID based on current answers and logic rules.
    public func getNextScreen(currentScreenId: String, answers: [String: Any]) -> String? {
        guard let currentIndex = definition.screens.firstIndex(where: { $0.id == currentScreenId }) else {
            return nil
        }

        // Check for skip logic first
        if let logic = definition.logic {
            for rule in logic {
                if checkTrigger(trigger: rule.trigger, answers: answers) {
                    if rule.action == .skipTo {
                        return rule.target
                    } else if rule.action == .endSurvey {
                        return nil
                    }
                }
            }
        }

        // Default: next screen in array
        if currentIndex + 1 < definition.screens.count {
            return definition.screens[currentIndex + 1].id
        }

        return nil // end of survey
    }

    // MARK: - Trigger Evaluation

    private func checkTrigger(trigger: LogicTrigger, answers: [String: Any]) -> Bool {
        guard let answer = answers[trigger.questionId] else { return false }

        switch trigger.operatorType {
        case .equals:
            return comparableString(answer) == comparableString(trigger.value.value)
        case .notEquals:
            return comparableString(answer) != comparableString(trigger.value.value)
        case .greaterThan:
            return compare(answer, trigger.value.value, >)
        case .lessThan:
            return compare(answer, trigger.value.value, <)
        case .contains:
            return String(describing: answer).contains(String(describing: trigger.value.value))
        }
    }

    // MARK: - Comparison Helpers

    /// Normalise a value to a canonical string so that 5, 5.0, and "5" all compare equal.
    private func comparableString(_ value: Any) -> String {
        if let d = (value as? NSNumber)?.doubleValue {
            // Drop ".0" suffix for whole numbers
            return d.truncatingRemainder(dividingBy: 1) == 0 ? String(Int(d)) : String(d)
        }
        return String(describing: value)
    }

    private func compare(_ a: Any, _ b: Any, _ op: (Double, Double) -> Bool) -> Bool {
        let v1 = (a as? NSNumber)?.doubleValue
            ?? Double(String(describing: a))
            ?? 0
        let v2 = (b as? NSNumber)?.doubleValue
            ?? Double(String(describing: b))
            ?? 0
        return op(v1, v2)
    }
}

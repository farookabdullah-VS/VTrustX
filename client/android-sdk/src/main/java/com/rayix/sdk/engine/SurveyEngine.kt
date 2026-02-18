
package com.vtrustx.sdk.engine

import com.vtrustx.sdk.models.*

class SurveyEngine(private val definition: NativeSurveyDefinition) {

    fun getNextScreen(currentScreenId: String, answers: Map<String, Any>): String? {
        val currentIndex = definition.screens.indexOfFirst { it.id == currentScreenId }
        if (currentIndex == -1) return null

        // Evaluate logic (Skip, End Survey)
        definition.logic?.forEach { rule ->
            if (checkTrigger(rule.trigger, answers)) {
                if (rule.action == "skip_to") {
                    return rule.target
                } else if (rule.action == "end_survey") {
                    return null
                }
            }
        }

        // Default: Next in line
        if (currentIndex + 1 < definition.screens.size) {
            return definition.screens[currentIndex + 1].id
        }

        return null
    }

    /**
     * Validate that all required components on a screen have answers.
     */
    fun validateScreen(screenId: String, answers: Map<String, Any>): Boolean {
        val screen = definition.screens.find { it.id == screenId } ?: return false
        return screen.components
            .filter { it.required == true }
            .all { answers.containsKey(it.id) }
    }

    private fun checkTrigger(trigger: LogicTrigger, answers: Map<String, Any>): Boolean {
        val answer = answers[trigger.questionId] ?: return false
        val triggerValue = trigger.value

        return when (trigger.operatorType) {
            // Normalize numbers to string for robust equality (e.g. 5 == 5.0 == "5")
            "equals" -> answer.toComparableString() == triggerValue.toComparableString()
            "not_equals" -> answer.toComparableString() != triggerValue.toComparableString()
            "greater_than" -> compare(answer, triggerValue) { a, b -> a > b }
            "less_than" -> compare(answer, triggerValue) { a, b -> a < b }
            "contains" -> answer.toString().contains(triggerValue.toString())
            else -> false
        }
    }

    /**
     * Normalise a value for equality comparison.
     * Gson deserialises all JSON numbers as Double for Any-typed fields,
     * so 5, 5.0, and "5" must all compare equal.
     */
    private fun Any.toComparableString(): String {
        val num = (this as? Number)?.toDouble()
        return if (num != null) {
            // Drop ".0" suffix so that 5.0 → "5" and 5.5 → "5.5"
            if (num == Math.floor(num) && !num.isInfinite()) num.toLong().toString()
            else num.toString()
        } else {
            this.toString()
        }
    }

    private fun compare(a: Any, b: Any, op: (Double, Double) -> Boolean): Boolean {
        val da = (a as? Number)?.toDouble() ?: a.toString().toDoubleOrNull() ?: return false
        val db = (b as? Number)?.toDouble() ?: b.toString().toDoubleOrNull() ?: return false
        return op(da, db)
    }
}

# Robust Loop Logic in SurveyJS

To build robust loop logic in SurveyJS without relying on raw JSON configuration, you are essentially looking to implement the **Dynamic Panel** (`paneldynamic`) or **Dynamic Matrix** (`matrixdynamic`).

In programming terms, the Dynamic Panel is the UI equivalent of a `for` loop or a `foreach` loop. It iterates over a template of questions based on a specific count or user action.

## 1. Limits (Start/Stop Conditions)

In a standard for loop (`for i = 0; i < n; i++`), you define the start and the limit ($n$). In SurveyJS, you control the "Limit" by manipulating how many panels (iterations) are generated.

You can control this in three ways:

*   **User-Defined (Do-While):** Allow the user to click "Add New" until they are done. You control the boundaries using `minPanelCount` and `maxPanelCount`.
*   **Hard Coded (Fixed Loop):** Set the `panelCount` to a static number (e.g., exactly 3 references required).
*   **Logic-Driven (Dependent Loop):** This is the most robust method. You bind the loop count to a previous answer (e.g., "How many children do you have?").

### The Logic Implementation:
Instead of writing code, you use **Property Binding**. You bind the `panelCount` property of your dynamic panel to the value of a source question.

*   **Source Question:** `number_of_cars` (Input type: number)
*   **Loop Object:** `car_details_panel` (Dynamic Panel)
*   **Logic:** Set `car_details_panel.bindings.panelCount = "number_of_cars"`

> **Pro Tip:** If you want to prevent the loop from running (Step = 0), simply ensure the Dynamic Panel has a `visibleIf` condition that evaluates to false until the limit variable is valid.

## 2. State (Data Storage)

In a programming loop, you often push data into an array: `results[i] = input`.
SurveyJS handles the State automatically, but you must understand the structure to manipulate it or read it later.
The Dynamic Panel acts as a container that outputs an **Array of Objects**.

### The Data Structure:
If your panel is named `employment_history` and contains questions `company` and `role`, the state is stored like this:

```javascript
// This is how SurveyJS manages the loop state internally
employment_history: [
    { company: "Google", role: "Engineer" }, // Iteration 0
    { company: "Microsoft", role: "Manager" } // Iteration 1
]
```

### Accessing State Programmatically:
To access the state of a specific iteration (the current `i`) **inside the loop**, SurveyJS provides the `panel` prefix.
*   **Inside the loop:** You can reference `{panel.company}` to get the value of the "company" question for the current row only.

## 3. Validation (Rules Inside the Loop)

Validation in a loop is trickier because you must validate `data[i]`, not the whole array. SurveyJS splits this into **Item Validation** and **Array Validation**.

### A. Input Validation (The `i` Validator)
This ensures the data inside a specific iteration is correct. You add validators to the questions within the panel template.
*   **Example:** Inside the loop, the "Email" question has a required and email validator.
*   **Behavior:** The user cannot proceed to the next page or complete the survey if *any* iteration contains invalid data.

### B. Logic Validation (The Array Validator)
Sometimes you need to validate the loop as a whole. For example, "You must provide at least 2 entries, but no more than 5."
*   **API Logic:** You use the `minPanelCount` and `maxPanelCount` properties.
*   **Custom Script Logic:** If you need complex validation (e.g., "The sum of percentages across all loop iterations must equal 100%"), you use the `onValidateQuestion` event in JavaScript.

**Example: Sum Validation**
```javascript
survey.onValidateQuestion.add((sender, options) => {
    // Check if we are validating the loop question itself
    if (options.name === "allocation_loop") {
        let sum = 0;
        // options.value is the array of objects (the State)
        options.value.forEach(item => {
            sum += item.percentage_question || 0;
        });
        
        if (sum !== 100) {
            options.error = `Total allocation must be 100%. Currently: ${sum}%`;
        }
    }
});
```

## Summary: The Loop Architecture

| Concept | Programming Equivalent | SurveyJS Component |
| :--- | :--- | :--- |
| **Limit** | `i < count` | `panelCount` (Static or Bound) |
| **Iterator** | `i` | `panelIndex` (Internal index) |
| **State** | `Array[i]` | `survey.data['panelName']` (Array of Objects) |
| **Scope** | Local Variables | `panel.questionName` (Access current row data) |
| **Validation** | `if (x != valid) throw` | Question Validators (Inner) & `onValidateQuestion` (Outer) |

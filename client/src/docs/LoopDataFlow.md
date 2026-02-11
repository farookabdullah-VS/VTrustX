# 🔄 Loop Logic Data Flow in FormViewer

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                          FormBuilder                             │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  User Creates Form with paneldynamic questions              │ │
│  │  - Sets panelCount, min/max, bindings                       │ │
│  │  - Defines templateElements (questions inside loop)         │ │
│  └────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ Saves to Database
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                       PostgreSQL Database                        │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  forms.definition (JSONB)                                   │ │
│  │  {                                                           │ │
│  │    "elements": [                                             │ │
│  │      {                                                       │ │
│  │        "type": "paneldynamic",                              │ │
│  │        "name": "children_details",                          │ │
│  │        "bindings": { "panelCount": "number_of_children" }   │ │
│  │      }                                                       │ │
│  │    ]                                                         │ │
│  │  }                                                           │ │
│  └────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ GET /api/forms/:id
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                          FormViewer                              │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  Step 1: Initialize SurveyJS Model                          │ │
│  │  ────────────────────────────────────────────────────────   │ │
│  │  const model = new Model(formDef.definition);  ← Line 442   │ │
│  │                                                               │ │
│  │  Step 2: SurveyJS Parses Loop Configuration                 │ │
│  │  ────────────────────────────────────────────────────────   │ │
│  │  - Detects paneldynamic questions                           │ │
│  │  - Registers binding watchers                               │ │
│  │  - Sets up panel rendering logic                            │ │
│  │                                                               │ │
│  │  Step 3: User Interacts                                     │ │
│  │  ────────────────────────────────────────────────────────   │ │
│  │  ┌──────────────────────────────────────────────────────┐  │ │
│  │  │ User-Defined:                                         │  │ │
│  │  │ • User clicks "Add New" → Panel added to array       │  │ │
│  │  │ • User clicks "Remove" → Panel removed from array    │  │ │
│  │  │ • UI enforces min/max constraints                    │  │ │
│  │  └──────────────────────────────────────────────────────┘  │ │
│  │  ┌──────────────────────────────────────────────────────┐  │ │
│  │  │ Hard-Coded:                                           │  │ │
│  │  │ • Fixed panels rendered on page load                 │  │ │
│  │  │ • No Add/Remove buttons shown                        │  │ │
│  │  │ • User fills each panel                              │  │ │
│  │  └──────────────────────────────────────────────────────┘  │ │
│  │  ┌──────────────────────────────────────────────────────┐  │ │
│  │  │ Logic-Driven:                                         │  │ │
│  │  │ 1. User enters source value (e.g., "3" children)     │  │ │
│  │  │ 2. SurveyJS triggers onValueChanged event            │  │ │
│  │  │ 3. Binding watcher detects change                    │  │ │
│  │  │ 4. panelCount auto-updates to 3                      │  │ │
│  │  │ 5. 3 panels auto-render on next page                 │  │ │
│  │  └──────────────────────────────────────────────────────┘  │ │
│  │                                                               │ │
│  │  Step 4: Data Collection                                    │ │
│  │  ────────────────────────────────────────────────────────   │ │
│  │  model.data = {                                             │ │
│  │    number_of_children: 3,                                   │ │
│  │    children_details: [  ← Array of objects                  │ │
│  │      { child_name: "Alex", child_age: 5 },                  │ │
│  │      { child_name: "Sam", child_age: 3 },                   │ │
│  │      { child_name: "Jordan", child_age: 7 }                 │ │
│  │    ]                                                         │ │
│  │  }                                                           │ │
│  └────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ Submit (model.onComplete)
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                       API: POST /api/submissions                 │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  Body:                                                       │ │
│  │  {                                                           │ │
│  │    "formId": 123,                                            │ │
│  │    "data": {                                                 │ │
│  │      "children_details": [...]  ← Loop data as array        │ │
│  │    },                                                        │ │
│  │    "metadata": { "status": "complete" }                     │ │
│  │  }                                                           │ │
│  └────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ INSERT INTO submissions
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                       PostgreSQL Database                        │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  submissions.data (JSONB)                                   │ │
│  │  {                                                           │ │
│  │    "number_of_children": 3,                                 │ │
│  │    "children_details": [                                    │ │
│  │      { "child_name": "Alex", "child_age": 5 },              │ │
│  │      { "child_name": "Sam", "child_age": 3 },               │ │
│  │      { "child_name": "Jordan", "child_age": 7 }             │ │
│  │    ]                                                         │ │
│  │  }                                                           │ │
│  └────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ GET /api/submissions?formId=123
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                          ResultsViewer                           │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  Display Loop Data:                                         │ │
│  │  ────────────────────────────────────────────────────────   │ │
│  │  • Flatten arrays for CSV export                            │ │
│  │  • Aggregate statistics (avg, count, sum)                   │ │
│  │  • Display individual submission details                    │ │
│  │                                                               │ │
│  │  Example Table View:                                        │ │
│  │  ┌──────────────────────────────────────────────────────┐  │ │
│  │  │ Submission ID │ # Children │ Child 1 │ Child 2 │ ... │  │ │
│  │  ├──────────────────────────────────────────────────────┤  │ │
│  │  │ 501           │ 3          │ Alex    │ Sam     │ ... │  │ │
│  │  │ 502           │ 2          │ Max     │ Emma    │     │  │ │
│  │  └──────────────────────────────────────────────────────┘  │ │
│  └────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

---

## Event Flow: Logic-Driven Loop

### Step-by-Step Execution

```
┌─────────────────────────────────────────────────────────────────┐
│ Page 1: Source Question                                          │
└─────────────────────────────────────────────────────────────────┘
                              │
                User enters: "3"
                              │
                              ▼
         ┌────────────────────────────────────────┐
         │  SurveyJS Event: onValueChanged        │
         │  ─────────────────────────────────────  │
         │  sender.data["number_of_children"] = 3 │
         └────────────────────────────────────────┘
                              │
                              ▼
         ┌────────────────────────────────────────┐
         │  Binding Watcher Triggered              │
         │  ─────────────────────────────────────  │
         │  Detects: bindings.panelCount points   │
         │  to "number_of_children"                │
         └────────────────────────────────────────┘
                              │
                              ▼
         ┌────────────────────────────────────────┐
         │  Update Loop Property                   │
         │  ─────────────────────────────────────  │
         │  children_details.panelCount = 3        │
         └────────────────────────────────────────┘
                              │
                User clicks "Next"
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ Page 2: Loop Page (children_details)                             │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ Panel 1: child_name, child_age                              │ │
│ │ Panel 2: child_name, child_age                              │ │
│ │ Panel 3: child_name, child_age                              │ │
│ └─────────────────────────────────────────────────────────────┘ │
│  3 panels auto-rendered because panelCount = 3                  │
└─────────────────────────────────────────────────────────────────┘
                              │
                User fills all panels
                              │
                              ▼
         ┌────────────────────────────────────────┐
         │  Data Structure Built                   │
         │  ─────────────────────────────────────  │
         │  children_details = [                   │
         │    { child_name: "Alex", child_age: 5 },│
         │    { child_name: "Sam", child_age: 3 }, │
         │    { child_name: "Jordan", child_age: 7}│
         │  ]                                       │
         └────────────────────────────────────────┘
                              │
                User clicks "Submit"
                              │
                              ▼
         ┌────────────────────────────────────────┐
         │  model.onComplete Event                 │
         │  ─────────────────────────────────────  │
         │  POST /api/submissions                  │
         │  Body: { data: { children_details: [...] } } │
         └────────────────────────────────────────┘
```

---

## Code Examples: Accessing Loop Data

### 1. In FormViewer (During Survey)

#### Access Specific Panel Data (inside loop)
```javascript
// Inside a paneldynamic templateElement, use {panel.fieldName}
{
  "type": "html",
  "html": "You entered: {panel.child_name} (Age: {panel.child_age})"
}
```

#### Access All Loop Data
```javascript
// In visibleIf or custom expressions
{
  "visibleIf": "{children_details.length} > 0"
}

// Display loop count
{
  "html": "You have {children_details.length} children."
}
```

#### Access Source Question from Loop
```javascript
// Dynamic titles referencing source
{
  "templateTitle": "Child #{panelIndex + 1} of {number_of_children}"
}
```

---

### 2. In Server API (After Submission)

#### Retrieve Submission with Loop Data
```javascript
// GET /api/submissions/:id
router.get('/submissions/:id', authenticate, async (req, res) => {
  const submission = await db.query(
    'SELECT * FROM submissions WHERE id = $1',
    [req.params.id]
  );

  const data = submission.rows[0].data; // JSONB column

  // Access loop arrays
  const children = data.children_details; // Array<Object>
  console.log(`Number of children: ${children.length}`);

  children.forEach((child, index) => {
    console.log(`Child ${index + 1}: ${child.child_name}, Age: ${child.child_age}`);
  });

  res.json(submission.rows[0]);
});
```

#### Query/Filter by Loop Data (PostgreSQL JSONB)
```sql
-- Find submissions with 3+ children
SELECT * FROM submissions
WHERE (data->'children_details')::jsonb IS NOT NULL
  AND jsonb_array_length(data->'children_details') >= 3;

-- Find submissions where any child is under 5
SELECT * FROM submissions
WHERE EXISTS (
  SELECT 1 FROM jsonb_array_elements(data->'children_details') child
  WHERE (child->>'child_age')::int < 5
);

-- Aggregate: Average number of children per submission
SELECT AVG(jsonb_array_length(data->'children_details')) as avg_children
FROM submissions
WHERE data->'children_details' IS NOT NULL;
```

---

### 3. In Analytics/Reports

#### Flatten Loop Data for Export (CSV)
```javascript
// In ResultsViewer or Export API
function flattenLoopData(submissions) {
  return submissions.flatMap(sub => {
    const baseData = {
      submission_id: sub.id,
      submitted_at: sub.created_at
    };

    // If no children, return one row with null values
    if (!sub.data.children_details || sub.data.children_details.length === 0) {
      return [{ ...baseData, child_name: null, child_age: null }];
    }

    // Create one row per child
    return sub.data.children_details.map((child, idx) => ({
      ...baseData,
      child_index: idx + 1,
      child_name: child.child_name,
      child_age: child.child_age
    }));
  });
}

// Export to CSV
const flatData = flattenLoopData(submissions);
const csv = Papa.unparse(flatData);
// Result:
// submission_id, submitted_at, child_index, child_name, child_age
// 501, 2025-01-15, 1, Alex, 5
// 501, 2025-01-15, 2, Sam, 3
// 502, 2025-01-16, 1, Max, 8
```

#### Aggregate Loop Statistics
```javascript
// Calculate total children across all submissions
const totalChildren = submissions.reduce((sum, sub) =>
  sum + (sub.data.children_details?.length || 0), 0
);

// Average age of all children
const allChildren = submissions.flatMap(sub =>
  sub.data.children_details || []
);
const avgAge = allChildren.reduce((sum, child) =>
  sum + child.child_age, 0
) / allChildren.length;

// Most common child name
const nameFrequency = {};
allChildren.forEach(child => {
  nameFrequency[child.child_name] = (nameFrequency[child.child_name] || 0) + 1;
});
const mostCommonName = Object.keys(nameFrequency).sort(
  (a, b) => nameFrequency[b] - nameFrequency[a]
)[0];
```

---

### 4. In Custom Validation (FormViewer)

#### Validate Sum Across Loop
```javascript
// FormViewer.jsx - Add custom validation
model.onValidateQuestion.add((sender, options) => {
  if (options.name === "budget_allocation") {
    const sum = options.value.reduce((acc, item) =>
      acc + (parseFloat(item.percentage) || 0), 0
    );

    if (Math.abs(sum - 100) > 0.01) { // Allow 0.01 tolerance
      options.error = `Budget must total 100%. Current: ${sum.toFixed(2)}%`;
    }
  }
});
```

#### Validate Uniqueness
```javascript
model.onValidateQuestion.add((sender, options) => {
  if (options.name === "team_members") {
    const emails = options.value.map(m => m.email.toLowerCase());
    const uniqueEmails = new Set(emails);

    if (emails.length !== uniqueEmails.size) {
      options.error = "Each team member must have a unique email address.";
    }
  }
});
```

---

## Performance Considerations

### Large Loop Counts (100+ panels)

**Problem:** Rendering 100+ panels can slow down the UI

**Solution 1: Pagination (renderMode)**
```json
{
  "type": "paneldynamic",
  "renderMode": "progressTop",  // Show progress bar
  "panelsState": "collapsed"    // Start panels collapsed
}
```

**Solution 2: Lazy Loading (Server-Side)**
```javascript
// Instead of one big loop, break into pages
// Page 1: "How many products? (Max 20 per page)"
// Page 2: Loop for products 1-20
// Page 3: Loop for products 21-40 (if needed)
```

**Solution 3: Alternative Question Type**
```json
// Use matrixdynamic for tabular data (faster rendering)
{
  "type": "matrixdynamic",
  "name": "products",
  "columns": [
    { "name": "product_name", "cellType": "text" },
    { "name": "quantity", "cellType": "text", "inputType": "number" }
  ]
}
```

---

## Debugging Tips

### View Loop State in Browser Console
```javascript
// In FormViewer, add this temporarily:
model.onValueChanged.add((sender, options) => {
  if (options.name === "children_details") {
    console.log("Loop data updated:", options.value);
  }
});
```

### Check Binding Status
```javascript
// Verify binding is working
const panel = model.getQuestionByName("children_details");
console.log("Panel Count:", panel.panelCount);
console.log("Bindings:", panel.bindings);
```

### Inspect Submission Data
```javascript
// Before submission
model.onComplete.add((sender) => {
  console.log("Full submission data:", sender.data);
  console.log("Loop data:", sender.data.children_details);
});
```

---

## Summary

| Stage | Loop Handling | Data Format |
|-------|---------------|-------------|
| **FormBuilder** | Define paneldynamic with bindings | JSON definition |
| **Database (forms)** | Store as JSONB in `definition` column | JSONB |
| **FormViewer** | SurveyJS Model handles rendering | JavaScript Array |
| **Submission** | POST array of objects | JSON body |
| **Database (submissions)** | Store as JSONB in `data` column | JSONB |
| **Analytics** | Flatten or aggregate arrays | CSV/JSON |

**Key Insight:** Loop logic is **fully handled by SurveyJS** - FormViewer just initializes the model and lets SurveyJS do the rest!

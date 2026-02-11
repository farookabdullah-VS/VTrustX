# 🎬 Loop Logic in FormViewer - Live Demo Guide

## How to Test the Loop Demo

### Option 1: Import via FormBuilder
1. **Open VTrustX** → Navigate to **Forms**
2. Click **"Create New Form"**
3. In FormBuilder, click the **JSON icon** (top toolbar)
4. **Paste** the contents of `client/src/templates/loop-demo-survey.json`
5. Click **"Preview"** tab to see it in action
6. Or **Save** the form and open it in **FormViewer**

### Option 2: Direct API Import (Developer)
```bash
# POST the template to your API
curl -X POST http://localhost:5000/api/forms \
  -H "Content-Type: application/json" \
  -d @client/src/templates/loop-demo-survey.json
```

---

## 🔍 What Happens in FormViewer

### **The Magic Line** (FormViewer.jsx:442)
```javascript
const model = new Model(formDef.definition);
```

This single line **loads the entire form definition** into SurveyJS's Model. The Model:
- ✅ Parses all `paneldynamic` questions
- ✅ Sets up event listeners for `bindings.panelCount`
- ✅ Renders Add/Remove buttons based on `allowAddPanel` / `allowRemovePanel`
- ✅ Validates `minPanelCount` / `maxPanelCount` constraints
- ✅ Stores loop data as `Array<Object>`

**Zero custom code needed** for loop logic - SurveyJS handles everything!

---

## 📊 Live Demo Walkthrough

### Page 1: User-Defined Loop (Books)
**What You'll See:**
- Initial panel with 1 book entry
- **"➕ Add Another Book"** button at the bottom
- **"Remove"** button on each panel (except when only 1 remains)
- Counter shows `(1 of 5)` if you add more

**Try This:**
1. Click "Add Another Book" → New panel appears
2. Fill in book details (title, author, rating)
3. Click "Remove" → Confirmation dialog appears
4. Max out at 5 books → Add button disappears

**Behind the Scenes:**
```json
{
  "type": "paneldynamic",
  "name": "favorite_books",
  "panelCount": 1,
  "minPanelCount": 1,
  "maxPanelCount": 5,
  "allowAddPanel": true,   ← Shows "Add" button
  "allowRemovePanel": true  ← Shows "Remove" button
}
```

**Data Stored:**
```javascript
favorite_books: [
  { book_title: "1984", author: "Orwell", rating: 5 },
  { book_title: "Dune", author: "Herbert", rating: 4 }
]
```

---

### Page 2: Hard-Coded Loop (Emergency Contacts)
**What You'll See:**
- Exactly 3 panels pre-rendered
- **No Add/Remove buttons** (disabled)
- All 3 required to proceed

**Try This:**
1. Fill all 3 contacts → Can proceed
2. Leave one empty → Validation error blocks Next
3. No way to add/remove panels

**Behind the Scenes:**
```json
{
  "type": "paneldynamic",
  "name": "emergency_contacts",
  "panelCount": 3,
  "minPanelCount": 3,
  "maxPanelCount": 3,
  "allowAddPanel": false,   ← No "Add" button
  "allowRemovePanel": false  ← No "Remove" button
}
```

---

### Page 3: Logic-Driven Loop (Children)
**What You'll See:**
- A number input: "How many children?"
- Enter `3` → Next page shows **exactly 3 panels**
- Enter `0` → Next page is **skipped** (visibleIf)

**Try This:**
1. Enter `2` → Click Next
2. See 2 pre-generated child panels
3. Go back, change to `4` → Now see 4 panels
4. Enter `0` → Page is hidden

**Behind the Scenes:**
```json
// Source Question
{
  "type": "text",
  "name": "number_of_children",
  "inputType": "number"
}

// Loop on Next Page
{
  "type": "paneldynamic",
  "name": "children_details",
  "panelCount": 0,              ← Starts empty
  "bindings": {
    "panelCount": "number_of_children"  ← 🔗 Auto-updates!
  },
  "allowAddPanel": false,
  "allowRemovePanel": false
}

// Page Visibility
{
  "name": "logic_driven_loop",
  "visibleIf": "{number_of_children} > 0"  ← Conditional page
}
```

**The Binding Magic:**
- SurveyJS watches `number_of_children` for changes
- When value changes, triggers `onValueChanged` event
- Automatically updates `panelCount` property
- Re-renders panels with new count

---

### Page 4: Multi-Select Loop (Service Feedback)
**What You'll See:**
- Checkbox: "Select VTrustX modules"
- Select 3 modules → Next page shows **3 feedback panels**
- Each panel title shows the **selected item name**

**Try This:**
1. Select: "Form Builder", "Analytics", "CJM"
2. Next page shows 3 panels with titles:
   - "📦 forms"
   - "📦 analytics"
   - "📦 cjm"
3. Go back, uncheck "Analytics" → Now only 2 panels

**Behind the Scenes:**
```json
// Multi-Select Source
{
  "type": "checkbox",
  "name": "selected_services",
  "choices": ["forms", "analytics", "cjm", "workflows", "crm"]
}

// Array-Length Binding
{
  "type": "paneldynamic",
  "name": "service_feedback",
  "templateTitle": "📦 {selected_services[panelIndex]}",  ← Dynamic title!
  "bindings": {
    "panelCount": "selected_services.length"  ← Binds to array length
  }
}
```

**Array Indexing:**
- `{selected_services[panelIndex]}` → Shows current item
- `panelIndex` is auto-provided by SurveyJS (0, 1, 2...)
- Example: Panel 0 shows `selected_services[0]` = "forms"

---

## 🔧 FormViewer Implementation Details

### Survey Initialization (FormViewer.jsx:442-524)
```javascript
// 1. Create SurveyJS Model
const model = new Model(formDef.definition);

// 2. Apply Theme
setupSurveyColors(model);
model.applyTheme(VTrustTheme);

// 3. Set Language
model.locale = i18n.language;

// 4. Enable Features
if (formDef.allowAudio) model.setVariable("allowAudio", true);

// 5. Handle Password-Protected Forms
if (formDef.password) {
  model.jsonObj.password = formDef.password;
}

// 6. Load Existing Submission (Edit Mode)
if (submissionId) {
  axios.get(`/api/submissions/${submissionId}`)
    .then(subRes => {
      model.data = subRes.data.data;  // ← Loads loop arrays!
      model.mode = 'edit';
    });
}
```

### Data Submission (onComplete Event)
```javascript
model.onComplete.add((sender) => {
  const data = sender.data;  // ← Contains all loop arrays

  // Example data structure:
  // {
  //   favorite_books: [{ book_title: "...", author: "..." }],
  //   emergency_contacts: [{ contact_name: "...", phone: "..." }],
  //   children_details: [{ child_name: "...", child_age: 5 }],
  //   service_feedback: [{ satisfaction: 8, feedback_comment: "..." }]
  // }

  axios.post(`/api/submissions`, {
    formId: resolvedId,
    data: data,  // ← All loops stored as arrays
    metadata: { /* ... */ }
  });
});
```

---

## 🎯 Key Takeaways

### 1. **Zero Custom Code Required**
   - FormViewer just creates `new Model(definition)`
   - SurveyJS handles **all loop rendering, binding, and validation**

### 2. **Three Patterns Work Out-of-the-Box**
   | Pattern | FormViewer Code | SurveyJS Handles |
   |---------|----------------|------------------|
   | User-Defined | None | Add/Remove buttons, confirmDelete |
   | Hard-Coded | None | Fixed panel count, no buttons |
   | Logic-Driven | None | Watches bindings, auto-updates panels |

### 3. **Data Structure is Consistent**
   - All loops store as `Array<Object>`
   - Each iteration = 1 object in the array
   - Accessible via `{loopName[index].questionName}`

### 4. **Advanced Features Work Automatically**
   - **Dynamic Titles**: `{sourceQuestion[panelIndex]}`
   - **Conditional Visibility**: `visibleIf` on panels/pages
   - **Nested Questions**: Questions inside panels can reference `{panel.fieldName}`
   - **Validation**: `minPanelCount`, `maxPanelCount`, `isRequired` on template elements

---

## 🚀 Testing Checklist

When testing loop logic in FormViewer, verify:

- [ ] **User-Defined**: Add/Remove buttons work, min/max enforced, confirmDelete shows
- [ ] **Hard-Coded**: Correct number of panels, no buttons, all required
- [ ] **Logic-Driven**: Panels update when source changes, visibleIf hides page if 0
- [ ] **Multi-Select**: Panel count = array length, dynamic titles show correct items
- [ ] **Data Storage**: Submission contains arrays of objects
- [ ] **Edit Mode**: Loading existing submission populates all loop panels
- [ ] **Validation**: Required fields in loops block submission
- [ ] **Navigation**: Can go back and modify loop count/selections

---

## 📚 Related Files

- **Demo Template**: `client/src/templates/loop-demo-survey.json`
- **Enterprise Example**: `client/src/templates/enterprise-loop-survey.json`
- **FormViewer**: `client/src/components/FormViewer.jsx`
- **Loop Builder**: `client/src/components/SurveyLoopLogic.js`
- **Loop Config UI**: `client/src/components/LoopLogicView.jsx`
- **Documentation**: `client/src/docs/LoopLogic.md`

---

## 💡 Pro Tips

### Tip 1: Preventing Empty Loops
```json
{
  "visibleIf": "{number_of_children} > 0",
  "panelCount": 0,
  "minPanelCount": 0
}
```
Page is hidden when source = 0, preventing "No panels" state.

### Tip 2: Dynamic Panel Titles
```json
{
  "templateTitle": "Child #{panelIndex + 1}: {panel.child_name}"
}
```
Shows: "Child #1: Alex" using both index and current panel data.

### Tip 3: Nested Conditionals
```json
{
  "type": "comment",
  "name": "issueDetails",
  "visibleIf": "{panel.anyIssue} = true"  ← Access current panel
}
```
Questions inside loops can reference their own panel's data using `{panel.fieldName}`.

### Tip 4: Sum Validation
```javascript
// In FormViewer, add custom validation:
model.onValidateQuestion.add((sender, options) => {
  if (options.name === "budget_allocation") {
    const sum = options.value.reduce((acc, item) =>
      acc + (item.percentage || 0), 0
    );
    if (sum !== 100) {
      options.error = `Total must be 100%. Currently: ${sum}%`;
    }
  }
});
```

---

## 🎬 Ready to Test?

1. **Import** `loop-demo-survey.json` into FormBuilder
2. Click **"Preview"** to test in FormViewer
3. Try all three loop types
4. Submit and check the **Results** tab to see loop data structure

**Need help?** Check the [LoopLogic.md](./LoopLogic.md) for deeper technical details.

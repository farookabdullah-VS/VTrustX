# Emoji to Lucide Icon Mapping

## Common Emoji Mappings

| Emoji | Lucide Icon | Import |
|-------|-------------|--------|
| 👥 | `Users` | `import { Users } from 'lucide-react';` |
| 📊 | `BarChart3` or `TrendingUp` | `import { BarChart3 } from 'lucide-react';` |
| ⏱️ | `Clock` or `Timer` | `import { Clock } from 'lucide-react';` |
| ✨ | `Sparkles` | `import { Sparkles } from 'lucide-react';` |
| 🎫 | `Ticket` | `import { Ticket } from 'lucide-react';` |
| 📢 | `Megaphone` | `import { Megaphone } from 'lucide-react';` |
| 📝 | `FileText` or `FileSignature` | `import { FileText } from 'lucide-react';` |
| ⚙️ | `Settings` | `import { Settings } from 'lucide-react';` |
| 🔁 | `RefreshCw` or `Repeat` | `import { RefreshCw } from 'lucide-react';` |
| ⭐ | `Star` | `import { Star } from 'lucide-react';` |
| 🏠 | `Home` | `import { Home } from 'lucide-react';` |
| 📋 | `ClipboardList` | `import { ClipboardList } from 'lucide-react';` |
| 🤖 | `Bot` | `import { Bot } from 'lucide-react';` |
| 💬 | `MessageCircle` | `import { MessageCircle } from 'lucide-react';` |
| 🗺️ | `Map` | `import { Map } from 'lucide-react';` |
| 👤 | `User` | `import { User } from 'lucide-react';` |
| 📈 | `TrendingUp` | `import { TrendingUp } from 'lucide-react';` |
| ⚡ | `Zap` | `import { Zap } from 'lucide-react';` |
| 🔧 | `Wrench` or `Tool` | `import { Wrench } from 'lucide-react';` |
| 🌐 | `Globe` | `import { Globe } from 'lucide-react';` |
| 📚 | `BookOpen` | `import { BookOpen } from 'lucide-react';` |
| 💾 | `Save` or `HardDrive` | `import { Save } from 'lucide-react';` |
| 🎨 | `Palette` | `import { Palette } from 'lucide-react';` |
| 🔒 | `Lock` | `import { Lock } from 'lucide-react';` |
| 🔓 | `Unlock` | `import { Unlock } from 'lucide-react';` |
| 📁 | `Folder` | `import { Folder } from 'lucide-react';` |
| 📂 | `FolderOpen` | `import { FolderOpen } from 'lucide-react';` |
| 🔍 | `Search` | `import { Search } from 'lucide-react';` |
| ➕ | `Plus` | `import { Plus } from 'lucide-react';` |
| ➖ | `Minus` | `import { Minus } from 'lucide-react';` |
| ✓ | `Check` | `import { Check } from 'lucide-react';` |
| ✕ | `X` | `import { X } from 'lucide-react';` |
| ↻ | `RotateCw` | `import { RotateCw } from 'lucide-react';` |
| ← | `ArrowLeft` | `import { ArrowLeft } from 'lucide-react';` |
| → | `ArrowRight` | `import { ArrowRight } from 'lucide-react';` |
| ↑ | `ArrowUp` | `import { ArrowUp } from 'lucide-react';` |
| ↓ | `ArrowDown` | `import { ArrowDown } from 'lucide-react';` |

## Priority Files (High Impact)

### 1. **Dashboard.jsx** (CRITICAL - User facing)
Emoji found: 👥, 📊, ⏱️, ✨
- Replace metric card emojis with proper Lucide icons
- Status: NOT STARTED

### 2. **Sidebar/Navigation Components** (CRITICAL)
Files: AppLayout.jsx, Sidebar components
Emoji found: 🏠, 📋, 🤖, 💬, 🗺️, 👤, 📈, ⚡, 🔧, 📢, 📝, ⚙️
- Replace navigation menu emojis
- Status: NOT STARTED

### 3. **FormBuilder.jsx** (HIGH)
Emoji found: Various in toolbox
- Replace form element icons
- Status: NOT STARTED

### 4. **Ticket Components** (HIGH)
Files: TicketDetailView, TicketList
Emoji found: 🎫
- Replace ticket icons
- Status: NOT STARTED

### 5. **FormViewer.jsx** (MEDIUM)
- Replace any emoji in form rendering
- Status: NOT STARTED

## Implementation Pattern

### Before:
```jsx
<div style={{ fontSize: '2rem' }}>
  📊
</div>
```

### After:
```jsx
import { BarChart3 } from 'lucide-react';

<BarChart3 size={32} color="#10b981" />
```

### With Styling:
```jsx
<BarChart3
  size={24}
  color="currentColor"
  strokeWidth={2}
  className="icon-class"
/>
```

## Lucide Icon Props

- `size`: Number (default: 24)
- `color`: String (CSS color, default: "currentColor")
- `strokeWidth`: Number (default: 2)
- `absoluteStrokeWidth`: Boolean
- `className`: String
- All SVG props are supported

## Testing Checklist

- [ ] Dashboard metrics display correctly
- [ ] Sidebar navigation icons render
- [ ] Form builder toolbox icons work
- [ ] Ticket icons show properly
- [ ] Icons are accessible (have aria-label if icon-only)
- [ ] Icons scale correctly with responsive layouts
- [ ] Icons match brand colors
- [ ] No emoji remain in production code

## Progress Tracking

Total files with emoji: 42
Files updated: 0
Percentage complete: 0%

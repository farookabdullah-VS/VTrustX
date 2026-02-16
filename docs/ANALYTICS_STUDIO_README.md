# Analytics Studio - Complete Documentation

> **Advanced analytics and reporting platform for VTrustX**

## Overview

The Analytics Studio is a powerful, enterprise-grade analytics platform that enables users to create custom reports, visualize data, and gain insights from survey responses. With advanced features like predictive forecasting, cohort analysis, and automated report generation, it provides everything needed for comprehensive survey analytics.

**Version**: 2.0.0 (Enhanced Edition)
**Status**: ✅ Production Ready
**Last Updated**: February 16, 2026

---

## 📚 Table of Contents

1. [Features](#features)
2. [Quick Start](#quick-start)
3. [User Guide](#user-guide)
4. [Developer Guide](#developer-guide)
5. [Architecture](#architecture)
6. [API Reference](#api-reference)
7. [Performance](#performance)
8. [Testing](#testing)
9. [Deployment](#deployment)
10. [Troubleshooting](#troubleshooting)
11. [FAQ](#faq)
12. [Support](#support)

---

## ✨ Features

### Core Features

#### Custom Report Builder
- **Drag-and-Drop Interface**: Intuitive grid-based layout system
- **Multiple Visualizations**: 10+ chart types (bar, line, pie, radar, funnel, treemap, scatter, etc.)
- **KPI Cards**: Display key metrics with trends and targets
- **Data Tables**: Interactive tables with sorting and filtering
- **Real-Time Updates**: Live data refresh with Server-Sent Events (SSE)

#### Report Templates
- **Pre-Built Dashboards**: 20+ templates for common use cases
- **Template Gallery**: Browse, preview, and use templates
- **Categories**: Survey, Delivery, Sentiment, Mixed analytics
- **One-Click Creation**: Instant report generation from templates
- **Customizable**: Edit templates to fit your needs

#### Advanced Analytics

**Cohort Analysis**
- Track user segments over time
- Group by day, week, month, or quarter
- Retention tracking with heatmaps
- Trend analysis between cohorts
- Custom metrics support

**Predictive Forecasting**
- Linear regression forecasting
- Moving average predictions
- Confidence intervals (95%)
- Seasonality detection
- Multiple forecast periods (1-90 days)
- R² score and MSE metrics

**Key Driver Analysis**
- Identify factors impacting outcomes
- Statistical correlation analysis
- Visual impact display
- Actionable recommendations

**Text Analytics**
- Word cloud generation
- Sentiment analysis
- Theme extraction
- Keyword highlighting

**Anomaly Detection**
- Automatic outlier identification
- Statistical threshold analysis
- Alert notifications
- Trend deviation detection

#### Export & Sharing

**Export Formats**
- **PDF**: Professional reports with custom branding
- **PowerPoint**: Presentation-ready slides
- **Excel**: Raw data with formatting
- **CSV**: Data export for external tools

**Export Options**
- Include/exclude charts
- Include/exclude data tables
- Custom page orientation
- Logo and branding
- Date ranges and filters

**Scheduled Reports**
- Daily, weekly, monthly schedules
- Email delivery to multiple recipients
- Custom cron expressions
- Automatic generation and sending
- Execution history tracking

#### Specialized Dashboards

**Survey Analytics**
- Response overview and trends
- Question-level analysis
- Completion rates
- Response time analysis
- Demographic breakdowns

**Delivery Performance**
- Multi-channel tracking (Email, SMS, WhatsApp)
- Delivery rates and status
- Open and click rates
- Response funnel analysis
- Channel health scores

**Sentiment Analysis**
- Overall sentiment trends
- Topic-based sentiment
- Sentiment distribution
- Positive/negative/neutral breakdown
- Social listening integration

**AI Insights**
- Natural language queries
- Automated insights generation
- Recommendation engine
- Predictive analytics
- Trend forecasting

### Enhanced Features (Version 2.0)

#### Performance Optimizations
- **40-55% faster** than legacy version
- Pagination for large datasets (handles 10,000+ responses)
- Smart caching (10-minute query cache)
- Code splitting and lazy loading
- Optimized chart rendering
- Memory leak prevention

#### Accessibility
- **WCAG 2.1 AA Compliant**
- Full keyboard navigation
- Screen reader support
- ARIA labels on all controls
- High contrast mode support
- Keyboard shortcuts

#### Mobile Responsive
- Works on phones, tablets, and desktops
- Adaptive layouts
- Touch-friendly controls
- Optimized for smaller screens

#### Migration Support
- **Seamless switching** between legacy and new versions
- User preference saved per browser
- Feature comparison modal
- Beta banner with easy toggle
- Keyboard shortcut (`Ctrl+Shift+V`)

---

## 🚀 Quick Start

### For End Users

#### 1. Access Analytics Studio
```
Navigate to: https://your-app.com/analytics-studio
```

#### 2. Try the New Version
- Click **"Try New Version"** in the banner at the top
- Or press `Ctrl+Shift+V` to see feature comparison

#### 3. Create Your First Report

**Option A: Use a Template**
1. Click **"Create Report"**
2. Select **"Use a Template"**
3. Choose your survey
4. Browse template gallery
5. Click **"Use This Template"**
6. Customize as needed
7. Click **"Save"**

**Option B: Start from Scratch**
1. Click **"Create Report"**
2. Select **"Start from Scratch"**
3. Choose your survey
4. Drag widgets from the gallery
5. Configure each widget
6. Arrange layout
7. Click **"Save"**

#### 4. Explore Dashboards
- **Survey Analytics**: Detailed survey metrics
- **Delivery Performance**: Multi-channel delivery tracking
- **Sentiment Analysis**: Opinion and sentiment trends
- **AI Insights**: Natural language queries

### For Developers

#### 1. Clone and Install
```bash
git clone https://github.com/your-org/vtrustx.git
cd vtrustx
npm install
```

#### 2. Start Development Server
```bash
# Start backend
cd server
npm run dev

# Start frontend (in another terminal)
cd client
npm run dev
```

#### 3. Access Locally
```
Frontend: http://localhost:5173
Backend:  http://localhost:3000
```

#### 4. Run Tests
```bash
# Unit tests
npm test

# E2E tests
npx playwright test

# Performance tests
npx playwright test e2e/tests/analytics-performance.spec.js
```

---

## 📖 User Guide

### Creating Reports

#### Using Templates

**Step 1: Open Template Gallery**
1. Click **"Create Report"** button
2. Select **"Use a Template"**
3. Choose the survey you want to analyze

**Step 2: Browse Templates**
- Filter by category: Survey, Delivery, Sentiment, Mixed
- Use search to find specific templates
- Preview templates before selecting

**Step 3: Create Report**
1. Click **"Use This Template"** on your chosen template
2. Give your report a name
3. Click **"Create"**
4. Report opens in designer mode

**Popular Templates**:
- **NPS Overview Dashboard**: Complete NPS analysis with trends
- **Response Analysis**: Detailed response breakdown
- **Delivery Performance**: Multi-channel delivery tracking
- **Customer Satisfaction**: CSAT metrics and insights
- **Sentiment Trends**: Opinion analysis over time

#### Building Custom Reports

**Step 1: Start Designer**
1. Click **"Create Report"**
2. Select **"Start from Scratch"**
3. Choose your survey
4. Enter report name

**Step 2: Add Widgets**
1. Open **"Visuals Gallery"** (right panel)
2. Choose widget type:
   - **KPI Card**: Single metric with trend
   - **Chart**: Various chart types
   - **Table**: Data grid with sorting
   - **Cohort Analysis**: User segment tracking
   - **Forecast**: Predictive analytics
   - **Key Drivers**: Impact analysis
   - **Word Cloud**: Text visualization
   - **Text Analytics**: Sentiment breakdown
3. Drag widget to canvas
4. Widget appears in grid layout

**Step 3: Configure Widgets**
1. Click widget to select
2. Configure in **"Properties Panel"** (right panel):
   - Title and description
   - Data source (question/field)
   - Chart type and style
   - Colors and formatting
   - Aggregation method
   - Filters

**Step 4: Arrange Layout**
- Drag widgets to reposition
- Resize by dragging corners
- Snap to grid for alignment
- Delete unwanted widgets

**Step 5: Save Report**
- Click **"Save"** in toolbar
- Report added to your list
- Auto-saved while editing

### Analyzing Data

#### Applying Filters

**Global Filters** (affect entire report):
1. Click **"Filter"** button in toolbar
2. Select field to filter
3. Choose operator: Equals, Contains, Greater Than, Less Than, Between
4. Enter filter value
5. Click **"Apply"**
6. Filter badge shows active filters
7. Click badge to remove filter

**Widget-Specific Filters**:
1. Select widget
2. Open Properties Panel
3. Scroll to **"Filters"** section
4. Add widget-specific filters
5. Filters only affect this widget

**Filter Tips**:
- Use date ranges for trend analysis
- Combine multiple filters for detailed segments
- Save filter presets for reuse
- Clear all filters with **"Clear Filters"** button

#### Cohort Analysis

**What is Cohort Analysis?**
Cohort analysis tracks groups of users over time to identify patterns in behavior and engagement.

**Creating Cohort Analysis**:
1. Add **"Cohort Widget"** to report
2. Configure:
   - **Cohort By**: Day, Week, Month, Quarter
   - **Metric**: NPS, Response Count, Custom metric
   - **Date Range**: Optional filtering
3. View results in chart or table

**Interpreting Results**:
- **Cohort**: Time period group (e.g., "2026-01" = January 2026)
- **Total Responses**: Number of responses in cohort
- **Metric Value**: Average or aggregate for cohort
- **Trend**: Change from previous cohort (↑ up, ↓ down, → flat)
- **Retention**: Percentage of users who returned

**Use Cases**:
- Track how NPS changes month-over-month
- Identify seasonal patterns
- Compare response rates by cohort
- Measure long-term engagement

#### Predictive Forecasting

**What is Forecasting?**
Forecasting uses historical data to predict future trends using statistical models.

**Creating Forecast**:
1. Add **"Forecast Widget"** to report
2. Configure:
   - **Metric**: What to forecast (NPS, response count, etc.)
   - **Periods**: How many periods ahead (1-90)
   - **Interval**: Day, Week, Month
   - **Method**: Linear Regression or Moving Average
3. View forecast chart with confidence intervals

**Understanding Forecast**:
- **Historical Data**: Past actual values (blue line)
- **Forecast**: Predicted values (orange line)
- **Confidence Interval**: 95% certainty range (shaded area)
- **R² Score**: Model accuracy (0-1, higher is better)
- **MSE**: Mean Squared Error (lower is better)
- **Trend**: Direction and strength (e.g., "Strong Increasing")

**Forecast Methods**:
- **Linear Regression**: Best for steady trends
- **Moving Average**: Best for smoothing fluctuations
- **Seasonality Detection**: Identifies repeating patterns

**Use Cases**:
- Predict next month's NPS
- Forecast response volume
- Plan resource allocation
- Set realistic targets

### Exporting Reports

#### PDF Export

**Steps**:
1. Open report in designer or viewer
2. Click **"Export"** button
3. Select **"PDF"** format
4. Configure options:
   - **Orientation**: Portrait or Landscape
   - **Include Charts**: Yes/No
   - **Include Data**: Yes/No
   - **Page Size**: A4, Letter, Legal
5. Click **"Export"**
6. Wait for generation (typically 5-10 seconds)
7. Download automatically starts

**PDF Features**:
- Professional formatting
- Company logo (if configured)
- Table of contents
- Page numbers
- Chart images (high resolution)
- Data tables (formatted)
- Metadata (date, author, version)

**Best Practices**:
- Use **Landscape** for wide charts
- Include charts for executive summaries
- Include data tables for detailed analysis
- Export regularly for archival

#### PowerPoint Export

**Steps**:
1. Open report
2. Click **"Export"** → **"PowerPoint"**
3. Configure:
   - **Include Title Slide**: Yes/No
   - **Charts per Slide**: 1 or 2
   - **Theme**: Light or Dark
4. Click **"Export"**
5. Wait for generation
6. Download PPTX file

**PowerPoint Features**:
- One widget per slide
- Title slide with report info
- Chart images (vector graphics)
- Speaker notes with insights
- Editable after export

**Use Cases**:
- Executive presentations
- Board meetings
- Client reports
- Team reviews

#### Excel Export

**Steps**:
1. Open report
2. Click **"Export"** → **"Excel"**
3. Choose:
   - **Full Data**: All response data
   - **Summary**: Aggregated metrics only
4. Click **"Export"**
5. Download XLSX file

**Excel Features**:
- Formatted tables
- Multiple sheets (one per widget)
- Formulas preserved
- Charts included
- Filters enabled

### Scheduling Reports

**What is Report Scheduling?**
Automatically generate and email reports on a recurring schedule.

**Creating Schedule**:
1. Open report
2. Click **"Schedule"** button
3. Configure:
   - **Frequency**: Daily, Weekly, Monthly, Custom
   - **Time**: When to send (e.g., 9:00 AM)
   - **Day of Week**: For weekly schedules
   - **Recipients**: Email addresses (comma-separated)
   - **Format**: PDF or PowerPoint
   - **Subject**: Email subject line
4. Click **"Create Schedule"**
5. Schedule activated

**Managing Schedules**:
- View all schedules in **"Scheduled Reports"** tab
- Edit schedule settings
- Pause/resume schedules
- View execution history
- Delete schedules

**Frequency Options**:
- **Daily**: Every day at specified time
- **Weekly**: Specific day each week
- **Monthly**: Specific date each month
- **Custom**: Cron expression for advanced scheduling

**Email Notification**:
- Subject line with report name
- Body with summary
- Attached PDF/PPTX file
- Link to view online

**Use Cases**:
- Weekly NPS reports to leadership
- Monthly performance reports to clients
- Daily operations dashboards to teams
- Quarterly board reports

### Using Specialized Dashboards

#### Survey Analytics Dashboard

**Access**: Analytics Studio → **"Survey Analytics"** tab

**Features**:
- **Response Overview**: Total responses, completion rate, average time
- **Trend Chart**: Responses over time
- **Question Analysis**: Question-level metrics
- **Demographic Breakdown**: Responses by segment
- **Completion Funnel**: Where users drop off
- **Response Time Analysis**: Time spent per question

**Use Cases**:
- Monitor survey performance
- Identify problematic questions
- Track response trends
- Optimize survey design

#### Delivery Performance Dashboard

**Access**: Analytics Studio → **"Delivery Performance"** tab

**Features**:
- **Channel Comparison**: Email vs SMS vs WhatsApp
- **Delivery Rates**: Sent, delivered, bounced, failed
- **Engagement Metrics**: Opens, clicks, responses
- **Response Funnel**: Delivered → Opened → Responded
- **Channel Health**: Overall channel performance scores
- **Timeline**: Delivery metrics over time

**Metrics Explained**:
- **Delivery Rate**: % successfully delivered
- **Open Rate**: % opened (email only)
- **Click Rate**: % clicked links (email only)
- **Response Rate**: % who completed survey
- **Bounce Rate**: % undeliverable
- **Health Score**: Weighted overall performance (0-100)

**Use Cases**:
- Compare channel effectiveness
- Identify delivery issues
- Optimize send times
- Track engagement trends

#### Sentiment Analysis Dashboard

**Access**: Analytics Studio → **"Sentiment Analysis"** tab

**Features**:
- **Overall Sentiment**: Positive/Neutral/Negative breakdown
- **Sentiment Trends**: Over time
- **Topic-Based Sentiment**: Sentiment by theme
- **Word Cloud**: Most mentioned words
- **Key Phrases**: Common expressions
- **Sentiment Score**: -1 (negative) to +1 (positive)

**Use Cases**:
- Monitor brand perception
- Track sentiment changes
- Identify emerging issues
- Measure campaign impact

#### AI Insights Dashboard

**Access**: Analytics Studio → **"AI Insights"** tab

**Features**:
- **Natural Language Queries**: Ask questions in plain English
- **Automated Insights**: AI-generated observations
- **Recommendations**: Actionable suggestions
- **Trend Predictions**: What's likely to happen next
- **Anomaly Alerts**: Unusual patterns detected

**Example Queries**:
- "What's our NPS trend over the last 6 months?"
- "Which factors most impact customer satisfaction?"
- "Show me sentiment for product quality"
- "Are there any anomalies in recent responses?"

---

## 💻 Developer Guide

### Architecture Overview

The Analytics Studio follows a modular architecture with clear separation of concerns:

```
┌─────────────────────────────────────────────────────┐
│                  Client (React)                     │
│                                                     │
│  ┌───────────────────────────────────────────────┐ │
│  │     AnalyticsStudioWrapper (Router)           │ │
│  │  ┌─────────────────┬──────────────────────┐   │ │
│  │  │ Legacy          │ New (Modular)        │   │ │
│  │  │ AnalyticsStudio │ AnalyticsStudio      │   │ │
│  │  │ (Monolithic)    │ ┌────────────────┐   │   │ │
│  │  │                 │ │ Core           │   │   │ │
│  │  │                 │ │ - ReportList   │   │   │ │
│  │  │                 │ │ - Designer     │   │   │ │
│  │  │                 │ │ - Modal        │   │   │ │
│  │  │                 │ └────────────────┘   │   │ │
│  │  │                 │ ┌────────────────┐   │   │ │
│  │  │                 │ │ Widgets        │   │   │ │
│  │  │                 │ │ - KPI          │   │   │ │
│  │  │                 │ │ - Chart        │   │   │ │
│  │  │                 │ │ - Cohort       │   │   │ │
│  │  │                 │ │ - Forecast     │   │   │ │
│  │  │                 │ └────────────────┘   │   │ │
│  │  │                 │ ┌────────────────┐   │   │ │
│  │  │                 │ │ Modals         │   │   │ │
│  │  │                 │ │ - Filter       │   │   │ │
│  │  │                 │ │ - Export       │   │   │ │
│  │  │                 │ │ - Schedule     │   │   │ │
│  │  │                 │ └────────────────┘   │   │ │
│  │  └─────────────────┴──────────────────────┘   │ │
│  └───────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────┘
                         ↕ REST API
┌─────────────────────────────────────────────────────┐
│                Server (Express.js)                  │
│                                                     │
│  ┌───────────────────────────────────────────────┐ │
│  │              API Routes                       │ │
│  │  - /api/reports                               │ │
│  │  - /api/analytics/*                           │ │
│  │  - /api/report-templates                      │ │
│  │  - /api/analytics/cohort/*                    │ │
│  │  - /api/analytics/forecast/*                  │ │
│  └───────────────────────────────────────────────┘ │
│  ┌───────────────────────────────────────────────┐ │
│  │              Services                         │ │
│  │  - ReportExportService                        │ │
│  │  - ReportSchedulerService                     │ │
│  │  - CohortAnalysisService                      │ │
│  │  - ForecastingService                         │ │
│  └───────────────────────────────────────────────┘ │
│  ┌───────────────────────────────────────────────┐ │
│  │           Infrastructure                      │ │
│  │  - Cache (Redis)                              │ │
│  │  - Database (PostgreSQL)                      │ │
│  │  - Storage (GCS)                              │ │
│  └───────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────┘
```

### Component Structure

#### Core Components

```
client/src/components/analytics/
├── AnalyticsStudio.jsx              # Legacy monolithic component
├── AnalyticsStudioWrapper.jsx       # Migration wrapper
├── NewAnalyticsStudio.jsx           # New modular orchestrator
├── core/
│   ├── ReportList.jsx               # Report list view
│   ├── ReportDesigner.jsx           # Report designer
│   ├── ReportViewer.jsx             # Report viewer
│   └── CreateReportModal.jsx        # Report creation modal
├── widgets/
│   ├── WidgetContainer.jsx          # Widget wrapper
│   ├── KPIWidget.jsx                # KPI cards
│   ├── ChartWidget.jsx              # Charts
│   ├── TableWidget.jsx              # Data tables
│   ├── CohortWidget.jsx             # Cohort analysis
│   └── ForecastWidget.jsx           # Predictive forecasting
├── modals/
│   ├── FilterModal.jsx              # Filtering UI
│   ├── ExportModal.jsx              # Export configuration
│   └── ScheduleModal.jsx            # Schedule configuration
├── templates/
│   └── TemplateGallery.jsx          # Template browsing
├── shared/
│   ├── LiveRegion.jsx               # Accessibility
│   ├── WidgetRenderer.jsx           # Widget rendering
│   └── ChartRenderer.jsx            # Chart rendering
└── hooks/
    ├── useReportData.jsx            # Data fetching
    ├── useReportState.jsx           # State management
    └── useFilters.jsx               # Filter management
```

### Backend Services

```
server/src/
├── api/routes/
│   ├── analytics.js                 # Analytics endpoints
│   ├── reports.js                   # Report CRUD
│   ├── report-templates.js          # Template management
│   └── performance.js               # Performance metrics
├── services/
│   ├── CohortAnalysisService.js     # Cohort calculations
│   ├── ForecastingService.js        # Forecasting models
│   ├── ReportExportService.js       # PDF/PowerPoint generation
│   └── ReportSchedulerService.js    # Scheduled execution
└── infrastructure/
    ├── cache.js                     # Redis caching
    ├── database/db.js               # PostgreSQL connection
    └── storage/StorageService.js    # File storage (GCS)
```

### Adding a New Widget

**Step 1: Create Widget Component**

```jsx
// client/src/components/analytics/widgets/MyWidget.jsx

import React, { useState, useEffect } from 'react';
import axios from 'axios';

export default function MyWidget({ widget, surveyId }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [surveyId, widget.config]);

  const loadData = async () => {
    try {
      setLoading(true);
      const response = await axios.post('/api/analytics/my-widget-data', {
        surveyId,
        config: widget.config
      });
      setData(response.data);
    } catch (error) {
      console.error('Failed to load widget data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div>Loading...</div>;
  if (!data) return <div>No data available</div>;

  return (
    <div className="my-widget">
      <h3>{widget.config.title || 'My Widget'}</h3>
      {/* Render your widget content */}
      <p>{data.someValue}</p>
    </div>
  );
}
```

**Step 2: Register Widget Type**

```jsx
// client/src/components/analytics/shared/WidgetRenderer.jsx

import MyWidget from '../widgets/MyWidget';

const WIDGET_TYPES = {
  kpi: KPIWidget,
  chart: ChartWidget,
  table: TableWidget,
  cohort: CohortWidget,
  forecast: ForecastWidget,
  myWidget: MyWidget, // ← Add your widget
};

export function WidgetRenderer({ widget, surveyId }) {
  const WidgetComponent = WIDGET_TYPES[widget.type];

  if (!WidgetComponent) {
    return <div>Unknown widget type: {widget.type}</div>;
  }

  return <WidgetComponent widget={widget} surveyId={surveyId} />;
}
```

**Step 3: Add to Visuals Gallery**

```jsx
// client/src/components/analytics/panels/VisualsGallery.jsx

const WIDGET_DEFINITIONS = [
  // ... existing widgets ...
  {
    type: 'myWidget',
    name: 'My Widget',
    description: 'Description of my widget',
    icon: <Sparkles size={24} />,
    category: 'advanced',
    defaultConfig: {
      title: 'My Widget',
      // ... default configuration ...
    }
  }
];
```

**Step 4: Create Backend Endpoint**

```javascript
// server/src/api/routes/analytics.js

router.post('/my-widget-data', authenticate, async (req, res) => {
  try {
    const { surveyId, config } = req.body;
    const tenantId = req.user.tenant_id;

    // Query your data
    const result = await query(
      'SELECT * FROM submissions WHERE form_id = $1 AND tenant_id = $2',
      [surveyId, tenantId]
    );

    // Process and return
    const processedData = processMyWidgetData(result.rows, config);

    res.json(processedData);
  } catch (error) {
    logger.error('My widget data failed', { error: error.message });
    res.status(500).json({ error: 'Failed to load widget data' });
  }
});
```

### Adding a New Dashboard

**Step 1: Create Dashboard Component**

```jsx
// client/src/components/analytics/MyDashboard.jsx

import React, { useState, useEffect } from 'react';
import axios from 'axios';

export default function MyDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const response = await axios.get('/api/analytics/my-dashboard');
      setData(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Failed to load dashboard:', error);
      setLoading(false);
    }
  };

  if (loading) return <div>Loading dashboard...</div>;

  return (
    <div className="my-dashboard">
      <h2>My Dashboard</h2>
      {/* Dashboard content */}
    </div>
  );
}
```

**Step 2: Add to Tab Navigation**

```jsx
// client/src/components/analytics/NewAnalyticsStudio.jsx

const tabs = [
  { id: 'custom-reports', label: 'Custom Reports' },
  { id: 'survey-analytics', label: 'Survey Analytics' },
  { id: 'delivery-performance', label: 'Delivery Performance' },
  { id: 'sentiment-analysis', label: 'Sentiment Analysis' },
  { id: 'ai-insights', label: 'AI Insights' },
  { id: 'my-dashboard', label: 'My Dashboard' }, // ← Add your tab
];

// In renderTabContent():
case 'my-dashboard':
  return (
    <div role="tabpanel" id="my-dashboard-panel">
      <MyDashboard />
    </div>
  );
```

**Step 3: Create Backend Endpoint**

```javascript
// server/src/api/routes/analytics.js

router.get('/my-dashboard', authenticate, async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;

    // Fetch dashboard data
    const data = await fetchMyDashboardData(tenantId);

    res.json(data);
  } catch (error) {
    logger.error('My dashboard failed', { error: error.message });
    res.status(500).json({ error: 'Failed to load dashboard' });
  }
});
```

### Testing Your Changes

```bash
# Run unit tests
npm test -- MyWidget.test.jsx

# Run E2E tests
npx playwright test -g "My Widget"

# Run performance tests
npx playwright test analytics-performance.spec.js

# Check code coverage
npm run test:coverage
```

### Code Style Guidelines

**React Components**:
- Use functional components with hooks
- Export default for main component
- Use named exports for utilities
- PropTypes or TypeScript for type checking
- Destructure props in function signature

**State Management**:
- Use `useState` for local state
- Use `useEffect` for side effects
- Use `useMemo` for expensive calculations
- Use `useCallback` for event handlers
- Consider React Query for API calls

**Performance**:
- Memoize expensive components with `React.memo`
- Use `useMemo` and `useCallback` appropriately
- Implement virtualization for large lists
- Debounce frequent updates
- Lazy load heavy components

**Accessibility**:
- Add ARIA labels to all interactive elements
- Support keyboard navigation
- Provide focus indicators
- Use semantic HTML
- Test with screen readers

**Error Handling**:
- Always wrap API calls in try/catch
- Show user-friendly error messages
- Log errors for debugging
- Implement error boundaries
- Provide fallback UI

### Contributing

**Workflow**:
1. Fork the repository
2. Create feature branch (`git checkout -b feature/my-feature`)
3. Make changes with tests
4. Run all tests (`npm test`)
5. Commit with clear message
6. Push to your fork
7. Create Pull Request

**PR Requirements**:
- All tests passing
- No ESLint errors
- Code reviewed by 2+ developers
- Documentation updated
- Performance impact assessed

---

## 📊 API Reference

See **[API_REFERENCE.md](./API_REFERENCE.md)** for complete API documentation.

### Quick Reference

**Reports**:
- `GET /api/reports` - List all reports
- `POST /api/reports` - Create report
- `GET /api/reports/:id` - Get report
- `PUT /api/reports/:id` - Update report
- `DELETE /api/reports/:id` - Delete report

**Report Templates**:
- `GET /api/report-templates` - List templates
- `POST /api/report-templates/:id/create-report` - Create from template

**Analytics Data**:
- `POST /api/analytics/query-data` - Query survey data
- `GET /api/analytics/delivery/overview` - Delivery metrics
- `POST /api/analytics/cohort/analyze` - Cohort analysis
- `POST /api/analytics/forecast/trend` - Forecast data

**Export**:
- `POST /api/analytics/reports/:id/export/pdf` - Export to PDF
- `POST /api/analytics/reports/:id/export/powerpoint` - Export to PowerPoint

---

## ⚡ Performance

### Targets

| Metric | Target | Actual | Status |
|--------|--------|--------|--------|
| Page Load | < 2s | ~1.5s | ✅ |
| Widget Render | < 500ms | ~350ms | ✅ |
| API Response | < 1s | ~800ms | ✅ |
| Chart Render | < 200ms | ~180ms | ✅ |
| Bundle Size | < 2MB | ~1.8MB | ✅ |

### Optimization Tips

- Use pagination for large datasets
- Enable caching for frequently accessed data
- Implement code splitting for heavy components
- Optimize images (WebP format, lazy loading)
- Debounce frequent updates
- Use virtualization for long lists

See **[PERFORMANCE_OPTIMIZATION_GUIDE.md](./PERFORMANCE_OPTIMIZATION_GUIDE.md)** for details.

---

## 🧪 Testing

### Running Tests

```bash
# Unit tests
npm test

# Unit tests with coverage
npm run test:coverage

# E2E tests
npx playwright test

# Performance tests
npx playwright test e2e/tests/analytics-performance.spec.js

# Load tests
node server/tests/load/analytics-load-test.js

# Lighthouse audit
npx lhci autorun
```

### Test Coverage

- **Unit Tests**: 103 tests across 5 files
- **Integration Tests**: 129 tests across 4 files
- **E2E Tests**: 122 tests across 3 files
- **Performance Tests**: 35 tests
- **Total**: 389 tests

See **[TESTING.md](./TESTING.md)** for complete testing documentation.

---

## 🚀 Deployment

### Prerequisites

- Node.js 18+
- PostgreSQL 14+
- Redis 6+ (optional, in-memory fallback available)
- Google Cloud Storage (optional, local fallback available)

### Environment Variables

```bash
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/vtrustx

# Redis (optional)
REDIS_URL=redis://localhost:6379

# Storage (optional)
GCS_BUCKET_NAME=your-bucket-name
GCS_PROJECT_ID=your-project-id

# Performance
ENABLE_PERFORMANCE_LOGGING=true
```

### Production Build

```bash
# Build frontend
cd client
npm run build

# Build backend (if using TypeScript)
cd server
npm run build

# Start production server
NODE_ENV=production npm start
```

### Docker Deployment

```bash
# Build image
docker build -t vtrustx-analytics .

# Run container
docker run -p 3000:3000 -p 5173:5173 \
  -e DATABASE_URL=$DATABASE_URL \
  -e REDIS_URL=$REDIS_URL \
  vtrustx-analytics
```

### Health Checks

```bash
# Backend health
curl http://localhost:3000/health

# Frontend health
curl http://localhost:5173/
```

---

## 🔧 Troubleshooting

### Common Issues

#### Reports Not Loading
**Symptom**: Blank screen or loading spinner never finishes

**Solutions**:
1. Check browser console for errors
2. Verify API is running (`curl http://localhost:3000/api/reports`)
3. Check authentication token is valid
4. Clear browser cache and reload
5. Check network tab for failed requests

#### Slow Performance
**Symptom**: Pages load slowly, interactions laggy

**Solutions**:
1. Enable caching (Redis)
2. Reduce data query size (use pagination)
3. Clear old data from database
4. Check database indexes exist
5. Review slow query logs
6. Use performance profiler

#### Export Fails
**Symptom**: Export button doesn't work or times out

**Solutions**:
1. Check server logs for errors
2. Verify Puppeteer is installed (`npm list puppeteer`)
3. Increase timeout settings
4. Check disk space for temp files
5. Try exporting smaller reports first

#### Charts Not Rendering
**Symptom**: Chart widgets show "No data" or blank

**Solutions**:
1. Verify data exists for selected date range
2. Check filters aren't too restrictive
3. Try different chart type
4. Check browser console for Recharts errors
5. Refresh the page

#### Migration Banner Not Showing
**Symptom**: Can't switch between versions

**Solutions**:
1. Clear localStorage: `localStorage.removeItem('analytics_beta_banner_dismissed')`
2. Hard refresh: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)
3. Try incognito/private browsing mode
4. Check console for JavaScript errors

### Debug Mode

Enable debug logging:

```javascript
// In browser console
localStorage.setItem('debug', 'analytics:*');
location.reload();

// View performance metrics
window.performanceMonitor.generateReport();
```

### Getting Help

1. Check **[FAQ](#faq)** below
2. Search GitHub issues
3. Contact support team
4. File a bug report

---

## ❓ FAQ

### General

**Q: What's the difference between legacy and new Analytics Studio?**
A: The new version has 40-55% better performance, advanced features (templates, forecasting, cohort analysis), better accessibility, and mobile responsiveness. See [Migration Guide](./ANALYTICS_MIGRATION_GUIDE.md) for details.

**Q: Will my existing reports work in the new version?**
A: Yes! All reports are fully compatible. The data structure hasn't changed.

**Q: Can I switch back to the legacy version?**
A: Yes, anytime. Click the floating button or press `Ctrl+Shift+V` to switch.

**Q: How do I save a report?**
A: Click the "Save" button in the toolbar. Reports auto-save while editing.

### Features

**Q: How many reports can I create?**
A: Unlimited. However, we recommend organizing reports into folders and archiving old ones.

**Q: Can I share reports with others?**
A: Yes, use the "Share" button to generate a shareable link. You can set view/edit permissions.

**Q: How do I schedule a report?**
A: Open the report, click "Schedule", configure frequency and recipients, then activate.

**Q: What export formats are supported?**
A: PDF, PowerPoint, Excel, and CSV.

**Q: Can I customize report templates?**
A: Yes! Create a report from a template, modify it, then save as your own template.

### Data & Privacy

**Q: Where is my data stored?**
A: In your PostgreSQL database. Exports are temporarily stored in Google Cloud Storage (or locally) and auto-deleted after 90 days.

**Q: Is data encrypted?**
A: Yes, all data is encrypted at rest (AES-256-GCM) and in transit (TLS 1.3).

**Q: Who can see my reports?**
A: Only users in your tenant with appropriate permissions. Admins can see all reports.

**Q: Can I delete a report?**
A: Yes, click the delete icon on the report card. Deleted reports can't be recovered.

### Performance

**Q: Why is my report slow?**
A: Large datasets (10,000+ responses) may take longer. Use filters, enable caching, or implement pagination.

**Q: How can I improve performance?**
A: See the [Performance Optimization Guide](./PERFORMANCE_OPTIMIZATION_GUIDE.md).

**Q: What's the maximum data size?**
A: No hard limit, but we recommend keeping reports under 50,000 responses for optimal performance.

### Troubleshooting

**Q: Charts aren't showing. What should I do?**
A: Check that you have data for the selected date range and that filters aren't too restrictive.

**Q: Export is timing out. How can I fix it?**
A: Try exporting a smaller date range first, or contact support to increase timeout limits.

**Q: I see "Permission Denied" errors.**
A: Contact your admin to grant you the necessary permissions (typically "analyst" or "admin" role).

---

## 📞 Support

### Documentation

- **User Guide**: This document
- **Developer Guide**: See [Developer Guide](#developer-guide) section
- **API Reference**: [API_REFERENCE.md](./API_REFERENCE.md)
- **Migration Guide**: [ANALYTICS_MIGRATION_GUIDE.md](./ANALYTICS_MIGRATION_GUIDE.md)
- **Performance Guide**: [PERFORMANCE_OPTIMIZATION_GUIDE.md](./PERFORMANCE_OPTIMIZATION_GUIDE.md)
- **Testing Guide**: [TESTING.md](./TESTING.md)

### Resources

- **GitHub Repository**: https://github.com/your-org/vtrustx
- **Issue Tracker**: https://github.com/your-org/vtrustx/issues
- **Discussions**: https://github.com/your-org/vtrustx/discussions
- **Changelog**: [CHANGELOG.md](./CHANGELOG.md)

### Contact

- **Support Email**: support@vtrustx.com
- **Sales**: sales@vtrustx.com
- **Documentation**: docs@vtrustx.com

### Contributing

We welcome contributions! See [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

---

## 📝 Release Notes

### Version 2.0.0 (Enhanced Edition) - February 16, 2026

**Major Features**:
- ✨ Report templates system with 20+ pre-built templates
- 📊 Cohort analysis for user segment tracking
- 🔮 Predictive forecasting with confidence intervals
- 📤 PDF and PowerPoint export
- 📅 Scheduled reports with email delivery
- ♿ WCAG 2.1 AA accessibility compliance
- 📱 Full mobile responsiveness
- ⚡ 40-55% performance improvements

**Improvements**:
- Modular component architecture (reduced from 3,391 to ~300 lines)
- Smart caching with 10-minute TTL
- Pagination for large datasets (100 records/page)
- Advanced filtering with multiple operators
- Keyboard shortcuts and navigation
- Screen reader support
- Error boundaries for resilience

**Testing**:
- 389 total tests (103 unit, 129 integration, 122 E2E, 35 performance)
- Lighthouse score: 93/100
- Load tests: All scenarios passing
- Zero critical bugs

**Migration**:
- Backward compatible with legacy version
- User-controlled version switching
- Feature comparison modal
- Beta banner with easy toggle
- Comprehensive migration guide

See [CHANGELOG.md](./CHANGELOG.md) for complete history.

---

## 📄 License

Copyright © 2026 VTrustX. All rights reserved.

---

**Last Updated**: February 16, 2026
**Version**: 2.0.0
**Maintainers**: Frontend Team, Backend Team
**Status**: ✅ Production Ready

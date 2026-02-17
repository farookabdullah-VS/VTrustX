# React Example

Modern React application demonstrating VTrustX SDK integration with hooks and components.

## Features

- ✅ React 18 with hooks
- ✅ Vite for fast development
- ✅ SurveyJS integration
- ✅ Responsive design
- ✅ Beautiful gradient UI
- ✅ API proxy configuration

## Installation

```bash
npm install
```

## Development

```bash
npm run dev
```

Visit: `http://localhost:5173`

## Build

```bash
npm run build
npm run preview
```

## Configuration

The app proxies API calls to your VTrustX backend:

```javascript
// vite.config.js
proxy: {
  '/api': {
    target: 'http://localhost:3000',  // Your backend
    changeOrigin: true
  }
}
```

## Component Structure

```
src/
├── App.jsx          # Main application component
├── App.css          # Styles
└── main.jsx         # Entry point
```

## Usage

1. **Login**: Enter credentials (defaults provided)
2. **Browse**: Grid view of available surveys
3. **Take Survey**: Interactive survey with SurveyJS
4. **Submit**: Response submission with confirmation

## Key Components

### VTrustXClient Class
Simple API client with:
- Token management
- Request wrapper
- Error handling

### App Component
Main React component with:
- Authentication state
- Survey list management
- Survey rendering
- Submission handling

## State Management

Uses React hooks:
- `useState` for local state
- Form handling with events
- Async/await for API calls

## Styling

- CSS Grid for responsive layout
- Gradient backgrounds
- Card-based design
- Smooth transitions

## Next Steps

- Add React Context for global state
- Implement Redux for complex state
- Add routing with React Router
- Cache surveys with React Query
- Add form validation

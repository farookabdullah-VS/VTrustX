# Vanilla JavaScript Example

Simple HTML + JavaScript example showing VTrustX SDK integration.

## Features

- ✅ Login authentication
- ✅ List all surveys
- ✅ Display survey with SurveyJS
- ✅ Submit responses
- ✅ Beautiful gradient UI

## How to Run

### Option 1: Open Directly in Browser

```bash
# Just open the file in your browser
open index.html
# or double-click index.html
```

### Option 2: Use Local Server

```bash
# With Python 3
python -m http.server 8080

# With Node.js (http-server)
npx http-server -p 8080

# Then open
# http://localhost:8080
```

## Configuration

Edit the default values in `index.html`:

```javascript
API URL: http://localhost:3000/api
Email: admin@vtrustx.com
Password: admin123
```

## Usage

1. **Login**: Enter your credentials and click "Login"
2. **Browse**: View all available surveys
3. **Take Survey**: Click "Take Survey" to start
4. **Submit**: Complete and submit your responses

## Code Structure

- **VTrustXClient**: Minimal API client implementation
- **Authentication**: Login with token management
- **Survey Rendering**: Using SurveyJS library
- **Response Submission**: POST to /api/submissions

## Dependencies

- SurveyJS Core (CDN)
- SurveyJS UI (CDN)
- Modern browser with ES6 support

## Screenshot

Login page with surveys list and interactive survey rendering.

## Next Steps

- Add error handling improvements
- Implement logout functionality
- Add survey preview before submission
- Cache surveys locally

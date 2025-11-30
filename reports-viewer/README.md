# Test Reports Viewer

A simple web-based viewer for PNNCLE automation test reports.

## Usage

1. Open `index.html` in your web browser
2. Click "Upload Test Report" and select a test report HTML file from GitHub Actions artifacts
3. View the parsed results with statistics and detailed test information

## Features

- 📊 Visual statistics dashboard
- 📋 Detailed test results with pass/fail status
- 🔍 Full HTML report viewer in iframe
- 📁 Upload and parse pytest-html reports
- 🎨 Modern, responsive UI

## How to Get Test Reports

1. Go to your GitHub Actions: https://github.com/eliaguilar/PNNCLE-Automation-Testing/actions
2. Click on a completed workflow run
3. Scroll down to "Artifacts"
4. Download `full-test-report` or `test-reports`
5. Extract and open the HTML file, or upload it to this viewer

## Local Development

Simply open `index.html` in a browser - no server needed!

For better security (CORS), you can serve it with a simple HTTP server:

```bash
# Python 3
python -m http.server 8000

# Node.js
npx http-server

# Then open http://localhost:8000
```


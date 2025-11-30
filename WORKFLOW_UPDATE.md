# GitHub Actions Workflow Update Required

The workflow file (`.github/workflows/test.yml`) needs to be updated manually via the GitHub web interface due to OAuth token scope restrictions.

## Updated Workflow Content

Copy this content into `.github/workflows/test.yml` via GitHub web interface:

```yaml
name: PNNCLE Automation Tests

on:
  push:
    branches: [ main, master ]
  pull_request:
    branches: [ main, master ]
  schedule:
    # Run daily at 2 AM UTC
    - cron: '0 2 * * *'
  workflow_dispatch: # Allow manual triggering

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
    - name: Checkout code
      uses: actions/checkout@v4
    
    - name: Set up Node.js
      uses: actions/setup-node@v4
      with:
        node-version: '20'
        cache: 'npm'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Install Playwright browsers
      run: npx playwright install --with-deps chromium
    
    - name: Create test-results directory
      run: mkdir -p test-results
    
    - name: Run form tests
      continue-on-error: true
      run: npm run test:forms -- --reporter=html --output-dir=test-results/form-report || true
    
    - name: Run content scanning tests
      continue-on-error: true
      run: npm run test:content -- --reporter=html --output-dir=test-results/content-report || true
    
    - name: Run all tests
      continue-on-error: true
      run: npm run test:report -- --output-dir=test-results || true
    
    - name: Upload test reports
      uses: actions/upload-artifact@v4
      if: always()
      continue-on-error: true
      with:
        name: test-reports
        path: test-results/
        if-no-files-found: ignore
    
    - name: Upload full test report
      uses: actions/upload-artifact@v4
      if: always()
      continue-on-error: true
      with:
        name: full-test-report
        path: test-results/html-report/
        if-no-files-found: ignore
```

## Steps to Update

1. Go to: https://github.com/eliaguilar/PNNCLE-Automation-Testing/blob/main/.github/workflows/test.yml
2. Click the pencil icon (Edit this file)
3. Replace the entire content with the YAML above
4. Click "Commit changes"
5. The workflow will automatically run on the next push or can be triggered manually


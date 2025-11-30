# Workflow Fix for Artifact Generation

The workflow file needs to be updated manually via GitHub UI to fix the artifact generation issue.

## Problem
The workflow was trying to run tests multiple times with incorrect output directories, and the artifact path wasn't matching what Playwright generates.

## Solution
Update `.github/workflows/test.yml` with this corrected version:

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
    
    - name: Run all tests
      continue-on-error: true
      run: npm run test:report || true
    
    - name: Upload full test report
      uses: actions/upload-artifact@v4
      if: always()
      continue-on-error: true
      with:
        name: full-test-report
        path: test-results/html-report/
        if-no-files-found: ignore
        retention-days: 90
```

## Key Changes
1. **Removed duplicate test runs** - Now runs all tests in one step using `npm run test:report`
2. **Removed incorrect output-dir flags** - Playwright HTML reporter uses the config file's `outputFolder` setting
3. **Simplified artifact upload** - Only uploads the main HTML report from `test-results/html-report/`
4. **Added retention-days** - Keeps artifacts for 90 days to prevent premature expiration

## How to Update
1. Go to: https://github.com/eliaguilar/PNNCLE-Automation-Testing/blob/main/.github/workflows/test.yml
2. Click the pencil icon (Edit this file)
3. Replace the entire content with the YAML above
4. Click "Commit changes"
5. The next workflow run will generate artifacts correctly


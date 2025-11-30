# PNNCLE Automation Testing

Automated testing suite for [pnncle.com](https://pnncle.com/) to ensure web forms are working correctly and content quality is maintained.

## Overview

This project uses **TypeScript** and **Playwright** to automate:
1. **Form Testing**: Ensures all web forms submit correctly and messages are delivered
2. **Content Quality**: Scans the entire site for spelling and grammatical errors

## Tech Stack

- **TypeScript** - Type-safe test code
- **Playwright** - Browser automation
- **Node.js** - Runtime environment
- **GitHub Actions** - CI/CD automation
- **Next.js Dashboard** - Test results visualization

## Project Structure

```
.
├── tests-ts/              # TypeScript test files
│   ├── test-forms.spec.ts      # Form submission tests
│   ├── test-content.spec.ts    # Content quality tests
│   └── helpers/               # Helper utilities
├── dashboard-app/         # Next.js dashboard for viewing results
├── playwright.config.ts   # Playwright configuration
└── .github/workflows/     # GitHub Actions workflows
```

## Setup

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Install Playwright Browsers**
   ```bash
   npx playwright install chromium
   ```

## Running Tests

### Run All Tests
```bash
npm test
```

### Run Form Tests Only
```bash
npm run test:forms
```

### Run Content Tests Only
```bash
npm run test:content
```

### Run with UI
```bash
npm run test:ui
```

### Generate HTML Report
```bash
npm run test:report
```

## Test Data

Default test data used for form submissions:
- **Name**: PNNCLE Automation
- **Email**: pnncle.automation@pnncle.com
- **Phone**: 805-123-4567
- **Other Fields**: PNNCLE Automation Test Scripts

## Forms Tested

- `/equip/` - Equipment request form
- `/gift/` - Gift form
- `/partners/` - Partnership form
- `/contact/` - Contact form
- Homepage newsletter forms

## Content Scanning

The content scanning tests:
- Fetch all pages from the sitemap (`https://pnncle.com/sitemap_index.xml`)
- Check spelling using native spellchecker
- Check grammar using LanguageTool API
- Report issues with page URL, paragraph number, context, and suggestions

## Dashboard

The Next.js dashboard (`dashboard-app/`) provides:
- View test results from GitHub Actions
- Form test status cards
- Content quality check results
- Manual test triggering
- Historical test run data

See `dashboard-app/README.md` for dashboard setup instructions.

## CI/CD

Tests run automatically on:
- Push to `main` branch
- Pull requests
- Daily at 2 AM UTC
- Manual trigger via GitHub Actions UI or dashboard

## Legacy Python Tests

The `tests/` directory contains legacy Python tests (pytest-based). These are being phased out in favor of the TypeScript implementation.

## License

ISC

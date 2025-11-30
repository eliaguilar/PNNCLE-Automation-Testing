# PNNCLE Automation Testing

Automated testing suite for [pnncle.com](https://pnncle.com/) to ensure web forms are working correctly and content quality is maintained.

## Features

### 1. Form Testing
- Tests all web forms on the website
- Verifies form submissions
- Checks for success/error messages
- Tests newsletter signup forms
- Tests contact forms
- Validates form accessibility

### 2. Content Scanning
- Scans blog posts and articles for typos
- Checks grammar and spelling errors
- Reports content quality issues
- Monitors new content automatically

## Setup

### Prerequisites
- Python 3.8 or higher
- pip (Python package manager)

### Installation

1. **Clone the repository** (if not already done):
   ```bash
   git clone https://github.com/eliaguilar/PNNCLE-Automation-Testing.git
   cd PNNCLE-Automation-Testing
   ```

2. **Create a virtual environment** (recommended):
   ```bash
   python3 -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. **Install dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

4. **Install Playwright browsers**:
   ```bash
   playwright install chromium
   ```

## Running Tests

### Run all tests:
```bash
pytest
```

### Run specific test suites:
```bash
# Run only form tests
pytest -m form_test

# Run only content scanning tests
pytest -m content_test
```

### Run with HTML report:
```bash
pytest --html=test-results/report.html --self-contained-html
```

The HTML report will be generated in the `test-results/` directory.

### Run with verbose output:
```bash
pytest -v
```

## Test Structure

```
PNNCLE-Automation-Testing/
├── tests/
│   ├── __init__.py
│   ├── test_forms.py          # Form submission tests
│   └── test_content_scanning.py # Content quality tests
├── conftest.py                 # Pytest configuration and fixtures
├── pytest.ini                  # Pytest settings
├── requirements.txt            # Python dependencies
├── .gitignore                  # Git ignore rules
└── README.md                   # This file
```

## Configuration

### Base URL
The base URL is configured in `conftest.py`. To test a different environment, modify the `base_url` fixture.

### Test Markers
Tests are marked with:
- `@pytest.mark.form_test` - Form-related tests
- `@pytest.mark.content_test` - Content scanning tests

## CI/CD Integration

This test suite can be integrated into CI/CD pipelines:

### GitHub Actions Example
```yaml
name: PNNCLE Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-python@v2
        with:
          python-version: '3.9'
      - run: pip install -r requirements.txt
      - run: playwright install chromium
      - run: pytest
```

## Hosting Considerations

### Option 1: GitHub Actions (Recommended)
- Free for public repositories
- Runs tests on every push/PR
- Generates test reports automatically
- No additional hosting needed

### Option 2: Self-Hosted Runner
- Set up on your own server
- More control over environment
- Requires server maintenance

### Option 3: Cloud CI/CD Services
- CircleCI, Travis CI, or similar
- May have free tiers
- Easy integration with GitHub

## Notes

- **Form Testing**: Tests use test email addresses. Make sure your forms accept these or configure test mode.
- **Content Scanning**: Grammar checking uses LanguageTool which may have some false positives. Review reports carefully.
- **Rate Limiting**: Tests include delays to avoid overwhelming the server. Adjust if needed.

## Troubleshooting

### Playwright browser not found
```bash
playwright install chromium
```

### Language tool errors
The grammar checker may fail on first run. It will download language data automatically. If issues persist, the tests will skip grammar checking.

### Timeout errors
If tests timeout, increase timeout values in test files or check network connectivity.

## Contributing

1. Create a feature branch
2. Make your changes
3. Run tests to ensure everything works
4. Submit a pull request

## License

This project is for PNNCLE Global Ministries testing purposes.


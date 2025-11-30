#!/bin/bash
# Helper script to run PNNCLE automation tests

echo "🚀 Running PNNCLE Automation Tests..."
echo ""

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo "⚠️  Virtual environment not found. Creating one..."
    python3 -m venv venv
    source venv/bin/activate
    echo "📦 Installing dependencies..."
    pip install -r requirements.txt
    echo "🌐 Installing Playwright browsers..."
    playwright install chromium
else
    source venv/bin/activate
fi

echo ""
echo "🧪 Running tests..."
echo ""

# Run tests based on argument
case "$1" in
    forms)
        echo "Testing forms only..."
        pytest -m form_test -v
        ;;
    content)
        echo "Testing content only..."
        pytest -m content_test -v
        ;;
    *)
        echo "Running all tests..."
        pytest -v --html=test-results/report.html --self-contained-html
        echo ""
        echo "✅ Test report generated: test-results/report.html"
        ;;
esac

echo ""
echo "✨ Tests completed!"


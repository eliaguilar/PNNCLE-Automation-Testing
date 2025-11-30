"""
Pytest configuration and shared fixtures for PNNCLE automation testing.
"""
import pytest
from playwright.sync_api import Page, Browser, BrowserContext
from playwright.sync_api import sync_playwright


@pytest.fixture(scope="session")
def browser():
    """Launch browser instance for the test session."""
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        yield browser
        browser.close()


@pytest.fixture
def context(browser: Browser):
    """Create a new browser context for each test."""
    context = browser.new_context(
        viewport={"width": 1920, "height": 1080},
        user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"
    )
    yield context
    context.close()


@pytest.fixture
def page(context: BrowserContext):
    """Create a new page for each test."""
    page = context.new_page()
    yield page
    page.close()


@pytest.fixture
def base_url():
    """Base URL for the PNNCLE website."""
    return "https://pnncle.com"


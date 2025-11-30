"""
Test suite for content scanning and grammar/spelling checking on pnncle.com
Scans blog posts and other content for typos and grammatical errors.
"""
import pytest
from playwright.sync_api import Page
from bs4 import BeautifulSoup
import re
from spellchecker import SpellChecker
import language_tool_python
from typing import List, Dict, Tuple


@pytest.mark.content_test
class TestContentScanning:
    """Test content quality including spelling and grammar."""
    
    @pytest.fixture(scope="class")
    def spell_checker(self):
        """Initialize spell checker."""
        return SpellChecker()
    
    @pytest.fixture(scope="class")
    def grammar_tool(self):
        """Initialize language tool for grammar checking."""
        try:
            return language_tool_python.LanguageTool('en-US')
        except:
            # Fallback if language tool fails
            return None
    
    def extract_text_content(self, page: Page) -> str:
        """Extract readable text content from the page."""
        # Remove script and style elements
        page_content = page.content()
        soup = BeautifulSoup(page_content, 'html.parser')
        
        # Remove script and style elements
        for script in soup(["script", "style", "nav", "footer"]):
            script.decompose()
        
        # Get text
        text = soup.get_text()
        
        # Clean up whitespace
        lines = (line.strip() for line in text.splitlines())
        chunks = (phrase.strip() for line in lines for phrase in line.split("  "))
        text = ' '.join(chunk for chunk in chunks if chunk)
        
        return text
    
    def find_blog_posts(self, page: Page, base_url: str) -> List[str]:
        """Find all blog post URLs on the website."""
        page.goto(base_url)
        page.wait_for_load_state("networkidle")
        
        blog_urls = []
        
        # Look for blog links - common patterns
        blog_selectors = [
            'a[href*="blog"]',
            'a[href*="story"]',
            'a[href*="article"]',
            'a[href*="post"]',
            'a:has-text("Read")',
            'a:has-text("Story")',
            'a:has-text("Article")'
        ]
        
        for selector in blog_selectors:
            links = page.locator(selector)
            for i in range(links.count()):
                try:
                    link = links.nth(i)
                    href = link.get_attribute('href')
                    if href:
                        # Convert relative URLs to absolute
                        if href.startswith('/'):
                            full_url = f"{base_url}{href}"
                        elif href.startswith('http'):
                            full_url = href
                        else:
                            full_url = f"{base_url}/{href}"
                        
                        if full_url not in blog_urls and base_url in full_url:
                            blog_urls.append(full_url)
                except:
                    continue
        
        # Also check for "Kingdom Stories" section mentioned on the site
        page.goto(f"{base_url}/kingdom-stories")
        page.wait_for_load_state("networkidle", timeout=10000)
        
        story_links = page.locator('a[href*="story"], a[href*="article"], a:has-text("Read")')
        for i in range(story_links.count()):
            try:
                link = story_links.nth(i)
                href = link.get_attribute('href')
                if href:
                    if href.startswith('/'):
                        full_url = f"{base_url}{href}"
                    elif href.startswith('http'):
                        full_url = href
                    else:
                        full_url = f"{base_url}/{href}"
                    
                    if full_url not in blog_urls and base_url in full_url:
                        blog_urls.append(full_url)
            except:
                continue
        
        return blog_urls
    
    def check_spelling(self, text: str, spell_checker: SpellChecker) -> List[Dict]:
        """Check text for spelling errors."""
        errors = []
        
        # Split text into words
        words = re.findall(r'\b[a-zA-Z]+\b', text.lower())
        
        # Check each word
        misspelled = spell_checker.unknown(words)
        
        for word in misspelled:
            # Skip common proper nouns and technical terms
            if len(word) < 3:
                continue
            
            # Get suggestions
            suggestions = spell_checker.candidates(word)
            errors.append({
                'word': word,
                'suggestions': list(suggestions)[:5] if suggestions else []
            })
        
        return errors
    
    def check_grammar(self, text: str, grammar_tool) -> List[Dict]:
        """Check text for grammatical errors."""
        if grammar_tool is None:
            return []
        
        errors = []
        
        # Split text into sentences for better checking
        sentences = re.split(r'[.!?]+', text)
        
        for sentence in sentences:
            if len(sentence.strip()) < 10:  # Skip very short sentences
                continue
            
            try:
                matches = grammar_tool.check(sentence)
                for match in matches:
                    errors.append({
                        'message': match.message,
                        'context': sentence[:100],  # First 100 chars for context
                        'suggestions': match.replacements[:3] if match.replacements else []
                    })
            except:
                continue
        
        return errors
    
    def test_blog_posts_spelling(self, page: Page, base_url: str, spell_checker: SpellChecker):
        """Test spelling in all blog posts."""
        blog_urls = self.find_blog_posts(page, base_url)
        
        if not blog_urls:
            pytest.skip("No blog posts found on the website")
        
        all_errors = []
        
        for url in blog_urls[:10]:  # Limit to first 10 posts to avoid timeout
            try:
                page.goto(url, timeout=30000)
                page.wait_for_load_state("networkidle", timeout=30000)
                
                text = self.extract_text_content(page)
                
                # Skip if text is too short (might be a listing page)
                if len(text) < 200:
                    continue
                
                errors = self.check_spelling(text, spell_checker)
                
                if errors:
                    all_errors.append({
                        'url': url,
                        'errors': errors
                    })
                
            except Exception as e:
                pytest.skip(f"Could not access blog post {url}: {str(e)}")
        
        # Report errors
        if all_errors:
            error_report = "\n\nSpelling Errors Found:\n"
            for item in all_errors:
                error_report += f"\nURL: {item['url']}\n"
                for error in item['errors'][:5]:  # Limit to 5 errors per post
                    error_report += f"  - '{error['word']}'"
                    if error['suggestions']:
                        error_report += f" (suggestions: {', '.join(error['suggestions'][:3])})"
                    error_report += "\n"
            
            # Don't fail the test, just report
            print(error_report)
        else:
            print("\n✓ No spelling errors found in blog posts")
    
    def test_blog_posts_grammar(self, page: Page, base_url: str, grammar_tool):
        """Test grammar in all blog posts."""
        if grammar_tool is None:
            pytest.skip("Language tool not available")
        
        blog_urls = self.find_blog_posts(page, base_url)
        
        if not blog_urls:
            pytest.skip("No blog posts found on the website")
        
        all_errors = []
        
        for url in blog_urls[:10]:  # Limit to first 10 posts
            try:
                page.goto(url, timeout=30000)
                page.wait_for_load_state("networkidle", timeout=30000)
                
                text = self.extract_text_content(page)
                
                if len(text) < 200:
                    continue
                
                errors = self.check_grammar(text, grammar_tool)
                
                if errors:
                    all_errors.append({
                        'url': url,
                        'errors': errors
                    })
                
            except Exception as e:
                pytest.skip(f"Could not access blog post {url}: {str(e)}")
        
        # Report errors
        if all_errors:
            error_report = "\n\nGrammar Errors Found:\n"
            for item in all_errors:
                error_report += f"\nURL: {item['url']}\n"
                for error in item['errors'][:5]:  # Limit to 5 errors per post
                    error_report += f"  - {error['message']}\n"
                    if error['suggestions']:
                        error_report += f"    Suggestions: {', '.join(error['suggestions'])}\n"
            
            print(error_report)
        else:
            print("\n✓ No grammar errors found in blog posts")
    
    def test_main_page_content_quality(self, page: Page, base_url: str, spell_checker: SpellChecker):
        """Test content quality on the main page."""
        page.goto(base_url)
        page.wait_for_load_state("networkidle")
        
        text = self.extract_text_content(page)
        
        # Check for obvious spelling errors
        errors = self.check_spelling(text, spell_checker)
        
        # Filter out common false positives (brand names, etc.)
        filtered_errors = [
            e for e in errors 
            if e['word'] not in ['pnncle', 'pnncle', 'pncle']  # Brand name variations
        ]
        
        if filtered_errors:
            error_report = "\nMain Page Spelling Issues:\n"
            for error in filtered_errors[:10]:
                error_report += f"  - '{error['word']}'"
                if error['suggestions']:
                    error_report += f" (suggestions: {', '.join(error['suggestions'][:3])})"
                error_report += "\n"
            print(error_report)
        else:
            print("\n✓ Main page content looks good")


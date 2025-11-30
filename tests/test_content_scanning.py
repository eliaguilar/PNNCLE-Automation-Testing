"""
Test suite for content scanning and grammar/spelling checking on pnncle.com
Scans blog posts and other content for typos and grammatical errors.
Enhanced to show page, paragraph number, and context.
"""
import pytest
from playwright.sync_api import Page
from bs4 import BeautifulSoup
import re
from spellchecker import SpellChecker
import language_tool_python
from typing import List, Dict, Tuple
from sitemap_helper import get_all_urls_from_sitemap_index


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
    
    def extract_text_with_paragraphs(self, page: Page) -> Tuple[str, List[Dict]]:
        """Extract readable text content with paragraph tracking."""
        page_content = page.content()
        soup = BeautifulSoup(page_content, 'html.parser')
        
        # Remove script and style elements
        for script in soup(["script", "style", "nav", "footer"]):
            script.decompose()
        
        # Extract paragraphs with their numbers
        paragraphs = []
        para_num = 0
        
        # Find all paragraph elements and text blocks
        para_elements = soup.find_all(['p', 'div', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'li', 'span'])
        
        for elem in para_elements:
            text = elem.get_text(strip=True)
            if len(text) > 20:  # Only count substantial paragraphs
                para_num += 1
                paragraphs.append({
                    'number': para_num,
                    'text': text,
                    'html': str(elem)
                })
        
        # Combine all text
        all_text = ' '.join([p['text'] for p in paragraphs])
        
        return all_text, paragraphs
    
    def find_paragraph_for_word(self, word: str, paragraphs: List[Dict], context_chars: int = 100) -> Dict:
        """Find which paragraph contains a word and return context."""
        word_lower = word.lower()
        
        for para in paragraphs:
            para_text_lower = para['text'].lower()
            if word_lower in para_text_lower:
                # Find the word position
                word_pos = para_text_lower.find(word_lower)
                
                # Get before and after context
                start = max(0, word_pos - context_chars)
                end = min(len(para['text']), word_pos + len(word) + context_chars)
                
                before = para['text'][start:word_pos].strip()
                after = para['text'][word_pos + len(word):end].strip()
                highlighted = para['text'][word_pos:word_pos + len(word)]
                
                return {
                    'paragraph_number': para['number'],
                    'paragraph_text': para['text'],
                    'word': highlighted,
                    'before_context': before,
                    'after_context': after,
                    'full_sentence': para['text']
                }
        
        return {
            'paragraph_number': 0,
            'paragraph_text': '',
            'word': word,
            'before_context': '',
            'after_context': '',
            'full_sentence': ''
        }
    
    def check_spelling(self, text: str, spell_checker: SpellChecker, paragraphs: List[Dict], page_url: str) -> List[Dict]:
        """Check text for spelling errors with context."""
        errors = []
        
        # Split text into words
        words = re.findall(r'\b[a-zA-Z]+\b', text.lower())
        
        # Check each word
        misspelled = spell_checker.unknown(words)
        
        for word in misspelled:
            # Skip common proper nouns and technical terms
            if len(word) < 3:
                continue
            
            # Skip brand names
            if word in ['pnncle', 'pncle']:
                continue
            
            # Get suggestions
            suggestions = spell_checker.candidates(word)
            
            # Find paragraph context
            para_info = self.find_paragraph_for_word(word, paragraphs)
            
            errors.append({
                'type': 'spelling',
                'word': word,
                'page_url': page_url,
                'paragraph_number': para_info['paragraph_number'],
                'before_context': para_info['before_context'],
                'after_context': para_info['after_context'],
                'full_sentence': para_info['full_sentence'],
                'highlighted_word': para_info['word'],
                'suggestions': list(suggestions)[:5] if suggestions else []
            })
        
        return errors
    
    def check_grammar(self, text: str, grammar_tool, paragraphs: List[Dict], page_url: str) -> List[Dict]:
        """Check text for grammatical errors with context."""
        if grammar_tool is None:
            return []
        
        errors = []
        
        # Check each paragraph separately for better context
        for para in paragraphs:
            if len(para['text'].strip()) < 20:  # Skip very short paragraphs
                continue
            
            try:
                matches = grammar_tool.check(para['text'])
                for match in matches:
                    # Get context around the error
                    error_start = match.offset
                    error_end = match.offset + match.errorLength
                    
                    context_before = para['text'][max(0, error_start - 50):error_start]
                    context_after = para['text'][error_end:min(len(para['text']), error_end + 50)]
                    highlighted = para['text'][error_start:error_end]
                    
                    errors.append({
                        'type': 'grammar',
                        'message': match.message,
                        'page_url': page_url,
                        'paragraph_number': para['number'],
                        'before_context': context_before.strip(),
                        'after_context': context_after.strip(),
                        'full_sentence': para['text'],
                        'highlighted_text': highlighted,
                        'suggestions': match.replacements[:3] if match.replacements else []
                    })
            except:
                continue
        
        return errors
    
    def discover_all_pages(self, page: Page, base_url: str) -> List[str]:
        """Discover all pages on the website by following links."""
        pages_found = set()
        pages_to_visit = [base_url]
        visited = set()
        max_pages = 50  # Limit to prevent infinite loops
        
        while pages_to_visit and len(visited) < max_pages:
            current_url = pages_to_visit.pop(0)
            
            if current_url in visited:
                continue
            
            try:
                page.goto(current_url, timeout=30000)
                page.wait_for_load_state("networkidle", timeout=30000)
                visited.add(current_url)
                pages_found.add(current_url)
                
                # Find all internal links
                links = page.locator('a[href]')
                for i in range(min(links.count(), 100)):  # Limit links per page
                    try:
                        link = links.nth(i)
                        href = link.get_attribute('href')
                        if href:
                            # Convert to absolute URL
                            if href.startswith('/'):
                                full_url = f"{base_url}{href}"
                            elif href.startswith('http') and base_url in href:
                                full_url = href.split('#')[0].split('?')[0]  # Remove fragments and queries
                            else:
                                continue
                            
                            # Only add if it's from the same domain and not already visited
                            if base_url in full_url and full_url not in visited and full_url not in pages_to_visit:
                                # Skip common non-content pages
                                skip_patterns = ['mailto:', 'tel:', '#', '.pdf', '.jpg', '.png', '.gif', 'javascript:']
                                if not any(pattern in full_url.lower() for pattern in skip_patterns):
                                    pages_to_visit.append(full_url)
                    except:
                        continue
            except Exception as e:
                print(f"Could not access {current_url}: {str(e)}")
                continue
        
        return list(pages_found)
    
    def test_all_pages_spelling(self, page: Page, base_url: str, spell_checker: SpellChecker):
        """Test spelling on all pages across the entire site using sitemap."""
        print("\n🔍 Fetching sitemap to discover all pages...")
        
        try:
            # Get all URLs from sitemap
            sitemap_url = f"{base_url}/sitemap_index.xml"
            pages_to_check = get_all_urls_from_sitemap_index(sitemap_url, base_url)
            print(f"📄 Found {len(pages_to_check)} pages from sitemap")
        except Exception as e:
            print(f"⚠️  Could not fetch sitemap: {str(e)}")
            print("🔄 Falling back to page discovery...")
            # Fallback to page discovery
            all_pages = self.discover_all_pages(page, base_url)
            known_pages = [
                base_url,
                f"{base_url}/equip/",
                f"{base_url}/gift/",
                f"{base_url}/partners/",
                f"{base_url}/contact/",
                f"{base_url}/go/",
                f"{base_url}/kingdom-stories/",
            ]
            pages_to_check = list(set(all_pages + known_pages))
            print(f"📄 Found {len(pages_to_check)} pages via discovery")
        
        all_errors = []
        
        for page_url in pages_to_check:
            try:
                page.goto(page_url, timeout=30000)
                page.wait_for_load_state("networkidle", timeout=30000)
                
                text, paragraphs = self.extract_text_with_paragraphs(page)
                
                if len(text) < 50:  # Skip pages with very little content
                    continue
                
                errors = self.check_spelling(text, spell_checker, paragraphs, page_url)
                
                if errors:
                    all_errors.extend(errors)
                    print(f"  ❌ Found {len(errors)} spelling errors on {page_url}")
                else:
                    print(f"  ✅ No errors on {page_url}")
                
            except Exception as e:
                print(f"  ⚠️  Could not check {page_url}: {str(e)}")
                continue
        
        # Report errors with full context
        if all_errors:
            error_report = "\n\n🔤 Spelling Errors Found Across Site:\n"
            error_report += "=" * 80 + "\n"
            error_report += f"Total errors found: {len(all_errors)}\n"
            error_report += "=" * 80 + "\n"
            
            for error in all_errors[:50]:  # Limit to 50 errors for readability
                error_report += f"\n📄 Page: {error['page_url']}\n"
                error_report += f"📍 Paragraph #{error['paragraph_number']}\n"
                error_report += f"❌ Word: '{error['word']}'\n"
                
                if error['before_context'] or error['after_context']:
                    error_report += f"📝 Context: ...{error['before_context']} **{error['highlighted_word']}** {error['after_context']}...\n"
                else:
                    error_report += f"📝 Full sentence: {error['full_sentence'][:200]}...\n"
                
                if error['suggestions']:
                    error_report += f"💡 Suggestions: {', '.join(error['suggestions'][:3])}\n"
                
                error_report += "-" * 80 + "\n"
            
            print(error_report)
        else:
            print("\n✅ No spelling errors found across the entire site!")
    
    def test_all_pages_grammar(self, page: Page, base_url: str, grammar_tool):
        """Test grammar on all pages across the entire site using sitemap."""
        if grammar_tool is None:
            pytest.skip("Language tool not available")
        
        print("\n🔍 Fetching sitemap to discover all pages...")
        
        try:
            # Get all URLs from sitemap
            sitemap_url = f"{base_url}/sitemap_index.xml"
            pages_to_check = get_all_urls_from_sitemap_index(sitemap_url, base_url)
            print(f"📄 Found {len(pages_to_check)} pages from sitemap")
        except Exception as e:
            print(f"⚠️  Could not fetch sitemap: {str(e)}")
            print("🔄 Falling back to page discovery...")
            # Fallback to page discovery
            all_pages = self.discover_all_pages(page, base_url)
            known_pages = [
                base_url,
                f"{base_url}/equip/",
                f"{base_url}/gift/",
                f"{base_url}/partners/",
                f"{base_url}/contact/",
                f"{base_url}/go/",
                f"{base_url}/kingdom-stories/",
            ]
            pages_to_check = list(set(all_pages + known_pages))
            print(f"📄 Found {len(pages_to_check)} pages via discovery")
        
        all_errors = []
        
        for page_url in pages_to_check:
            try:
                page.goto(page_url, timeout=30000)
                page.wait_for_load_state("networkidle", timeout=30000)
                
                text, paragraphs = self.extract_text_with_paragraphs(page)
                
                if len(text) < 50:  # Skip pages with very little content
                    continue
                
                errors = self.check_grammar(text, grammar_tool, paragraphs, page_url)
                
                if errors:
                    all_errors.extend(errors)
                    print(f"  ❌ Found {len(errors)} grammar errors on {page_url}")
                else:
                    print(f"  ✅ No errors on {page_url}")
                
            except Exception as e:
                print(f"  ⚠️  Could not check {page_url}: {str(e)}")
                continue
        
        # Report errors with full context
        if all_errors:
            error_report = "\n\n📖 Grammar Errors Found Across Site:\n"
            error_report += "=" * 80 + "\n"
            error_report += f"Total errors found: {len(all_errors)}\n"
            error_report += "=" * 80 + "\n"
            
            for error in all_errors[:50]:  # Limit to 50 errors for readability
                error_report += f"\n📄 Page: {error['page_url']}\n"
                error_report += f"📍 Paragraph #{error['paragraph_number']}\n"
                error_report += f"❌ Issue: {error['message']}\n"
                
                if error['before_context'] or error['after_context']:
                    error_report += f"📝 Context: ...{error['before_context']} **{error['highlighted_text']}** {error['after_context']}...\n"
                else:
                    error_report += f"📝 Full sentence: {error['full_sentence'][:200]}...\n"
                
                if error['suggestions']:
                    error_report += f"💡 Suggestions: {', '.join(error['suggestions'])}\n"
                
                error_report += "-" * 80 + "\n"
            
            print(error_report)
        else:
            print("\n✅ No grammar errors found across the entire site!")
    
    def test_blog_posts_spelling(self, page: Page, base_url: str, spell_checker: SpellChecker):
        """Test spelling in all blog posts."""
        blog_urls = self.find_blog_posts(page, base_url)
        
        if not blog_urls:
            pytest.skip("No blog posts found on the website")
        
        all_errors = []
        
        for url in blog_urls[:10]:  # Limit to first 10 posts
            try:
                page.goto(url, timeout=30000)
                page.wait_for_load_state("networkidle", timeout=30000)
                
                text, paragraphs = self.extract_text_with_paragraphs(page)
                
                if len(text) < 200:
                    continue
                
                errors = self.check_spelling(text, spell_checker, paragraphs, url)
                
                if errors:
                    all_errors.extend(errors)
                
            except Exception as e:
                pytest.skip(f"Could not access blog post {url}: {str(e)}")
        
        # Report errors
        if all_errors:
            error_report = "\n\n🔤 Blog Post Spelling Errors:\n"
            error_report += "=" * 80 + "\n"
            
            for error in all_errors[:15]:
                error_report += f"\n📄 Page: {error['page_url']}\n"
                error_report += f"📍 Paragraph #{error['paragraph_number']}\n"
                error_report += f"❌ Word: '{error['word']}'\n"
                error_report += f"📝 Context: ...{error['before_context']} **{error['highlighted_word']}** {error['after_context']}...\n"
                if error['suggestions']:
                    error_report += f"💡 Suggestions: {', '.join(error['suggestions'][:3])}\n"
                error_report += "-" * 80 + "\n"
            
            print(error_report)
        else:
            print("\n✅ No spelling errors found in blog posts")
    
    def find_blog_posts(self, page: Page, base_url: str) -> List[str]:
        """Find all blog post URLs on the website."""
        blog_urls = []
        
        # Check for "Kingdom Stories" section
        try:
            page.goto(f"{base_url}/kingdom-stories", timeout=10000)
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
        except:
            pass
        
        return blog_urls

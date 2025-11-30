import { test, expect, Page } from '@playwright/test';
import { getAllUrlsFromSitemapIndex } from './helpers/sitemap-helper';
import {
  extractTextWithParagraphs,
  checkSpelling,
  checkGrammar,
  ContentIssue,
} from './helpers/content-checker';

const BASE_URL = 'https://pnncle.com';

test.describe('Content Quality Tests', () => {
  test('All Pages Spelling Check @content_test', async ({ page }) => {
    console.log('\n🔍 Fetching sitemap to discover all pages...');
    
    let pagesToCheck: string[] = [];
    
    try {
      // Get all URLs from sitemap
      const sitemapUrl = `${BASE_URL}/sitemap_index.xml`;
      pagesToCheck = await getAllUrlsFromSitemapIndex(sitemapUrl, BASE_URL);
      console.log(`📄 Found ${pagesToCheck.length} pages from sitemap`);
    } catch (error) {
      console.log(`⚠️  Could not fetch sitemap: ${error}`);
      console.log('🔄 Falling back to known pages...');
      // Fallback to known pages
      pagesToCheck = [
        BASE_URL,
        `${BASE_URL}/equip/`,
        `${BASE_URL}/gift/`,
        `${BASE_URL}/partners/`,
        `${BASE_URL}/contact/`,
        `${BASE_URL}/go/`,
        `${BASE_URL}/kingdom-stories/`,
      ];
    }
    
    const allIssues: ContentIssue[] = [];
    
    for (const pageUrl of pagesToCheck) {
      try {
        await page.goto(pageUrl, { timeout: 30000, waitUntil: 'networkidle' });
        
        const html = await page.content();
        const { text, paragraphs } = extractTextWithParagraphs(html);
        
        if (text.length < 50) {
          // Skip pages with very little content
          continue;
        }
        
        const spellingIssues = checkSpelling(text, paragraphs, pageUrl);
        
        if (spellingIssues.length > 0) {
          allIssues.push(...spellingIssues);
          console.log(`  ❌ Found ${spellingIssues.length} spelling errors on ${pageUrl}`);
        } else {
          console.log(`  ✅ No errors on ${pageUrl}`);
        }
      } catch (error) {
        console.log(`  ⚠️  Could not check ${pageUrl}: ${error}`);
        continue;
      }
    }
    
    // Report errors with full context
    if (allIssues.length > 0) {
      console.log(`\n📊 Total spelling errors found: ${allIssues.length}`);
      for (const issue of allIssues) {
        console.log(`\n  Word: "${issue.word}"`);
        console.log(`  Page: ${issue.page_url}`);
        if (issue.paragraph_number) {
          console.log(`  Paragraph: #${issue.paragraph_number}`);
        }
        if (issue.before_context || issue.after_context) {
          console.log(`  Context: ...${issue.before_context} [${issue.highlighted_word}] ${issue.after_context}...`);
        }
        if (issue.suggestions && issue.suggestions.length > 0) {
          console.log(`  Suggestions: ${issue.suggestions.join(', ')}`);
        }
      }
      
      // Fail the test if there are spelling errors
      expect(allIssues.length).toBe(0);
    } else {
      console.log('\n✅ No spelling errors found across all pages!');
    }
  });

  test('All Pages Grammar Check @content_test', async ({ page }) => {
    console.log('\n🔍 Fetching sitemap to discover all pages...');
    
    let pagesToCheck: string[] = [];
    
    try {
      const sitemapUrl = `${BASE_URL}/sitemap_index.xml`;
      pagesToCheck = await getAllUrlsFromSitemapIndex(sitemapUrl, BASE_URL);
      console.log(`📄 Found ${pagesToCheck.length} pages from sitemap`);
    } catch (error) {
      console.log(`⚠️  Could not fetch sitemap: ${error}`);
      pagesToCheck = [
        BASE_URL,
        `${BASE_URL}/equip/`,
        `${BASE_URL}/gift/`,
        `${BASE_URL}/partners/`,
        `${BASE_URL}/contact/`,
      ];
    }
    
    const allIssues: ContentIssue[] = [];
    
    for (const pageUrl of pagesToCheck) {
      try {
        await page.goto(pageUrl, { timeout: 30000, waitUntil: 'networkidle' });
        
        const html = await page.content();
        const { text, paragraphs } = extractTextWithParagraphs(html);
        
        if (text.length < 50) {
          continue;
        }
        
        const grammarIssues = await checkGrammar(text, paragraphs, pageUrl);
        
        if (grammarIssues.length > 0) {
          allIssues.push(...grammarIssues);
          console.log(`  ❌ Found ${grammarIssues.length} grammar errors on ${pageUrl}`);
        } else {
          console.log(`  ✅ No errors on ${pageUrl}`);
        }
      } catch (error) {
        console.log(`  ⚠️  Could not check ${pageUrl}: ${error}`);
        continue;
      }
    }
    
    if (allIssues.length > 0) {
      console.log(`\n📊 Total grammar errors found: ${allIssues.length}`);
      for (const issue of allIssues) {
        console.log(`\n  Issue: ${issue.message}`);
        console.log(`  Page: ${issue.page_url}`);
        if (issue.paragraph_number) {
          console.log(`  Paragraph: #${issue.paragraph_number}`);
        }
        if (issue.suggestions && issue.suggestions.length > 0) {
          console.log(`  Suggestions: ${issue.suggestions.join(', ')}`);
        }
      }
      
      // Fail the test if there are grammar errors
      expect(allIssues.length).toBe(0);
    } else {
      console.log('\n✅ No grammar errors found across all pages!');
    }
  });
});


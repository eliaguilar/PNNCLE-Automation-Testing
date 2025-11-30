const SpellChecker = require('spellchecker');
import axios from 'axios';
import * as cheerio from 'cheerio';

export interface Paragraph {
  number: number;
  text: string;
  html: string;
}

export interface ContentIssue {
  type: 'spelling' | 'grammar';
  word?: string;
  message: string;
  suggestions?: string[];
  page_url?: string;
  paragraph_number?: number;
  before_context?: string;
  after_context?: string;
  full_sentence?: string;
  highlighted_word?: string;
  highlighted_text?: string;
}

/**
 * Extract readable text content with paragraph tracking
 */
export function extractTextWithParagraphs(html: string): { text: string; paragraphs: Paragraph[] } {
  const $ = cheerio.load(html);
  
  // Remove script and style elements
  $('script, style, nav, footer').remove();
  
  // Extract paragraphs with their numbers
  const paragraphs: Paragraph[] = [];
  let paraNum = 0;
  
  // Find all paragraph elements and text blocks
  $('p, div, h1, h2, h3, h4, h5, h6, li, span').each((_, elem) => {
    const text = $(elem).text().trim();
    if (text.length > 20) { // Only count substantial paragraphs
      paraNum++;
      paragraphs.push({
        number: paraNum,
        text: text,
        html: $(elem).html() || '',
      });
    }
  });
  
  // Combine all text
  const allText = paragraphs.map(p => p.text).join(' ');
  
  return { text: allText, paragraphs };
}

/**
 * Find which paragraph contains a word and return context
 */
export function findParagraphForWord(
  word: string,
  paragraphs: Paragraph[],
  contextChars: number = 100
): {
  paragraph_number: number;
  paragraph_text: string;
  word: string;
  before_context: string;
  after_context: string;
  full_sentence: string;
} {
  const wordLower = word.toLowerCase();
  
  for (const para of paragraphs) {
    const paraTextLower = para.text.toLowerCase();
    const wordPos = paraTextLower.indexOf(wordLower);
    
    if (wordPos !== -1) {
      // Get before and after context
      const start = Math.max(0, wordPos - contextChars);
      const end = Math.min(para.text.length, wordPos + word.length + contextChars);
      
      const before = para.text.substring(start, wordPos).trim();
      const after = para.text.substring(wordPos + word.length, end).trim();
      const highlighted = para.text.substring(wordPos, wordPos + word.length);
      
      return {
        paragraph_number: para.number,
        paragraph_text: para.text,
        word: highlighted,
        before_context: before,
        after_context: after,
        full_sentence: para.text,
      };
    }
  }
  
  return {
    paragraph_number: 0,
    paragraph_text: '',
    word: word,
    before_context: '',
    after_context: '',
    full_sentence: '',
  };
}

/**
 * Check spelling in text
 */
export function checkSpelling(
  text: string,
  paragraphs: Paragraph[],
  pageUrl: string
): ContentIssue[] {
  const issues: ContentIssue[] = [];
  const words = text.split(/\s+/).filter(w => w.length > 2);
  
  for (const word of words) {
    // Clean word (remove punctuation)
    const cleanWord = word.replace(/[^\w]/g, '');
    if (cleanWord.length < 3) continue;
    
    // Check if word is misspelled
    const isMisspelled = !SpellChecker.checkSpelling(cleanWord);
    if (isMisspelled) {
      const suggestions = SpellChecker.getCorrectionsForMisspelling(cleanWord);
      const context = findParagraphForWord(cleanWord, paragraphs);
      
      issues.push({
        type: 'spelling',
        word: cleanWord,
        message: `Misspelled word: "${cleanWord}"`,
        suggestions: suggestions ? suggestions.slice(0, 5) : [],
        page_url: pageUrl,
        paragraph_number: context.paragraph_number,
        before_context: context.before_context,
        after_context: context.after_context,
        full_sentence: context.full_sentence,
        highlighted_word: cleanWord,
      });
    }
  }
  
  return issues;
}

/**
 * Check grammar using LanguageTool API (free tier)
 */
export async function checkGrammar(
  text: string,
  paragraphs: Paragraph[],
  pageUrl: string
): Promise<ContentIssue[]> {
  const issues: ContentIssue[] = [];
  
  try {
    // Use LanguageTool public API (free, rate-limited)
    const response = await axios.post('https://api.languagetool.org/v2/check', {
      text: text,
      language: 'en-US',
    }, {
      timeout: 10000,
    });
    
    for (const match of response.data.matches || []) {
      const context = findParagraphForWord(match.context.text, paragraphs, 50);
      
      issues.push({
        type: 'grammar',
        message: match.message || 'Grammar issue found',
        suggestions: match.replacements?.slice(0, 3).map((r: any) => r.value) || [],
        page_url: pageUrl,
        paragraph_number: context.paragraph_number,
        before_context: context.before_context,
        after_context: context.after_context,
        full_sentence: context.full_sentence,
        highlighted_text: match.context.text.substring(
          match.offset,
          match.offset + match.length
        ),
      });
    }
  } catch (error) {
    // Silently fail - grammar checking is optional
    console.warn('Grammar check failed:', error);
  }
  
  return issues;
}


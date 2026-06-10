import * as cheerio from 'cheerio';
import { chromium } from 'playwright';

interface ScrapeResult {
  title: string;
  content: string;
}

const DEFAULT_USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

function extractTextFromHtml(html: string): ScrapeResult {
  const $ = cheerio.load(html);

  const title = $('title').text().trim() || $('h1').first().text().trim() || 'Untitled Webpage';

  $('script, style, svg, nav, footer, header, iframe, noscript, .sidebar, #sidebar, .nav, .menu, .advertisement, .ads').remove();

  const rawText = $('body').length > 0 ? $('body').text() : $.root().text();
  const textLines = rawText
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0);

  return {
    title,
    content: textLines.join('\n'),
  };
}

async function fetchPageContent(urlStr: string): Promise<ScrapeResult> {
  const response = await fetch(urlStr, {
    headers: {
      'User-Agent': DEFAULT_USER_AGENT,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch page: ${response.status} ${response.statusText}`);
  }

  const html = await response.text();
  return extractTextFromHtml(html);
}

/**
 * Scrapes a webpage using Playwright browser automation with a fetch fallback.
 * Handles JavaScript-rendered content when possible, and falls back to static HTML scraping.
 */
export async function scrapeUrl(urlStr: string): Promise<ScrapeResult> {
  let browser;

  try {
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ userAgent: DEFAULT_USER_AGENT });
    const page = await context.newPage();

    await page.goto(urlStr, {
      waitUntil: 'networkidle',
      timeout: 30000,
    });

    await page.waitForSelector('body', { timeout: 5000 }).catch(() => {
      // Continue even if body selector times out
    });

    const html = await page.content();
    return extractTextFromHtml(html);
  } catch (error) {
    console.warn(`Playwright scrape failed for ${urlStr}, falling back to fetch-based scraping.`, error);
    return await fetchPageContent(urlStr);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

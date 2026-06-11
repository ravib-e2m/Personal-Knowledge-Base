import * as cheerio from 'cheerio';

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

/**
 * Primary scraping method: plain HTTP fetch + Cheerio HTML parsing.
 * This works in serverless environments (Netlify/Vercel) because it has no
 * native browser dependency. Good for the majority of static/SSR pages.
 */
async function fetchPageContent(urlStr: string): Promise<ScrapeResult> {
  const response = await fetch(urlStr, {
    headers: {
      'User-Agent': DEFAULT_USER_AGENT,
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
    redirect: 'follow',
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch page: ${response.status} ${response.statusText}`);
  }

  const html = await response.text();
  return extractTextFromHtml(html);
}

/**
 * Optional enhanced scraping via Playwright for JS-heavy pages.
 * Playwright is loaded with a dynamic import inside try/catch so that
 * environments without the browser binaries (e.g. Netlify Functions) never
 * crash — they simply skip this path.
 */
async function tryPlaywrightScrape(urlStr: string): Promise<ScrapeResult | null> {
  let browser: import('playwright').Browser | undefined;
  try {
    const { chromium } = await import('playwright');
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ userAgent: DEFAULT_USER_AGENT });
    const page = await context.newPage();

    await page.goto(urlStr, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForSelector('body', { timeout: 5000 }).catch(() => {});

    const html = await page.content();
    return extractTextFromHtml(html);
  } catch (error) {
    console.warn(
      `Playwright unavailable or failed for ${urlStr}; using fetch-based result.`,
      error instanceof Error ? error.message : error
    );
    return null;
  } finally {
    if (browser) {
      await browser.close().catch(() => {});
    }
  }
}

/**
 * Scrapes a webpage. Uses a fast, serverless-safe fetch first. If that returns
 * very little text (likely a JS-rendered page) it optionally tries Playwright,
 * but only when the browser is actually available.
 */
export async function scrapeUrl(urlStr: string): Promise<ScrapeResult> {
  // 1. Try the lightweight fetch-based scrape first.
  let fetchResult: ScrapeResult | null = null;
  let fetchError: unknown = null;
  try {
    fetchResult = await fetchPageContent(urlStr);
  } catch (err) {
    fetchError = err;
  }

  // If we got a healthy amount of text, return immediately.
  if (fetchResult && fetchResult.content.trim().length >= 200) {
    return fetchResult;
  }

  // 2. Content was thin or fetch failed — attempt Playwright if available.
  const playwrightResult = await tryPlaywrightScrape(urlStr);
  if (playwrightResult && playwrightResult.content.trim().length > 0) {
    return playwrightResult;
  }

  // 3. Fall back to whatever the fetch produced, even if small.
  if (fetchResult && fetchResult.content.trim().length > 0) {
    return fetchResult;
  }

  // 4. Nothing worked — surface a clear error.
  const reason =
    fetchError instanceof Error ? fetchError.message : 'No readable text content found on the page.';
  throw new Error(reason);
}

import { BrowserUse } from 'browser-use-sdk';

const browserUseApiKey = process.env.BROWSER_USE_API_KEY || '';

if (!browserUseApiKey) {
  console.warn('Warning: BROWSER_USE_API_KEY is not set. Browser automation features will be unavailable.');
}

let browserUseClient: BrowserUse | null = null;

/**
 * Get or initialize Browser Use client for web automation tasks
 */
function getBrowserUseClient(): BrowserUse {
  if (!browserUseApiKey) {
    throw new Error(
      'BROWSER_USE_API_KEY is not set. Add it to .env.local to use web automation features.'
    );
  }

  if (!browserUseClient) {
    browserUseClient = new BrowserUse({
      apiKey: browserUseApiKey,
    });
  }

  return browserUseClient;
}

interface BrowserUseTaskOptions {
  maxSteps?: number;
  timeout?: number;
}

/**
 * Execute a browser automation task using Browser Use
 * Best for complex interactions, form filling, CAPTCHA handling, and multi-step workflows
 */
export async function executeBrowserTask(
  task: string,
  options: BrowserUseTaskOptions = {}
): Promise<string> {
  const client = getBrowserUseClient();
  const { maxSteps = 10, timeout = 120 } = options;

  try {
    const result = await client.run(task, {
      maxSteps,
      timeout,
    });

    return result.output || '';
  } catch (error) {
    console.error('Browser Use task failed:', error);
    throw new Error(`Browser automation failed: ${(error as Error).message}`);
  }
}

/**
 * Extract content from a website using Browser Use
 * Handles JavaScript-rendered content, dynamic pages, and complex layouts better than simple HTML scraping
 */
export async function extractWebContent(
  url: string,
  extractionInstructions?: string
): Promise<{ title: string; content: string }> {
  const task = extractionInstructions
    ? `Visit ${url} and extract the following: ${extractionInstructions}. Return the extracted content.`
    : `Visit ${url} and extract all main content text (title and body). Return in format: TITLE: [title]\nCONTENT: [content]`;

  const result = await executeBrowserTask(task);

  // Parse the result to extract title and content
  const titleMatch = result.match(/TITLE:\s*(.+?)(?:\nCONTENT:|$)/i);
  const contentMatch = result.match(/CONTENT:\s*([\s\S]+)$/i);

  const title = titleMatch ? titleMatch[1].trim() : 'Extracted Content';
  const content = contentMatch ? contentMatch[1].trim() : result;

  return { title, content };
}

/**
 * Search and extract information from multiple URLs in parallel using Browser Use
 * Useful for research, comparison, and data aggregation tasks
 */
export async function searchAndExtractFromMultipleUrls(
  urls: string[],
  searchQuery: string
): Promise<
  Array<{
    url: string;
    title: string;
    content: string;
    error?: string;
  }>
> {
  const promises = urls.map(async (url) => {
    try {
      const task = `Visit ${url} and find information related to: "${searchQuery}". Extract and return the most relevant content.`;
      const result = await executeBrowserTask(task, { maxSteps: 5 });

      return {
        url,
        title: `Results for "${searchQuery}"`,
        content: result,
      };
    } catch (error) {
      return {
        url,
        title: 'Error',
        content: '',
        error: (error as Error).message,
      };
    }
  });

  return Promise.all(promises);
}

/**
 * Fill a form and submit it using Browser Use
 * Handles CAPTCHA, JavaScript validation, and complex form interactions
 */
export async function fillAndSubmitForm(
  url: string,
  formData: Record<string, string>
): Promise<{ success: boolean; message: string; result?: string }> {
  const formDataStr = Object.entries(formData)
    .map(([key, value]) => `- ${key}: ${value}`)
    .join('\n');

  const task = `
Visit ${url} and:
1. Find the form on the page
2. Fill in the following fields:
${formDataStr}
3. Submit the form
4. Wait for confirmation or response
5. Return the resulting page content or success message
`;

  try {
    const result = await executeBrowserTask(task, { maxSteps: 15 });
    return {
      success: true,
      message: 'Form submitted successfully',
      result,
    };
  } catch (error) {
    return {
      success: false,
      message: `Form submission failed: ${(error as Error).message}`,
    };
  }
}

/**
 * Handle complex authentication flows (login, 2FA, etc.)
 * Browser Use can handle CAPTCHA, cookies, and multi-step auth
 */
export async function handleAuthenticationFlow(
  url: string,
  credentials: { username?: string; password?: string; otp?: string }
): Promise<{ authenticated: boolean; message: string; cookies?: string }> {
  let task = `Visit ${url} and authenticate using the following credentials:`;
  if (credentials.username) task += `\n- Username/Email: ${credentials.username}`;
  if (credentials.password) task += `\n- Password: ${credentials.password}`;
  if (credentials.otp) task += `\n- OTP/2FA Code: ${credentials.otp}`;
  task += `\nComplete the entire authentication process and confirm successful login.`;

  try {
    const result = await executeBrowserTask(task, { maxSteps: 20, timeout: 180 });
    return {
      authenticated: true,
      message: 'Authentication successful',
      cookies: result,
    };
  } catch (error) {
    return {
      authenticated: false,
      message: `Authentication failed: ${(error as Error).message}`,
    };
  }
}

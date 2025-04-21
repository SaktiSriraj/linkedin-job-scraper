/**
 * Express server implementation for LinkedIn job scraper
 * 
 * This server provides an API endpoint for scraping LinkedIn job pages using Playwright.
 * It can be deployed to a cloud provider or run locally.
 */

const express = require('express');
const { chromium } = require('playwright');
const cors = require('cors');
const config = require('./config');

// Configure Playwright for serverless
const isProd = process.env.NODE_ENV === 'production';

// Use custom browser path for production
const chromiumExecutablePath = isProd 
  ? '/tmp/chromium' 
  : undefined;

// Create Express app
const app = express();

// Middleware
app.use(express.json());
app.use(cors());

// Initialize a browser pool for better performance
let browserPromise = null;

async function getBrowser() {
  if (!browserPromise) {
    browserPromise = chromium.launch({
      headless: true
    });
  }
  return browserPromise;
}

// Endpoint for health check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Endpoint for LinkedIn job scraping
app.post('/scrape', async (req, res) => {
  console.log('Received scrape request:', req.body);
  
  const { linkedinUrl, companyName } = req.body;
  
  if (!linkedinUrl || !companyName) {
    return res.status(400).json({ 
      error: 'Missing required parameters',
      required: ['linkedinUrl', 'companyName']
    });
  }
  
  try {
    const result = await scrapeLinkedInJobs(linkedinUrl, companyName);
    return res.status(200).json(result);
  } catch (error) {
    console.error('Scraping error:', error);
    return res.status(500).json({ 
      error: error.message, 
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined 
    });
  }
});

/**
 * Scrape LinkedIn jobs for a company
 * 
 * @param {string} linkedinUrl - Company's LinkedIn URL
 * @param {string} companyName - Company name
 * @returns {Object} Job count information
 */
async function scrapeLinkedInJobs(linkedinUrl, companyName) {
  // Normalize URL and ensure it ends with /jobs/
  if (!linkedinUrl.endsWith('/')) {
    linkedinUrl += '/';
  }
  const jobsUrl = linkedinUrl + 'jobs/';
  
  console.log(`Scraping LinkedIn jobs for ${companyName} at ${jobsUrl}`);
  
  const browser = await chromium.launch({
    headless: true,
    executablePath: chromiumExecutablePath,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage'
    ]
  });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.110 Safari/537.36',
    viewport: { width: 1280, height: 800 }
  });
  
  // Add stealth mode capabilities
  await context.addInitScript(() => {
    // Override the navigator.webdriver property
    Object.defineProperty(navigator, 'webdriver', {
      get: () => false,
    });
    
    // Override the plugins property
    Object.defineProperty(navigator, 'plugins', {
      get: () => [1, 2, 3, 4, 5],
    });
    
    // Override the languages property
    Object.defineProperty(navigator, 'languages', {
      get: () => ['en-US', 'en'],
    });
  });
  
  const page = await context.newPage();
  
  try {
    // Set timeout to 10 seconds as specified in constraints
    page.setDefaultTimeout(10000);
    
    // Navigation with retry logic
    let retries = 3;
    let success = false;
    
    while (retries > 0 && !success) {
      try {
        await page.goto(jobsUrl, { waitUntil: 'networkidle' });
        success = true;
      } catch (err) {
        console.log(`Navigation failed, retrying... (${retries} attempts left)`);
        retries--;
        if (retries === 0) throw err;
        await new Promise(r => setTimeout(r, 2000)); // Wait 2 seconds before retrying
      }
    }
    
    // Take a screenshot for debugging (optional)
    // const screenshot = await page.screenshot();
    
    // Check if we're on a login page
    const isLoginPage = await page.evaluate(() => {
      return window.location.href.includes('checkpoint') || 
             window.location.href.includes('login') ||
             document.querySelector('form[action*="login"]') !== null;
    });
    
    if (isLoginPage) {
      console.log('Redirected to login page, extracting using alternative method');
      await context.close();
      
      return {
        company_name: companyName,
        openings_count: 'N/A',
        source: 'LinkedIn Jobs Page (Login Required)',
        url: jobsUrl,
        reason: 'LinkedIn requires authentication'
      };
    }
    
    // Wait for the content to load
    await page.waitForLoadState('domcontentloaded');
    
    // Extract current URL to check for redirects
    const currentUrl = page.url();
    
    // Try multiple selectors and patterns to find the job count
    const jobCount = await page.evaluate(() => {
      // Check for the most common job count selector
      const countElement = document.querySelector('.results-context-header__job-count');
      if (countElement) {
        const text = countElement.textContent.trim();
        const match = text.match(/(\d+)/);
        if (match) return parseInt(match[1], 10);
      }
      
      // Check for alternative selector
      const altCountElement = document.querySelector('[data-test-job-count]');
      if (altCountElement) {
        const count = altCountElement.getAttribute('data-test-job-count');
        if (count) return parseInt(count, 10);
      }
      
      // Check for text patterns in the page
      const pageText = document.body.textContent;
      
      // Pattern: "X jobs"
      const jobsMatch = pageText.match(/(\d+)\s+jobs/i);
      if (jobsMatch) return parseInt(jobsMatch[1], 10);
      
      // Pattern: "X open positions"
      const positionsMatch = pageText.match(/(\d+)\s+open positions/i);
      if (positionsMatch) return parseInt(positionsMatch[1], 10);
      
      // Pattern: "X job openings"
      const openingsMatch = pageText.match(/(\d+)\s+job openings/i);
      if (openingsMatch) return parseInt(openingsMatch[1], 10);
      
      // Try to find any numbers followed by "jobs" within a reasonable proximity
      const elements = document.querySelectorAll('*');
      for (const el of elements) {
        if (el.textContent.toLowerCase().includes('job') && /\d+/.test(el.textContent)) {
          const match = el.textContent.match(/(\d+)/);
          if (match) return parseInt(match[1], 10);
        }
      }
      
      // Count job listings if present
      const jobItems = document.querySelectorAll('.job-card-container, .job-search-card');
      if (jobItems && jobItems.length > 0) {
        return jobItems.length;
      }
      
      return null;
    });
    
    await context.close();
    
    if (jobCount !== null) {
      return {
        company_name: companyName,
        openings_count: jobCount,
        source: 'LinkedIn Jobs Page (Playwright)',
        url: currentUrl
      };
    } else {
      return {
        company_name: companyName,
        openings_count: 'N/A',
        source: 'LinkedIn Jobs Page',
        url: currentUrl,
        reason: 'Job count not found on page'
      };
    }
  } catch (error) {
    console.error('Error scraping LinkedIn:', error);
    await context.close();
    
    return {
      company_name: companyName,
      openings_count: 'N/A',
      source: 'LinkedIn Jobs Page',
      url: jobsUrl,
      reason: `Error: ${error.message}`
    };
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM signal received: closing HTTP server');
  
  // Close the browser if it exists
  if (browserPromise) {
    const browser = await browserPromise;
    await browser.close();
  }
  
  process.exit(0);
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
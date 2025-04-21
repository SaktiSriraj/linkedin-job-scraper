/**
 * Configuration for LinkedIn Job Scraper
 * 
 * Advanced settings and customization options for the job scraping service.
 */

// Connection settings
const config = {
    // Browser and proxy settings
    browser: {
      // Maximum concurrent browser contexts
      maxConcurrentContexts: 3,
      
      // Browser session timeout (in ms)
      sessionTimeout: 30000,
      
      // Default browser launch options
      launchOptions: {
        headless: true,
        args: [
          '--disable-dev-shm-usage',
          '--disable-setuid-sandbox',
          '--no-sandbox',
          '--disable-gpu'
        ]
      },
      
      // Default navigation options
      navigationOptions: {
        waitUntil: 'networkidle',
        timeout: 10000
      }
    },
    
    // Proxy configuration
    proxy: {
      enabled: false, // Set to true to enable proxy rotation
      proxies: [
        // Add your proxies here
        // { host: 'proxy1.example.com', port: 8080, username: 'user1', password: 'pass1' },
        // { host: 'proxy2.example.com', port: 8080, username: 'user2', password: 'pass2' }
      ],
      
      // Proxy rotation strategy: 'round-robin' or 'random'
      rotationStrategy: 'round-robin'
    },
    
    // Rate limiting settings
    rateLimit: {
      // Maximum requests per minute
      maxRequestsPerMinute: 10,
      
      // Delay between requests in milliseconds
      delayBetweenRequests: 2000,
      
      // Jitter to add to delay (random value from 0 to jitter in ms)
      jitter: 1000
    },
    
    // LinkedIn specific settings
    linkedin: {
      // LinkedIn URL patterns
      urlPatterns: {
        companyJobs: '{companyUrl}/jobs/',
        search: 'https://www.linkedin.com/jobs/search/?keywords={keywords}&location={location}'
      },
      
      // Selectors for scraping
      selectors: {
        jobCount: '.results-context-header__job-count',
        altJobCount: '[data-test-job-count]',
        jobCards: '.job-card-container, .job-search-card',
        loginForm: 'form[action*="login"]'
      },
      
      // Text patterns to extract job counts
      textPatterns: [
        /(\d+)\s+jobs/i,
        /(\d+)\s+job openings/i,
        /(\d+)\s+open positions/i,
        /Showing\s+(\d+)\s+results/i,
        /(\d+)\s+available jobs/i
      ],
      
      // JSON patterns to find job counts
      jsonPatterns: [
        /"jobCount":(\d+)/,
        /"totalJobCount":(\d+)/,
        /"numResults":(\d+)/
      ]
    },
    
    // Anti-detection measures
    stealth: {
      // User agents to rotate through
      userAgents: [
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.110 Safari/537.36',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.110 Safari/537.36',
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:95.0) Gecko/20100101 Firefox/95.0',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.1 Safari/605.1.15'
      ],
      
      // Additional stealth settings
      evasionTechniques: {
        maskWebdriver: true,
        emulatePlugins: true,
        emulateLanguages: true,
        maskDevToolsProtocol: true,
        emulateTouchPoints: true,
        maskHeadlessChrome: true
      }
    },
    
    // Error handling and retry settings
    errorHandling: {
      // Maximum number of retries for a single request
      maxRetries: 3,
      
      // Delay between retries (in ms)
      retryDelay: 2000,
      
      // Backoff multiplier for retry delays
      retryBackoffMultiplier: 1.5,
      
      // Error types that should trigger a retry
      retryableErrors: [
        'TimeoutError',
        'NavigationError',
        'NetworkError',
        'ConnectionRefusedError'
      ]
    },
    
    // Cache settings
    cache: {
      enabled: true,
      ttl: 60 * 60 * 1000, // 1 hour in milliseconds
      maxSize: 100 // Maximum number of entries
    },
    
    // CAPTCHA handling
    captcha: {
      detection: {
        enabled: true,
        selectors: [
          '#captcha',
          '.recaptcha',
          '[id*="captcha"]',
          '.g-recaptcha'
        ]
      },
      
      // Configure your CAPTCHA solving service here if needed
      solver: {
        enabled: false,
        service: 'none', // 'none', '2captcha', 'anticaptcha', etc.
        apiKey: ''
      }
    },
    
    // Logging configuration
    logging: {
      level: 'info', // 'debug', 'info', 'warn', 'error'
      
      // Enable request logging
      requests: true,
      
      // Enable response logging
      responses: false,
      
      // Log screenshots for failed requests
      screenshotsOnFailure: true,
      
      // Log HTML content for failed requests
      htmlContentOnFailure: true
    }
  };
  
  module.exports = config;
/**
 * BioMini Debug Utilities
 * Helper functions to diagnose proxy and API issues
 */

export const debugBioMini = {
  /**
   * Test the proxy and direct connections
   */
  async testConnections() {
    const results = {
      proxyRoot: null as any,
      proxyAPI: null as any,
      directRoot: null as any,
      directAPI: null as any
    };

    console.log('🔍 BioMini Connection Debug Started...');

    // Test 1: Proxy root
    try {
      console.log('📤 Testing proxy root: /biomini/');
      const response = await fetch('/biomini/', { 
        method: 'GET',
        signal: AbortSignal.timeout(3000)
      });
      results.proxyRoot = {
        status: response.status,
        ok: response.ok,
        headers: Object.fromEntries(response.headers.entries()),
        contentLength: response.headers.get('content-length')
      };
      console.log('📥 Proxy root result:', results.proxyRoot);
    } catch (error) {
      results.proxyRoot = { error: error.message };
      console.log('❌ Proxy root failed:', error.message);
    }

    // Test 2: Proxy API
    try {
      console.log('📤 Testing proxy API: /biomini/api/version');
      const response = await fetch('/biomini/api/version?dummy=' + Math.random(), { 
        method: 'GET',
        signal: AbortSignal.timeout(3000)
      });
      results.proxyAPI = {
        status: response.status,
        ok: response.ok,
        text: await response.text().then(t => t.substring(0, 200))
      };
      console.log('📥 Proxy API result:', results.proxyAPI);
    } catch (error) {
      results.proxyAPI = { error: error.message };
      console.log('❌ Proxy API failed:', error.message);
    }

    // Test 3: Direct root (only if not in dev mode proxy)
    if (!import.meta.env.DEV) {
      try {
        console.log('📤 Testing direct root: https://localhost/');
        const response = await fetch('https://localhost/', { 
          method: 'GET',
          signal: AbortSignal.timeout(3000)
        });
        results.directRoot = {
          status: response.status,
          ok: response.ok
        };
        console.log('📥 Direct root result:', results.directRoot);
      } catch (error) {
        results.directRoot = { error: error.message };
        console.log('❌ Direct root failed:', error.message);
      }
    }

    return results;
  },

  /**
   * Test specific BioMini API endpoints
   */
  async testBioMiniAPIs() {
    const baseUrl = import.meta.env.DEV ? '/biomini' : 'https://localhost';
    console.log(`🧪 Testing BioMini APIs with base URL: ${baseUrl}`);

    const endpoints = [
      '/api/version',
      '/api/createSessionID', 
      '/api/initDevice',
      '/api/getScannerList'
    ];

    const results = {};

    for (const endpoint of endpoints) {
      try {
        const url = `${baseUrl}${endpoint}?dummy=${Math.random()}`;
        console.log(`📤 Testing: ${url}`);
        
        const response = await fetch(url, {
          method: 'GET',
          signal: AbortSignal.timeout(3000)
        });
        
        const text = await response.text();
        let data;
        try {
          data = JSON.parse(text);
        } catch {
          data = text.substring(0, 100);
        }
        
        results[endpoint] = {
          status: response.status,
          ok: response.ok,
          data: data
        };
        
        console.log(`📥 ${endpoint}:`, results[endpoint]);
      } catch (error) {
        results[endpoint] = { error: error.message };
        console.log(`❌ ${endpoint} failed:`, error.message);
      }
    }

    return results;
  },

  /**
   * Get environment info
   */
  getEnvironmentInfo() {
    const info = {
      isDev: import.meta.env.DEV,
      mode: import.meta.env.MODE,
      baseUrl: import.meta.env.BASE_URL,
      userAgent: navigator.userAgent,
      location: window.location.href,
      origin: window.location.origin
    };
    
    console.log('🌍 Environment Info:', info);
    return info;
  }
};

// Make it available globally for console debugging
(window as any).debugBioMini = debugBioMini;

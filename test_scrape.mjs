// Test scrape.do API — scrape Google search results for a topic
const SCRAPE_TOKEN = 'f67e13d1eddd45f6b916429a8406f64d2264b3409bf';

async function testScrape() {
  const query = 'Samsung Galaxy S26';
  
  // Use scrape.do to fetch Google News results about the query
  const targetUrl = `https://www.google.com/search?q=${encodeURIComponent(query + ' opinions reviews')}&tbm=nws`;
  const scrapeUrl = `https://api.scrape.do?token=${SCRAPE_TOKEN}&url=${encodeURIComponent(targetUrl)}`;
  
  console.log('Fetching Google News for:', query);
  console.log('URL:', scrapeUrl.substring(0, 80) + '...');
  
  try {
    const res = await fetch(scrapeUrl);
    console.log('Status:', res.status);
    
    if (res.ok) {
      const html = await res.text();
      console.log('Response length:', html.length);
      console.log('First 500 chars:', html.substring(0, 500));
      
      // Extract text snippets from search results
      const snippets = html.match(/<div[^>]*class="[^"]*BNeawe[^"]*"[^>]*>([^<]+)</g);
      if (snippets) {
        console.log('\nFound', snippets.length, 'snippets:');
        snippets.slice(0, 5).forEach((s, i) => {
          const text = s.replace(/<[^>]+>/g, '');
          console.log(`  ${i+1}. ${text.substring(0, 150)}`);
        });
      }
    } else {
      const body = await res.text();
      console.log('Error body:', body.substring(0, 300));
    }
  } catch (e) {
    console.error('Error:', e.message);
  }

  // Also test Reddit scrape
  console.log('\n--- Testing Reddit scrape ---');
  const redditUrl = `https://www.reddit.com/search/?q=${encodeURIComponent(query)}&sort=new`;
  const redditScrapeUrl = `https://api.scrape.do?token=${SCRAPE_TOKEN}&url=${encodeURIComponent(redditUrl)}&render=false`;
  
  try {
    const res = await fetch(redditScrapeUrl);
    console.log('Reddit Status:', res.status);
    if (res.ok) {
      const html = await res.text();
      console.log('Reddit HTML length:', html.length);
      console.log('Contains "Samsung":', html.includes('Samsung'));
      console.log('First 300 chars:', html.substring(0, 300));
    } else {
      const body = await res.text();
      console.log('Reddit error:', body.substring(0, 200));
    }
  } catch (e) {
    console.error('Reddit error:', e.message);
  }
}

testScrape();

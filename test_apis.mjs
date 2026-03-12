// Test Groq free API
const GROQ_KEY_TEST = ''; // We'll get one

// Test Google Gemini quota reset
const GEMINI_KEY = 'YOUR_API_KEY';

// Try Gemini with the other available model names
async function testGeminiModels() {
  const models = ['gemini-2.0-flash-lite', 'gemini-2.0-flash', 'gemini-1.5-pro'];
  for (const model of models) {
    console.log(`\n=== GEMINI: ${model} ===`);
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_KEY}`;
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: 'Say hello' }] }],
          generationConfig: { maxOutputTokens: 10 }
        })
      });
      console.log('Status:', res.status);
      const d = await res.json();
      if (d.candidates) console.log('✅', d.candidates[0].content.parts[0].text);
      else console.log('❌', JSON.stringify(d.error || d).substring(0, 150));
    } catch (e) { console.log('❌ Network:', e.message); }
  }
}

// Also test the OpenAI-compatible Gemini endpoint
async function testGeminiOpenAI() {
  console.log('\n=== GEMINI: OpenAI-compatible endpoint ===');
  try {
    const res = await fetch('https://generativelanguage.googleapis.com/v1beta/openai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GEMINI_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gemini-2.0-flash',
        messages: [{ role: 'user', content: 'Say hello' }],
        max_tokens: 10
      })
    });
    console.log('Status:', res.status);
    const d = await res.json();
    if (d.choices) console.log('✅', d.choices[0].message.content);
    else console.log('❌', JSON.stringify(d).substring(0, 200));
  } catch (e) { console.log('❌ Network:', e.message); }
}

await testGeminiModels();
await testGeminiOpenAI();
console.log('\n=== DONE ===');

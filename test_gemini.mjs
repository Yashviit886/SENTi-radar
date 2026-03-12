const GEMINI_KEY = 'YOUR_API_KEY';

async function test() {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_KEY}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: 'Say "working" in one word' }] }],
      generationConfig: { maxOutputTokens: 5 }
    })
  });
  console.log('Gemini Status:', res.status);
  const d = await res.json();
  if (d.candidates) console.log('✅ GEMINI WORKS:', d.candidates[0].content.parts[0].text);
  else console.log('❌', JSON.stringify(d.error || d).substring(0, 200));
}
test();

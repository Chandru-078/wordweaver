export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { word } = req.body;

    if (!word || typeof word !== 'string') {
      return res.status(400).json({ error: 'Word is required' });
    }

    // Try to get key from headers (if user put one in settings)
    // Fallback to Vercel Environment Variable (for all public visitors)
    const apiKey = req.headers['x-custom-api-key'] || process.env.GROQ_API_KEY;

    if (!apiKey) {
      return res.status(403).json({ error: 'API key not configured in Vercel' });
    }

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages: [
          {
            role: 'user',
            content: `Generate exactly 10 unique, creative, grammatically correct sentences using the word '${word}'. Number them 1 to 10. Vary the tone — formal, poetic, casual, humorous, motivational. Return ONLY the 10 numbered sentences, no extra text, no introduction, no explanation.`
          }
        ],
        temperature: 0.9,
        max_tokens: 1024
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      return res.status(response.status).json(errorData);
    }

    const data = await response.json();
    
    // Extract the exact sentences content to send back
    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      throw new Error('Invalid response format from Groq');
    }

    const rawContent = data.choices[0].message.content;
    
    // Parse the sentences server-side to keep client payload small
    const sentences = rawContent.split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0)
      .map(line => line.replace(/^\d+[\.\)\-:]\s*/, '').trim())
      .filter(line => line.length > 0)
      .slice(0, 10);

    return res.status(200).json(sentences);

  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ error: 'Internal server error while generating sentences' });
  }
}

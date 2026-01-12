import { NextRequest, NextResponse } from 'next/server';

// Support multiple AI APIs
const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

export async function POST(request: NextRequest) {
  console.log('=== AI Enhance Description API Called ===');

  try {
    const { description, propertyDetails } = await request.json();

    if (!description || description.trim().length === 0) {
      return NextResponse.json(
        { success: false, message: 'Description is required' },
        { status: 400 }
      );
    }

    // Check for API keys - Groq is now priority (best free tier)
    const groqKey = process.env.GROQ_API_KEY || process.env.NEXT_PUBLIC_GROQ_API_KEY;
    const openaiKey = process.env.OPENAI_API_KEY || process.env.NEXT_PUBLIC_OPENAI_API_KEY;
    const geminiKey = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY;
    
    console.log('🔑 Groq Key:', groqKey ? 'Found' : 'NOT FOUND');
    console.log('🔑 OpenAI Key:', openaiKey ? 'Found' : 'NOT FOUND');
    console.log('🔑 Gemini Key:', geminiKey ? 'Found' : 'NOT FOUND');

    // Create prompt
    const prompt = `You are a professional real estate copywriter. Enhance this property description to be more appealing and professional.

Original: "${description}"

${propertyDetails?.area ? `Area: ${propertyDetails.area} sq.ft` : ''}
${propertyDetails?.address ? `Location: ${propertyDetails.address}` : ''}

Rules:
- Max 100 words
- Professional real estate language
- Highlight key features
- Keep facts accurate

Return ONLY the enhanced description.`;

    // Try Groq first (best free tier)
    if (groqKey) {
      console.log('📤 Calling Groq API...');
      try {
        const response = await fetch(GROQ_API_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${groqKey}`,
          },
          body: JSON.stringify({
            model: 'llama-3.1-8b-instant',
            messages: [{ role: 'user', content: prompt }],
            max_tokens: 200,
            temperature: 0.7
          })
        });

        if (response.ok) {
          const result = await response.json();
          const enhancedText = result.choices?.[0]?.message?.content?.trim() || description;
          console.log('✅ Groq Enhancement successful');
          return NextResponse.json({ success: true, enhanced: enhancedText, demo: false, provider: 'groq' });
        } else {
          console.error('❌ Groq API error:', await response.json());
        }
      } catch (err) {
        console.error('❌ Groq request failed:', err);
      }
    }

    // Try OpenAI
    if (openaiKey) {
      console.log('📤 Calling OpenAI API...');
      try {
        const response = await fetch(OPENAI_API_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${openaiKey}`,
          },
          body: JSON.stringify({
            model: 'gpt-3.5-turbo',
            messages: [{ role: 'user', content: prompt }],
            max_tokens: 200,
            temperature: 0.7
          })
        });

        if (response.ok) {
          const result = await response.json();
          const enhancedText = result.choices?.[0]?.message?.content?.trim() || description;
          console.log('✅ OpenAI Enhancement successful');
          return NextResponse.json({ success: true, enhanced: enhancedText, demo: false, provider: 'openai' });
        } else {
          console.error('❌ OpenAI API error:', await response.json());
        }
      } catch (err) {
        console.error('❌ OpenAI request failed:', err);
      }
    }

    // Try Gemini
    if (geminiKey) {
      console.log('📤 Calling Gemini API...');
      try {
        const response = await fetch(`${GEMINI_API_URL}?key=${geminiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.7, maxOutputTokens: 200 }
          })
        });

        if (response.ok) {
          const result = await response.json();
          const enhancedText = result.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || description;
          console.log('✅ Gemini Enhancement successful');
          return NextResponse.json({ success: true, enhanced: enhancedText, demo: false, provider: 'gemini' });
        } else {
          console.error('❌ Gemini API error:', await response.json());
        }
      } catch (err) {
        console.error('❌ Gemini request failed:', err);
      }
    }

    // Use smart basic enhancement (no API needed)
    console.log('📝 Using smart basic enhancement');
    const enhanced = smartEnhance(description, propertyDetails);
    return NextResponse.json({ success: true, enhanced, demo: true, message: 'Enhanced locally' });

  } catch (error: any) {
    console.error('❌ Error:', error.message);
    return NextResponse.json({ success: true, enhanced: smartEnhance("property", {}), demo: true });
  }
}

// Smart enhancement without AI - actually does useful formatting
function smartEnhance(description: string, details?: any): string {
  const desc = description.trim();
  
  // Professional intro phrases
  const intros = [
    "This exceptional property presents",
    "Discover this remarkable opportunity featuring",
    "An outstanding property showcasing",
    "This premium offering includes"
  ];
  const intro = intros[Math.floor(Math.random() * intros.length)];
  
  // Build enhanced description
  let enhanced = `${intro} ${desc.toLowerCase().replace(/^(a |an |the )/i, '')}`;
  
  // Ensure proper sentence ending
  if (!enhanced.endsWith('.')) enhanced += '.';
  
  // Add property highlights
  const highlights: string[] = [];
  if (details?.area) highlights.push(`${details.area} sq.ft of prime space`);
  if (details?.address) highlights.push(`strategically located at ${details.address}`);
  
  if (highlights.length > 0) {
    enhanced += ` Featuring ${highlights.join(' and ')}.`;
  }
  
  // Add call to action
  enhanced += '\n\n✨ Schedule a viewing today to explore this exceptional opportunity!';
  
  return enhanced;
}

require('dotenv').config({ quiet: true });
const { GoogleGenAI } = require('@google/genai');

async function main() {
  const ai = new GoogleGenAI({});
  const model = process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite';

  const interaction = await ai.interactions.create({
    model,
    input: 'Reply with exactly: Gemini connection OK',
  });

  console.log('Model:', model);
  console.log('Reply:', interaction.output_text);
}

main().catch((err) => {
  console.error('Gemini test failed:', err.message);
  process.exit(1);
});
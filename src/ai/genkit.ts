import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';

export const ai = genkit({
  // plugins: [googleAI()], // Temporarily disabled to debug permissions
  // model: 'googleai/gemini-2.0-flash',
});

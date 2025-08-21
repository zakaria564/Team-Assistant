'use server';

/**
 * @fileOverview AI-powered player position suggestion flow.
 *
 * - suggestPlayerPositions - A function that suggests player positions based on age and physical characteristics.
 * - SuggestPlayerPositionsInput - The input type for the suggestPlayerPositions function.
 * - SuggestPlayerPositionsOutput - The return type for the suggestPlayerPositions function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SuggestPlayerPositionsInputSchema = z.object({
  age: z.number().describe('The age of the player in years.'),
  heightCm: z.number().describe('The height of the player in centimeters.'),
  weightKg: z.number().describe('The weight of the player in kilograms.'),
  strengths: z.string().describe('A description of the player\'s strengths.'),
  weaknesses: z.string().describe('A description of the player\'s weaknesses.'),
});
export type SuggestPlayerPositionsInput = z.infer<typeof SuggestPlayerPositionsInputSchema>;

const SuggestPlayerPositionsOutputSchema = z.object({
  suggestedPositions: z
    .string()
    .describe(
      'A comma-separated list of suggested player positions based on the provided characteristics.'
    ),
  trainingRegimen: z
    .string()
    .describe(
      'A suggested training regimen optimized for the suggested positions, focusing on improving relevant skills.'
    ),
});
export type SuggestPlayerPositionsOutput = z.infer<typeof SuggestPlayerPositionsOutputSchema>;

export async function suggestPlayerPositions(
  input: SuggestPlayerPositionsInput
): Promise<SuggestPlayerPositionsOutput> {
  return suggestPlayerPositionsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'suggestPlayerPositionsPrompt',
  input: {schema: SuggestPlayerPositionsInputSchema},
  output: {schema: SuggestPlayerPositionsOutputSchema},
  prompt: `You are an expert football (soccer) scout, skilled at identifying player positions based on physical and skill-based attributes.

  Given the following player characteristics, suggest one or more suitable positions for the player. List the positions separated by commas.

  Age: {{{age}}}
  Height: {{{heightCm}}} cm
  Weight: {{{weightKg}}} kg
  Strengths: {{{strengths}}}
  Weaknesses: {{{weaknesses}}}

  Also, suggest a training regimen optimized for the suggested positions, focusing on improving relevant skills. Return training regimen as a list of things they should be doing.

  Format your response as follows:
  Suggested Positions: [comma-separated list of positions]
  Training Regimen: [description of training regimen]`,
});

const suggestPlayerPositionsFlow = ai.defineFlow(
  {
    name: 'suggestPlayerPositionsFlow',
    inputSchema: SuggestPlayerPositionsInputSchema,
    outputSchema: SuggestPlayerPositionsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);

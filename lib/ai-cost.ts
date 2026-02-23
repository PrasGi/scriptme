/**
 * Token estimation and cost calculation for Gemini 2.5 Flash.
 * Uses character-based heuristics when real usage metadata is unavailable.
 *
 * Gemini 2.5 Flash pricing (as of 2025):
 *   Input:  $0.30 per 1M tokens
 *   Output: $2.50 per 1M tokens
 */

const CHARS_PER_TOKEN = 4; // rough heuristic for English
const INPUT_PRICE_PER_1M = 0.3;
const OUTPUT_PRICE_PER_1M = 2.5;

export function estimateTokens(text: string): number {
  if (!text) return 0;
  return Math.ceil(text.length / CHARS_PER_TOKEN);
}

export function estimateCost(inputTokens: number, outputTokens: number): number {
  const inputCost  = (inputTokens / 1_000_000) * INPUT_PRICE_PER_1M;
  const outputCost = (outputTokens / 1_000_000) * OUTPUT_PRICE_PER_1M;
  return inputCost + outputCost;
}

export interface TokenUsage {
  inputTokens:  number;
  outputTokens: number;
  totalTokens:  number;
  costUsd:      number;
}

export function computeUsage(message: string, response: string): TokenUsage {
  const inputTokens  = estimateTokens(message);
  const outputTokens = estimateTokens(response);
  const totalTokens  = inputTokens + outputTokens;
  const costUsd      = estimateCost(inputTokens, outputTokens);

  return { inputTokens, outputTokens, totalTokens, costUsd };
}

/**
 * Standardized Typing Prompts for ParkinTrace
 * 
 * Every sentence is carefully calibrated to be of the EXACT SAME character length (170 characters),
 * ensuring uniform cognitive load, neuromuscular motor demands, and consistent hold/flight kinematic sampling.
 * 
 * Successive sessions automatically rotate to the next standardized sentence so repeat sessions
 * stay fresh while maintaining rigorous scientific parity.
 */

export const STANDARDIZED_PROMPTS = [
  "A quiet breeze moves through the cedar trees along the gentle valley. Sunlight warms the cold morning stone as small birds gather near the fountain in the open courtyard.",
  "Clear water flows over smooth white pebbles beside the wooden footbridge. Soft morning shadows stretch across the garden while quiet footsteps pass along the gravel path.",
  "Golden leaves drift down to rest upon the peaceful waters of the shallow pond. An early morning mist rises slowly between the hills as another peaceful autumn day begins.",
  "Warm sunlight filters down between the pine branches onto the forest floor. A calm river winds through the open meadows where bright flowers bloom beside the mossy rocks.",
  "Gentle rain taps lightly against the window pane through the quiet afternoon. Green hills roll toward the distant coastline beneath a wide canopy of silver autumn clouds.",
  "Bright morning air fills the quiet kitchen as steam rises from the fresh hot tea. Outside the doorway a friendly breeze rustles the green leaves in the quiet back garden.",
  "Smooth polished stones line the edge of the shallow stream in the afternoon. Cool mountain water sparkles beneath the bright sun as gentle currents carry colorful leaves.",
  "Pale yellow light touches the horizon just as the sleepy morning awakens. Tall grasses bend softly in the coastal wind while quiet waves break upon the sandy beach today.",
] as const;

export const STANDARDIZED_PROMPT_LENGTH = 170;

/**
 * Returns the next standardized prompt, cycling through the bank across sessions
 * so that different sessions present different sentences of the exact same length.
 */
export function getNextStandardPrompt(): string {
  if (typeof window === "undefined") {
    return STANDARDIZED_PROMPTS[0];
  }
  try {
    const raw = sessionStorage.getItem("parkintrace_prompt_idx");
    const lastIdx = raw !== null ? parseInt(raw, 10) : -1;
    const nextIdx = (isNaN(lastIdx) ? 0 : lastIdx + 1) % STANDARDIZED_PROMPTS.length;
    sessionStorage.setItem("parkintrace_prompt_idx", String(nextIdx));
    return STANDARDIZED_PROMPTS[nextIdx];
  } catch {
    return STANDARDIZED_PROMPTS[Math.floor(Math.random() * STANDARDIZED_PROMPTS.length)];
  }
}

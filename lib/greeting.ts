export type GreetingMode = "short" | "friendly";

export interface GreetingInput {
  name: string;
  mode: GreetingMode;
}

export function formatGreeting(input: GreetingInput): string {
  const name = input.name.trim() || "Pi";

  if (input.mode === "friendly") {
    return `Hello, ${name}! Your TypeScript-first Pi package is working.`;
  }

  return `Hello, ${name}!`;
}
import type { EnvVar } from "@phala/dstack-sdk/encrypt-env-vars";

// Regex pattern for parsing dotenv lines
const LINE =
  /(?:^|^)\s*(?:export\s+)?([\w.-]+)(?:\s*=\s*?|:\s+?)(\s*'(?:\\'|[^'])*'|\s*"(?:\\"|[^"])*"|\s*`(?:\\`|[^`])*`|[^#\r\n]+)?\s*(?:#.*)?(?:$|$)/gm;

/**
 * Parse dotenv format string into key-value object (preserves original parse behavior)
 * @param input - The dotenv format string to parse
 * @returns Object with parsed key-value pairs
 */
export function parseEnv(input: string | Buffer): Record<string, string> {
  const obj: Record<string, string> = {};

  // Convert buffer to string
  let lines = input.toString();

  // Convert line breaks to same format
  lines = lines.replace(/\r\n?/gm, "\n");

  let match;
  while ((match = LINE.exec(lines)) != null) {
    const key = match[1];

    // Skip if key is undefined
    if (!key) continue;

    // Default undefined or null to empty string
    let value = match[2] || "";

    // Remove whitespace
    value = value.trim();

    // Check if double quoted
    const maybeQuote = value[0];

    // Remove surrounding quotes
    value = value.replace(/^(['"`])([\s\S]*)\1$/gm, "$2");

    // Expand newlines if double quoted
    if (maybeQuote === '"') {
      value = value.replace(/\\n/g, "\n");
      value = value.replace(/\\r/g, "\r");
    }

    // Add to object
    obj[key] = value;
  }

  return obj;
}

/**
 * Parse dotenv format string into array of environment variables
 * @param input - The dotenv format string to parse
 * @returns Array of EnvVar objects with key and value properties (all values are strings)
 */
export function parseEnvVars(input: string | Buffer): EnvVar[] {
  const parsed = parseEnv(input);
  const result: EnvVar[] = [];

  for (const [key, value] of Object.entries(parsed)) {
    result.push({ key, value });
  }

  return result;
}

import { z } from "zod";

/**
 * Common type for action parameters that control behavior (e.g., schema validation)
 */
export type ActionParameters<T = undefined> = T extends z.ZodSchema
  ? { schema: T }
  : T extends false
    ? { schema: false }
    : { schema?: z.ZodSchema | false };

/**
 * Common type for action return values with schema validation support
 */
export type ActionReturnType<DefaultType, T = undefined> = T extends z.ZodSchema
  ? z.infer<T>
  : T extends false
    ? unknown
    : DefaultType;

// Re-export for convenience
export type { z };

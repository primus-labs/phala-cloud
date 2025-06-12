# Action Functions Development Guide

A comprehensive guide for creating consistent, type-safe, and well-tested action functions in the Phala Cloud SDK.

## Overview

Action functions are the primary interface for SDK users to interact with the Phala Cloud API. They provide a clean, typed abstraction over HTTP requests with built-in validation, error handling, and comprehensive testing.

## Core Principles

### Dual API Pattern
Every action should provide two versions:
- **Standard version**: Throws errors for traditional try/catch handling
- **Safe version**: Returns `SafeResult<T>` for functional error handling

### Type-Safe Schema Validation
- Use Zod schemas for runtime validation with TypeScript inference.
- Always align Zod schemas with backend (Python/Pydantic) models.
- For optional fields, use `.optional()` or `.nullable().optional()` as appropriate.
- Top-level schemas must use `.passthrough()` for forward compatibility.

### Intelligent Type Inference
- Use TypeScript conditional types to provide smart return type inference based on parameters.
- Type inference tests should use type-level assertions, not generic invocation.

## File Structure

```
src/actions/
├── index.ts                    # Export all actions
├── {action_name}.ts           # Action implementation
├── {action_name}.test.ts      # Unit tests
└── {action_name}.e2e.test.ts   # End-to-end (integration) tests
```

## Implementation Template

### 1. Basic Structure

```typescript
import { z } from "zod";
import { type Client, type SafeResult } from "../client";

/**
 * {Action description}
 *
 * {Detailed description of what this action does}
 *
 * @example
 * ```typescript
 * import { createClient, {actionName} } from '@phala/cloud'
 *
 * // Using environment variables (PHALA_CLOUD_API_KEY)
 * const client = createClient()
 * // Or explicit configuration
 * const client = createClient({ apiKey: 'your-api-key' })
 * 
 * const result = await {actionName}(client)
 * // Output: { ... }
 * ```
 *
 * ## Returns
 *
 * `{ReturnType} | unknown`
 *
 * {Description of return value}. Return type depends on schema parameter.
 *
 * ## Parameters
 *
 * ### schema (optional)
 *
 * - **Type:** `ZodSchema | false`
 * - **Default:** `{ActionName}Schema`
 *
 * Schema to validate the response. Use `false` to return raw data without validation.
 *
 * ```typescript
 * // Use default schema
 * const result = await {actionName}(client)
 *
 * // Return raw data without validation
 * const raw = await {actionName}(client, { schema: false })
 *
 * // Use custom schema
 * const customSchema = z.object({ id: z.number(), name: z.string() })
 * const custom = await {actionName}(client, { schema: customSchema })
 * ```
 *
 * ## Safe Version
 *
 * Use `safe{ActionName}` for error handling without exceptions:
 *
 * ```typescript
 * import { safe{ActionName} } from '@phala/cloud'
 *
 * const result = await safe{ActionName}(client)
 * if (result.success) {
 *   console.log(result.data)
 * } else {
 *   if ("isRequestError" in result.error) {
 *     console.error(`HTTP ${result.error.status}: ${result.error.message}`)
 *   } else {
 *     console.error(`Validation error: ${result.error.issues}`)
 *   }
 * }
 * ```
 */

// Zod schema definition (align with backend, use .optional()/.nullable() for optional fields)
export const {ActionName}Schema = z
  .object({
    // Define schema fields
  })
  .passthrough();

export type {ActionName} = z.infer<typeof {ActionName}Schema>;

// Conditional types for intelligent type inference
export type {ActionName}Parameters<T = undefined> = T extends z.ZodSchema
  ? { schema: T }
  : T extends false
    ? { schema: false }
    : { schema?: z.ZodSchema | false };

export type {ActionName}ReturnType<T = undefined> = T extends z.ZodSchema
  ? z.infer<T>
  : T extends false
    ? unknown
    : {ActionName};

// Standard version (throws on error)
export async function {actionName}<T extends z.ZodSchema | false | undefined = undefined>(
  client: Client,
  parameters?: {ActionName}Parameters<T>,
): Promise<{ActionName}ReturnType<T>> {
  const response = await client.get("{api_endpoint}");

  if (parameters?.schema === false) {
    return response as {ActionName}ReturnType<T>;
  }

  const schema = (parameters?.schema || {ActionName}Schema) as z.ZodSchema;
  return schema.parse(response) as {ActionName}ReturnType<T>;
}

// Safe version (returns SafeResult)
export async function safe{ActionName}<T extends z.ZodSchema | false | undefined = undefined>(
  client: Client,
  parameters?: {ActionName}Parameters<T>,
): Promise<SafeResult<{ActionName}ReturnType<T>>> {
  const httpResult = await client.safeGet("{api_endpoint}");

  if (!httpResult.success) {
    return httpResult as SafeResult<{ActionName}ReturnType<T>>;
  }

  if (parameters?.schema === false) {
    return { success: true, data: httpResult.data } as SafeResult<{ActionName}ReturnType<T>>;
  }

  const schema = (parameters?.schema || {ActionName}Schema) as z.ZodSchema;
  return schema.safeParse(httpResult.data) as SafeResult<{ActionName}ReturnType<T>>;
}
```

### 2. Schema Design

- **Align with backend:** Always match the backend (Python/Pydantic) model fields and types.
- **Optional fields:** Use `.optional()` or `.nullable().optional()` for any field that is not always present.
- **Forward compatibility:** Always add `.passthrough()` to the top-level schema. Add tests to ensure extra fields in the API response do not cause validation failures.

### 3. Type Inference

- Use TypeScript conditional types for parameterized return types.
- In tests, use type-level assertions for type inference:

```typescript
type T = Awaited<ReturnType<typeof getXxx>>;
const isExpected: T extends ExpectedType ? true : false = true;
expect(isExpected).toBe(true);
```

## Testing Structure

### Unit Tests (`{action_name}.test.ts`)

- **Standard version:**
  - Returns data successfully
  - Validates response data with Zod schema
  - Handles API errors (throws)
  - Returns raw data when schema is false
  - Uses custom schema when provided
  - Throws when custom schema validation fails
- **Safe version:**
  - Returns success result when API call succeeds
  - Returns error result when API call fails
  - Handles Zod validation errors
  - Passes through HTTP errors directly
  - Returns raw data when schema is false
  - Uses custom schema when provided
  - Returns validation error when custom schema fails
- **Parameter handling:**
  - Works without parameters
  - Works with empty parameters object
  - Works with safe version without parameters
  - Works with safe version with empty parameters object
- **Schema flexibility:**
  - Allows extra fields in API response for forward compatibility
- **Type inference:**
  - Infers correct types for default, unknown, and custom schema
- **Safe version type inference:**
  - Infers correct SafeResult types for all parameterizations

#### SafeResult Error Type Branching in Tests
When testing safe action functions, the `error` field in the result can be either an HTTP error (RequestError) or a Zod validation error (ZodError). **Always use `"isRequestError" in result.error` to distinguish the type before accessing properties.**

Example:
```typescript
if (!result.success) {
  if ("isRequestError" in result.error) {
    // HTTP error
    expect(result.error.status).toBe(400);
  } else {
    // Zod validation error
    expect(result.error.issues).toBeDefined();
  }
}
```

### End-to-End Tests (`{action_name}.e2e.test.ts`)

- Should call the real API and assert the main fields are present.
- Should skip if required environment variables (e.g., API key) are not set.

### Test Coverage Checklist
For every action function, unit tests must cover:
- Standard schema validation
- API errors (exception thrown)
- SafeResult success and failure branches
- Zod validation errors
- HTTP error passthrough
- Parameter handling (no parameters, empty object, custom schema, schema: false)
- Forward compatibility (extra fields in response)
- Type inference (default, unknown, custom schema)

## Best Practices

- Use conditional types for intelligent type inference.
- Prefer single-line function signatures when possible.
- Keep parameter names consistent (`parameters` not `options`).
- Use descriptive variable names.
- Always support both error patterns (throw vs SafeResult).
- Use discriminated unions for error type detection in tests.
- Provide meaningful error messages.
- Export all relevant types for consumer use.
- Aim for 100% code coverage.
- Mock external dependencies properly.
- Include edge cases and boundary conditions.
- Consider schema validation performance for large responses.

## Common Patterns

### With Body Parameters
For POST/PUT operations that require request bodies:

```typescript
export type CreateUserParameters<T = undefined> = {
  body: {
    name: string;
    email: string;
  };
} & (T extends z.ZodSchema
  ? { schema: T }
  : T extends false
    ? { schema: false }
    : { schema?: z.ZodSchema | false });
```

### With Query Parameters
For operations that accept query parameters:

```typescript
export type ListUsersParameters<T = undefined> = {
  page?: number;
  limit?: number;
} & (T extends z.ZodSchema
  ? { schema: T }
  : T extends false
    ? { schema: false }
    : { schema?: z.ZodSchema | false });
```

### With Path Parameters
For operations with dynamic path segments:

```typescript
export async function getUser<T extends z.ZodSchema | false | undefined = undefined>(
  client: Client,
  userId: string,
  parameters?: GetUserParameters<T>,
): Promise<GetUserReturnType<T>> {
  const response = await client.get(`/users/${userId}`);
  // ... rest of implementation
}
```

## Migration and Versioning

When updating existing actions:
1. Maintain backward compatibility in public APIs
2. Add new optional parameters as needed
3. Update tests to cover new functionality
4. Consider deprecation notices for removed features

This guide ensures consistent, high-quality action functions that provide excellent developer experience while maintaining type safety and comprehensive error handling. 
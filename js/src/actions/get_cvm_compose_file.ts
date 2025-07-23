import { z } from "zod";
import { type Client, type SafeResult } from "../client";
import { ActionParameters, ActionReturnType } from "../types/common";

/**
 * Get CVM compose file configuration
 *
 * Retrieves the current Docker Compose file configuration and metadata for a specified CVM.
 *
 * @example
 * ```typescript
 * import { createClient, getCvmComposeFile } from '@phala/cloud'
 *
 * const client = createClient({ apiKey: 'your-api-key' })
 * const composeFile = await getCvmComposeFile(client, { id: 'cvm-123' })
 * // Output: { compose_content: '...', version: '...', last_modified: '...' }
 * ```
 *
 * ## Returns
 *
 * `GetCvmComposeFileResult | unknown`
 *
 * The CVM compose file configuration including compose_content and metadata. Return type depends on schema parameter.
 *
 * ## Parameters
 *
 * ### request (required)
 * - **Type:** `GetCvmComposeFileRequest`
 *
 * Request parameters containing the CVM identifier. Can be one of:
 * - id: The CVM ID
 * - uuid: The CVM UUID
 * - appId: The App ID (40 chars)
 * - instanceId: The Instance ID (40 chars)
 *
 * ### parameters (optional)
 * - **Type:** `GetCvmComposeFileParameters`
 *
 * Optional behavior parameters for schema validation.
 *
 * ```typescript
 * // Use default schema
 * const result = await getCvmComposeFile(client, { id: 'cvm-123' })
 *
 * // Return raw data without validation
 * const raw = await getCvmComposeFile(client, { id: 'cvm-123' }, { schema: false })
 *
 * // Use custom schema
 * const customSchema = z.object({ compose_content: z.string() })
 * const custom = await getCvmComposeFile(client, { id: 'cvm-123' }, { schema: customSchema })
 * ```
 *
 * ## Safe Version
 *
 * Use `safeGetCvmComposeFile` for error handling without exceptions:
 *
 * ```typescript
 * import { safeGetCvmComposeFile } from '@phala/cloud'
 *
 * const result = await safeGetCvmComposeFile(client, { id: 'cvm-123' })
 * if (result.success) {
 *   console.log(result.data.compose_content)
 * } else {
 *   if ("isRequestError" in result.error) {
 *     console.error(`HTTP ${result.error.status}: ${result.error.message}`)
 *   } else {
 *     console.error(`Validation error: ${result.error.issues}`)
 *   }
 * }
 * ```
 */

export const GetCvmComposeFileResultSchema = z
  .object({
    allowed_envs: z.array(z.string()).optional(),
    docker_compose_file: z.string(),
    features: z.array(z.string()).optional(),
    name: z.string().optional(),
    manifest_version: z.number().optional(),
    kms_enabled: z.boolean().optional(),
    public_logs: z.boolean().optional(),
    public_sysinfo: z.boolean().optional(),
    tproxy_enabled: z.boolean().optional(),
    pre_launch_script: z.string().optional(),
  })
  .passthrough();

// Legacy alias for backwards compatibility
export const CvmComposeFileSchema = GetCvmComposeFileResultSchema;
export type CvmComposeFile = z.infer<typeof CvmComposeFileSchema>;
export type GetCvmComposeFileResult = z.infer<typeof GetCvmComposeFileResultSchema>;

export const GetCvmComposeFileRequestSchema = z
  .object({
    id: z.string().optional(),
    uuid: z
      .string()
      .regex(/^[0-9a-f]{8}[-]?[0-9a-f]{4}[-]?4[0-9a-f]{3}[-]?[89ab][0-9a-f]{3}[-]?[0-9a-f]{12}$/i)
      .optional(),
    app_id: z
      .string()
      .refine(
        (val) => !val.startsWith("app_") && val.length === 40,
        "app_id should be 40 characters without prefix",
      )
      .transform((val) => (val.startsWith("app_") ? val : `app_${val}`))
      .optional(),
    instance_id: z
      .string()
      .refine(
        (val) => !val.startsWith("instance_") && val.length === 40,
        "instance_id should be 40 characters without prefix",
      )
      .transform((val) => (val.startsWith("instance_") ? val : `instance_${val}`))
      .optional(),
  })
  .refine(
    (data) => !!(data.id || data.uuid || data.app_id || data.instance_id),
    "One of id, uuid, app_id, or instance_id must be provided",
  )
  .transform((data) => ({
    cvmId: data.id || data.uuid || data.app_id || data.instance_id,
    _raw: data,
  }));

export type GetCvmComposeFileRequest = {
  id?: string;
  uuid?: string;
  app_id?: string;
  instance_id?: string;
};

export type GetCvmComposeFileParameters<T = undefined> = ActionParameters<T>;

export type GetCvmComposeFileReturnType<T = undefined> = ActionReturnType<
  GetCvmComposeFileResult,
  T
>;

export async function getCvmComposeFile<T extends z.ZodSchema | false | undefined = undefined>(
  client: Client,
  request: GetCvmComposeFileRequest,
  parameters?: GetCvmComposeFileParameters<T>,
): Promise<GetCvmComposeFileReturnType<T>> {
  const validatedRequest = GetCvmComposeFileRequestSchema.parse(request);

  const response = await client.get(`/cvms/${validatedRequest.cvmId}/compose_file`);

  if (parameters?.schema === false) {
    return response as GetCvmComposeFileReturnType<T>;
  }

  const schema = (parameters?.schema || GetCvmComposeFileResultSchema) as z.ZodSchema;
  return schema.parse(response) as GetCvmComposeFileReturnType<T>;
}

export async function safeGetCvmComposeFile<T extends z.ZodSchema | false | undefined = undefined>(
  client: Client,
  request: GetCvmComposeFileRequest,
  parameters?: GetCvmComposeFileParameters<T>,
): Promise<SafeResult<GetCvmComposeFileReturnType<T>>> {
  const requestValidation = GetCvmComposeFileRequestSchema.safeParse(request);
  if (!requestValidation.success) {
    return requestValidation as SafeResult<GetCvmComposeFileReturnType<T>>;
  }

  const httpResult = await client.safeGet(`/cvms/${requestValidation.data.cvmId}/compose_file`);
  if (!httpResult.success) {
    return httpResult as SafeResult<GetCvmComposeFileReturnType<T>>;
  }

  if (parameters?.schema === false) {
    return { success: true, data: httpResult.data } as SafeResult<GetCvmComposeFileReturnType<T>>;
  }

  const schema = (parameters?.schema || GetCvmComposeFileResultSchema) as z.ZodSchema;
  return schema.safeParse(httpResult.data) as SafeResult<GetCvmComposeFileReturnType<T>>;
}

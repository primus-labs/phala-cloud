import { z } from "zod";
import { type Client, type SafeResult } from "../client";
import { ActionParameters, ActionReturnType } from "../types/common";
import { KmsInfoSchema } from "../types/kms_info";

/**
 * Provision CVM compose file update
 *
 * Provisions a CVM compose file update by uploading the new compose file configuration.
 * Returns a compose_hash that must be used with `commitCvmComposeFileUpdate` to finalize the update.
 *
 * @example
 * ```typescript
 * import { createClient, provisionCvmComposeFileUpdate } from '@phala/cloud'
 *
 * const client = createClient({ apiKey: 'your-api-key' })
 * const result = await provisionCvmComposeFileUpdate(client, {
 *   id: 'cvm-123',
 *   app_compose: {
 *     name: 'my-app',
 *     docker_compose_file: 'version: "3.8"\nservices:\n  app:\n    image: nginx'
 *   }
 * })
 * console.log(`Compose hash: ${result.compose_hash}`)
 * ```
 *
 * ## Returns
 *
 * `ProvisionCvmComposeFileUpdateResult | unknown`
 *
 * Provision response including compose_hash and metadata needed for committing the update.
 * Return type depends on schema parameter.
 *
 * ## Parameters
 *
 * ### request (required)
 * - **Type:** `ProvisionCvmComposeFileUpdateRequest`
 *
 * Request parameters containing the CVM ID and compose file configuration.
 *
 * ### parameters (optional)
 * - **Type:** `ProvisionCvmComposeFileUpdateParameters`
 *
 * Optional behavior parameters for schema validation.
 *
 * ```typescript
 * // Use default schema
 * const result = await provisionCvmComposeFileUpdate(client, {
 *   id: 'cvm-123',
 *   app_compose: { name: 'my-app', docker_compose_file: '...' }
 * })
 *
 * // Return raw data without validation
 * const raw = await provisionCvmComposeFileUpdate(client, request, { schema: false })
 *
 * // Use custom schema
 * const customSchema = z.object({ compose_hash: z.string() })
 * const custom = await provisionCvmComposeFileUpdate(client, request, { schema: customSchema })
 * ```
 *
 * ## Safe Version
 *
 * Use `safeProvisionCvmComposeFileUpdate` for error handling without exceptions:
 *
 * ```typescript
 * import { safeProvisionCvmComposeFileUpdate } from '@phala/cloud'
 *
 * const result = await safeProvisionCvmComposeFileUpdate(client, {
 *   id: 'cvm-123',
 *   app_compose: { name: 'my-app', docker_compose_file: '...' }
 * })
 * if (result.success) {
 *   console.log(`Compose hash: ${result.data.compose_hash}`)
 * } else {
 *   if ("isRequestError" in result.error) {
 *     console.error(`HTTP ${result.error.status}: ${result.error.message}`)
 *   } else {
 *     console.error(`Validation error: ${result.error.issues}`)
 *   }
 * }
 * ```
 */

export const ProvisionCvmComposeFileUpdateRequestSchema = z
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
    app_compose: z.object({
      allowed_envs: z.array(z.string()).optional(),
      docker_compose_file: z.string().min(1, "Docker compose file is required"),
      name: z.string(),
      kms_enabled: z.boolean().optional(),
      public_logs: z.boolean().optional(),
      public_sysinfo: z.boolean().optional(),
      pre_launch_script: z.string().optional(),
    }),
  })
  .refine(
    (data) => !!(data.id || data.uuid || data.app_id || data.instance_id),
    "One of id, uuid, app_id, or instance_id must be provided",
  )
  .transform((data) => ({
    cvmId: data.id || data.uuid || data.app_id || data.instance_id,
    request: data.app_compose,
    _raw: data,
  }));

export const ProvisionCvmComposeFileUpdateResultSchema = z
  .object({
    app_id: z.string().nullable(),
    device_id: z.string().nullable(),
    compose_hash: z.string(),
    kms_info: KmsInfoSchema.nullable().optional(),
  })
  .passthrough();

export type ProvisionCvmComposeFileUpdateRequest = z.input<
  typeof ProvisionCvmComposeFileUpdateRequestSchema
>;
export type ProvisionCvmComposeFileUpdateResult = z.infer<
  typeof ProvisionCvmComposeFileUpdateResultSchema
>;

export type ProvisionCvmComposeFileUpdateParameters<T = undefined> = ActionParameters<T>;
export type ProvisionCvmComposeFileUpdateReturnType<T = undefined> = ActionReturnType<
  ProvisionCvmComposeFileUpdateResult,
  T
>;

/**
 * Provision a CVM compose file update
 *
 * @param client - The API client
 * @param request - Request parameters containing CVM ID and compose file configuration
 * @param parameters - Optional behavior parameters
 * @returns Update provision result
 */
export async function provisionCvmComposeFileUpdate<
  T extends z.ZodSchema | false | undefined = undefined,
>(
  client: Client,
  request: ProvisionCvmComposeFileUpdateRequest,
  parameters?: ProvisionCvmComposeFileUpdateParameters<T>,
): Promise<ProvisionCvmComposeFileUpdateReturnType<T>> {
  const validatedRequest = ProvisionCvmComposeFileUpdateRequestSchema.parse(request);

  const response = await client.post(
    `/cvms/${validatedRequest.cvmId}/compose_file/provision`,
    validatedRequest.request,
  );

  if (parameters?.schema === false) {
    return response as ProvisionCvmComposeFileUpdateReturnType<T>;
  }

  const schema = (parameters?.schema || ProvisionCvmComposeFileUpdateResultSchema) as z.ZodSchema;
  return schema.parse(response) as ProvisionCvmComposeFileUpdateReturnType<T>;
}

/**
 * Safe version of provisionCvmComposeFileUpdate that returns a Result type instead of throwing
 */
export async function safeProvisionCvmComposeFileUpdate<
  T extends z.ZodSchema | false | undefined = undefined,
>(
  client: Client,
  request: ProvisionCvmComposeFileUpdateRequest,
  parameters?: ProvisionCvmComposeFileUpdateParameters<T>,
): Promise<SafeResult<ProvisionCvmComposeFileUpdateReturnType<T>>> {
  const requestValidation = ProvisionCvmComposeFileUpdateRequestSchema.safeParse(request);
  if (!requestValidation.success) {
    return requestValidation as SafeResult<ProvisionCvmComposeFileUpdateReturnType<T>>;
  }

  const httpResult = await client.safePost(
    `/cvms/${requestValidation.data.cvmId}/compose_file/provision`,
    requestValidation.data.request,
  );
  if (!httpResult.success) {
    return httpResult as SafeResult<ProvisionCvmComposeFileUpdateReturnType<T>>;
  }

  if (parameters?.schema === false) {
    return { success: true, data: httpResult.data } as SafeResult<
      ProvisionCvmComposeFileUpdateReturnType<T>
    >;
  }

  const schema = (parameters?.schema || ProvisionCvmComposeFileUpdateResultSchema) as z.ZodSchema;
  return schema.safeParse(httpResult.data) as SafeResult<
    ProvisionCvmComposeFileUpdateReturnType<T>
  >;
}

import { z } from "zod";
import type { Client, SafeResult } from "../client";
import { type KmsInfo, KmsInfoSchema } from "../types/kms_info";
import { ActionParameters, ActionReturnType } from "../types/common";
import { validateActionParameters, safeValidateActionParameters } from "../utils";

export const GetKmsInfoRequestSchema = z.object({
  kms_id: z.string().min(1, "KMS ID is required"),
});

export type GetKmsInfoRequest = z.infer<typeof GetKmsInfoRequestSchema>;

export type GetKmsInfoParameters<T = undefined> = ActionParameters<T>;

export type GetKmsInfoReturnType<T = undefined> = ActionReturnType<KmsInfo, T>;

/**
 * Get information about a specific KMS
 *
 * @param client - The API client
 * @param request - Request parameters
 * @param request.kms_id - ID of the KMS to get information for
 * @param parameters - Optional behavior parameters
 * @returns KMS information
 *
 * @example
 * ```typescript
 * const info = await getKmsInfo(client, { kms_id: "kms-123" })
 * ```
 */
export async function getKmsInfo<T extends z.ZodSchema | false | undefined = undefined>(
  client: Client,
  request: GetKmsInfoRequest,
  parameters?: GetKmsInfoParameters<T>,
): Promise<GetKmsInfoReturnType<T>> {
  const validatedRequest = GetKmsInfoRequestSchema.parse(request);

  validateActionParameters(parameters);

  const response = await client.get(`/kms/${validatedRequest.kms_id}`);
  if (parameters?.schema === false) {
    return response as GetKmsInfoReturnType<T>;
  }
  const schema = (parameters?.schema || KmsInfoSchema) as z.ZodSchema;
  return schema.parse(response) as GetKmsInfoReturnType<T>;
}

/**
 * Safe version of getKmsInfo that returns a Result type instead of throwing
 */
export async function safeGetKmsInfo<T extends z.ZodSchema | false | undefined = undefined>(
  client: Client,
  request: GetKmsInfoRequest,
  parameters?: GetKmsInfoParameters<T>,
): Promise<SafeResult<GetKmsInfoReturnType<T>>> {
  const requestValidation = GetKmsInfoRequestSchema.safeParse(request);
  if (!requestValidation.success) {
    return requestValidation as SafeResult<GetKmsInfoReturnType<T>>;
  }

  const parameterValidationError = safeValidateActionParameters(parameters);
  if (parameterValidationError) {
    return parameterValidationError as SafeResult<GetKmsInfoReturnType<T>>;
  }

  const httpResult = await client.safeGet(`/kms/${requestValidation.data.kms_id}`);
  if (!httpResult.success) {
    return httpResult;
  }
  if (parameters?.schema === false) {
    return { success: true, data: httpResult.data } as SafeResult<GetKmsInfoReturnType<T>>;
  }
  const schema = (parameters?.schema || KmsInfoSchema) as z.ZodSchema;
  const validationResult = schema.safeParse(httpResult.data);
  return validationResult as SafeResult<GetKmsInfoReturnType<T>>;
}

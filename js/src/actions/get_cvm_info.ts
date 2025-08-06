import { z } from "zod";
import { type Client, type SafeResult } from "../client";
import { CvmLegacyDetailSchema } from "../types/cvm_info";
import { ActionParameters, ActionReturnType } from "../types/common";
import { validateActionParameters, safeValidateActionParameters } from "../utils";

export { CvmLegacyDetailSchema };

export type GetCvmInfoResponse = z.infer<typeof CvmLegacyDetailSchema>;

export const GetCvmInfoRequestSchema = z
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

export type GetCvmInfoRequest = {
  id?: string;
  uuid?: string;
  app_id?: string;
  instance_id?: string;
};

export type GetCvmInfoParameters<T = undefined> = ActionParameters<T>;

export type GetCvmInfoReturnType<T = undefined> = ActionReturnType<GetCvmInfoResponse, T>;

/**
 * Get information about a specific CVM
 *
 * @param client - The API client
 * @param request - Request parameters
 * @param request.cvmId - ID of the CVM to get information for
 * @param parameters - Optional behavior parameters
 * @returns CVM information
 *
 * @example
 * ```typescript
 * const info = await getCvmInfo(client, { cvmId: "cvm-123" })
 * ```
 */
export async function getCvmInfo<T extends z.ZodSchema | false | undefined = undefined>(
  client: Client,
  request: GetCvmInfoRequest,
  parameters?: GetCvmInfoParameters<T>,
): Promise<GetCvmInfoReturnType<T>> {
  const validatedRequest = GetCvmInfoRequestSchema.parse(request);

  validateActionParameters(parameters);

  const response = await client.get(`/cvms/${validatedRequest.cvmId}`);

  if (parameters?.schema === false) {
    return response as GetCvmInfoReturnType<T>;
  }
  const schema = (parameters?.schema || CvmLegacyDetailSchema) as z.ZodSchema;
  return schema.parse(response) as GetCvmInfoReturnType<T>;
}

/**
 * Safe version of getCvmInfo that returns a Result type instead of throwing
 */
export async function safeGetCvmInfo<T extends z.ZodSchema | false | undefined = undefined>(
  client: Client,
  request: GetCvmInfoRequest,
  parameters?: GetCvmInfoParameters<T>,
): Promise<SafeResult<GetCvmInfoReturnType<T>>> {
  const requestValidation = GetCvmInfoRequestSchema.safeParse(request);
  if (!requestValidation.success) {
    return requestValidation as SafeResult<GetCvmInfoReturnType<T>>;
  }

  const parameterValidationError = safeValidateActionParameters(parameters);
  if (parameterValidationError) {
    return parameterValidationError as SafeResult<GetCvmInfoReturnType<T>>;
  }

  const httpResult = await client.safeGet(`/cvms/${requestValidation.data.cvmId}`);
  if (!httpResult.success) {
    return httpResult;
  }
  if (parameters?.schema === false) {
    return {
      success: true,
      data: httpResult.data,
    } as SafeResult<GetCvmInfoReturnType<T>>;
  }
  const schema = (parameters?.schema || CvmLegacyDetailSchema) as z.ZodSchema;
  const validationResult = schema.safeParse(httpResult.data);
  return validationResult as SafeResult<GetCvmInfoReturnType<T>>;
}

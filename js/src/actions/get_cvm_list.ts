import { z } from "zod";
import { type Client, type SafeResult } from "../client";
import { CvmInfoSchema } from "../types/cvm_info";
import { ActionParameters, ActionReturnType } from "../types/common";
import { validateActionParameters, safeValidateActionParameters } from "../utils";

export const GetCvmListRequestSchema = z
  .object({
    page: z.number().int().min(1).optional(),
    page_size: z.number().int().min(1).optional(),
    node_id: z.number().int().min(1).optional(),
  })
  .strict();

export const GetCvmListSchema = z
  .object({
    items: z.array(CvmInfoSchema),
    total: z.number(),
    page: z.number(),
    page_size: z.number(),
    pages: z.number(),
  })
  .strict();

export type GetCvmListRequest = z.infer<typeof GetCvmListRequestSchema>;
export type GetCvmListResponse = z.infer<typeof GetCvmListSchema>;

export type GetCvmListParameters<T = undefined> = ActionParameters<T>;

export type GetCvmListReturnType<T = undefined> = ActionReturnType<GetCvmListResponse, T>;

/**
 * Get a paginated list of CVMs
 *
 * @param client - The API client
 * @param request - Optional request parameters for pagination and filtering
 * @param request.page - Page number (1-based)
 * @param request.page_size - Number of items per page
 * @param request.node_id - Filter by node ID
 * @param parameters - Optional behavior parameters
 * @returns Paginated list of CVMs
 *
 * @example
 * ```typescript
 * // Get first page with default size
 * const list = await getCvmList(client, { page: 1 })
 *
 * // Get with custom page size
 * const list = await getCvmList(client, { page: 1, page_size: 20 })
 *
 * // Get with custom schema
 * const list = await getCvmList(client, { page: 1 }, { schema: customSchema })
 * ```
 */
export async function getCvmList<T extends z.ZodSchema | false | undefined = undefined>(
  client: Client,
  request?: GetCvmListRequest,
  parameters?: GetCvmListParameters<T>,
): Promise<GetCvmListReturnType<T>> {
  const validatedRequest = GetCvmListRequestSchema.parse(request ?? {});

  validateActionParameters(parameters);

  const response = await client.get("/cvms/paginated", { params: validatedRequest });

  if (parameters?.schema === false) {
    return response as GetCvmListReturnType<T>;
  }

  const schema = (parameters?.schema || GetCvmListSchema) as z.ZodSchema;
  return schema.parse(response) as GetCvmListReturnType<T>;
}

/**
 * Safe version of getCvmList that returns a Result type instead of throwing
 */
export async function safeGetCvmList<T extends z.ZodSchema | false | undefined = undefined>(
  client: Client,
  request?: GetCvmListRequest,
  parameters?: GetCvmListParameters<T>,
): Promise<SafeResult<GetCvmListReturnType<T>>> {
  const requestValidation = GetCvmListRequestSchema.safeParse(request ?? {});
  if (!requestValidation.success) {
    return requestValidation as SafeResult<GetCvmListReturnType<T>>;
  }

  const parameterValidationError = safeValidateActionParameters(parameters);
  if (parameterValidationError) {
    return parameterValidationError as SafeResult<GetCvmListReturnType<T>>;
  }

  const httpResult = await client.safeGet("/cvms/paginated", { params: requestValidation.data });
  if (!httpResult.success) {
    return httpResult;
  }

  if (parameters?.schema === false) {
    return {
      success: true,
      data: httpResult.data,
    } as SafeResult<GetCvmListReturnType<T>>;
  }

  const schema = (parameters?.schema || GetCvmListSchema) as z.ZodSchema;
  const validationResult = schema.safeParse(httpResult.data);
  return validationResult as SafeResult<GetCvmListReturnType<T>>;
}

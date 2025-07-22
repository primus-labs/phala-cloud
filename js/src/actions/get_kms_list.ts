import { z } from "zod";
import { type Client, type SafeResult } from "../client";
import { KmsInfoSchema } from "../types/kms_info";
import { ActionParameters, ActionReturnType } from "../types/common";
import { validateActionParameters, safeValidateActionParameters } from "../utils";

export const GetKmsListRequestSchema = z
  .object({
    page: z.number().int().min(1).optional(),
    page_size: z.number().int().min(1).optional(),
    is_onchain: z.boolean().optional(),
  })
  .strict();

export const GetKmsListSchema = z
  .object({
    items: z.array(KmsInfoSchema),
    total: z.number(),
    page: z.number(),
    page_size: z.number(),
    pages: z.number(),
  })
  .strict();

export type GetKmsListRequest = z.infer<typeof GetKmsListRequestSchema>;
export type GetKmsListResponse = z.infer<typeof GetKmsListSchema>;

export type GetKmsListParameters<T = undefined> = ActionParameters<T>;

export type GetKmsListReturnType<T = undefined> = ActionReturnType<GetKmsListResponse, T>;

export async function getKmsList<T extends z.ZodSchema | false | undefined = undefined>(
  client: Client,
  request?: GetKmsListRequest,
  parameters?: GetKmsListParameters<T>,
): Promise<GetKmsListReturnType<T>> {
  const validatedRequest = GetKmsListRequestSchema.parse(request ?? {});

  validateActionParameters(parameters);

  const response = await client.get("/kms", { params: validatedRequest });
  if (parameters?.schema === false) {
    return response as GetKmsListReturnType<T>;
  }

  const schema = (parameters?.schema || GetKmsListSchema) as z.ZodSchema;
  return schema.parse(response) as GetKmsListReturnType<T>;
}

export async function safeGetKmsList<T extends z.ZodSchema | false | undefined = undefined>(
  client: Client,
  request?: GetKmsListRequest,
  parameters?: GetKmsListParameters<T>,
): Promise<SafeResult<GetKmsListReturnType<T>>> {
  const requestValidation = GetKmsListRequestSchema.safeParse(request ?? {});
  if (!requestValidation.success) {
    return requestValidation as SafeResult<GetKmsListReturnType<T>>;
  }

  const parameterValidationError = safeValidateActionParameters(parameters);
  if (parameterValidationError) {
    return parameterValidationError as SafeResult<GetKmsListReturnType<T>>;
  }

  const httpResult = await client.safeGet("/kms", { params: requestValidation.data });
  if (!httpResult.success) {
    return httpResult;
  }

  if (parameters?.schema === false) {
    return {
      success: true,
      data: httpResult.data,
    } as SafeResult<GetKmsListReturnType<T>>;
  }

  const schema = (parameters?.schema || GetKmsListSchema) as z.ZodSchema;
  const validationResult = schema.safeParse(httpResult.data);
  return validationResult as SafeResult<GetKmsListReturnType<T>>;
}

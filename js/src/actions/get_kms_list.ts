import { z } from "zod";
import type { SafeResult, Client } from "../client";
import { type KmsInfo, KmsInfoSchema } from "../types/kms_info";

export const GetKmsListSchema = z.object({
  items: z.array(KmsInfoSchema),
  total: z.number(),
  page: z.number(),
  page_size: z.number(),
  pages: z.number(),
});

export type GetKmsListParameters<T = undefined> = T extends z.ZodSchema
  ? { schema: T }
  : T extends false
    ? { schema: false }
    : { schema?: z.ZodSchema | false };

export type GetKmsListReturnType<T = undefined> = T extends z.ZodSchema
  ? z.infer<T>
  : T extends false
    ? unknown
    : KmsInfo[];

export async function getKmsList<T extends z.ZodSchema | false | undefined = undefined>(
  client: Client,
  parameters?: GetKmsListParameters<T>,
): Promise<GetKmsListReturnType<T>> {
  const httpResult = await client.safeGet("/kms");
  if (httpResult.error) {
    throw httpResult.error;
  }
  if (parameters?.schema === false) {
    return httpResult.data as GetKmsListReturnType<T>;
  }
  const schema = (parameters?.schema || GetKmsListSchema) as z.ZodSchema;
  return schema.parse(httpResult.data) as GetKmsListReturnType<T>;
}

export async function safeGetKmsList<T extends z.ZodSchema | false | undefined = undefined>(
  client: Client,
  parameters?: GetKmsListParameters<T>,
): Promise<SafeResult<GetKmsListReturnType<T>>> {
  const httpResult = await client.safeGet("/kms");
  if (httpResult.error) {
    return httpResult;
  }
  if (parameters?.schema === false) {
    return { success: true, data: httpResult.data } as SafeResult<GetKmsListReturnType<T>>;
  }
  const schema = (parameters?.schema || GetKmsListSchema) as z.ZodSchema;
  const validationResult = schema.safeParse(httpResult.data);
  return validationResult as SafeResult<GetKmsListReturnType<T>>;
}

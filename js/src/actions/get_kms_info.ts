import { z } from "zod";
import type { Client, SafeResult } from "../client";
import { type KmsInfo, KmsInfoSchema } from "../types/kms_info";

export type GetKmsInfoParameters<T = undefined> = T extends z.ZodSchema
  ? { schema: T }
  : T extends false
    ? { schema: false }
    : { schema?: z.ZodSchema | false };

export type GetKmsInfoReturnType<T = undefined> = T extends z.ZodSchema
  ? z.infer<T>
  : T extends false
    ? unknown
    : KmsInfo;

export async function getKmsInfo<T extends z.ZodSchema | false | undefined = undefined>(
  client: Client,
  kmsId: string,
  parameters?: GetKmsInfoParameters<T>,
): Promise<GetKmsInfoReturnType<T>> {
  const httpResult = await client.safeGet(`/kms/${kmsId}`);
  if (!httpResult.success) {
    throw httpResult.error;
  }
  if (parameters?.schema === false) {
    return httpResult.data as GetKmsInfoReturnType<T>;
  }
  const schema = (parameters?.schema || KmsInfoSchema) as z.ZodSchema;
  return schema.parse(httpResult.data) as GetKmsInfoReturnType<T>;
}

export async function safeGetKmsInfo<T extends z.ZodSchema | false | undefined = undefined>(
  client: Client,
  kmsId: string,
  parameters?: GetKmsInfoParameters<T>,
): Promise<SafeResult<GetKmsInfoReturnType<T>>> {
  const httpResult = await client.safeGet(`/kms/${kmsId}`);
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

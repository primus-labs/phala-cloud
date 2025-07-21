import { z } from "zod";
import type { SafeResult, Client } from "../client";
import { CvmInfoSchema, type CvmInfo } from "../types/cvm_info";

export const GetCvmInfoSchema = CvmInfoSchema;

export type GetCvmInfoResponse = z.infer<typeof GetCvmInfoSchema>;

export type GetCvmInfoParameters<T = undefined> = T extends z.ZodSchema
  ? { schema: T }
  : T extends false
    ? { schema: false }
    : { schema?: z.ZodSchema | false };

export type GetCvmInfoReturnType<T = undefined> = T extends z.ZodSchema
  ? z.infer<T>
  : T extends false
    ? unknown
    : GetCvmInfoResponse;

export async function getCvmInfo<T extends z.ZodSchema | false | undefined = undefined>(
  client: Client,
  cvmId: string,
  parameters?: GetCvmInfoParameters<T>,
): Promise<GetCvmInfoReturnType<T>> {
  const httpResult = await client.safeGet(`/cvms/${cvmId}`);
  if (httpResult.error) {
    throw httpResult.error;
  }
  if (parameters?.schema === false) {
    return httpResult.data as GetCvmInfoReturnType<T>;
  }
  const schema = (parameters?.schema || GetCvmInfoSchema) as z.ZodSchema;
  return schema.parse(httpResult.data) as GetCvmInfoReturnType<T>;
}

export async function safeGetCvmInfo<T extends z.ZodSchema | false | undefined = undefined>(
  client: Client,
  cvmId: string,
  parameters?: GetCvmInfoParameters<T>,
): Promise<SafeResult<GetCvmInfoReturnType<T>>> {
  const httpResult = await client.safeGet(`/cvms/${cvmId}`);
  if (httpResult.error) {
    return httpResult;
  }
  if (parameters?.schema === false) {
    return {
      success: true,
      data: httpResult.data,
    } as SafeResult<GetCvmInfoReturnType<T>>;
  }
  const schema = (parameters?.schema || GetCvmInfoSchema) as z.ZodSchema;
  const validationResult = schema.safeParse(httpResult.data);
  return validationResult as SafeResult<GetCvmInfoReturnType<T>>;
}

import { z } from "zod";
import type { SafeResult, Client } from "../client";
import { CvmInfoSchema, type CvmInfo } from "../types/cvm_info";

export const GetCvmListSchema = z.object({
  items: z.array(CvmInfoSchema),
  total: z.number(),
  page: z.number(),
  page_size: z.number(),
  pages: z.number(),
});

export type GetCvmListResponse = z.infer<typeof GetCvmListSchema>;

interface QueryParams {
  page?: number;
  page_size?: number;
  node_id?: number;
}

export type GetCvmListParameters<T = undefined> = T extends z.ZodSchema
  ? { schema: T } & QueryParams
  : T extends false
    ? { schema: false } & QueryParams
    : { schema?: z.ZodSchema | false } & QueryParams;

export type GetCvmListReturnType<T = undefined> = T extends z.ZodSchema
  ? z.infer<T>
  : T extends false
    ? unknown
    : GetCvmListResponse;

export async function getCvmList<T extends z.ZodSchema | false | undefined = undefined>(
  client: Client,
  parameters?: GetCvmListParameters<T>,
): Promise<GetCvmListReturnType<T>> {
  const params = {} as QueryParams;
  if (parameters?.page) {
    params.page = parameters.page;
  }
  if (parameters?.page_size) {
    params.page_size = parameters.page_size;
  }
  if (parameters?.node_id) {
    params.node_id = parameters.node_id;
  }
  const httpResult = await client.safeGet("/cvms/paginated", { params });
  if (httpResult.error) {
    throw httpResult.error;
  }
  if (parameters?.schema === false) {
    return httpResult.data as GetCvmListReturnType<T>;
  }
  const schema = (parameters?.schema || GetCvmListSchema) as z.ZodSchema;
  return schema.parse(httpResult.data) as GetCvmListReturnType<T>;
}

export async function safeGetCvmList<T extends z.ZodSchema | false | undefined = undefined>(
  client: Client,
  parameters?: GetCvmListParameters<T>,
): Promise<SafeResult<GetCvmListReturnType<T>>> {
  const params = {} as QueryParams;
  if (parameters?.page) {
    params.page = parameters.page;
  }
  if (parameters?.page_size) {
    params.page_size = parameters.page_size;
  }
  if (parameters?.node_id) {
    params.node_id = parameters.node_id;
  }
  const httpResult = await client.safeGet("/cvms/paginated", { params });
  if (httpResult.error) {
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

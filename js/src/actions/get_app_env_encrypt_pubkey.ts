import { z } from "zod";
import type { Client, SafeResult } from "../client";

export const GetAppEnvEncryptPubKeyRequestSchema = z.object({
  kmsId: z.string(),
  appId: z.string(),
});

export const GetAppEnvEncryptPubKeySchema = z.object({
  public_key: z.string(),
  signature: z.string(),
});

export type GetAppEnvEncryptPubKeyRequest = z.infer<typeof GetAppEnvEncryptPubKeyRequestSchema>;

export type GetAppEnvEncryptPubKey = z.infer<typeof GetAppEnvEncryptPubKeySchema>;

export type GetAppEnvEncryptPubKeyParameters<T = undefined> = T extends z.ZodSchema
  ? { schema: T }
  : T extends false
    ? { schema: false }
    : { schema?: z.ZodSchema | false };

export type GetAppEnvEncryptPubKeyReturnType<T = undefined> = T extends z.ZodSchema
  ? z.infer<T>
  : T extends false
    ? unknown
    : GetAppEnvEncryptPubKey;

export const getAppEnvEncryptPubKey = async <T extends z.ZodSchema | false | undefined = undefined>(
  client: Client,
  payload: GetAppEnvEncryptPubKeyRequest,
  parameters?: GetAppEnvEncryptPubKeyParameters<T>,
): Promise<GetAppEnvEncryptPubKeyReturnType<T>> => {
  const httpResult = await client.safeGet(`/kms/${payload.kmsId}/pubkey/${payload.appId}`);
  if (!httpResult.success) {
    return httpResult as GetAppEnvEncryptPubKeyReturnType<T>;
  }
  if (parameters?.schema === false) {
    return httpResult.data as GetAppEnvEncryptPubKeyReturnType<T>;
  }
  const schema = (parameters?.schema || GetAppEnvEncryptPubKeySchema) as z.ZodSchema;
  return schema.parse(httpResult.data) as GetAppEnvEncryptPubKeyReturnType<T>;
};

export const safeGetAppEnvEncryptPubKey = async <
  T extends z.ZodSchema | false | undefined = undefined,
>(
  client: Client,
  payload: GetAppEnvEncryptPubKeyRequest,
  parameters?: GetAppEnvEncryptPubKeyParameters<T>,
): Promise<SafeResult<GetAppEnvEncryptPubKeyReturnType<T>>> => {
  const httpResult = await client.safeGet(`/kms/${payload.kmsId}/pubkey/${payload.appId}`);
  if (!httpResult.success) {
    return { success: false, error: httpResult.error } as SafeResult<
      GetAppEnvEncryptPubKeyReturnType<T>
    >;
  }
  if (parameters?.schema === false) {
    return { success: true, data: httpResult.data } as SafeResult<
      GetAppEnvEncryptPubKeyReturnType<T>
    >;
  }
  const schema = (parameters?.schema || GetAppEnvEncryptPubKeySchema) as z.ZodSchema;
  const validationResult = schema.safeParse(httpResult.data);
  return validationResult as SafeResult<GetAppEnvEncryptPubKeyReturnType<T>>;
};

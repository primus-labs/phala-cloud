import { z } from "zod";
import { type Client, type SafeResult } from "../client";
import { ActionParameters, ActionReturnType } from "../types/common";
import { validateActionParameters, safeValidateActionParameters } from "../utils";

export const GetAppEnvEncryptPubKeyRequestSchema = z
  .object({
    kms: z.string().min(1, "KMS ID or slug is required"),
    app_id: z.string().refine(
      (val) => val.length === 40 || (val.startsWith("0x") && val.length === 42),
      "App ID must be exactly 40 characters or 42 characters with 0x prefix"
    ),
  })
  .strict();

export const GetAppEnvEncryptPubKeySchema = z
  .object({
    public_key: z.string(),
    signature: z.string(),
  })
  .strict();

export type GetAppEnvEncryptPubKeyRequest = z.infer<typeof GetAppEnvEncryptPubKeyRequestSchema>;

export type GetAppEnvEncryptPubKey = z.infer<typeof GetAppEnvEncryptPubKeySchema>;

export type GetAppEnvEncryptPubKeyParameters<T = undefined> = ActionParameters<T>;

export type GetAppEnvEncryptPubKeyReturnType<T = undefined> = ActionReturnType<
  GetAppEnvEncryptPubKey,
  T
>;

export const getAppEnvEncryptPubKey = async <T extends z.ZodSchema | false | undefined = undefined>(
  client: Client,
  payload: GetAppEnvEncryptPubKeyRequest,
  parameters?: GetAppEnvEncryptPubKeyParameters<T>,
): Promise<GetAppEnvEncryptPubKeyReturnType<T>> => {
  const validatedRequest = GetAppEnvEncryptPubKeyRequestSchema.parse(payload);

  validateActionParameters(parameters);

  const response = await client.get(
    `/kms/${validatedRequest.kms}/pubkey/${validatedRequest.app_id}`,
  );

  if (parameters?.schema === false) {
    return response as GetAppEnvEncryptPubKeyReturnType<T>;
  }

  const schema = (parameters?.schema || GetAppEnvEncryptPubKeySchema) as z.ZodSchema;
  return schema.parse(response) as GetAppEnvEncryptPubKeyReturnType<T>;
};

export const safeGetAppEnvEncryptPubKey = async <
  T extends z.ZodSchema | false | undefined = undefined,
>(
  client: Client,
  payload: GetAppEnvEncryptPubKeyRequest,
  parameters?: GetAppEnvEncryptPubKeyParameters<T>,
): Promise<SafeResult<GetAppEnvEncryptPubKeyReturnType<T>>> => {
  const requestValidation = GetAppEnvEncryptPubKeyRequestSchema.safeParse(payload);
  if (!requestValidation.success) {
    return requestValidation as SafeResult<GetAppEnvEncryptPubKeyReturnType<T>>;
  }

  const parameterValidationError = safeValidateActionParameters(parameters);
  if (parameterValidationError) {
    return parameterValidationError as SafeResult<GetAppEnvEncryptPubKeyReturnType<T>>;
  }

  const httpResult = await client.safeGet(
    `/kms/${requestValidation.data.kms}/pubkey/${requestValidation.data.app_id}`,
  );
  if (!httpResult.success) {
    return httpResult as SafeResult<GetAppEnvEncryptPubKeyReturnType<T>>;
  }

  if (parameters?.schema === false) {
    return { success: true, data: httpResult.data } as SafeResult<
      GetAppEnvEncryptPubKeyReturnType<T>
    >;
  }

  const schema = (parameters?.schema || GetAppEnvEncryptPubKeySchema) as z.ZodSchema;
  return schema.safeParse(httpResult.data) as SafeResult<GetAppEnvEncryptPubKeyReturnType<T>>;
};

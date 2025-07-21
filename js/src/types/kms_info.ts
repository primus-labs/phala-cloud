import type { Address, Hex } from "viem";
import { z } from "zod";

export const KmsInfoSchema = z
  .object({
    id: z.string(),
    slug: z.string().nullable(),
    url: z.string(),
    version: z.string(),
    chain_id: z.number().nullable(),
    kms_contract_address: z
      .string()
      .nullable()
      .transform((val) => val as Address),
    gateway_app_id: z
      .string()
      .nullable()
      .transform((val) => val as Hex),
  })
  .passthrough();

export type KmsInfo = z.infer<typeof KmsInfoSchema>;

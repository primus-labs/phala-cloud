import { z } from "zod";
import { type KmsInfo, KmsInfoSchema } from "./kms_info";

export const VmInfoSchema = z.object({
  id: z.string(),
  name: z.string(),
  status: z.string(),
  uptime: z.string(),
  app_url: z.string().nullable(),
  app_id: z.string(),
  instance_id: z.string().nullable(),
  configuration: z.any().optional(), // TODO: add VmConfiguration schema if needed
  exited_at: z.string().nullable(),
  boot_progress: z.string().nullable(),
  boot_error: z.string().nullable(),
  shutdown_progress: z.string().nullable(),
  image_version: z.string().nullable(),
});

export const ManagedUserSchema = z.object({
  id: z.number(),
  username: z.string(),
});

export const CvmNodeSchema = z.object({
  id: z.number(),
  name: z.string(),
  region_identifier: z.string().optional(),
});

export const CvmNetworkUrlsSchema = z.object({
  app: z.string(),
  instance: z.string(),
});

// CVM schema that use in list API.
export const CvmInfoSchema = z
  .object({
    hosted: VmInfoSchema,
    name: z.string(),
    managed_user: ManagedUserSchema.optional().nullable(),
    node: CvmNodeSchema.optional().nullable(),
    listed: z.boolean().default(false),
    status: z.string(),
    in_progress: z.boolean().default(false),
    dapp_dashboard_url: z.string().nullable(),
    syslog_endpoint: z.string().nullable(),
    allow_upgrade: z.boolean().default(false),
    project_id: z.string().nullable(), // HashedId is represented as string in JS
    project_type: z.string().nullable(),
    billing_period: z.string().nullable(),
    kms_info: KmsInfoSchema.nullable(),
    vcpu: z.number().nullable(),
    memory: z.number().nullable(),
    disk_size: z.number().nullable(),
    gateway_domain: z.string().nullable(),
    public_urls: z.array(CvmNetworkUrlsSchema),
  })
  .partial();

export type CvmInfo = z.infer<typeof CvmInfoSchema>;

// CVM schema that use in get API.
export const CvmLegacyDetailSchema = z.object({
  id: z.number(),
  name: z.string(),
  status: z.string(),
  in_progress: z.boolean(),
  teepod_id: z.number().nullable(),
  teepod: CvmNodeSchema,
  app_id: z.string(),
  vm_uuid: z.string().nullable(),
  instance_id: z.string().nullable(),
  vcpu: z.number().nullable(),
  memory: z.number().nullable(),
  disk_size: z.number().nullable(),
  base_image: z.string(),
  encrypted_env_pubkey: z.string().nullable(),
  listed: z.boolean(),
  project_id: z.string().nullable(),
  project_type: z.string().nullable(),
  public_sysinfo: z.boolean(),
  public_logs: z.boolean(),
  dapp_dashboard_url: z.string().nullable(),
  syslog_endpoint: z.string().nullable(),
  kms_info: KmsInfoSchema.nullable(),
  contract_address: z.string().nullable(),
  deployer_address: z.string().nullable(),
  scheduled_delete_at: z.string().nullable(),
  public_urls: z.array(CvmNetworkUrlsSchema),
  gateway_domain: z.string().nullable(),
});

export type CvmLegacyDetail = z.infer<typeof CvmLegacyDetailSchema> & { kms_info: KmsInfo };

import { z } from "zod";
import { type Client, type SafeResult } from "../client";
import { ActionParameters, ActionReturnType } from "../types/common";
import { validateActionParameters, safeValidateActionParameters } from "../utils";

/**
 * Provision a CVM (Confidential Virtual Machine)
 *
 * This action provisions a new CVM on a specified node, returning the app_id, encryption public key, and other metadata required for secure deployment.
 *
 * @example
 * ```typescript
 * import { createClient, getAvailableNodes, provisionCvm } from '@phala/cloud'
 *
 * const client = createClient();
 * const nodes = await getAvailableNodes(client);
 * const node = nodes.nodes[0];
 *
 * const docker_compose = `
 *version: '3'
 *services:
 *  demo:
 *    image: leechael/phala-cloud-bun-starter:latest
 *    container_name: demo
 *    ports:
 *      - "3000:3000"
 *    volumes:
 *      - /var/run/tappd.sock:/var/run/tappd.sock
 *`;
 *
 * const app_compose = {
 *   name: 'my-app',
 *   node_id: node.node_id,
 *   image: node.images[0].name,
 *   vcpu: 1,
 *   memory: 1024,
 *   disk_size: 10,
 *   compose_file: {
 *     docker_compose_file: docker_compose,
 *     name: 'my-app',
 *   },
 * };
 *
 * const result = await provisionCvm(client, app_compose);
 * console.log(result.app_id);
 * ```
 *
 * ## Safe Version
 *
 * Use `safeProvisionCvm` for error handling without exceptions:
 *
 * ```typescript
 * const result = await safeProvisionCvm(client, app_compose);
 * if (result.success) {
 *   console.log(result.data.app_id);
 * } else {
 *   console.error('Failed to provision CVM:', result.error.message);
 * }
 * ```
 */

// Zod schema definition (align with backend, use .optional()/.nullable() for optional fields)
export const ProvisionCvmSchema = z
  .object({
    app_id: z.string().nullable().optional(),
    app_env_encrypt_pubkey: z.string().nullable().optional(),
    compose_hash: z.string(),
    fmspc: z.string().nullable().optional(),
    device_id: z.string().nullable().optional(),
    os_image_hash: z.string().nullable().optional(),
    node_id: z.number().nullable().optional(), // Transformed from teepod_id in response
    kms_id: z.string().nullable().optional(),
  })
  .passthrough();

export type ProvisionCvm = z.infer<typeof ProvisionCvmSchema>;

// Request schema (for reference, not used directly in function signature)
export const ProvisionCvmRequestSchema = z
  .object({
    node_id: z.number().optional(), // recommended
    teepod_id: z.number().optional(), // deprecated, for compatibility
    name: z.string(),
    image: z.string(),
    vcpu: z.number(),
    memory: z.number(),
    disk_size: z.number(),
    compose_file: z.object({
      allowed_envs: z.array(z.string()).optional(),
      pre_launch_script: z.string().optional(),
      docker_compose_file: z.string().optional(),
      name: z.string().optional(),
      kms_enabled: z.boolean().optional(),
      public_logs: z.boolean().optional(),
      public_sysinfo: z.boolean().optional(),
      gateway_enabled: z.boolean().optional(), // recommended
      tproxy_enabled: z.boolean().optional(), // deprecated, for compatibility
    }),
    listed: z.boolean().optional(),
    instance_type: z.string().nullable().optional(),
    kms_id: z.string().optional(),
    env_keys: z.array(z.string()).optional(),
  })
  .passthrough();

export type ProvisionCvmRequest = z.infer<typeof ProvisionCvmRequestSchema> & {
  node_id?: number; // recommended
  teepod_id?: number; // deprecated
  compose_file?: {
    gateway_enabled?: boolean; // recommended
    tproxy_enabled?: boolean; // deprecated
    [key: string]: unknown;
  };
};

export type ProvisionCvmParameters<T = undefined> = ActionParameters<T>;

export type ProvisionCvmReturnType<T = undefined> = ActionReturnType<ProvisionCvm, T>;

function autofillComposeFileName(appCompose: ProvisionCvmRequest): ProvisionCvmRequest {
  if (appCompose.compose_file && !appCompose.compose_file.name) {
    return {
      ...appCompose,
      compose_file: {
        ...appCompose.compose_file,
        name: appCompose.name,
      },
    };
  }
  return appCompose;
}

function handleGatewayCompatibility(appCompose: ProvisionCvmRequest): ProvisionCvmRequest {
  if (!appCompose.compose_file) {
    return appCompose;
  }

  const composeFile = { ...appCompose.compose_file };

  // If both are provided, prefer gateway_enabled
  if (
    typeof composeFile.gateway_enabled === "boolean" &&
    typeof composeFile.tproxy_enabled === "boolean"
  ) {
    delete composeFile.tproxy_enabled;
  }
  // If only tproxy_enabled is provided, convert to gateway_enabled and warn
  else if (
    typeof composeFile.tproxy_enabled === "boolean" &&
    typeof composeFile.gateway_enabled === "undefined"
  ) {
    composeFile.gateway_enabled = composeFile.tproxy_enabled;
    delete composeFile.tproxy_enabled;
    if (typeof window !== "undefined" ? window.console : globalThis.console) {
      console.warn(
        "[phala/cloud] tproxy_enabled is deprecated, please use gateway_enabled instead. See docs for migration.",
      );
    }
  }

  return {
    ...appCompose,
    compose_file: composeFile,
  };
}

function transformResponse(data: unknown, isDefaultSchema: boolean): unknown {
  if (!isDefaultSchema || !data || typeof data !== "object") {
    return data;
  }

  if (data && typeof data === "object" && "teepod_id" in data) {
    const { teepod_id, ...rest } = data as Record<string, unknown> & { teepod_id: unknown };
    return { ...rest, node_id: teepod_id };
  }

  return data;
}

export async function provisionCvm<T extends z.ZodSchema | false | undefined = undefined>(
  client: Client,
  appCompose: ProvisionCvmRequest,
  parameters?: ProvisionCvmParameters<T>,
): Promise<ProvisionCvmReturnType<T>> {
  validateActionParameters(parameters);

  const body = handleGatewayCompatibility(autofillComposeFileName(appCompose));
  let requestBody = { ...body };
  if (typeof body.node_id === "number") {
    requestBody = { ...body, teepod_id: body.node_id };
    delete requestBody.node_id;
  } else if (typeof body.teepod_id === "number") {
    console.warn("[phala/cloud] teepod_id is deprecated, please use node_id instead.");
  }

  const response = await client.post("/cvms/provision", requestBody);

  const isDefaultSchema = parameters?.schema === undefined;
  const transformedData = transformResponse(response, isDefaultSchema);

  if (parameters?.schema === false) {
    return transformedData as ProvisionCvmReturnType<T>;
  }

  const usedSchema = (parameters?.schema || ProvisionCvmSchema) as z.ZodSchema;
  return usedSchema.parse(transformedData) as ProvisionCvmReturnType<T>;
}

// Safe version (returns SafeResult)
export async function safeProvisionCvm<T extends z.ZodSchema | false | undefined = undefined>(
  client: Client,
  appCompose: ProvisionCvmRequest,
  parameters?: ProvisionCvmParameters<T>,
): Promise<SafeResult<ProvisionCvmReturnType<T>>> {
  const parameterValidationError = safeValidateActionParameters(parameters);
  if (parameterValidationError) {
    return parameterValidationError as SafeResult<ProvisionCvmReturnType<T>>;
  }

  const schema: z.ZodSchema | false | undefined = parameters?.schema;
  const body = handleGatewayCompatibility(autofillComposeFileName(appCompose));
  let requestBody = { ...body };
  if (typeof body.node_id === "number") {
    requestBody = { ...body, teepod_id: body.node_id };
    delete requestBody.node_id;
  } else if (typeof body.teepod_id === "number") {
    console.warn("[phala/cloud] teepod_id is deprecated, please use node_id instead.");
  }
  const httpResult = await client.safePost("/cvms/provision", requestBody);
  if (!httpResult.success) {
    return httpResult as SafeResult<ProvisionCvmReturnType<T>>;
  }

  if (schema === false) {
    return { success: true, data: httpResult.data } as SafeResult<ProvisionCvmReturnType<T>>;
  }

  const isDefaultSchema = !schema;
  const usedSchema = (schema || ProvisionCvmSchema) as z.ZodSchema;
  const transformResult = usedSchema.safeParse(transformResponse(httpResult.data, isDefaultSchema));
  return transformResult as SafeResult<ProvisionCvmReturnType<T>>;
}

import fs from "fs";
import arg from "arg";
import type { Client, ProvisionCvmComposeFileUpdateRequest } from "@phala/cloud";
import { addComposeHash, createClient } from "@phala/cloud";
import { getCvmInfo } from "@phala/cloud";
import { getCvmComposeFile } from "@phala/cloud";
import { getAvailableNodes } from "@phala/cloud";
import { getKmsList } from "@phala/cloud";
import { provisionCvm } from "@phala/cloud";
import { commitCvmProvision } from "@phala/cloud";
import { getAppEnvEncryptPubKey } from "@phala/cloud";
import { encryptEnvVars } from "@phala/cloud";
import { deployAppAuth } from "@phala/cloud"
import type { EnvVar } from "@phala/cloud";
import { provisionCvmComposeFileUpdate } from "@phala/cloud";
import { commitCvmComposeFileUpdate } from "@phala/cloud";
import { anvil } from "viem/chains";

// ==================================================================
//
// Helper functions
//
// ==================================================================

function assert_not_null<T>(condition: T | null | undefined, message: string): NonNullable<T> {
  if (condition === null || condition === undefined) {
    throw new Error(message);
  }
  return condition!;
}

// ==================================================================
//
// Main function
//
// ==================================================================

const typed: Parameters<typeof arg>[0] = {
  "--name": String,
  "--vcpu": Number,
  "--memory": Number,
  "--disk-size": Number,
  "--node-id": Number,
  "--kms-id": String,
  "--private-key": String,
  "--rpc-url": String,
  "--env": String,
  "--uuid": String,
};

async function main(args: arg.Result<typeof typed>) {
  //
  // Input validation.
  //
  if (!args["_"] || args["_"].length === 0 || !args["_"][0]) {
    console.log("Usage: node deploy.ts <path_to_docker_compose_yml>");
    process.exit(1);
  }
  const docker_compose_path = args["_"][0];
  if (!fs.existsSync(docker_compose_path)) {
    console.log("File not found:", docker_compose_path);
    process.exit(1);
  }
  const docker_compose_yml = fs.readFileSync(docker_compose_path, "utf8");

  let env_vars: EnvVar[] = [];
  if (args['--env']) {
    if (!fs.existsSync(args['--env'])) {
      console.log("File not found:", args['--env']);
      process.exit(1);
    }
    const env_file = fs.readFileSync(args['--env'], "utf8");
    env_vars = env_file.split("\n").filter((line) => line.trim() !== "").map(line => line.split("=")).filter(([k,v]) => {
      return !!k;
    }).map(([key, value]) => ({ key: key!, value: value ? `${value}` : '' }));
  }

  // If uuid specified, we considering it already exists and processing update on it.
  const uuid = args["--uuid"];
  const is_update = uuid !== undefined;

  const client = createClient();

  if (is_update) {
    await update_cvm(client, uuid, docker_compose_yml, env_vars, args);
  } else {
    await deploy_new_cvm(client, docker_compose_yml, env_vars, args);
  }
}

async function update_cvm(client: Client, uuid: string, docker_compose_yml: string, env_vars: EnvVar[], args: arg.Result<typeof typed>) {
  const rpc_url = args["--rpc-url"];
  const private_key = args["--private-key"];

  const [cvm, app_compose] = await Promise.all([
    getCvmInfo(client, {
      uuid: uuid,
    }),
    getCvmComposeFile(client, {
      uuid: uuid,
    }),
  ]);

  // patched the compose_file
  app_compose.docker_compose_file = docker_compose_yml;
  app_compose.allowed_envs = env_vars.map((env) => env.key);

  const provision = await provisionCvmComposeFileUpdate(client, {
    uuid: uuid,
    app_compose: app_compose as ProvisionCvmComposeFileUpdateRequest['app_compose'],
  })

  let encrypted_env: string | undefined;
  if (cvm.kms_info) {
    // Update with decentralized KMS.
    console.log('Interacting with contract DstackApp')
    if (!private_key) {
      throw new Error('Private key is required for contract DstackApp');
    }

    const receipt = await addComposeHash({
      chain: anvil,
      rpcUrl: rpc_url,
      appId: cvm.app_id as `0x${string}`,
      composeHash: provision.compose_hash,
      privateKey: private_key,
    })
    console.log('the receipt: ', receipt)
  } else {
    if (env_vars.length > 0) {
      const encrypted_env_vars = await encryptEnvVars(env_vars, cvm.encrypted_env_pubkey!);
      encrypted_env = encrypted_env_vars;
    }
  }

  await commitCvmComposeFileUpdate(client, {
    // @ts-ignore
    id: uuid,
    compose_hash: provision.compose_hash,
    encrypted_env: encrypted_env,
    env_keys: env_vars.map((env) => env.key),
  })
}

async function deploy_new_cvm(client: Client, docker_compose_yml: string, env_vars: EnvVar[], args: arg.Result<typeof typed>) {
  const nodeId = args["--node-id"];
  const kmsId = args["--kms-id"];
  const privateKey = args["--private-key"];
  const rpcUrl = args["--rpc-url"];

  const name = args["--name"] || "app";
  const vcpu = args["--vcpu"] || 1;
  const memory = args["--memory"] || 1024;
  const diskSize = args["--disk-size"] || 10;

  //
  // Step 1: Get resources & check capacity.
  //
  const nodes = await getAvailableNodes(client);
  // If no specified node, use the first one.
  let target = null;
  let kms = null;
  if (nodeId) {
    target = nodes.nodes.find((node) => node.teepod_id === nodeId);
    if (!target) {
      throw new Error(`Node ${nodeId} not found`);
    }
    if (target.support_onchain_kms) {
      if (!kmsId) {
        throw new Error(`Node ${nodeId} requires a KMS ID for Contract Owned CVM`);
      }
      if (!privateKey) {
        throw new Error(`You need specify a private key for Contract Owned CVM`);
      }
      const kms_list = await getKmsList(client);
      kms = kms_list.items.find((kms) => kms.slug === kmsId || kms.id === kmsId);
      if (!kms) {
        throw new Error(`KMS ${kmsId} not found`);
      }
    }
  } else {
    target = nodes.nodes[0];
  }
  if (!target) {
    throw new Error("No available nodes found");
  }
  const image = target.images[0];
  if (!image) {
    throw new Error(`No available OS images found in the node ${target.name}.`);
  }

  // Step 2:
  const app_compose = {
    name: name,
    compose_file: {
      docker_compose_file: docker_compose_yml,
    },
    // Resource
    vcpu: vcpu,
    memory: memory,
    disk_size: diskSize,
    node_id: target.teepod_id,
    image: image.name,
  };

  // Step 3: Deploy the app with Centralized KMS.
  const app = await provisionCvm(client, app_compose);

  //
  // For centralized KMS, we can get the AppID & AppEnvEncryptPubkey from provision response.
  //
  let result;
  if (app.app_env_encrypt_pubkey && app.app_id) {
    const encrypted_env_vars = await encryptEnvVars(env_vars, app.app_env_encrypt_pubkey);
    result = await commitCvmProvision(client, {
      app_id: app.app_id,
      encrypted_env: encrypted_env_vars,
      compose_hash: app.compose_hash,
    });
  } else {
    kms = assert_not_null(kms, "Assert kms is not null.");
    const kms_slug = assert_not_null(kms.slug, "Assert kms.slug is not null.");
    assert_not_null(kms.kms_contract_address, "Assert kms_contract_address is not null.");
    assert_not_null(privateKey, "Assert privateKey is not null.");
    assert_not_null(app.compose_hash, "Assert compose_hash is not null.");
    const device_id = assert_not_null(target.device_id, "Assert device_id is not null.");
    const rpc_url = assert_not_null(rpcUrl, "Assert rpcUrl is not null.");

    const deployed_contract = await deployAppAuth({
      chain: anvil,
      rpcUrl: rpc_url,
      kmsContractAddress: kms.kms_contract_address,
      privateKey: privateKey,
      deviceId: device_id,
      composeHash: app.compose_hash,
    });
    let app_id = assert_not_null(deployed_contract.appId, "Assert appId is not null.");
    const resp = await getAppEnvEncryptPubKey(client, {
      app_id: app_id,
      kms: kms_slug,
    });
    const encrypted_env_vars = await encryptEnvVars(env_vars, resp.public_key);
    result = await commitCvmProvision(client, {
      app_id: app_id,
      encrypted_env: encrypted_env_vars,
      compose_hash: app.compose_hash,
      kms_id: kms_slug,
      contract_address: deployed_contract.appAuthAddress,
      deployer_address: deployed_contract.deployer,
    });
  }

  console.log("Deployed!");
  console.log(result);
}

main(arg(typed))
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.trace(error);
    process.exit(1);
  });

import fs from 'fs';
import arg from "arg";
import { createClient, getAvailableNodes, getKmsList, provisionCvm, commitCvmProvision, getAppEnvEncryptPubKey, encryptEnvVars, deployAppAuth } from "@phala/cloud";
import type { AppCompose, EnvVar } from '@phala/cloud';
import { anvil } from 'viem/chains';
import { createPublicClient, http } from 'viem';

const typed: Parameters<typeof arg>[0] = {
  '--name': String,
  '--vcpu': Number,
  '--memory': Number,
  '--disk-size': Number,
  '--node-id': Number,
  '--kms-id': String,
  '--private-key': String,
  '--rpc-url': String,
}

function assert_not_null<T>(condition: T | null | undefined, message: string): NonNullable<T> {
  if (condition === null || condition === undefined) {
    throw new Error(message);
  }
  return condition!;
}

async function main(args: arg.Result<typeof typed>) {
  if (!args['_'] || args['_'].length === 0 || !args['_'][0]) {
    console.log('Usage: node deploy.ts <path_to_docker_compose_yml>');
    process.exit(1);
  }
  const docker_compose_path = args['_'][0];
  if (!fs.existsSync(docker_compose_path)) {
    console.log('File not found:', docker_compose_path);
    process.exit(1);
  }
  const docker_compose_yml = fs.readFileSync(docker_compose_path, 'utf8');

  const nodeId = args['--node-id'];
  const kmsId = args['--kms-id'];
  const privateKey = args['--private-key'];
  const rpcUrl = args['--rpc-url'];
  // const { name, vcpu, memory, diskSize, nodeId, kmsId } = args;
  // console.log(name, vcpu, memory, diskSize, nodeId, kmsId)

  try {
    const client = createClient();

    // Step 1: Get resources & check capacity.
    const nodes = await getAvailableNodes(client);
    // If no specified node, use the first one.
    let target = null;
    let kms = null;
    if (nodeId) {
      target = nodes.nodes.find(node => node.teepod_id === nodeId);
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
        kms = kms_list.items.find(kms => kms.slug === kmsId || kms.id === kmsId);
        if (!kms) {
          throw new Error(`KMS ${kmsId} not found`);
        }
      }
    } else {
      target = nodes.nodes[0];
    }
    if (!target) {
      throw new Error('No available nodes found');
    }
    const image = target.images[0];
    if (!image) {
      throw new Error(`No available OS images found in the node ${target.name}.`);
    }

    // Step 2: 
    const app_compose = {
      name: 'app',
      compose_file: {
        docker_compose_file: docker_compose_yml,
      },
      // Resource
      vcpu: 1,
      memory: 1024,
      disk_size: 10,
      node_id: target.teepod_id,
      image: image.name,
    }

    // Step 3: Deploy the app with Centralized KMS.
    const app = await provisionCvm(client, app_compose);
    const env_vars: EnvVar[] = [
      {
        key: 'FOO',
        value: 'bar',
      },
    ]
    //
    // For centralized KMS, we can get the AppID & AppEnvEncryptPubkey from provision response.
    //
    let result
    if (app.app_env_encrypt_pubkey && app.app_id) {
      const encrypted_env_vars = await encryptEnvVars(env_vars, app.app_env_encrypt_pubkey);
      result = await commitCvmProvision(client, {
        app_id: app.app_id,
        encrypted_env: encrypted_env_vars,
        compose_hash: app.compose_hash,
      });
    } else {
      kms = assert_not_null(kms, 'Assert kms is not null.')
      const kms_slug = assert_not_null(kms.slug, 'Assert kms.slug is not null.')
      assert_not_null(kms.kms_contract_address, 'Assert kms_contract_address is not null.')
      assert_not_null(privateKey, 'Assert privateKey is not null.')
      assert_not_null(app.compose_hash, 'Assert compose_hash is not null.')
      const device_id = assert_not_null(target.device_id, 'Assert device_id is not null.')
      const rpc_url = assert_not_null(rpcUrl, 'Assert rpcUrl is not null.')

      const deployed_contract = await deployAppAuth({
        chain: anvil,
        rpcUrl: rpc_url,
        kmsContractAddress: kms.kms_contract_address,
        privateKey: privateKey,
        deviceId: device_id,
        composeHash: app.compose_hash,
      });
      console.log('deployed_contract', deployed_contract)
      let app_id = assert_not_null(deployed_contract.appId, 'Assert appId is not null.')
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
      console.log('result', result)
    }

    console.log('Deployed!')
    console.log(result)

  } catch (error) {
    console.error('Error:', error);
    throw error;
  }
}

main(arg(typed)).then(() => {
  process.exit(0);
}).catch((error) => {
  console.trace(error);
  process.exit(1);
});

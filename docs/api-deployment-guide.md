# Phala Cloud CVM Deployment API Guide

## Overview

The Phala Cloud platform provides REST APIs for deploying and managing Confidential Virtual Machines (CVMs). This guide shows you how to deploy applications using our V2 API endpoints with KMS integration.

## Base URL
```
https://cloud-api.phala.network/v1
```

## Authentication

### Getting Your API Key

1. **Sign up for Phala Cloud**: Go to [https://cloud.phala.network](https://cloud.phala.network)
2. **Complete verification**: Verify your email and finish onboarding
3. **Generate API key**: 
   - Go to "Settings" → "API Keys" in your dashboard
   - Click "Create New API Key"
   - Copy and store your API key safely

### Using Your API Key

All API requests need authentication with an API key:
```bash
-H "X-API-Key: <your-api-key>"
```

### Verify Your API Key

Test your API key with this verification endpoint:

```bash
curl -X GET "https://cloud-api.phala.network/v1/users/me" \
  -H "X-API-Key: <your-api-key>"
```

**Expected Response:**
```json
{
  "id": 123,
  "email": "user@example.com",
  "tier": "free",
  "created_at": "2024-01-01T00:00:00Z"
}
```

If this fails, check:
- API key is correct and not cut off
- Account is verified and active
- No extra spaces in the header

## Core Concepts

### CVM Deployment Process
CVM deployment follows these steps:
1. **Node Discovery**: Find available compute nodes and their features
2. **Resource Selection**: Pick appropriate nodes, images, and KMS services
3. **Provision Phase**: Reserve resources and prepare deployment setup
4. **App Authentication**: Set up App ID (method depends on KMS type)
5. **Create Phase**: Deploy the CVM instance with encrypted environment variables

### KMS Types and App ID Generation

The system supports two types of Key Management Services with different App ID methods:

#### Built-in KMS (Traditional)
- **App ID Generation**: `app_id = compose_hash[:40]` (first 40 characters of compose hash)
- **Usage**: Simpler setup, good for development and basic production
- **Authentication**: Direct KMS connection with app_id from compose file

#### Onchain KMS
- **App ID Generation**: Generated through blockchain contract deployment
- **Usage**: Enterprise-grade security with blockchain-based authentication
- **Authentication**: Needs contract deployment and blockchain interaction
- **Node Support**: Only works on nodes with `support_onchain_kms: true`

### Compose Hash Generation

The compose hash uses this algorithm:

1. **JSON Serialization**: Convert the compose manifest to JSON with:
   - Keys sorted alphabetically
   - Specific formatting: `indent=4, separators=(",", ":"), ensure_ascii=False`
   - Consistent field ordering

2. **SHA-256 Hashing**: Apply SHA-256 to the UTF-8 encoded JSON string
3. **Example Algorithm**:
```python
import hashlib
import json
from collections import OrderedDict

def generate_compose_hash(compose_manifest: dict) -> str:
    # Sort keys alphabetically
    sorted_keys = sorted(compose_manifest.keys())
    ordered = OrderedDict((k, compose_manifest[k]) for k in sorted_keys)
    
    # Serialize with specific formatting
    manifest_str = json.dumps(
        ordered, 
        indent=4, 
        separators=(",", ":"), 
        ensure_ascii=False
    )
    
    # Generate SHA-256 hash
    hash_obj = hashlib.sha256()
    hash_obj.update(manifest_str.encode("utf-8"))
    return hash_obj.hexdigest()
```

### Environment Variable Encryption
Environment variables are encrypted end-to-end using x25519 key exchange and AES-GCM encryption before being sent to the TEE environment.

**Version-Specific Requirements:**
- **For OS image version >= 0.5.0**: The `allowed_envs` field is **mandatory** when using environment variables
- **For older image versions**: The `allowed_envs` field is optional and can be used for enhanced security
- All environment variables used in `env_keys` must be declared in `allowed_envs` (for version >= 0.5.0)

## Deployment Method

Phala Cloud uses a **provision-based deployment approach** with the V2 API:

### Features
- **Two-step process**: Provision first, then create
- **Endpoints**: `POST /cvms/provision` → `POST /cvms`
- **Benefits**: Better error handling, caching support, better workflow control
- **Preflight**: Separate provision and creation phases for better validation

## Quick Start: Minimal Working Example

This section gives you a complete end-to-end example for deploying your first CVM using built-in KMS (the simplest path).

**What you'll learn:**
- How to find and use the best available node automatically
- Which values are examples vs actual API responses you need
- A complete working deployment in 6 simple steps
- How to handle environment variable encryption safely

### Step 1: Verify Your Setup

```bash
# Test your API key
export PHALA_API_KEY="your-api-key-here"

curl -X GET "https://cloud-api.phala.network/v1/users/me" \
  -H "X-API-Key: $PHALA_API_KEY"
```

### Step 2: Select Node and Image

```bash
# Get best available node (first node in response is system-recommended)
curl -X GET "https://cloud-api.phala.network/v1/teepods/available" \
  -H "X-API-Key: $PHALA_API_KEY" \
  | jq '.nodes[0] | {teepod_id, name, support_onchain_kms, images: [.images[] | select(.is_dev == false)][0]}'
```

**How to use the response:**
1. **Node ID**: Use `teepod_id` from the first node (system picks the best available automatically)
2. **Image**: Use `name` from the first non-dev image in that node's `images` array
3. **KMS Type**: Note the `support_onchain_kms` value (use `false` for this quick start)

**Example response structure:**
```json
{
  "teepod_id": 123,
  "name": "node-builtin-us-west",
  "support_onchain_kms": false,
  "images": {
    "name": "phala-cloud-base-0.4.0",
    "is_dev": false
  }
}
```

**📝 Important**: Always use the **actual values** from your API response. The numbers above are just examples.

### Step 3: Provision Your Deployment

```bash
# Provision resources (use YOUR actual values from Step 2)
curl -X POST "https://cloud-api.phala.network/v1/cvms/provision" \
  -H "X-API-Key: $PHALA_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "my-first-app",
    "image": "YOUR_IMAGE_NAME_FROM_STEP2",
    "vcpu": 2,
    "memory": 4096,
    "disk_size": 40,
    "teepod_id": YOUR_TEEPOD_ID_FROM_STEP2,
    "compose_file": {
      "docker_compose_file": "version: \"3.8\"\nservices:\n  app:\n    image: nginx:alpine\n    ports:\n      - \"3000:3000\"",
      "allowed_envs": [],
      "features": ["kms"],
      "kms_enabled": true,
      "manifest_version": 2,
      "name": "my-first-app",
      "public_logs": true,
      "public_sysinfo": true,
      "tproxy_enabled": false
    },
    "env_keys": [],
    "listed": true,
    "instance_type": "tdx.medium"
  }'
```

**Expected Response:**
```json
{
  "app_id": "abc123def456...",
  "app_env_encrypt_pubkey": "SGVsbG8gV29ybGQ=",
  "compose_hash": "sha256:def456abc123...",
  "device_id": "device-uuid-123",
  "os_image_hash": "sha256:image-hash-456..."
}
```

**💾 Save these values - you'll need them for the next step!**

### Environment Variable Encryption Notice
- ⚠️ **Important**: There's no API to check encrypted environment variable format
- If encryption format is wrong, CVM creation will fail with an error
- **Recommendation**: Start with empty `"encrypted_env": ""` to test the deployment flow
- Add environment variables only after basic deployment works

### Step 4: Create Your CVM

```bash
# Create the CVM (using values from step 3)
curl -X POST "https://cloud-api.phala.network/v1/cvms" \
  -H "X-API-Key: $PHALA_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "app_id": "abc123def456...",
    "compose_hash": "sha256:def456abc123...",
    "encrypted_env": ""
  }'
```

**Expected Response:**
```json
{
  "id": 789,
  "name": "my-first-app",
  "vm_uuid": "cvm-uuid-789",
  "status": "creating",
  "teepod_id": 42,
  "created_at": "2024-01-01T00:00:00Z"
}
```

### Step 5: Monitor Deployment

```bash
# Check deployment status
curl -X GET "https://cloud-api.phala.network/v1/cvms/789" \
  -H "X-API-Key: $PHALA_API_KEY"
```

**Monitor the `status` field:**
- `"creating"` → Deployment in progress
- `"running"` → ✅ Success! Your app is ready
- `"failed"` → ❌ Check error logs

### Step 6: Access Your Application

Once status is `"running"`, your application will be available at:
```
https://<vm_uuid>.cloud.phala.network
```

**🎉 Done!** You've deployed your first CVM.

## Detailed API Workflow

### Step 1: Discover Available Nodes

Find available compute nodes to understand their capabilities, supported images, and KMS services.

**Endpoint:** `GET /teepods/available`

**Request:**
```bash
curl -X GET "https://cloud-api.phala.network/v1/teepods/available" \
  -H "X-API-Key: <your-api-key>"
```

**Response:**
```json
{
  "tier": "free",
  "capacity": {
    "max_instances": 16,
    "max_vcpu": 16,
    "max_memory": 32768,
    "max_disk": 640
  },
  "nodes": [
    {
      "teepod_id": 1,
      "name": "node-tdx-1",
      "listed": true,
      "remaining_vcpu": 8,
      "remaining_memory": 16384,
      "remaining_cvm_slots": 5,
      "support_onchain_kms": true,
      "fmspc": "00606A000000",
      "device_id": "1234567890abcdef1234567890abcdef",
      "dedicated_for_team_id": null,
      "images": [
        {
          "name": "phala-cloud-base-0.4.0",
          "is_dev": false,
          "version": [0, 4, 0],
          "os_image_hash": "sha256:abc123def456..."
        },
        {
          "name": "phala-cloud-dev-0.4.0",
          "is_dev": true,
          "version": [0, 4, 0],
          "os_image_hash": "sha256:def456abc123..."
        }
      ]
    },
    {
      "teepod_id": 2,
      "name": "node-builtin-1",
      "listed": true,
      "remaining_vcpu": 4,
      "remaining_memory": 8192,
      "remaining_cvm_slots": 3,
      "support_onchain_kms": false,
      "fmspc": null,
      "device_id": null,
      "dedicated_for_team_id": null,
      "images": [
        {
          "name": "phala-cloud-base-0.3.9",
          "is_dev": false,
          "version": [0, 3, 9],
          "os_image_hash": "sha256:xyz789uvw456..."
        }
      ]
    }
  ],
  "kms_list": [
    {
      "id": "kms_abc123def456",
      "url": "https://kms-node-1.phala.network",
      "version": "0.3.3",
      "chain_id": 1337,
      "kms_contract_address": "0x1234567890abcdef1234567890abcdef12345678",
      "gateway_app_id": "0xabcdef1234567890abcdef1234567890abcdef12"
    }
  ]
}
```

**Response Fields:**

| Field | Type | Description |
|-------|------|-------------|
| `nodes` | Array | Available compute nodes |
| `nodes[].teepod_id` | Integer | Unique node identifier |
| `nodes[].name` | String | Node display name |
| `nodes[].support_onchain_kms` | Boolean | Whether node supports onchain KMS |
| `nodes[].fmspc` | String | Hardware measurement (onchain KMS only) |
| `nodes[].device_id` | String | Device identifier (onchain KMS only) |
| `nodes[].images` | Array | Available OS images on this node |
| `kms_list` | Array | Available KMS services (for onchain KMS nodes) |
| `kms_list[].chain_id` | Integer | Blockchain network ID |
| `kms_list[].kms_contract_address` | String | KMS contract address |

### Step 2: Provision CVM Resources

Reserve compute resources and prepare the deployment configuration. This step generates the compose hash and prepares encryption keys.

**Endpoint:** `POST /cvms/provision`

**Request:**
```bash
curl -X POST "https://cloud-api.phala.network/v1/cvms/provision" \
  -H "X-API-Key: <your-api-key>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "my-app",
    "image": "phala-cloud-dev-0.4.0",
    "vcpu": 2,
    "memory": 4096,
    "disk_size": 40,
    "teepod_id": 1,
    "kms_id": "kms_abc123def456",
    "compose_file": {
      "docker_compose_file": "version: \"3.8\"\nservices:\n  app:\n    image: nginx:alpine\n    ports:\n      - \"3000:3000\"",
      "allowed_envs": ["DATABASE_URL", "API_KEY"],
      "features": ["kms", "tproxy-net"],
      "kms_enabled": true,
      "manifest_version": 2,
      "name": "my-app",
      "public_logs": true,
      "public_sysinfo": true,
      "tproxy_enabled": true
    },
    "env_keys": ["DATABASE_URL", "API_KEY"],
    "listed": true,
    "instance_type": "tdx.medium"
  }'
```

**Response:**
```json
{
  "app_id": null,
  "app_env_encrypt_pubkey": "base64-encoded-public-key-for-env-encryption",
  "compose_hash": "sha256:1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
  "fmspc": "00606A000000",
  "device_id": "1234567890abcdef1234567890abcdef",
  "os_image_hash": "sha256:abc123def456ghi789jkl012mno345pqr678stu901vwx234yzab567cdef890",
  "kms_info": {
    "chain_id": 1337,
    "kms_url": "https://kms-node-1.phala.network",
    "kms_contract_address": "0x1234567890abcdef1234567890abcdef12345678"
  }
}
```

**Important Notes:**
- For **built-in KMS** nodes: `app_id` will be set to `compose_hash[:40]`
- For **onchain KMS** nodes: `app_id` will be `null` initially and must be configured in Step 3
- The `app_env_encrypt_pubkey` is used for encrypting environment variables
- `kms_info` is only present for onchain KMS nodes
- **Version Requirement**: For OS images with version >= 0.5.0, the `allowed_envs` field in `compose_file` is **required** when using environment variables
- For older image versions, `allowed_envs` is optional and can be used for additional security

### Step 3: Configure App Authentication (Onchain KMS Only)

For nodes with `support_onchain_kms: true`, you must configure App Authentication before creating the CVM.

#### Method 1: Deploy New App Auth Contract (Recommended)

Deploy a new authentication contract on the blockchain:

**Prerequisites:**
- ETH-compatible wallet with enough balance
- Access to the blockchain network (specified by `chain_id`)

**Contract Deployment Example:**

```typescript
import { createPublicClient, createWalletClient, http, type Chain } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { keccak256, encodePacked } from 'viem';

// App Auth Contract ABI for deployment
const appAuthAbi = [
  {
    "inputs": [
      {"name": "_kmsContract", "type": "address"},
      {"name": "_allowAnyDevice", "type": "bool"},
      {"name": "_deviceId", "type": "bytes32"},
      {"name": "_initialComposeHash", "type": "bytes32"}
    ],
    "stateMutability": "nonpayable",
    "type": "constructor"
  },
  {
    "inputs": [{"name": "composeHash", "type": "bytes32"}],
    "name": "addComposeHash",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "owner",
    "outputs": [{"name": "", "type": "address"}],
    "stateMutability": "view",
    "type": "function"
  }
] as const;

// KMS Factory ABI - for deploying App Auth contracts
const kmsFactoryAbi = [
  {
    name: 'deployAppAuth',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'allowAnyDevice', type: 'bool' },
      { name: 'deviceId', type: 'bytes32' },
      { name: 'composeHash', type: 'bytes32' }
    ],
    outputs: [
      { name: 'appAuthAddress', type: 'address' }
    ]
  }
] as const;

interface DeployAppAuthParams {
  kmsContractAddress: `0x${string}`;
  allowAnyDevice: boolean;
  deviceId: string;
  composeHash: string;
  chainId: number;
  privateKey: `0x${string}`;
  rpcUrl?: string;
}

async function deployAppAuthContract({
  kmsContractAddress,
  allowAnyDevice,
  deviceId,
  composeHash,
  chainId,
  privateKey,
  rpcUrl
}: DeployAppAuthParams): Promise<{
  appId: string;
  appAuthAddress: `0x${string}`;
  deployer: `0x${string}`;
  transactionHash: `0x${string}`;
}> {
  const account = privateKeyToAccount(privateKey);
  
  // Define chain configuration
  const chain: Chain = {
    id: chainId,
    name: `Chain ${chainId}`,
    network: `chain-${chainId}`,
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    rpcUrls: {
      default: { http: [rpcUrl || `https://rpc-${chainId}.example.com`] },
      public: { http: [rpcUrl || `https://rpc-${chainId}.example.com`] }
    }
  };
  
  // Create clients
  const publicClient = createPublicClient({
    chain,
    transport: http()
  });
  
  const walletClient = createWalletClient({
    account,
    chain,
    transport: http()
  });

  // Convert string parameters to proper types
  const deviceIdBytes = `0x${deviceId}` as `0x${string}`;
  const composeHashBytes = composeHash.startsWith('0x') 
    ? composeHash as `0x${string}`
    : `0x${composeHash}` as `0x${string}`;

  // Deploy App Auth contract via KMS factory
  const hash = await walletClient.writeContract({
    address: kmsContractAddress,
    abi: kmsFactoryAbi,
    functionName: 'deployAppAuth',
    args: [allowAnyDevice, deviceIdBytes, composeHashBytes]
  });
  
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  
  // Extract deployed contract address from logs
  const deployedAddress = receipt.logs[0]?.address;
  if (!deployedAddress) {
    throw new Error('Contract deployment failed: no contract address in logs');
  }
  
  const appAuthAddress = deployedAddress;
  
  // Generate App ID from contract deployment (following dstack convention)
  const appId = keccak256(
    encodePacked(
      ['address', 'address', 'bytes32'],
      [appAuthAddress, account.address, composeHashBytes]
    )
  ).slice(0, 42); // First 20 bytes as hex string
  
  return {
    appId,
    appAuthAddress,
    deployer: account.address,
    transactionHash: hash
  };
}

// Usage example
try {
  const authResult = await deployAppAuthContract({
    kmsContractAddress: "0x1234567890abcdef1234567890abcdef12345678",
    allowAnyDevice: false, // Set to true for development environments
    deviceId: "1234567890abcdef1234567890abcdef", // From provision response  
    composeHash: "1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef", // From provision response
    chainId: 1337,
    privateKey: "0x...", // Your wallet private key
    rpcUrl: "https://your-rpc-endpoint.com" // Optional: custom RPC URL
  });

  console.log("Contract deployed successfully:");
  console.log("App ID:", authResult.appId);
  console.log("Contract Address:", authResult.appAuthAddress);
  console.log("Transaction Hash:", authResult.transactionHash);
} catch (error) {
  console.error("Contract deployment failed:", error);
}
```

#### Method 2: Use Existing App ID

If you already have a deployed App Auth contract:

```json
{
  "app_id": "0x1234567890abcdef1234567890abcdef12345678",
  "app_auth_contract_address": "0xabcdef1234567890abcdef1234567890abcdef12",
  "deployer_address": "0xfedcba0987654321fedcba0987654321fedcba09"
}
```

### Step 4: Built-in KMS Flow

For built-in KMS nodes (`support_onchain_kms: false`), the App ID is automatically derived from the compose hash:

```
app_id = compose_hash[:40]  # First 20 bytes as hex string
```

No blockchain interaction required - go straight to Step 5.

### Step 5: Create CVM Instance

Create the actual CVM instance using the provision data and App ID.

**Endpoint:** `POST /cvms`

#### For Onchain KMS:
```bash
curl -X POST "https://cloud-api.phala.network/v1/cvms" \
  -H "X-API-Key: <your-api-key>" \
  -H "Content-Type: application/json" \
  -d '{
    "app_id": "0x1234567890abcdef1234567890abcdef12345678",
    "compose_hash": "sha256:1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
    "encrypted_env": "hex-encoded-encrypted-environment-data",
    "app_auth_contract_address": "0xabcdef1234567890abcdef1234567890abcdef12",
    "deployer_address": "0xfedcba0987654321fedcba0987654321fedcba09"
  }'
```

#### For Built-in KMS:
```bash
curl -X POST "https://cloud-api.phala.network/v1/cvms" \
  -H "X-API-Key: <your-api-key>" \
  -H "Content-Type: application/json" \
  -d '{
    "app_id": "1234567890abcdef1234567890abcdef12345678",
    "compose_hash": "sha256:1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
    "encrypted_env": "hex-encoded-encrypted-environment-data"
  }'
```

**Response:**
```json
{
  "id": 123,
  "name": "my-app",
  "vm_uuid": "cvm-uuid-456",
  "status": "creating",
  "teepod_id": 1,
  "created_at": "2024-01-01T00:00:00Z"
}
```

## Environment Variable Encryption

Environment variables are encrypted end-to-end using x25519 key exchange and AES-GCM encryption before being sent to the TEE environment.

### 🔒 Enhanced Security with allowed_envs

The `allowed_envs` field is an optional security feature that can be used to whitelist environment variables:

**Example usage:**
```json
{
  "compose_file": {
    "docker_compose_file": "version: '3.8'...",
    "allowed_envs": ["DATABASE_URL", "API_KEY", "NODE_ENV"],
    "kms_enabled": true,
    // ... other fields
  },
  "env_keys": ["DATABASE_URL", "API_KEY", "NODE_ENV"]
}
```

**Benefits:**
- Provides an additional layer of security by explicitly defining allowed environment variables
- Optional for all KMS types and OS image versions
- Can help prevent accidental exposure of unintended environment variables

### Obtaining Encryption Public Keys

#### Method 1: Via Phala Cloud API (Recommended)

The provision response includes the `app_env_encrypt_pubkey`:

```json
{
  "app_env_encrypt_pubkey": "base64-encoded-public-key",
  "compose_hash": "sha256:abc123...",
  "device_id": "device-identifier"
}
```

#### Method 2: Direct KMS API Access

You can get the encryption public key directly from the KMS service:

**Endpoint:** `POST /prpc/KMS.GetAppEnvEncryptPubKey`

**Request:**
```bash
curl -X POST "https://kms-node-1.phala.network/prpc/KMS.GetAppEnvEncryptPubKey" \
  -H "Content-Type: application/x-protobuf" \
  --data-binary <protobuf-encoded-app-id>
```

**Response:**
```protobuf
message PublicKeyResponse {
  bytes public_key = 1;
  bytes signature = 2;
}
```

**Important:** KMS services use self-signed certificates. Handle certificate verification appropriately for your security requirements.

### Public Key Signature Verification

When getting public keys from KMS, verify the signature to make sure it's authentic:

```python
from cryptography.hazmat.primitives.asymmetric import x25519
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.primitives import serialization
from eth_keys import keys
from eth_utils import keccak
import sys
from typing import Optional

def verify_signature(public_key: bytes, signature: bytes, app_id: str) -> Optional[str]:
    """
    Verify the signature of a public key.

    Args:
        public_key: The public key bytes to verify
        signature: The signature bytes
        app_id: The application ID

    Returns:
        The compressed public key if valid, None otherwise
    """
    if len(signature) != 65:
        return None

    # Create the message to verify
    prefix = b"dstack-env-encrypt-pubkey"
    if app_id.startswith("0x"):
        app_id = app_id[2:]
    message = prefix + b":" + bytes.fromhex(app_id) + public_key

    # Hash the message with Keccak-256
    message_hash = keccak(message)

    # Recover the public key from the signature
    try:
        sig = keys.Signature(signature_bytes=signature)
        recovered_key = sig.recover_public_key_from_msg_hash(message_hash)
        return '0x' + recovered_key.to_compressed_bytes().hex()
    except Exception as e:
        print(f"Signature verification failed: {e}", file=sys.stderr)
        return None

# Usage example
signer_pubkey = verify_signature(public_key, signature, app_id)
if signer_pubkey:
    print(f"Verified signer public key: {signer_pubkey}")
else:
    print("Signature verification failed")
```

### Encryption Algorithm Implementation

The encryption process follows these steps:

1. **Generate ephemeral key pair**: Create a temporary x25519 key pair
2. **Perform key exchange**: Use your private key and the TEE's public key to derive a shared secret
3. **Encrypt environment data**: Use AES-GCM with the shared secret to encrypt the JSON-encoded environment variables
4. **Encode for transmission**: Hex encode the encrypted data

**Python Implementation:**

```python
import json
import os
from cryptography.hazmat.primitives.asymmetric import x25519
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.primitives import serialization

def encrypt_environment_variables(env_vars: dict, tee_public_key_bytes: bytes) -> str:
    """
    Encrypt environment variables for secure transmission to TEE.
    
    Args:
        env_vars: Dictionary of environment variables
        tee_public_key_bytes: TEE's x25519 public key (32 bytes)
    
    Returns:
        Hex-encoded encrypted data
    """
    # 1. Generate ephemeral key pair
    ephemeral_private_key = x25519.X25519PrivateKey.generate()
    ephemeral_public_key = ephemeral_private_key.public_key()
    
    # 2. Perform key exchange
    tee_public_key = x25519.X25519PublicKey.from_public_bytes(tee_public_key_bytes)
    shared_secret = ephemeral_private_key.exchange(tee_public_key)
    
    # 3. Prepare data for encryption
    env_data = json.dumps({"env": env_vars}).encode('utf-8')
    
    # 4. Encrypt using AES-GCM
    aesgcm = AESGCM(shared_secret[:32])  # Use first 32 bytes as AES key
    nonce = os.urandom(12)  # 96-bit nonce for AES-GCM
    
    ephemeral_public_bytes = ephemeral_public_key.public_bytes(
        encoding=serialization.Encoding.Raw,
        format=serialization.PublicFormat.Raw
    )
    
    # Encrypt with ephemeral public key as additional authenticated data
    ciphertext = aesgcm.encrypt(nonce, env_data, ephemeral_public_bytes)
    
    # 5. Combine components: ephemeral_public_key + nonce + ciphertext
    result = ephemeral_public_bytes + nonce + ciphertext
    
    # 6. Hex encode for transmission
    return result.hex()

# Usage example
env_vars = {
    "DATABASE_URL": "postgresql://user:pass@localhost/db",
    "API_KEY": "secret-api-key-123"
}

# Convert base64 public key to bytes
import base64
tee_public_key = base64.b64decode("your-base64-encoded-public-key")
encrypted_env = encrypt_environment_variables(env_vars, tee_public_key)
```

**TypeScript Implementation (Alternative):**

```typescript
import { webcrypto } from 'crypto';

interface EnvironmentVariables {
  [key: string]: string;
}

async function encryptEnvironmentVariables(
  envVars: EnvironmentVariables, 
  teePublicKeyBase64: string
): Promise<string> {
  // 1. Decode the TEE public key from base64
  const teePublicKeyBytes = new Uint8Array(
    Buffer.from(teePublicKeyBase64, 'base64')
  );
  
  // 2. Generate ephemeral X25519 key pair
  const ephemeralKeyPair = await webcrypto.subtle.generateKey(
    {
      name: 'X25519',
    },
    true,
    ['deriveKey']
  );
  
  // 3. Export ephemeral public key
  const ephemeralPublicKey = await webcrypto.subtle.exportKey(
    'raw',
    ephemeralKeyPair.publicKey
  );
  
  // 4. Import TEE public key
  const teePublicKey = await webcrypto.subtle.importKey(
    'raw',
    teePublicKeyBytes,
    {
      name: 'X25519',
    },
    false,
    []
  );
  
  // 5. Derive shared secret using ECDH
  const sharedSecret = await webcrypto.subtle.deriveKey(
    {
      name: 'X25519',
      public: teePublicKey,
    },
    ephemeralKeyPair.privateKey,
    {
      name: 'AES-GCM',
      length: 256,
    },
    false,
    ['encrypt']
  );
  
  // 6. Prepare environment data
  const envData = JSON.stringify({ env: envVars });
  const envDataBytes = new TextEncoder().encode(envData);
  
  // 7. Generate random nonce (96 bits for AES-GCM)
  const nonce = webcrypto.getRandomValues(new Uint8Array(12));
  
  // 8. Encrypt using AES-GCM with ephemeral public key as AAD
  const ephemeralPublicKeyBytes = new Uint8Array(ephemeralPublicKey);
  const ciphertext = await webcrypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: nonce,
      additionalData: ephemeralPublicKeyBytes,
    },
    sharedSecret,
    envDataBytes
  );
  
  // 9. Combine components: ephemeral_public_key + nonce + ciphertext
  const result = new Uint8Array(
    ephemeralPublicKeyBytes.length + nonce.length + ciphertext.byteLength
  );
  result.set(ephemeralPublicKeyBytes, 0);
  result.set(nonce, ephemeralPublicKeyBytes.length);
  result.set(new Uint8Array(ciphertext), ephemeralPublicKeyBytes.length + nonce.length);
  
  // 10. Convert to hex string for transmission
  return Array.from(result)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

// Usage example
const envVars = {
  "DATABASE_URL": "postgresql://user:pass@localhost/db",
  "API_KEY": "secret-api-key-123"
};

const encryptedEnv = await encryptEnvironmentVariables(
  envVars, 
  "your-base64-encoded-public-key"
);
console.log("Encrypted environment:", encryptedEnv);
```

### Encoding Format Summary

Here are the encoding formats used throughout the API:

| Data Type | Format | Example |
|-----------|--------|---------|
| **App ID** | Hex string (no 0x prefix for built-in KMS) | `1234567890abcdef1234567890abcdef12345678` |
| **App ID (onchain KMS)** | Hex string with 0x prefix | `0x1234567890abcdef1234567890abcdef12345678` |
| **Compose Hash** | SHA-256 hex string | `sha256:abcdef123...` or `abcdef123...` |
| **Device ID** | Hex string (no 0x prefix) | `1234567890abcdef1234567890abcdef` |
| **Contract Address** | Hex string with 0x prefix | `0x1234567890abcdef1234567890abcdef12345678` |
| **Encrypted Environment** | Hex string (no 0x prefix) | `48656c6c6f20576f726c64...` |
| **Public Key (from API)** | Base64 string | `SGVsbG8gV29ybGQ=` |

## CVM Update Workflow

Updating a CVM follows a similar pattern to deployment, with optional onchain KMS interaction for nodes that support it.

### Step 1: Get Current Compose File

First, get the current compose file configuration:

**Endpoint:** `GET /cvms/{identifier}/compose_file`

**Request:**
```bash
curl -X GET "https://cloud-api.phala.network/v1/cvms/cvm-123/compose_file" \
  -H "X-API-Key: <your-api-key>"
```

**Response:**
```json
"version: '3.8'\nservices:\n  app:\n    image: nginx:alpine\n    ports:\n      - \"3000:3000\""
```

### Step 2: Provision Compose File Update

Prepare the updated compose file and generate a new compose hash:

**Endpoint:** `POST /cvms/{identifier}/compose_file/provision`

**Request:**
```bash
curl -X POST "https://cloud-api.phala.network/v1/cvms/cvm-123/compose_file/provision" \
  -H "X-API-Key: <your-api-key>" \
  -H "Content-Type: application/json" \
  -d '{
    "docker_compose_file": "version: \"3.8\"\nservices:\n  app:\n    image: nginx:latest\n    ports:\n      - \"3000:3000\"\n    environment:\n      - NODE_ENV=production",
    "allowed_envs": ["NODE_ENV"]
  }'
```

**Response:**
```json
{
  "app_id": "1234567890abcdef1234567890abcdef12345678",
  "device_id": "device-uuid-456",
  "compose_hash": "sha256:abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890",
  "kms_info": {
    "chain_id": 1337,
    "kms_url": "https://kms-node-1.phala.network",
    "kms_contract_address": "0x1234567890abcdef1234567890abcdef12345678"
  }
}
```

**Important Notes:**
- The provision response caches the update configuration for the next step
- `kms_info` is only present for onchain KMS nodes
- The `compose_hash` will be used for onchain KMS authentication (if applicable)

### Step 3A: Register Compose Hash (Onchain KMS Only)

For CVMs deployed on nodes with onchain KMS, you must register the new compose hash with the blockchain contract before applying the update.

#### Contract Interaction Flow

1. **Query KMS Contract**: Get the AppAuth contract address for your app
2. **Submit Transaction**: Add the new compose hash to the AppAuth contract

**Smart Contract Interaction:**

```typescript
import { createPublicClient, createWalletClient, http, type Chain } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';

// Contract ABIs
const kmsAuthAbi = [
  {
    "inputs": [{"name": "appId", "type": "bytes32"}],
    "name": "apps",
    "outputs": [
      {"name": "exists", "type": "bool"},
      {"name": "controller", "type": "address"}
    ],
    "stateMutability": "view",
    "type": "function"
  }
] as const;

const appAuthAbi = [
  {
    "inputs": [{"name": "composeHash", "type": "bytes32"}],
    "name": "addComposeHash",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "owner",
    "outputs": [{"name": "", "type": "address"}],
    "stateMutability": "view",
    "type": "function"
  }
] as const;

interface AddComposeHashParams {
  kmsContractAddress: `0x${string}`;
  appId: `0x${string}`;
  composeHash: string;
  privateKey: `0x${string}`;
  chainId: number;
  rpcUrl?: string;
}

async function addComposeHashToContract({
  kmsContractAddress,
  appId,
  composeHash,
  privateKey,
  chainId,
  rpcUrl
}: AddComposeHashParams) {
  const account = privateKeyToAccount(privateKey);
  
  // Define chain configuration
  const chain: Chain = {
    id: chainId,
    name: `Chain ${chainId}`,
    network: `chain-${chainId}`,
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    rpcUrls: {
      default: { http: [rpcUrl || `https://rpc-${chainId}.example.com`] },
      public: { http: [rpcUrl || `https://rpc-${chainId}.example.com`] }
    }
  };

  // Create clients
  const publicClient = createPublicClient({
    chain,
    transport: http()
  });

  const walletClient = createWalletClient({
    account,
    chain,
    transport: http()
  });

  // 1. Get AppAuth contract address from KMS contract
  const appInfo = await publicClient.readContract({
    address: kmsContractAddress,
    abi: kmsAuthAbi,
    functionName: 'apps',
    args: [appId]
  });

  if (!appInfo[0]) {
    throw new Error(`App ${appId} not found in KMS contract`);
  }

  const appAuthAddress = appInfo[1]; // controller address
  console.log(`Found AppAuth contract: ${appAuthAddress} for app: ${appId}`);

  // 2. Convert compose hash to proper format
  const composeHashBytes = composeHash.startsWith('0x')
    ? composeHash as `0x${string}`
    : `0x${composeHash}` as `0x${string}`;

  // 3. Add compose hash to AppAuth contract
  const hash = await walletClient.writeContract({
    address: appAuthAddress,
    abi: appAuthAbi,
    functionName: 'addComposeHash',
    args: [composeHashBytes]
  });

  console.log(`Transaction submitted: ${hash}`);

  // 4. Wait for transaction confirmation
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  
  if (receipt.status === 'success') {
    console.log(`Compose hash added successfully. Block: ${receipt.blockNumber}`);
  } else {
    throw new Error(`Transaction failed with status: ${receipt.status}`);
  }

  return {
    transactionHash: hash,
    blockNumber: receipt.blockNumber,
    gasUsed: receipt.gasUsed,
    appAuthAddress
  };
}

// Usage example
try {
  const result = await addComposeHashToContract({
    kmsContractAddress: '0x1234567890abcdef1234567890abcdef12345678', // From provision response
    appId: '0x1234567890abcdef1234567890abcdef12345678', // Your app ID
    composeHash: 'abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890', // New compose hash from provision
    privateKey: '0x...', // Your wallet private key
    chainId: 1337, // Chain ID from provision response
    rpcUrl: 'https://your-rpc-endpoint.com' // Optional: custom RPC URL
  });

  console.log('Compose hash registration completed:', result);
} catch (error) {
  console.error('Failed to add compose hash:', error);
}
```

### Step 3B: Built-in KMS Flow

For built-in KMS nodes, skip the blockchain interaction - go straight to Step 4.

### Step 4: Apply Compose File Update

Apply the provisioned update with encrypted environment variables:

**Endpoint:** `PATCH /cvms/{identifier}/compose_file`

**Request:**
```bash
curl -X PATCH "https://cloud-api.phala.network/v1/cvms/cvm-123/compose_file" \
  -H "X-API-Key: <your-api-key>" \
  -H "Content-Type: application/json" \
  -d '{
    "compose_hash": "sha256:abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890",
    "encrypted_env": "hex-encoded-encrypted-environment-data"
  }'
```

**Response:** `202 Accepted`

The update will be applied asynchronously. Monitor the CVM status to confirm completion.

### Step 5: Verify Update

Check the CVM status to make sure the update worked:

**Endpoint:** `GET /cvms/{identifier}`

**Request:**
```bash
curl -X GET "https://cloud-api.phala.network/v1/cvms/cvm-123" \
  -H "X-API-Key: <your-api-key>"
```

Look for:
- `status`: Should eventually return to "running"
- `updated_at`: Should reflect the recent update timestamp
- Check application logs for proper startup

## Alternative Update Methods

Besides the recommended workflow above, there are alternative methods for specific use cases:

### Direct Submit Method

Use this when you want to calculate the compose hash client-side and submit everything in one request:

**Endpoint:** `POST /cvms/{identifier}/compose_file`

**Request:**
```bash
curl -X POST "https://cloud-api.phala.network/v1/cvms/cvm-123/compose_file" \
  -H "X-API-Key: <your-api-key>" \
  -H "Content-Type: application/json" \
  -d '{
    "compose_file": {
      "docker_compose_file": "version: \"3.8\"\nservices:\n  app:\n    image: nginx:latest\n    ports:\n      - \"3000:3000\"",
      "allowed_envs": [],
      "features": ["kms", "tproxy-net"],
      "kms_enabled": true,
      "manifest_version": 2,
      "name": "my-app",
      "public_logs": true,
      "public_sysinfo": true,
      "tproxy_enabled": true
    },
    "compose_hash": "sha256:calculated-compose-hash-456...",
    "encrypted_env": "hex-encoded-encrypted-environment-data"
  }'
```

**Important Notes for Direct Submit:**
- You must calculate the compose hash client-side using the same algorithm described in the Core Concepts section
- For onchain KMS, you must register the compose hash with the blockchain contract before this API call
- The compose hash in the request must match the calculated hash from the compose file

## Error Handling and Troubleshooting

### Common Error Responses

| Status Code | Description | Next Steps |
|-------------|-------------|------------|
| 400 | Bad Request - Invalid payload or missing data | Check request format and required fields |
| 401 | Unauthorized - Invalid or missing API key | Verify API key and account status |
| 404 | Not Found - CVM or resource not found | Check resource IDs and permissions |
| 422 | Unprocessable Entity - Validation errors | Review payload validation requirements |
| 429 | Too Many Requests - Rate limit exceeded | Implement backoff and retry logic |
| 500 | Internal Server Error - Server-side error | Contact support with request details |
| 503 | Service Unavailable - KMS service temporarily unavailable | Wait and retry after specified time |

### Error Response Format

```json
{
  "detail": "Error description",
  "type": "error_type",
  "code": "ERROR_CODE"
}
```

### Debugging Guide

#### Step-by-Step Verification

**1. Verify API Authentication:**
```bash
# Test basic connectivity
curl -X GET "https://cloud-api.phala.network/v1/users/me" \
  -H "X-API-Key: $PHALA_API_KEY" \
  -v  # verbose output for debugging
```

**Expected Success Signs:**
- HTTP 200 status code
- JSON response with user info
- No certificate errors

**2. Check Node Availability:**
```bash
# Get available resources
curl -X GET "https://cloud-api.phala.network/v1/teepods/available" \
  -H "X-API-Key: $PHALA_API_KEY" \
  | jq '.nodes[] | {teepod_id, name, remaining_vcpu, remaining_memory}'
```

**3. Test Provision Request:**
```bash
# Minimal provision test
curl -X POST "https://cloud-api.phala.network/v1/cvms/provision" \
  -H "X-API-Key: $PHALA_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "debug-test",
    "image": "phala-cloud-base-0.4.0",
    "vcpu": 1,
    "memory": 2048,
    "disk_size": 20,
    "teepod_id": YOUR_NODE_ID,
    "compose_file": {
      "docker_compose_file": "version: \"3.8\"\nservices:\n  test:\n    image: hello-world",
      "manifest_version": 2,
      "name": "debug-test"
    },
    "instance_type": "tdx.small"
  }' \
  --fail-with-body  # show error response body
```

#### Common Issues and Solutions

**Problem: "Invalid API key" (401)**
```bash
# Diagnosis
echo "API Key length: ${#PHALA_API_KEY}"
echo "API Key prefix: ${PHALA_API_KEY:0:10}..."

# Solutions
- Regenerate API key from dashboard
- Check for hidden characters or spaces
- Verify account is not suspended
```

**Problem: "No available nodes" (400)**
```bash
# Diagnosis
curl -X GET "https://cloud-api.phala.network/v1/teepods/available" \
  -H "X-API-Key: $PHALA_API_KEY" \
  | jq '.nodes | length'

# Solutions
- Try different instance types (tdx.small, tdx.medium)
- Check during off-peak hours
- Contact support for dedicated nodes
```

**Problem: "Provision failed" (422)**
```bash
# Common causes and fixes:

1. Invalid Docker Compose:
   # Test locally first
   echo "version: '3.8'
   services:
     app:
       image: nginx:alpine" | docker-compose -f - config

2. Resource limits exceeded:
   # Check your account limits
   curl -X GET "https://cloud-api.phala.network/v1/users/me" \
     -H "X-API-Key: $PHALA_API_KEY" | jq '.limits'

3. Invalid teepod_id:
   # Verify node exists and supports your requirements
   curl -X GET "https://cloud-api.phala.network/v1/teepods/available" \
     -H "X-API-Key: $PHALA_API_KEY" | jq '.nodes[] | select(.teepod_id == YOUR_ID)'
```

**Problem: "CVM creation failed" (400)**
```bash
# Check provision data is still valid
# Provision data expires after 1 hour

# Re-run provision if needed:
curl -X POST "https://cloud-api.phala.network/v1/cvms/provision" \
  -H "X-API-Key: $PHALA_API_KEY" \
  # ... same payload as before
```

**Problem: CVM stuck in "creating" status**
```bash
# Monitor for 5-10 minutes, then check logs
curl -X GET "https://cloud-api.phala.network/v1/cvms/YOUR_CVM_ID/logs" \
  -H "X-API-Key: $PHALA_API_KEY"

# Common causes:
- Image pull timeout (use smaller images)
- Invalid port configuration
- Resource exhaustion on node
```

### Configuration Checklist

Before deploying, verify:

**✅ Docker Compose File:**
- [ ] Valid YAML syntax
- [ ] All images are publicly accessible
- [ ] Port mappings are correct (3000-9000 range recommended)
- [ ] No host volume mounts (not supported)
- [ ] No privileged containers

**✅ Resource Requirements:**
- [ ] VCPU: 1-8 cores available
- [ ] Memory: 2GB-32GB available  
- [ ] Disk: 20GB-100GB available
- [ ] Selected node has enough resources

**✅ Environment Variables:**
- [ ] Sensitive data is encrypted
- [ ] No hardcoded secrets in compose file
- [ ] Environment variable names are valid (alphanumeric + underscore)
- [ ] For OS image >= 0.5.0: Ensure `allowed_envs` field is present when using environment variables
- [ ] All `env_keys` entries are also listed in `allowed_envs` (for version >= 0.5.0)

**✅ Networking:**
- [ ] Only necessary ports are exposed
- [ ] No conflicting port assignments
- [ ] Application listens on 0.0.0.0, not 127.0.0.1

### Getting Help

**Error Logging:**
```bash
# Enable verbose curl output
curl -v -X POST "..." 2>&1 | tee debug.log

# Save full request/response for support
```

**Contact Support:**
- **Discord**: #developer-support in [Phala Discord](https://discord.gg/phala-network)
- **Email**: developer-support@phala.network
- **Include**: Request ID, error message, and full curl command (redact API key)

### Specific Error Scenarios

#### Onchain KMS Errors

**Invalid App ID for Onchain KMS (400)**
```json
{
  "detail": "Invalid app_id for onchain KMS node. App authentication required."
}
```
**Solution**: Deploy App Auth contract first or use existing App ID

**Node KMS Capability Mismatch (422)**  
```json
{
  "detail": "Selected node does not support onchain KMS but KMS configuration provided"
}
```
**Solution**: Choose node with `"support_onchain_kms": true` or remove KMS config

**Insufficient Blockchain Balance (400)**
```json
{
  "detail": "Insufficient balance for contract deployment on chain_id: 1337"
}
```
**Solution**: Add funds to your wallet for gas fees

**KMS Service Unavailable (503)**
```json
{
  "detail": "KMS service temporarily unavailable",
  "retry_after": 30
}
```
**Solution**: Wait 30 seconds and retry the request

#### Version-Specific Errors (OS Image >= 0.5.0)

**Missing allowed_envs for Version >= 0.5.0 (422)**
```json
{
  "detail": "allowed_envs is required for OS image version >= 0.5.0"
}
```
**Solution**: Add the `allowed_envs` field to your `compose_file` with all environment variable names

**Environment Variable Not Declared (422)**
```json
{
  "detail": "env_keys contains variables not declared in allowed_envs: ['SECRET_KEY']"
}
```
**Solution**: Add the missing environment variable names to the `allowed_envs` array in your compose file



## Best Practices

### 1. Node Selection
- Always discover available nodes before deployment
- Verify node capabilities match your requirements
- Choose nodes based on geographic location and resource availability
- Consider dedicated nodes for production workloads

### 2. KMS Integration
- Use onchain KMS for enterprise-grade security requirements
- Use built-in KMS for simpler development and testing
- Monitor KMS service health and availability
- Keep blockchain wallet private keys secure (onchain KMS)
- Verify KMS contract addresses before deployment

### 3. Environment Variable Security
- Always encrypt environment variables before transmission- Verify public key signatures when using direct KMS access
- Use unique salts for each deployment
- Clear sensitive data from memory after use

### 4. Error Handling
- Implement proper retry logic for transient errors
- Handle KMS service unavailability gracefully
- Validate App ID authenticity for onchain KMS
- Store provision data temporarily for recovery scenarios

### 5. Deployment Workflow
- Follow the structured API workflow: Discovery → Provision → Authentication → Create
- Validate compose files locally before submission
- Monitor CVM status after creation/updates
- Track blockchain transaction status for onchain KMS deployments
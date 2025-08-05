import arg from "arg";
import { createClient, getKmsList } from "@phala/cloud";

const typed: Parameters<typeof arg>[0] = {};

async function main(_: arg.Result<typeof typed>) {
  const client = createClient();
  const kmsList = await getKmsList(client);

  for (const kms of kmsList.items) {
    console.log(`KMS: ${kms.slug} (ver: ${kms.version})`);
    console.log(kms.url);
    if (kms.chain_id) {
      console.log("On-chain KMS");
      console.log("KMS Chain ID:", kms.chain_id);
      console.log("KMS KMS Contract Address:", kms.kms_contract_address);
      console.log("KMS Gateway App ID:", kms.gateway_app_id);
    } else {
      console.log("Centralized KMS");
    }
    console.log("--------------------------------");
  }
}

main(arg(typed)).catch(console.error);

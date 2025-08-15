import arg from "arg";
import { createClient, getCvmInfo } from "@phala/cloud";

const typed: Parameters<typeof arg>[0] = {};

async function main(argv: arg.Result<typeof typed>) {
  if (argv["_"].length < 1) {
    console.log("Usage: get-cvm-info <cvm-id>");
    process.exit(1);
  }
  const cvmId = argv["_"][0];
  const client = createClient();
  const cvmInfo = await getCvmInfo(client, { id: cvmId });
  console.log(cvmInfo);
}

main(arg(typed)).catch(console.error);

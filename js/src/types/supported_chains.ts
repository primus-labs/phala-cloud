import { type Chain } from "viem";
import { anvil, base, mainnet } from "viem/chains";

export const SUPPORTED_CHAINS: Readonly<Record<number, Chain>> = {
  [mainnet.id]: mainnet,
  [base.id]: base,
  [anvil.id]: anvil,
};

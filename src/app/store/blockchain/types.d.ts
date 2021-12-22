
import { ContractState } from "peleswap-sdk";
import { ZiloAppState } from "peleswap-sdk/lib/zilo";
import { Network } from "peleswap-sdk/lib/constants"
import { ConnectedWallet } from "core/wallet";

export interface BlockchainState {
  ready: boolean
  network: Network
  tokens: {}
  contracts: {
    zilswap: ContractState,
    zilo: {
      [key in string]: ZiloAppState // ok, it's not just the contract state but this makes it easy for us to get derived states
    },
  }
};

export type ChainInitProps = {
  wallet: ConnectedWallet | null
  network: Network
};

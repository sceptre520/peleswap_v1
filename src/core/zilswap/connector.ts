import { fromBech32Address, toBech32Address } from "@zilliqa-js/crypto";
import BigNumber from "bignumber.js";
import { ObservedTx, Pool, TokenDetails, Zilswap, WalletProvider } from "zilswap-sdk";
import { Network } from "zilswap-sdk/lib/constants";
import { BIG_ZERO } from "app/utils/constants";

import { logger } from "core/utilities";
import { ConnectedWallet, } from "core/wallet/ConnectedWallet";

import { Contract } from "@zilliqa-js/contract";
import { BN, Long, bytes, units } from "@zilliqa-js/util";
import { Zilliqa } from "@zilliqa-js/zilliqa";
import { TOKEN_LIST } from "./constants_cus";
import { ZIL_ADDRESS } from "app/utils/constants";

export interface ConnectProps {
  wallet: ConnectedWallet;
  network: Network;
  observedTxs?: ObservedTx[];
};
export interface InitProps {
  network?: Network;
};

interface ConnectorCallProps {
  suppressLogs?: boolean;
};

export interface ExchangeRateQueryProps extends ConnectorCallProps {
  exactOf: "in" | "out";
  tokenInID: string;
  tokenOutID: string;
  amount: BigNumber;
};

export interface ApproveTxProps {
  tokenID: string;
  tokenAmount: BigNumber;
  spenderAddress?: string
};

export interface AddTokenProps {
  address: string;
};

export interface AddLiquidityProps {
  tokenID: string;
  zilAmount: BigNumber;
  tokenAmount: BigNumber;
  maxExchangeRateChange?: number;
};

export interface RemoveLiquidityProps {
  tokenID: string;
  contributionAmount: BigNumber;
  maxExchangeRateChange?: number;
};
export interface SwapProps {
  exactOf: "in" | "out";
  tokenInID: string;
  tokenOutID: string;
  amount: BigNumber;
  maxAdditionalSlippage?: number;
  recipientAddress?: string;
};

export interface ContributeZILOProps {
  address: string;
  amount: BigNumber;
};

export interface ClaimZILOProps {
  address: string;
};

export interface TokenContractBalancesState {
  [index: string]: string;
}

export interface TokenContractAllowancesState {
  [index: string]: TokenContractBalancesState;
}

let zilswap: Zilswap | null = null
let peleswap: Contract | null = null
let zilliqa: Zilliqa | null = null
interface TokenObject {
  [key: string]: any
}

/**
 * Checks transaction receipt for error, and throw the top level exception
 * if any.
 *
 * @param txReceipt `@zilliqa-js` blockchain transaction receipt
 */
const handleObservedTx = (observedTx: ObservedTx) => {
  // // @ts-ignore
  // if (txReceipt.exceptions?.length) {
  //   // @ts-ignore
  //   throw txReceipt.exceptions[0];
  // }
};

/**
 * Abstraction class for Zilswap SDK.
 *
 * @member network {@link Zilswap.Network}
 */
export class ZilswapConnector {
  static setSDK = (sdk: Zilswap | null) => {
    zilswap = sdk
  }

  static setContract = async (pm_contract: Contract, pm_zilliqa: Zilliqa, pm_wallet: WalletProvider|null, pm_network: Network) => {
    peleswap = pm_contract
    zilliqa = pm_zilliqa

    var api_tokens:TokenObject = TOKEN_LIST[Network.MainNet]
    var api_token_hash:Array<string> = []
    var token:TokenObject = TOKEN_LIST[pm_network]
    // var token:TokenObject = {}
    // if(true) {
    if(pm_network == Network.MainNet) {
      var res = await fetch('https://api.zilstream.com/tokens')
      var data = await res.json()
      for(var z in data) {
        api_tokens[data[z].symbol] = data[z].address_bech32
        api_token_hash.push(fromBech32Address(data[z].address_bech32))
      }
    }

    var contractState = await peleswap.getState()
    var poolTokenHashes = Object.keys(contractState.pools);
    var tokenHashes = poolTokenHashes.concat(api_token_hash.filter(function (item) { return poolTokenHashes.indexOf(item) < 0; }));
    
    for(var x in tokenHashes) {
      var address = toBech32Address(tokenHashes[x])
      if(address === ZIL_ADDRESS) {
        token[tokenHashes[x]] = {
          contract: null, address: address, hash: tokenHashes[x], name: 'Zilliqa', symbol: 'ZIL', decimals: 12, whitelisted: true, registered: true
        }
      }
      else {
        var contract = await pm_zilliqa.contracts.at(address)
        var init = await contract.getInit()
        if(init !== undefined) {
          var decimalStr = '0';
          var name = '';
          var symbol = '';
          for(var y in init) {
            if(init[y].vname === 'decimals') {
              decimalStr = init[y].value
            }
            if(init[y].vname === 'name') {
              name = init[y].value
            }
            if(init[y].vname === 'symbol') {
              symbol = init[y].value
            }
          }
          var decimals = parseInt(decimalStr, 10);
          var registered = false;
          var whitelisted = false;
          token[tokenHashes[x]] = {
            contract: contract, address: address, hash: tokenHashes[x], name: name, symbol: symbol, decimals: decimals, whitelisted: registered, registered: whitelisted
          }
        }
      }
    }

    var currentUser = pm_wallet?.wallet.defaultAccount.base16
    // var currentUser = ''
    
    var pools: TokenObject = {}
    for (var k in contractState.pools) {
      var _a = contractState.pools[k].arguments;
      var zilReserve = new BigNumber(_a[0]);
      var tokenReserve = new BigNumber(_a[1]);
      var exchangeRate = zilReserve.dividedBy(tokenReserve);
      var totalContribution = new BigNumber(contractState.total_contributions[k]);
      var poolBalances = contractState.balances[k];
      var userContribution = new BigNumber(poolBalances && currentUser ? poolBalances[currentUser] || 0 : 0);
      var contributionPercentage = userContribution.dividedBy(totalContribution).times(100);
      pools[k] = {
        zilReserve: zilReserve,
        tokenReserve: tokenReserve,
        exchangeRate: exchangeRate,
        totalContribution: totalContribution,
        userContribution: userContribution,
        contributionPercentage: contributionPercentage,
      };
    }

    return {
      contractState: contractState,
      tokens: token,
      pools: pools,
      currentUser: currentUser,
      currentNonce: 0,
      currentBalance: 0
    }
    
    // var sub = await peleswap.getSubState("pools")
    // const smartContractState = await zilliqa.blockchain.getSmartContractSubState(
    //   'bd3fa050b1031bc4c91b489acb1d735f58858452', 'output_after_fee'
    // );
    // console.log('********************************************************')
    // console.log(sub)

    // const smartContractState1 = await zilliqa.blockchain.getSmartContractSubState(
    //   'bd3fa050b1031bc4c91b489acb1d735f58858452', 'pools'
    // );
    // console.log('********************************************************')
    // console.log(smartContractState1)
    // const smartContractState2 = await zilliqa.blockchain.getSmartContractSubState(
    //   'bd3fa050b1031bc4c91b489acb1d735f58858452', 'total_contributions'
    // );
    // console.log('********************************************************')
    // console.log(smartContractState2)
    // var tokens = ZilswapConnector.getTokenList(pm_network)
    // console.log('@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@')
    // console.log(tokens)
  }

  static getSDK = (): Zilswap => {
    if (!zilswap) throw new Error('not initialized');

    return zilswap
  }

  static getToken = (tokenID: string): TokenDetails | undefined => {
    if (!zilswap) return undefined

    const { tokens } = zilswap.getAppState();

    return Object.values(tokens).find((token) => token.address === tokenID);
  }

  static getCurrentBlock = () => {
    if (!zilswap) throw new Error('not initialized');
    return zilswap.getCurrentBlock()
  }

  /**
   * Get the pool of the provided token, or `null` if pool does not yet
   * exist on the contract.
   *
   * @returns the pool instance
   * @throws "not initialized" if `ZilswapConnector.setSDK` has not been called.
   */
  static getPool = (tokenID: string): Pool | null => {
    if (!zilswap) throw new Error('not initialized');
    return zilswap.getPool(tokenID);
  };

  /**
   *
   *
   * @throws "not initialized" if `ZilswapConnector.setSDK` has not been called.
   */
  static adjustedForGas = (intendedAmount: BigNumber, balance?: BigNumber): BigNumber => {
    if (!zilswap) throw new Error('not initialized');
    if (!balance) balance = new BigNumber(intendedAmount);
    const gasLimit = zilswap._txParams.gasLimit.toString();
    const netGasAmount = BigNumber.min(BigNumber.max(balance.minus(gasLimit), BIG_ZERO), intendedAmount);
    return netGasAmount;
  };


  /**
   *
   *
   * @throws "not initialized" if `ZilswapConnector.setSDK` has not been called.
   */
  static setDeadlineBlocks = (blocks: number) => {
    if (!zilswap) throw new Error('not initialized');
    return zilswap.setDeadlineBlocks(blocks);
  };

  /**
   *
   * @throws "not initialized" if `ZilswapConnector.setSDK` has not been called.
   */
  static approveTokenTransfer = async (props: ApproveTxProps) => {
    if (!zilswap) throw new Error('not initialized');
    logger(props.tokenID);
    logger(props.tokenAmount.toString());
    logger(props.spenderAddress);
    const observedTx = await zilswap.approveTokenTransferIfRequired(props.tokenID, props.tokenAmount, props.spenderAddress);
    if (observedTx)
      handleObservedTx(observedTx);

    return observedTx;
  };

  /**
   *
   * @throws "not initialized" if `ZilswapConnector.setSDK` has not been called.
   */
  static addPoolToken = async (props: AddTokenProps) => {
    if (!zilswap) throw new Error('not initialized');
    const tokenExists = await zilswap.addToken(props.address);
    if (!tokenExists)
      throw new Error("token not found");
    const { tokens } = zilswap.getAppState();
    const byte20Address = fromBech32Address(props.address);
    return tokens[byte20Address.toLowerCase()];
  };

  /**
   *
   *
   * @throws "not initialized" if `ZilswapConnector.setSDK` has not been called.
   */
  static getExchangeRate = (props: ExchangeRateQueryProps) => {
    if (!zilswap) throw new Error('not initialized');
    const queryFunction = props.exactOf === "in" ?
      zilswap.getRatesForInput.bind(zilswap) : zilswap.getRatesForOutput.bind(zilswap);

    if (!props.suppressLogs) {
      logger(props.exactOf);
      logger(props.tokenInID);
      logger(props.tokenOutID);
      logger(props.amount.toString());
    }
    return queryFunction(
      props.tokenInID,
      props.tokenOutID,
      props.amount.toString());
  };

  /**
   * Abstraction for Zilswap SDK functions
   * `addLiquidity`
   *
   * @param tokenID string
   * @param zilAmount BigNumber
   * @param tokenAmount BigNumber
   * @param maxExchangeRateChange number?
   * @see zilswap-sdk documentation
   *
   * @throws "not initialized" if `ZilswapConnector.setSDK` has not been called.
   */
  static addLiquidity = async (props: AddLiquidityProps) => {
    if (!zilswap) throw new Error('not initialized');
    if (!peleswap) throw new Error('not initialized');
    logger(props.tokenID);
    logger(props.zilAmount.toString());
    logger(props.tokenAmount.toString());
    logger(props.maxExchangeRateChange);

    const observedTx2 = await peleswap.call(
      'setHello',
      [
        {
          vname: 'msg',
          type: 'String',
          value: 'Test PP2'
        }
      ],
      {
        version: bytes.pack(333, 1),
        amount: new BN(0),
        gasPrice: units.toQa('2000', units.Units.Li),
        gasLimit: Long.fromNumber(10000),
      }
    );

    const cur = await ZilswapConnector.getCurrentBlock()
    const observedTx: ObservedTx = {
      hash: observedTx2.hash,
      deadline: cur+3
    }

    // const observedTx = await zilswap.addLiquidity(
    //   props.tokenID,
    //   props.zilAmount.toString(),
    //   props.tokenAmount.toString(),
    //   props.maxExchangeRateChange);

    handleObservedTx(observedTx);

    return observedTx;
  };

  /**
   * Abstraction for Zilswap SDK functions
   * `removeLiquidity`
   *
   * @param tokenID string
   * @param contributionAmount BigNumber
   * @param maxExchangeRateChange number?
   * @see zilswap-sdk documentation
   *
   * @throws "not initialized" if `ZilswapConnector.setSDK` has not been called.
   */
  static removeLiquidity = async (props: RemoveLiquidityProps) => {
    if (!zilswap) throw new Error('not initialized');
    logger(props.tokenID);
    logger(props.contributionAmount.toString());
    logger(props.maxExchangeRateChange);
    const observedTx = await zilswap.removeLiquidity(
      props.tokenID,
      props.contributionAmount.toString(),
      props.maxExchangeRateChange);
    handleObservedTx(observedTx);

    return observedTx;
  };

  /**
   * Abstraction for Zilswap SDK functions
   * `swapWithExactInput` and `swapWithExactOutput`
   *
   * "in" refers to the transfer of value *into* Zilswap contract
   * "out" refers to the transfer of value *out* of Zilswap contract
   *
   * @param exactOf  "in" | "out" - used to determine with exact swap function to use.
   * @param tokenInID string
   * @param tokenOutID string
   * @param amount BigNumber
   * @param maxAdditionalSlippage number?
   * @see zilswap-sdk documentation
   *
   * @throws "not initialized" if `ZilswapConnector.setSDK` has not been called.
   */
  static swap = async (props: SwapProps) => {
    if (!zilswap) throw new Error('not initialized');
    const swapFunction = props.exactOf === "in" ?
      zilswap.swapWithExactInput.bind(zilswap) :
      zilswap.swapWithExactOutput.bind(zilswap);

    logger(props.exactOf);
    logger(props.tokenInID);
    logger(props.tokenOutID);
    logger(props.amount.toString());
    logger(props.maxAdditionalSlippage);
    logger(props.recipientAddress);

    // TODO: proper token blacklist
    if (props.tokenOutID === "zil13c62revrh5h3rd6u0mlt9zckyvppsknt55qr3u")
      throw new Error("Suspected malicious token detected, swap disabled");
    const observedTx = await swapFunction(
      props.tokenInID,
      props.tokenOutID,
      props.amount.toString(),
      props.maxAdditionalSlippage,
      props.recipientAddress);
    handleObservedTx(observedTx);

    return observedTx;
  };

  /**
   * Abstraction for Zilswap SDK functions
   * `Zilo.contribute`
   *
   * @param address string - ZILO contract address to contribute to
   * @param amount BigNumber - ZIL amount to contribute
   * @see zilswap-sdk documentation
   *
   * @throws "not initialized" if `ZilswapConnector.setSDK` has not been called.
   */
  static contributeZILO = async (props: ContributeZILOProps) => {
    if (!zilswap) throw new Error('not initialized');
    logger(props.address);
    logger(props.amount.toString());
    const observedTx = await zilswap.zilos[fromBech32Address(props.address).toLowerCase()]!.contribute(props.amount.toString());
    if (observedTx)
      handleObservedTx(observedTx);

    return observedTx;
  };

  /**
   * Abstraction for Zilswap SDK functions
   * `Zilo.claim`
   *
   * @param address string - ZILO contract address to claim from
   * @see zilswap-sdk documentation
   *
   * @throws "not initialized" if `ZilswapConnector.setSDK` has not been called.
   */
  static claimZILO = async (props: ClaimZILOProps) => {
    if (!zilswap) throw new Error('not initialized');
    logger(props.address);
    const observedTx = await zilswap.zilos[fromBech32Address(props.address).toLowerCase()]!.claim();
    if (observedTx)
      handleObservedTx(observedTx);

    return observedTx;
  };
}

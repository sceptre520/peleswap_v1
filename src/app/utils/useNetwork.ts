
import { useSelector } from "react-redux";
import { Network } from "peleswap-sdk/lib/constants";
import { RootState } from "app/store/types";

const useNetwork = () => useSelector<RootState, Network>(state => state.blockchain.network);

export default useNetwork;

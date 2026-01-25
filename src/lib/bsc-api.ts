const BSC_RPC_URL = 'https://bsc-dataseed.bnbchain.org';
const USDT_BSC_CONTRACT = '0x55d398326f99059fF775485246999027B3197955';

export interface BscTokenTransfer {
  blockNumber: string;
  timeStamp: string;
  hash: string;
  from: string;
  to: string;
  value: string;
  tokenName: string;
  tokenSymbol: string;
  tokenDecimal: string;
  contractAddress: string;
}

export async function getBscUsdtBalance(address: string): Promise<number> {
  const paddedAddress = address.toLowerCase().replace('0x', '').padStart(64, '0');
  const data = `0x70a08231000000000000000000000000${paddedAddress}`;
  
  try {
    const response = await fetch(BSC_RPC_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'eth_call',
        params: [{ to: USDT_BSC_CONTRACT, data }, 'latest'],
        id: 1,
      }),
    });
    
    const result = await response.json();
    if (result.result && result.result !== '0x') {
      const balance = parseInt(result.result, 16);
      return balance / 1e18;
    }
  } catch (error) {
    console.error('Error fetching BSC USDT balance:', error);
  }
  
  return 0;
}

export async function getBscUsdtTransfers(
  address: string,
  direction: 'incoming' | 'outgoing' | 'all' = 'all'
): Promise<BscTokenTransfer[]> {
  console.log('BSCScan API V1 is deprecated. Transaction tracking requires paid API access.');
  console.log('Use HTX API for exchange balance (already integrated).');
  return [];
}

export async function getBnbBalance(address: string): Promise<number> {
  try {
    const response = await fetch(BSC_RPC_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'eth_getBalance',
        params: [address, 'latest'],
        id: 1,
      }),
    });
    
    const result = await response.json();
    if (result.result) {
      const balance = parseInt(result.result, 16);
      return balance / 1e18;
    }
  } catch (error) {
    console.error('Error fetching BNB balance:', error);
  }
  
  return 0;
}

export { USDT_BSC_CONTRACT };

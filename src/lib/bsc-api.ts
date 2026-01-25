const BSC_API_URL = 'https://api.bscscan.com/api';
const USDT_BSC_CONTRACT = '0x55d398326f99059fF775485246999027B3197955';

interface BscTokenTransfer {
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

interface BscApiResponse {
  status: string;
  message: string;
  result: BscTokenTransfer[] | string;
}

export async function getBscUsdtBalance(address: string, apiKey?: string): Promise<number> {
  const params = new URLSearchParams({
    module: 'account',
    action: 'tokenbalance',
    contractaddress: USDT_BSC_CONTRACT,
    address: address,
    tag: 'latest',
  });
  
  if (apiKey) {
    params.append('apikey', apiKey);
  }

  const url = `${BSC_API_URL}?${params.toString()}`;
  const response = await fetch(url);
  const data = await response.json();

  if (data.status === '1' && data.result) {
    return parseFloat(data.result) / 1e18;
  }
  
  return 0;
}

export async function getBscUsdtTransfers(
  address: string,
  direction: 'incoming' | 'outgoing' | 'all' = 'all',
  apiKey?: string
): Promise<BscTokenTransfer[]> {
  const params = new URLSearchParams({
    module: 'account',
    action: 'tokentx',
    contractaddress: USDT_BSC_CONTRACT,
    address: address,
    page: '1',
    offset: '100',
    sort: 'desc',
  });
  
  if (apiKey) {
    params.append('apikey', apiKey);
  }

  const url = `${BSC_API_URL}?${params.toString()}`;
  const response = await fetch(url);
  const data: BscApiResponse = await response.json();

  if (data.status === '1' && Array.isArray(data.result)) {
    const transfers = data.result;
    const normalizedAddress = address.toLowerCase();
    
    if (direction === 'incoming') {
      return transfers.filter(tx => tx.to.toLowerCase() === normalizedAddress);
    } else if (direction === 'outgoing') {
      return transfers.filter(tx => tx.from.toLowerCase() === normalizedAddress);
    }
    
    return transfers;
  }
  
  return [];
}

export async function getBnbBalance(address: string, apiKey?: string): Promise<number> {
  const params = new URLSearchParams({
    module: 'account',
    action: 'balance',
    address: address,
    tag: 'latest',
  });
  
  if (apiKey) {
    params.append('apikey', apiKey);
  }

  const url = `${BSC_API_URL}?${params.toString()}`;
  const response = await fetch(url);
  const data = await response.json();

  if (data.status === '1' && data.result) {
    return parseFloat(data.result) / 1e18;
  }
  
  return 0;
}

export { USDT_BSC_CONTRACT };

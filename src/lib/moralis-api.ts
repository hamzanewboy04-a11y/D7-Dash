const MORALIS_API_URL = 'https://deep-index.moralis.io/api/v2.2';
const USDT_BSC_CONTRACT = '0x55d398326f99059fF775485246999027B3197955';

export interface MoralisTokenTransfer {
  transaction_hash: string;
  address: string;
  block_timestamp: string;
  block_number: string;
  to_address: string;
  from_address: string;
  value: string;
  token_name: string;
  token_symbol: string;
  token_decimals: string;
}

interface MoralisTransferResponse {
  total: number;
  page: number;
  page_size: number;
  result: MoralisTokenTransfer[];
}

export async function getMoralisTokenTransfers(
  address: string,
  apiKey: string,
  contractAddress?: string
): Promise<MoralisTokenTransfer[]> {
  const params = new URLSearchParams({
    chain: 'bsc',
    limit: '100',
  });
  
  if (contractAddress) {
    params.append('contract_addresses[]', contractAddress);
  }

  const url = `${MORALIS_API_URL}/${address}/erc20/transfers?${params.toString()}`;
  
  try {
    const response = await fetch(url, {
      headers: {
        'accept': 'application/json',
        'X-API-Key': apiKey,
      },
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Moralis API error:', response.status, errorText);
      return [];
    }
    
    const data: MoralisTransferResponse = await response.json();
    return data.result || [];
  } catch (error) {
    console.error('Error fetching Moralis transfers:', error);
    return [];
  }
}

export async function getMoralisUsdtTransfers(
  address: string,
  apiKey: string,
  direction: 'incoming' | 'outgoing' | 'all' = 'all'
): Promise<MoralisTokenTransfer[]> {
  const transfers = await getMoralisTokenTransfers(address, apiKey, USDT_BSC_CONTRACT);
  const normalizedAddress = address.toLowerCase();
  
  if (direction === 'incoming') {
    return transfers.filter(tx => tx.to_address.toLowerCase() === normalizedAddress);
  } else if (direction === 'outgoing') {
    return transfers.filter(tx => tx.from_address.toLowerCase() === normalizedAddress);
  }
  
  return transfers;
}

export async function getMoralisTokenBalance(
  address: string,
  apiKey: string,
  contractAddress: string = USDT_BSC_CONTRACT
): Promise<number> {
  const url = `${MORALIS_API_URL}/${address}/erc20?chain=bsc&token_addresses[]=${contractAddress}`;
  
  try {
    const response = await fetch(url, {
      headers: {
        'accept': 'application/json',
        'X-API-Key': apiKey,
      },
    });
    
    if (!response.ok) {
      return 0;
    }
    
    const data = await response.json();
    if (data && data.length > 0) {
      const token = data[0];
      const decimals = parseInt(token.decimals) || 18;
      return parseFloat(token.balance) / Math.pow(10, decimals);
    }
  } catch (error) {
    console.error('Error fetching Moralis token balance:', error);
  }
  
  return 0;
}

export { USDT_BSC_CONTRACT as USDT_BSC_CONTRACT_MORALIS };

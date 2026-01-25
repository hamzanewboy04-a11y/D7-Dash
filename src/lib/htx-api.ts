import crypto from 'crypto';

// HTX API URL (Huobi Pro API - still the main endpoint)
const HTX_API_URL = 'https://api.huobi.pro';
const HTX_HOST = 'api.huobi.pro';

interface HTXBalance {
  currency: string;
  type: string;
  balance: string;
}

interface HTXAccountBalance {
  id: number;
  type: string;
  state: string;
  list: HTXBalance[];
}

function createSignature(
  method: string,
  host: string,
  path: string,
  params: Record<string, string>,
  secretKey: string
): string {
  const sortedParams = Object.keys(params)
    .sort()
    .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
    .join('&');

  const preSign = `${method}\n${host}\n${path}\n${sortedParams}`;
  const signature = crypto
    .createHmac('sha256', secretKey)
    .update(preSign)
    .digest('base64');

  return signature;
}

export async function getHTXAccounts(apiKey: string, secretKey: string): Promise<{ id: number; type: string }[]> {
  const method = 'GET';
  const host = HTX_HOST;
  const path = '/v1/account/accounts';
  const timestamp = new Date().toISOString().slice(0, 19);
  
  // Trim keys to remove any whitespace
  const cleanApiKey = apiKey.trim();
  const cleanSecretKey = secretKey.trim();

  const params: Record<string, string> = {
    AccessKeyId: cleanApiKey,
    SignatureMethod: 'HmacSHA256',
    SignatureVersion: '2',
    Timestamp: timestamp,
  };

  const signature = createSignature(method, host, path, params, cleanSecretKey);
  params.Signature = signature;

  const queryString = Object.keys(params)
    .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
    .join('&');

  const url = `${HTX_API_URL}${path}?${queryString}`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  const data = await response.json();

  if (data.status !== 'ok') {
    console.error('HTX API error response:', JSON.stringify(data));
    throw new Error(`HTX API error: ${data['err-msg'] || 'Unknown error'}`);
  }

  return data.data;
}

export async function getHTXAccountBalance(
  apiKey: string,
  secretKey: string,
  accountId: number
): Promise<HTXAccountBalance> {
  const method = 'GET';
  const host = HTX_HOST;
  const path = `/v1/account/accounts/${accountId}/balance`;
  const timestamp = new Date().toISOString().slice(0, 19);
  
  // Trim keys to remove any whitespace
  const cleanApiKey = apiKey.trim();
  const cleanSecretKey = secretKey.trim();

  const params: Record<string, string> = {
    AccessKeyId: cleanApiKey,
    SignatureMethod: 'HmacSHA256',
    SignatureVersion: '2',
    Timestamp: timestamp,
  };

  const signature = createSignature(method, host, path, params, cleanSecretKey);
  params.Signature = signature;

  const queryString = Object.keys(params)
    .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
    .join('&');

  const url = `${HTX_API_URL}${path}?${queryString}`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  const data = await response.json();

  if (data.status !== 'ok') {
    console.error('HTX API error response:', JSON.stringify(data));
    throw new Error(`HTX API error: ${data['err-msg'] || 'Unknown error'}`);
  }

  return data.data;
}

export async function getHTXUSDTBalance(apiKey: string, secretKey: string): Promise<number> {
  const accounts = await getHTXAccounts(apiKey, secretKey);
  
  const spotAccount = accounts.find(acc => acc.type === 'spot');
  if (!spotAccount) {
    throw new Error('No spot account found');
  }

  const balance = await getHTXAccountBalance(apiKey, secretKey, spotAccount.id);
  
  const usdtBalance = balance.list.find(
    b => b.currency === 'usdt' && b.type === 'trade'
  );

  return usdtBalance ? parseFloat(usdtBalance.balance) : 0;
}

export async function getHTXAllBalances(apiKey: string, secretKey: string): Promise<Record<string, number>> {
  const accounts = await getHTXAccounts(apiKey, secretKey);
  
  const spotAccount = accounts.find(acc => acc.type === 'spot');
  if (!spotAccount) {
    throw new Error('No spot account found');
  }

  const balance = await getHTXAccountBalance(apiKey, secretKey, spotAccount.id);
  
  const balances: Record<string, number> = {};
  
  for (const item of balance.list) {
    if (item.type === 'trade' && parseFloat(item.balance) > 0) {
      balances[item.currency.toUpperCase()] = parseFloat(item.balance);
    }
  }

  return balances;
}

// HTX Deposit/Withdrawal History Types
export interface HTXDepositWithdraw {
  id: number;
  type: 'deposit' | 'withdraw';
  currency: string;
  'tx-hash': string;
  chain: string;
  amount: number;
  address: string;
  'address-tag'?: string;
  fee: number;
  state: string;
  'created-at': number;
  'updated-at': number;
}

export async function getHTXDepositWithdrawHistory(
  apiKey: string,
  secretKey: string,
  type: 'deposit' | 'withdraw',
  currency?: string,
  size: number = 100
): Promise<HTXDepositWithdraw[]> {
  const method = 'GET';
  const host = HTX_HOST;
  const path = '/v1/query/deposit-withdraw';
  const timestamp = new Date().toISOString().slice(0, 19);
  
  const cleanApiKey = apiKey.trim();
  const cleanSecretKey = secretKey.trim();

  const params: Record<string, string> = {
    AccessKeyId: cleanApiKey,
    SignatureMethod: 'HmacSHA256',
    SignatureVersion: '2',
    Timestamp: timestamp,
    type: type,
    size: size.toString(),
  };

  if (currency) {
    params.currency = currency.toLowerCase();
  }

  const signature = createSignature(method, host, path, params, cleanSecretKey);
  params.Signature = signature;

  const queryString = Object.keys(params)
    .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
    .join('&');

  const url = `${HTX_API_URL}${path}?${queryString}`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  const data = await response.json();

  if (data.status !== 'ok') {
    console.error('HTX API error response:', JSON.stringify(data));
    throw new Error(`HTX API error: ${data['err-msg'] || 'Unknown error'}`);
  }

  return data.data || [];
}

export async function getHTXUSDTTransactions(
  apiKey: string,
  secretKey: string
): Promise<{ deposits: HTXDepositWithdraw[]; withdrawals: HTXDepositWithdraw[] }> {
  const [deposits, withdrawals] = await Promise.all([
    getHTXDepositWithdrawHistory(apiKey, secretKey, 'deposit', 'usdt', 100),
    getHTXDepositWithdrawHistory(apiKey, secretKey, 'withdraw', 'usdt', 100),
  ]);

  return { deposits, withdrawals };
}

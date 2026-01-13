import { createPublicClient, http } from 'viem';
import { baseSepolia } from 'viem/chains';

/**
 * Dedicated public client for fetching event logs/history
 * Uses the public Base Sepolia RPC which doesn't have Alchemy's 10-block limit
 * 
 * Note: This is separate from the main wagmi client to avoid rate limiting on log queries
 */
export const historyClient = createPublicClient({
  chain: baseSepolia,
  transport: http('https://sepolia.base.org'),
});

/**
 * Alternative RPC endpoints for history if primary fails
 */
export const FALLBACK_RPCS = [
  'https://sepolia.base.org',
  'https://base-sepolia-rpc.publicnode.com',
  'https://rpc.ankr.com/base_sepolia',
];

/**
 * Deployment block for contracts on Base Sepolia
 * All history queries should start from this block
 */
export const DEPLOYMENT_BLOCK = BigInt(36275482);

/**
 * Fetch contract events with retry logic using fallback RPCs
 */
export async function fetchHistoryEvents(
  address: `0x${string}`,
  abi: any,
  eventName: string,
  args?: any,
  fromBlock: bigint = DEPLOYMENT_BLOCK
) {
  for (const rpc of FALLBACK_RPCS) {
    try {
      const client = createPublicClient({
        chain: baseSepolia,
        transport: http(rpc),
      });
      
      const logs = await client.getContractEvents({
        address,
        abi,
        eventName,
        args,
        fromBlock,
      });
      
      return logs;
    } catch (error) {
      console.warn(`RPC ${rpc} failed for ${eventName}, trying next...`, error);
      continue;
    }
  }
  
  console.error(`All RPCs failed for event ${eventName}`);
  return [];
}

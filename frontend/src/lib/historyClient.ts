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
 * Max block range per query to avoid RPC limits
 * Most public RPCs limit to 50k-100k blocks, using 40k to be safe
 */
const MAX_BLOCK_RANGE = BigInt(40000);

/**
 * Fetch contract events with retry logic using fallback RPCs
 * Batches queries into smaller block ranges to avoid RPC limits
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
      
      // Get current block number
      const currentBlock = await client.getBlockNumber();
      
      // If range is within limit, do single query
      if (currentBlock - fromBlock <= MAX_BLOCK_RANGE) {
        const logs = await client.getContractEvents({
          address,
          abi,
          eventName,
          args,
          fromBlock,
        });
        return logs;
      }
      
      // Batch queries for large block ranges
      const allLogs: any[] = [];
      let startBlock = fromBlock;
      
      while (startBlock < currentBlock) {
        const endBlock = startBlock + MAX_BLOCK_RANGE > currentBlock 
          ? currentBlock 
          : startBlock + MAX_BLOCK_RANGE;
        
        try {
          const logs = await client.getContractEvents({
            address,
            abi,
            eventName,
            args,
            fromBlock: startBlock,
            toBlock: endBlock,
          });
          
          allLogs.push(...logs);
        } catch (batchError) {
          console.warn(`Batch ${startBlock}-${endBlock} failed for ${eventName}:`, batchError);
          // Continue to next batch even if one fails
        }
        
        startBlock = endBlock + BigInt(1);
      }
      
      return allLogs;
    } catch (error) {
      console.warn(`RPC ${rpc} failed for ${eventName}, trying next...`, error);
      continue;
    }
  }
  
  console.error(`All RPCs failed for event ${eventName}`);
  return [];
}

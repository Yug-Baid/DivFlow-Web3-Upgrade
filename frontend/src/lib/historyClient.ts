import { createPublicClient, http } from 'viem';
import { baseSepolia } from 'viem/chains';

/**
 * Dedicated public client for fetching event logs/history
 * 
 * IMPORTANT: Alchemy Free tier only allows 10 block range for eth_getLogs!
 * So we MUST use public RPCs for history queries which allow 40k+ blocks.
 */

// Public RPCs that allow larger block ranges for getLogs
// DO NOT use Alchemy here - Free tier is limited to 10 blocks only!
const HISTORY_RPCS = [
  'https://base-sepolia-rpc.publicnode.com',
  'https://rpc.ankr.com/base_sepolia',
  'https://base-sepolia.blockpi.network/v1/rpc/public',
  'https://sepolia.base.org',
];

// Primary client using first RPC
export const historyClient = createPublicClient({
  chain: baseSepolia,
  transport: http(HISTORY_RPCS[0]),
});

/**
 * Deployment block for contracts on Base Sepolia
 */
export const DEPLOYMENT_BLOCK = BigInt(36275482);

/**
 * Max block range per query for public RPCs
 */
const MAX_BLOCK_RANGE = BigInt(40000);

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
  console.log(`[HistoryClient] Fetching ${eventName} from block ${fromBlock}`);
  
  for (let i = 0; i < HISTORY_RPCS.length; i++) {
    const rpc = HISTORY_RPCS[i];
    console.log(`[HistoryClient] Trying RPC ${i + 1}/${HISTORY_RPCS.length}: ${rpc.substring(0, 40)}...`);
    
    try {
      const client = createPublicClient({
        chain: baseSepolia,
        transport: http(rpc),
      });
      
      // Get current block number
      const currentBlock = await client.getBlockNumber();
      console.log(`[HistoryClient] Current block: ${currentBlock}`);
      
      // If range is within limit, do single query
      if (currentBlock - fromBlock <= MAX_BLOCK_RANGE) {
        console.log(`[HistoryClient] Single query (range: ${currentBlock - fromBlock} blocks)`);
        const logs = await client.getContractEvents({
          address,
          abi,
          eventName,
          args,
          fromBlock,
        });
        console.log(`[HistoryClient] SUCCESS! Found ${logs.length} events for ${eventName}`);
        return logs;
      }
      
      // Batch queries for large block ranges
      console.log(`[HistoryClient] Batched query needed (range > ${MAX_BLOCK_RANGE} blocks)`);
      const allLogs: any[] = [];
      let startBlock = fromBlock;
      let batchCount = 0;
      
      while (startBlock < currentBlock) {
        const endBlock = startBlock + MAX_BLOCK_RANGE > currentBlock 
          ? currentBlock 
          : startBlock + MAX_BLOCK_RANGE;
        
        batchCount++;
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
          console.log(`[HistoryClient] Batch ${batchCount}: ${logs.length} events (blocks ${startBlock}-${endBlock})`);
        } catch (batchError: any) {
          console.warn(`[HistoryClient] Batch ${batchCount} failed:`, batchError.message);
        }
        
        startBlock = endBlock + BigInt(1);
      }
      
      console.log(`[HistoryClient] SUCCESS! Total ${allLogs.length} events for ${eventName}`);
      return allLogs;
    } catch (error: any) {
      console.error(`[HistoryClient] RPC failed: ${rpc.substring(0, 40)}...`, error.message);
      continue;
    }
  }
  
  console.error(`[HistoryClient] ALL RPCs FAILED for ${eventName}`);
  return [];
}

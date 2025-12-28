"use client";

import { useState } from "react";
import { useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { LAND_REGISTRY_ADDRESS, LAND_REGISTRY_ABI } from "@/lib/contracts";

interface TransferOwnershipModalProps {
  isOpen: boolean;
  onClose: () => void;
  propertyId: bigint;
}

export default function TransferOwnershipModal({ isOpen, onClose, propertyId }: TransferOwnershipModalProps) {
  const { writeContract, data: hash, error: writeError } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash,
  });

  const [newOwner, setNewOwner] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOwner) return;

    try {
      writeContract({
        address: LAND_REGISTRY_ADDRESS,
        abi: LAND_REGISTRY_ABI,
        functionName: "transferOwnership",
        args: [propertyId, newOwner as `0x${string}`],
      });
    } catch (error) {
      console.error("Transfer failed:", error);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-card border rounded-lg p-6 max-w-sm w-full shadow-xl">
        <h2 className="text-xl font-bold mb-4">Transfer Ownership</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Transfer Property #{propertyId.toString()} to a new owner.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">New Owner Address</label>
            <input
              type="text"
              placeholder="0x..."
              required
              className="w-full p-2 rounded-md border bg-background text-foreground"
              value={newOwner}
              onChange={(e) => setNewOwner(e.target.value)}
            />
          </div>

          <div className="flex gap-2 justify-end mt-6">
             <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm border rounded-md hover:bg-accent"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isConfirming || !newOwner}
              className="px-4 py-2 text-sm bg-destructive text-destructive-foreground rounded-md hover:bg-destructive/90 disabled:opacity-50"
            >
              {isConfirming ? "Processing..." : "Transfer"}
            </button>
          </div>
        </form>

        {isConfirmed && (
             <div className="mt-4 text-green-600 text-center text-sm">
                Ownership Transferred Successfully!
                <br/>
                <button onClick={onClose} className="text-xs underline mt-1">Close</button>
             </div>
        )}
        {writeError && <div className="mt-4 text-red-500 text-xs break-all">Error: {writeError.message}</div>}
      </div>
    </div>
  );
}

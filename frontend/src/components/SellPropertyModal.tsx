"use client";

import { useState } from "react";
import { useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { TRANSFER_OWNERSHIP_ADDRESS, TRANSFER_OWNERSHIP_ABI } from "@/lib/contracts";
import { parseEther } from "viem";

interface SellPropertyModalProps {
  isOpen: boolean;
  onClose: () => void;
  propertyId: bigint;
}

export default function SellPropertyModal({ isOpen, onClose, propertyId }: SellPropertyModalProps) {
  const { writeContract, data: hash, error: writeError } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash,
  });

  const [price, setPrice] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!price) return;

    try {
      writeContract({
        address: TRANSFER_OWNERSHIP_ADDRESS,
        abi: TRANSFER_OWNERSHIP_ABI,
        functionName: "addPropertyOnSale",
        args: [propertyId, parseEther(price)], 
      });
    } catch (error) {
      console.error("Listing failed:", error);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-card border rounded-lg p-6 max-w-sm w-full shadow-xl">
        <h2 className="text-xl font-bold mb-4">Sell Property</h2>
        <p className="text-sm text-muted-foreground mb-4">
          List Property #{propertyId.toString()} for sale.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Price (ETH)</label>
            <input
              type="number"
              step="0.0001"
              placeholder="1.5"
              required
              className="w-full p-2 rounded-md border bg-background text-foreground"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
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
              disabled={isConfirming || !price}
              className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50"
            >
              {isConfirming ? "Processing..." : "Put on Sale"}
            </button>
          </div>
        </form>

        {isConfirmed && (
             <div className="mt-4 text-green-600 text-center text-sm">
                Property Listed Successfully!
                <br/>
                <button onClick={onClose} className="text-xs underline mt-1">Close</button>
             </div>
        )}
        {writeError && <div className="mt-4 text-red-500 text-xs break-all">Error: {writeError.message}</div>}
      </div>
    </div>
  );
}

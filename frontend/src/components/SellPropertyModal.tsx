"use client";

import { useState, useEffect } from "react";
import { useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { TRANSFER_OWNERSHIP_ADDRESS, TRANSFER_OWNERSHIP_ABI } from "@/lib/contracts";
import { parseEther } from "viem";

interface SellPropertyModalProps {
  isOpen: boolean;
  onClose: () => void;
  propertyId: bigint;
  onSuccess?: () => void; // G1 FIX: Callback to refresh parent data
}

export default function SellPropertyModal({ isOpen, onClose, propertyId, onSuccess }: SellPropertyModalProps) {
  const { writeContract, data: hash, error: writeError, reset: resetWrite } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash,
  });

  const [price, setPrice] = useState("");
  // D2 FIX: Track if form has been submitted to prevent multiple clicks
  const [hasSubmitted, setHasSubmitted] = useState(false);

  // D1 FIX: Auto-close modal after successful listing
  useEffect(() => {
    if (isConfirmed) {
      // G1 FIX: Call onSuccess callback immediately when confirmed
      if (onSuccess) {
        onSuccess();
      }
      const timer = setTimeout(() => {
        setPrice("");
        setHasSubmitted(false);
        resetWrite();
        onClose();
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [isConfirmed, onClose, resetWrite, onSuccess]);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setPrice("");
      setHasSubmitted(false);
      resetWrite();
    }
  }, [isOpen, resetWrite]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!price || hasSubmitted) return;

    // D2 FIX: Mark as submitted to prevent double-clicks
    setHasSubmitted(true);

    try {
      writeContract({
        address: TRANSFER_OWNERSHIP_ADDRESS,
        abi: TRANSFER_OWNERSHIP_ABI,
        functionName: "addPropertyOnSale",
        args: [propertyId, parseEther(price)],
      });
    } catch (error) {
      console.error("Listing failed:", error);
      setHasSubmitted(false); // Allow retry on error
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
              disabled={hasSubmitted}
            />
          </div>

          <div className="flex gap-2 justify-end mt-6">
            <button
              type="button"
              onClick={onClose}
              disabled={isConfirming}
              className="px-4 py-2 text-sm border rounded-md hover:bg-accent disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isConfirming || !price || hasSubmitted || isConfirmed}
              className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50"
            >
              {isConfirming ? "Processing..." : isConfirmed ? "Listed!" : "Put on Sale"}
            </button>
          </div>
        </form>

        {isConfirmed && (
          <div className="mt-4 text-green-600 text-center text-sm">
            Property Listed Successfully!
            <p className="text-xs text-muted-foreground mt-1">Closing automatically...</p>
          </div>
        )}
        {writeError && (
          <div className="mt-4 text-red-500 text-xs break-all">
            Error: {writeError.message}
            <button
              onClick={() => { resetWrite(); setHasSubmitted(false); }}
              className="block underline mt-1"
            >
              Try Again
            </button>
          </div>
        )}
      </div>
    </div>
  );
}


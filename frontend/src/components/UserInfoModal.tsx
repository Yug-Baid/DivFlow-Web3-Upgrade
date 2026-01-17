"use client";

import { useReadContract, usePublicClient, useAccount } from "wagmi";
import { USERS_ADDRESS, USERS_ABI } from "@/lib/contracts";
import { motion, AnimatePresence } from "framer-motion";
import { X, User, Wallet, Calendar, Shield, CreditCard, Phone, Loader2, Lock, Unlock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { resolveIPFS, UserProfile } from "@/lib/ipfs";

interface UserInfoModalProps {
    isOpen: boolean;
    onClose: () => void;
    userAddress: string;
    isStaffView?: boolean; // If true, show full PAN/Aadhaar; if false, hide for privacy
}

export function UserInfoModal({ isOpen, onClose, userAddress, isStaffView = false }: UserInfoModalProps) {
    const publicClient = usePublicClient();
    const { address: connectedAddress } = useAccount(); // Connected staff wallet for authorization
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [isLoadingProfile, setIsLoadingProfile] = useState(false);

    // Decrypted values state
    const [decryptedPAN, setDecryptedPAN] = useState<string | null>(null);
    const [decryptedAadhaar, setDecryptedAadhaar] = useState<string | null>(null);
    const [isDecrypting, setIsDecrypting] = useState(false);
    const [decryptError, setDecryptError] = useState<string | null>(null);

    // Fetch user registration status
    const { data: isRegistered } = useReadContract({
        address: USERS_ADDRESS,
        abi: USERS_ABI,
        functionName: "isUserRegistered",
        args: [userAddress as `0x${string}`],
        query: { enabled: !!userAddress },
    });

    // Fetch account creation time
    const { data: createdTime } = useReadContract({
        address: USERS_ADDRESS,
        abi: USERS_ABI,
        functionName: "getAccountCreatedTime",
        args: [userAddress as `0x${string}`],
        query: { enabled: !!userAddress && isRegistered === true },
    });

    // Fetch profile CID and resolve IPFS
    useEffect(() => {
        const fetchProfile = async () => {
            if (!userAddress || !isRegistered || !publicClient) return;
            setIsLoadingProfile(true);
            setDecryptedPAN(null);
            setDecryptedAadhaar(null);
            setDecryptError(null);
            try {
                const cid = await publicClient.readContract({
                    address: USERS_ADDRESS,
                    abi: USERS_ABI,
                    functionName: "getUserProfileCID",
                    args: [userAddress as `0x${string}`],
                }) as string;

                if (cid && cid.length > 0) {
                    const { isMetadata, data } = await resolveIPFS(cid);
                    if (isMetadata && data) {
                        setProfile(data as UserProfile);
                    }
                }
            } catch (e) {
                console.error("Error fetching profile:", e);
            }
            setIsLoadingProfile(false);
        };
        fetchProfile();
    }, [userAddress, isRegistered, publicClient]);

    // Decrypt encrypted fields when profile loads (for staff view)
    useEffect(() => {
        const decryptFields = async () => {
            if (!profile || !isStaffView || !connectedAddress) return;

            // Check if profile has encrypted fields
            const hasEncryptedPAN = profile.panEncrypted && profile.panEncrypted.length > 0;
            const hasEncryptedAadhaar = profile.aadhaarEncrypted && profile.aadhaarEncrypted.length > 0;

            if (!hasEncryptedPAN && !hasEncryptedAadhaar) {
                // Legacy profile - use plain values if available
                if (profile.pan) setDecryptedPAN(profile.pan);
                if (profile.aadhaar) setDecryptedAadhaar(profile.aadhaar);
                return;
            }

            setIsDecrypting(true);
            setDecryptError(null);

            // Helper: Decrypt via server-side API (role-verified)
            const decryptOnServer = async (encryptedData: string): Promise<string | null> => {
                try {
                    const response = await fetch('/api/decrypt', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            encryptedData,
                            walletAddress: connectedAddress,
                        }),
                    });
                    const result = await response.json();
                    if (!result.success) {
                        console.warn('Server decryption failed:', result.error);
                        return null;
                    }
                    return result.decrypted;
                } catch (error) {
                    console.warn('Server decryption error:', error);
                    return null;
                }
            };

            // Helper: Fallback to client-side decryption for V1 encrypted data
            const decryptClientSide = async (encryptedData: string): Promise<string | null> => {
                try {
                    const { decryptData } = await import("@/lib/simpleEncrypt");
                    return decryptData(encryptedData) || null;
                } catch {
                    return null;
                }
            };

            try {
                // Check encryption version
                const isV2 = profile.encryptionVersion === 2;

                // Decrypt PAN
                if (hasEncryptedPAN) {
                    let decrypted: string | null = null;
                    
                    if (isV2) {
                        // V2: Server-side AES-256-GCM decryption
                        decrypted = await decryptOnServer(profile.panEncrypted!);
                    } else {
                        // V1: Client-side XOR fallback (legacy)
                        decrypted = await decryptClientSide(profile.panEncrypted!);
                    }
                    
                    if (decrypted) {
                        setDecryptedPAN(decrypted);
                    } else {
                        setDecryptError('Unauthorized or decryption failed for PAN');
                    }
                }

                // Decrypt Aadhaar
                if (hasEncryptedAadhaar) {
                    let decrypted: string | null = null;
                    
                    if (isV2) {
                        // V2: Server-side AES-256-GCM decryption
                        decrypted = await decryptOnServer(profile.aadhaarEncrypted!);
                    } else {
                        // V1: Client-side XOR fallback (legacy)
                        decrypted = await decryptClientSide(profile.aadhaarEncrypted!);
                    }
                    
                    if (decrypted) {
                        setDecryptedAadhaar(decrypted);
                    } else if (!decryptError) {
                        setDecryptError('Unauthorized or decryption failed for Aadhaar');
                    }
                }
            } catch (e: any) {
                console.error("Decryption error:", e);
                setDecryptError(e.message || 'Decryption failed');
            }
            setIsDecrypting(false);
        };

        decryptFields();
    }, [profile, isStaffView, connectedAddress, decryptError]);

    // Reset profile when modal closes
    useEffect(() => {
        if (!isOpen) {
            setProfile(null);
            setDecryptedPAN(null);
            setDecryptedAadhaar(null);
            setDecryptError(null);
        }
    }, [isOpen]);

    const formattedDate = createdTime
        ? new Date(Number(createdTime) * 1000).toLocaleString()
        : "N/A";

    // Helper to get display value for PAN
    const getDisplayPAN = () => {
        if (isDecrypting) return "Decrypting...";
        if (decryptedPAN) return decryptedPAN;
        if (profile?.pan) return profile.pan; // Legacy
        if (profile?.panMasked) return profile.panMasked; // Fallback to masked
        return "Not available";
    };

    // Helper to get display value for Aadhaar
    const getDisplayAadhaar = () => {
        if (isDecrypting) return "Decrypting...";
        if (decryptedAadhaar) return decryptedAadhaar;
        if (profile?.aadhaar) return profile.aadhaar; // Legacy
        if (profile?.aadhaarMasked) return profile.aadhaarMasked; // Fallback to masked
        return "Not available";
    };

    // Check if values are decrypted (full) or masked
    const isPANDecrypted = !!decryptedPAN || !!profile?.pan;
    const isAadhaarDecrypted = !!decryptedAadhaar || !!profile?.aadhaar;

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
                    />

                    {/* Modal */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-4"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="bg-card border border-border/50 rounded-2xl shadow-2xl overflow-hidden w-full max-w-md max-h-[90vh] overflow-y-auto">
                            {/* Header */}
                            <div className="p-4 border-b border-border/50 flex justify-between items-center bg-secondary/30">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-primary/20 rounded-full flex items-center justify-center">
                                        <User className="w-5 h-5 text-primary" />
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-foreground">User Details</h3>
                                        <p className="text-xs text-muted-foreground">
                                            {profile ? `${profile.firstName} ${profile.lastName}` : "Property Applicant Information"}
                                        </p>
                                    </div>
                                </div>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={onClose}
                                    className="h-8 w-8 p-0 rounded-full hover:bg-secondary"
                                >
                                    <X className="w-4 h-4" />
                                </Button>
                            </div>

                            {/* Content */}
                            <div className="p-4 space-y-4">
                                {/* Wallet Address */}
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                        <Wallet className="w-4 h-4" />
                                        Wallet Address
                                    </div>
                                    <div className="p-3 bg-secondary/50 rounded-lg font-mono text-sm break-all text-foreground border border-border/50">
                                        {userAddress}
                                    </div>
                                </div>

                                {/* Registration Status */}
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                        <Shield className="w-4 h-4" />
                                        Registration Status
                                    </div>
                                    <div className={`p-3 rounded-lg text-sm font-medium flex items-center gap-2 border ${isRegistered
                                        ? 'bg-green-500/10 text-green-500 border-green-500/20'
                                        : 'bg-red-500/10 text-red-500 border-red-500/20'
                                        }`}>
                                        <div className={`w-2 h-2 rounded-full ${isRegistered ? 'bg-green-500' : 'bg-red-500'}`} />
                                        {isRegistered ? 'Verified User' : 'Unregistered'}
                                    </div>
                                </div>

                                {/* IPFS Profile Data */}
                                {isLoadingProfile ? (
                                    <div className="flex items-center justify-center p-4 text-muted-foreground">
                                        <Loader2 className="w-4 h-4 animate-spin mr-2" /> Loading profile...
                                    </div>
                                ) : profile ? (
                                    <>
                                        {/* Decryption Error */}
                                        {decryptError && isStaffView && (
                                            <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg text-yellow-500 text-sm">
                                                ⚠️ {decryptError} - Showing masked values
                                            </div>
                                        )}

                                        {/* PAN Card - Only show for staff */}
                                        {isStaffView && (
                                            <div className="space-y-2">
                                                <div className="flex items-center justify-between text-sm text-muted-foreground">
                                                    <div className="flex items-center gap-2">
                                                        <CreditCard className="w-4 h-4" />
                                                        PAN Card
                                                    </div>
                                                    {isPANDecrypted ? (
                                                        <span className="text-xs text-green-500 flex items-center gap-1">
                                                            <Unlock className="w-3 h-3" /> Decrypted
                                                        </span>
                                                    ) : (
                                                        <span className="text-xs text-yellow-500 flex items-center gap-1">
                                                            <Lock className="w-3 h-3" /> Masked
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="p-3 bg-blue-500/10 rounded-lg font-mono text-sm text-blue-400 border border-blue-500/20 flex items-center gap-2">
                                                    {isDecrypting && <Loader2 className="w-3 h-3 animate-spin" />}
                                                    {getDisplayPAN()}
                                                </div>
                                            </div>
                                        )}

                                        {/* Aadhaar - Only show for staff */}
                                        {isStaffView && (
                                            <div className="space-y-2">
                                                <div className="flex items-center justify-between text-sm text-muted-foreground">
                                                    <div className="flex items-center gap-2">
                                                        <CreditCard className="w-4 h-4" />
                                                        Aadhaar Number
                                                    </div>
                                                    {isAadhaarDecrypted ? (
                                                        <span className="text-xs text-green-500 flex items-center gap-1">
                                                            <Unlock className="w-3 h-3" /> Decrypted
                                                        </span>
                                                    ) : (
                                                        <span className="text-xs text-yellow-500 flex items-center gap-1">
                                                            <Lock className="w-3 h-3" /> Masked
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="p-3 bg-purple-500/10 rounded-lg font-mono text-sm text-purple-400 border border-purple-500/20 flex items-center gap-2">
                                                    {isDecrypting && <Loader2 className="w-3 h-3 animate-spin" />}
                                                    {getDisplayAadhaar()}
                                                </div>
                                            </div>
                                        )}

                                        {/* Mobile */}
                                        <div className="space-y-2">
                                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                <Phone className="w-4 h-4" />
                                                Mobile Number
                                            </div>
                                            <div className="p-3 bg-secondary/50 rounded-lg font-mono text-sm text-foreground border border-border/50">
                                                +91 {profile.mobile}
                                            </div>
                                        </div>
                                    </>
                                ) : isRegistered ? (
                                    <div className="text-xs text-muted-foreground bg-secondary/30 p-3 rounded-lg border border-border/50">
                                        <strong className="text-foreground">Note:</strong> Profile data not available.
                                        User may have registered before IPFS profile storage was implemented.
                                    </div>
                                ) : null}

                                {/* Account Created */}
                                {isRegistered && (
                                    <div className="space-y-2">
                                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                            <Calendar className="w-4 h-4" />
                                            Account Created
                                        </div>
                                        <div className="p-3 bg-secondary/50 rounded-lg text-sm text-foreground border border-border/50">
                                            {formattedDate}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Footer */}
                            <div className="p-4 border-t border-border/50 bg-secondary/20">
                                <Button onClick={onClose} className="w-full" variant="secondary">
                                    Close
                                </Button>
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}


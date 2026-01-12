"use client";

import { useReadContract, usePublicClient } from "wagmi";
import { USERS_ADDRESS, USERS_ABI } from "@/lib/contracts";
import { motion, AnimatePresence } from "framer-motion";
import { X, User, Wallet, Calendar, Shield, CreditCard, Phone, Loader2 } from "lucide-react";
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
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [isLoadingProfile, setIsLoadingProfile] = useState(false);

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

    // Reset profile when modal closes
    useEffect(() => {
        if (!isOpen) setProfile(null);
    }, [isOpen]);

    const formattedDate = createdTime
        ? new Date(Number(createdTime) * 1000).toLocaleString()
        : "N/A";

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
                                        {/* PAN Card - Only show for staff */}
                                        {isStaffView && (
                                            <div className="space-y-2">
                                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                    <CreditCard className="w-4 h-4" />
                                                    PAN Card
                                                </div>
                                                <div className="p-3 bg-blue-500/10 rounded-lg font-mono text-sm text-blue-400 border border-blue-500/20">
                                                    {profile.pan}
                                                </div>
                                            </div>
                                        )}

                                        {/* Aadhaar - Only show for staff */}
                                        {isStaffView && (
                                            <div className="space-y-2">
                                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                    <CreditCard className="w-4 h-4" />
                                                    Aadhaar Number
                                                </div>
                                                <div className="p-3 bg-purple-500/10 rounded-lg font-mono text-sm text-purple-400 border border-purple-500/20">
                                                    {profile.aadhaar}
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

"use client";

import { useState, useMemo, useEffect } from "react";
import { useAccount, useReadContract, useReadContracts, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { TRANSFER_OWNERSHIP_ADDRESS, TRANSFER_OWNERSHIP_ABI, LAND_REGISTRY_ADDRESS, LAND_REGISTRY_ABI, USERS_ADDRESS, USERS_ABI } from "@/lib/contracts";
import { getTxUrl } from "@/lib/config";
import { fetchHistoryEvents } from "@/lib/historyClient";
import { formatEther, parseEther } from "viem";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { DashboardLayout } from "@/components/shared/DashboardLayout";
import { GlassCard } from "@/components/shared/GlassCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MapPin, Tag, ShoppingCart, Loader2, Info, ArrowLeft, Image as ImageIcon, FileText, Calendar, Wallet, History, ImageOff, ExternalLink, AlertTriangle, ShieldX } from "lucide-react";
import { resolveIPFS, getIPFSUrl, PropertyMetadata } from "@/lib/ipfs";
import DynamicMap from "@/components/shared/DynamicMap";
import { UserInfoModal } from "@/components/UserInfoModal";

// Admin address 
const ADMIN_ADDRESS = "0xA3547d22cBc90a88e89125eE360887Ee7C30a9d5";

export default function PropertyDetailsPage({ params }: { params: { id: string } }) {
    const propertyId = BigInt(params.id);
    const router = useRouter();
    const { address } = useAccount();
    const [isMounted, setIsMounted] = useState(false);
    const [metadata, setMetadata] = useState<PropertyMetadata | null>(null);
    const [offerPrice, setOfferPrice] = useState("");
    const [selectedUserAddress, setSelectedUserAddress] = useState<string | null>(null);
    const [historyEvents, setHistoryEvents] = useState<any[]>([]);
    const [isLoadingHistory, setIsLoadingHistory] = useState(false);
    const [selectedImage, setSelectedImage] = useState<string | null>(null); // For image gallery

    useEffect(() => {
        setIsMounted(true);
    }, []);

    // Fetch Property Details
    const { data: property, isLoading: isLoadingProperty } = useReadContract({
        address: LAND_REGISTRY_ADDRESS,
        abi: LAND_REGISTRY_ABI,
        functionName: "getPropertyDetails",
        args: [propertyId],
    });

    // Check if user is registered
    const { data: isRegistered } = useReadContract({
        address: USERS_ADDRESS,
        abi: USERS_ABI,
        functionName: "isUserRegistered",
        args: address ? [address] : undefined,
    });

    // Staff detection
    const { data: inspectorLocation } = useReadContract({
        address: LAND_REGISTRY_ADDRESS,
        abi: LAND_REGISTRY_ABI,
        functionName: "getInspectorLocation",
        args: address ? [address] : undefined,
    });

    const { data: employeeDept } = useReadContract({
        address: LAND_REGISTRY_ADDRESS,
        abi: LAND_REGISTRY_ABI,
        functionName: "getEmployeeRevenueDept",
        args: address ? [address] : undefined,
    });

    const isAdmin = address?.toLowerCase() === ADMIN_ADDRESS.toLowerCase();
    const isLandInspector = inspectorLocation && Number(inspectorLocation) > 0;
    const isRevenueEmployee = employeeDept && Number(employeeDept) > 0;
    const isStaff = isAdmin || isLandInspector || isRevenueEmployee;

    // Fetch Sales to find active sale
    const { data: allSales } = useReadContract({
        address: TRANSFER_OWNERSHIP_ADDRESS,
        abi: TRANSFER_OWNERSHIP_ABI,
        functionName: "getAllSales",
    });

    const activeSale = useMemo(() => {
        if (!allSales || !property) return null;
        const sales = (allSales as any[]).filter((s: any) => s.propertyId === propertyId && s.state === 0);
        // Return latest if multiple (shouldn't happen for active sales usually)
        return sales.length > 0 ? sales[sales.length - 1] : null;
    }, [allSales, property, propertyId]);

    // Fetch Metadata
    useEffect(() => {
        if (property && (property as any).ipfsHash) {
            resolveIPFS((property as any).ipfsHash).then(({ isMetadata, data }) => {
                if (isMetadata) {
                    setMetadata(data);
                } else {
                    // Legacy: make fake metadata wrapper
                    setMetadata({
                        name: `Property #${propertyId}`,
                        description: "No detailed description available.",
                        image: `ipfs://${(property as any).ipfsHash}`, // assume hash is image
                        properties: {
                            deed: `ipfs://${(property as any).ipfsHash}`,
                            photos: [],
                            location: undefined,
                            owner: (property as any).owner
                        }
                    });
                }
            });
        }
    }, [property, propertyId]);


    // FETCH HISTORY LOGS using dedicated history client (avoids Alchemy rate limits)
    useEffect(() => {
        const fetchHistory = async () => {
            setIsLoadingHistory(true);
            try {
                const [addedLogs, verifiedLogs, saleApprovedLogs, listedLogs, soldLogs] = await Promise.all([
                    fetchHistoryEvents(
                        LAND_REGISTRY_ADDRESS,
                        LAND_REGISTRY_ABI,
                        'LandAdded',
                        { propertyId: propertyId }
                    ),
                    fetchHistoryEvents(
                        LAND_REGISTRY_ADDRESS,
                        LAND_REGISTRY_ABI,
                        'PropertyVerifiedByInspector',
                        { propertyId: propertyId }
                    ),
                    fetchHistoryEvents(
                        LAND_REGISTRY_ADDRESS,
                        LAND_REGISTRY_ABI,
                        'SaleRequestApproved',
                        { propertyId: propertyId }
                    ),
                    fetchHistoryEvents(
                        TRANSFER_OWNERSHIP_ADDRESS,
                        TRANSFER_OWNERSHIP_ABI,
                        'PropertyOnSale',
                        { propertyId: propertyId }
                    ),
                    fetchHistoryEvents(
                        TRANSFER_OWNERSHIP_ADDRESS,
                        TRANSFER_OWNERSHIP_ABI,
                        'OwnershipTransferred',
                        { propertyId: propertyId }
                    ),
                ]);

                const events = [
                    ...addedLogs.map((l: any) => ({ type: 'Property Registered', block: l.blockNumber, tx: l.transactionHash })),
                    ...verifiedLogs.map((l: any) => ({ type: 'Verified by Inspector', block: l.blockNumber, tx: l.transactionHash })),
                    ...saleApprovedLogs.map((l: any) => ({ type: 'Sale Approved by Revenue Dept', block: l.blockNumber, tx: l.transactionHash })),
                    ...listedLogs.map((l: any) => ({ type: 'Sale Request Submitted', block: l.blockNumber, tx: l.transactionHash })),
                    ...soldLogs.map((l: any) => ({ type: 'Ownership Transferred', block: l.blockNumber, tx: l.transactionHash })),
                ];

                events.sort((a, b) => Number(b.block) - Number(a.block));
                setHistoryEvents(events);
            } catch (e) {
                console.error("Error fetching history:", e);
                setHistoryEvents([]);
            }
            setIsLoadingHistory(false);
        };

        fetchHistory();
    }, [propertyId]);


    // Purchase Logic
    const { writeContract, data: hash, error: writeError } = useWriteContract();
    const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash });

    const handleRequestPurchase = async () => {
        if (!activeSale) return;
        if (!offerPrice) {
            alert("Please enter an offer price");
            return;
        }
        writeContract({
            address: TRANSFER_OWNERSHIP_ADDRESS,
            abi: TRANSFER_OWNERSHIP_ABI,
            functionName: "sendPurchaseRequest",
            args: [activeSale.saleId, BigInt(parseEther(offerPrice))],
        });
    };

    if (!isMounted || isLoadingProperty) {
        return (
            <DashboardLayout>
                <div className="flex justify-center h-64 items-center">
                    <Loader2 className="w-10 h-10 animate-spin text-primary" />
                </div>
            </DashboardLayout>
        );
    }

    if (!property) return <DashboardLayout>Property not found</DashboardLayout>;

    return (
        <DashboardLayout>
            <div className="mb-4">
                <Button variant="ghost" className="pl-0 hover:bg-transparent hover:text-primary" onClick={() => router.back()}>
                    <ArrowLeft className="w-4 h-4 mr-2" /> Back to Marketplace
                </Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                {/* Left Column: Images & Map */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Main Cover Image - Shows selected image or default cover */}
                    <GlassCard className="p-2 overflow-hidden relative aspect-video group">
                        {(selectedImage || metadata?.image) ? (
                            <Image
                                src={getIPFSUrl(selectedImage || metadata?.image || "")}
                                alt={metadata?.name || "Property"}
                                fill
                                className="object-cover rounded-lg transition-transform duration-300"
                                unoptimized
                            />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center bg-secondary/30 rounded-lg">
                                <ImageOff className="w-12 h-12 text-muted-foreground" />
                            </div>
                        )}

                        {/* Price Tag Overlay */}
                        {activeSale && (
                            <div className="absolute top-4 right-4 bg-black/70 backdrop-blur-md text-white px-4 py-2 rounded-full font-bold text-lg border border-white/10">
                                {formatEther((activeSale as any).price)} ETH
                            </div>
                        )}
                    </GlassCard>

                    {/* Photo Gallery - Clickable thumbnails */}
                    {metadata && (metadata.image || (metadata.properties?.photos && metadata.properties.photos.length > 0)) && (
                        <div className="grid grid-cols-4 gap-4">
                            {/* Cover image as first thumbnail */}
                            {metadata.image && (
                                <div 
                                    onClick={() => setSelectedImage(metadata.image)}
                                    className={`aspect-square relative rounded-lg overflow-hidden border-2 cursor-pointer transition-all duration-200 hover:scale-105 ${
                                        (!selectedImage || selectedImage === metadata.image) 
                                            ? 'border-primary ring-2 ring-primary/30' 
                                            : 'border-border hover:border-primary/50'
                                    }`}
                                >
                                    <Image 
                                        src={getIPFSUrl(metadata.image)} 
                                        alt="Cover" 
                                        fill 
                                        className="object-cover" 
                                        unoptimized 
                                    />
                                </div>
                            )}
                            {/* Additional photos */}
                            {metadata.properties?.photos?.map((photo, i) => (
                                <div 
                                    key={i} 
                                    onClick={() => setSelectedImage(photo)}
                                    className={`aspect-square relative rounded-lg overflow-hidden border-2 cursor-pointer transition-all duration-200 hover:scale-105 ${
                                        selectedImage === photo 
                                            ? 'border-primary ring-2 ring-primary/30' 
                                            : 'border-border hover:border-primary/50'
                                    }`}
                                >
                                    <Image 
                                        src={getIPFSUrl(photo)} 
                                        alt={`Photo ${i + 1}`} 
                                        fill 
                                        className="object-cover" 
                                        unoptimized 
                                    />
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Location Map */}
                    <GlassCard className="p-6">
                        <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                            <MapPin className="w-5 h-5 text-primary" /> Property Location
                        </h3>
                        <div className="rounded-lg overflow-hidden border border-border">
                            <DynamicMap
                                readonly
                                initialLat={metadata?.properties?.location?.lat}
                                initialLng={metadata?.properties?.location?.lng}
                            />
                        </div>
                        
                        {/* Property Address */}
                        {metadata?.properties?.location?.address && (
                            <div className="mt-4 p-4 bg-primary/5 border border-primary/20 rounded-lg">
                                <div className="flex items-start gap-3">
                                    <MapPin className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                                    <p className="text-sm font-medium text-foreground">{metadata.properties.location.address}</p>
                                </div>
                            </div>
                        )}
                        
                        <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
                            <div className="bg-secondary/30 p-3 rounded flex justify-between">
                                <span className="text-muted-foreground">Location ID</span>
                                <span className="font-mono">{(property as any).locationId.toString()}</span>
                            </div>
                            <div className="bg-secondary/30 p-3 rounded flex justify-between">
                                <span className="text-muted-foreground">Revenue Dept</span>
                                <span className="font-mono">{(property as any).revenueDepartmentId.toString()}</span>
                            </div>
                            <div className="bg-secondary/30 p-3 rounded flex justify-between">
                                <span className="text-muted-foreground">Survey No.</span>
                                <span className="font-mono">{(property as any).surveyNumber.toString()}</span>
                            </div>
                            <div className="bg-secondary/30 p-3 rounded flex justify-between">
                                <span className="text-muted-foreground">Area</span>
                                <span className="font-mono">{(property as any).area.toString()} sq.ft</span>
                            </div>
                        </div>
                    </GlassCard>

                    {/* History Timeline */}
                    <GlassCard className="p-6">
                        <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                            <History className="w-5 h-5 text-primary" /> History
                        </h3>
                        <div className="relative border-l border-border ml-3 pl-6 space-y-6">
                            {historyEvents.map((event, i) => (
                                <div key={i} className="relative flex flex-col md:flex-row md:items-center justify-between gap-2 bg-secondary/10 p-3 rounded-lg border border-border/50">
                                    <div className="absolute -left-[37px] top-4 w-4 h-4 rounded-full bg-primary border-4 border-background" />
                                    <div>
                                        <p className="font-bold text-foreground text-sm">{event.type}</p>
                                        <p className="text-xs text-muted-foreground font-mono break-all">Tx: {event.tx}</p>
                                    </div>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => window.open(getTxUrl(event.tx), '_blank')}
                                        className="h-7 text-xs shrink-0 self-start md:self-center"
                                    >
                                        View <ExternalLink className="w-3 h-3 ml-2" />
                                    </Button>
                                </div>
                            ))}
                            {historyEvents.length === 0 && (
                                <p className="text-sm text-muted-foreground">No history events found (or indexing pending).</p>
                            )}
                        </div>
                    </GlassCard>
                </div>

                {/* Right Column: Actions & Details */}
                <div className="space-y-6">
                    <GlassCard className="p-6">
                        <h1 className="text-2xl font-bold mb-2">{metadata?.name || `Property #${propertyId}`}</h1>
                        <p className="text-muted-foreground text-sm mb-6">
                            {metadata?.description || "No description provided."}
                        </p>

                        <div className="space-y-4">
                            <div className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg">
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <Wallet className="w-4 h-4" /> Owner
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="font-mono text-xs">
                                        {(property as any).owner.slice(0, 6)}...{(property as any).owner.slice(-4)}
                                    </span>
                                    <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => setSelectedUserAddress((property as any).owner)}>
                                        <Info className="w-3 h-3" />
                                    </Button>
                                </div>
                            </div>

                            {metadata?.properties?.deed && (
                                <Button
                                    variant="outline"
                                    className="w-full justify-start"
                                    onClick={() => {
                                        // Check if user is registered before allowing deed access
                                        if (!address) {
                                            alert('Please connect your wallet to view the deed.');
                                            return;
                                        }
                                        if (!isRegistered && !isStaff) {
                                            // Redirect to register page
                                            router.push('/register');
                                            return;
                                        }
                                        window.open(getIPFSUrl(metadata.properties.deed), '_blank');
                                    }}
                                >
                                    <FileText className="w-4 h-4 mr-2" /> View Official Deed (PDF)
                                </Button>
                            )}
                        </div>
                    </GlassCard>

                    {/* Purchase Action */}
                    {activeSale && (activeSale as any).owner !== address && (
                        <GlassCard className="p-6 border-primary/20 bg-primary/5">
                            <h3 className="font-bold mb-4">Interested in buying?</h3>
                            {/* Staff cannot purchase */}
                            {isStaff ? (
                                <div className="p-4 bg-red-500/10 text-red-400 rounded-lg text-sm text-center border border-red-500/20">
                                    <ShieldX className="w-6 h-6 mx-auto mb-2" />
                                    <p className="font-medium">Staff members cannot purchase properties</p>
                                    <p className="text-xs mt-1 text-muted-foreground">Please use a personal wallet to make purchases</p>
                                </div>
                            ) : !address ? (
                                <div className="p-4 bg-yellow-500/10 text-yellow-500 rounded-lg text-sm text-center border border-yellow-500/20">
                                    <AlertTriangle className="w-6 h-6 mx-auto mb-2" />
                                    <p className="font-medium">Connect your wallet</p>
                                    <p className="text-xs mt-1 text-muted-foreground">Please connect your wallet to submit purchase requests</p>
                                </div>
                            ) : !isRegistered ? (
                                <div className="p-4 bg-yellow-500/10 text-yellow-500 rounded-lg text-sm text-center border border-yellow-500/20">
                                    <AlertTriangle className="w-6 h-6 mx-auto mb-2" />
                                    <p className="font-medium">Registration Required</p>
                                    <p className="text-xs mt-1 text-muted-foreground mb-3">You must register your identity before submitting purchase requests</p>
                                    <Button onClick={() => router.push('/register')} variant="hero" size="sm">
                                        Register Now
                                    </Button>
                                </div>
                            ) : selectedUserAddress === address ? (
                                <div className="p-3 bg-yellow-500/10 text-yellow-500 rounded text-sm text-center">
                                    You own this property
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    <Input
                                        type="number"
                                        placeholder="Offer Amount (ETH)"
                                        value={offerPrice}
                                        onChange={(e) => setOfferPrice(e.target.value)}
                                        className="bg-background"
                                    />
                                    <Button className="w-full" variant="hero" onClick={handleRequestPurchase} disabled={isConfirming}>
                                        {isConfirming ? <Loader2 className="w-4 h-4 animate-spin" /> : "Request to Buy"}
                                    </Button>
                                    {isConfirmed && (
                                        <p className="text-green-500 text-xs text-center font-bold">Offer Sent Successfully!</p>
                                    )}
                                </div>
                            )}
                        </GlassCard>
                    )}
                </div>
            </div>

            <UserInfoModal
                isOpen={!!selectedUserAddress}
                onClose={() => setSelectedUserAddress(null)}
                userAddress={selectedUserAddress || ""}
            />
        </DashboardLayout>
    );
}

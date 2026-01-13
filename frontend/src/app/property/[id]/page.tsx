"use client";

import { useState, useEffect } from "react";
import { useAccount, useReadContract } from "wagmi";
import { LAND_REGISTRY_ADDRESS, LAND_REGISTRY_ABI, TRANSFER_OWNERSHIP_ADDRESS, TRANSFER_OWNERSHIP_ABI } from "@/lib/contracts";
import { fetchHistoryEvents, DEPLOYMENT_BLOCK } from "@/lib/historyClient";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { DashboardLayout } from "@/components/shared/DashboardLayout";
import { GlassCard } from "@/components/shared/GlassCard";
import { Button } from "@/components/ui/button";
import { MapPin, Loader2, ArrowLeft, FileText, Wallet, History, ImageOff, ExternalLink, Tag, Edit, Eye } from "lucide-react";
import { resolveIPFS, getIPFSUrl, PropertyMetadata } from "@/lib/ipfs";
import DynamicMap from "@/components/shared/DynamicMap";
import { StaffRouteGuard } from "@/components/StaffRouteGuard";

// Property states
const PropertyState: Record<number, string> = {
  0: "Created",
  1: "Scheduled",
  2: "Verified",
  3: "Rejected",
  4: "On Sale",
  5: "Bought",
  6: "Sale Pending"
};

const StateColors: Record<number, string> = {
  0: "bg-gray-500/20 text-gray-400 border-gray-500/30",
  1: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  2: "bg-green-500/20 text-green-400 border-green-500/30",
  3: "bg-red-500/20 text-red-400 border-red-500/30",
  4: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  5: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  6: "bg-orange-500/20 text-orange-400 border-orange-500/30"
};

export default function PropertyDetailPage({ params }: { params: { id: string } }) {
  const propertyId = BigInt(params.id);
  const router = useRouter();
  const { address } = useAccount();
  const [isMounted, setIsMounted] = useState(false);
  const [metadata, setMetadata] = useState<PropertyMetadata | null>(null);
  const [historyEvents, setHistoryEvents] = useState<any[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

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

  // Fetch Metadata
  useEffect(() => {
    if (property && (property as any).ipfsHash) {
      resolveIPFS((property as any).ipfsHash).then(({ isMetadata, data }) => {
        if (isMetadata) {
          setMetadata(data);
        } else {
          setMetadata({
            name: `Property #${propertyId}`,
            description: "No detailed description available.",
            image: `ipfs://${(property as any).ipfsHash}`,
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

  // Fetch History using dedicated history client (avoids Alchemy rate limits)
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
          ...addedLogs.map(l => ({ type: 'Property Registered', block: l.blockNumber, tx: l.transactionHash })),
          ...verifiedLogs.map(l => ({ type: 'Verified by Inspector', block: l.blockNumber, tx: l.transactionHash })),
          ...saleApprovedLogs.map(l => ({ type: 'Sale Approved', block: l.blockNumber, tx: l.transactionHash })),
          ...listedLogs.map(l => ({ type: 'Listed for Sale', block: l.blockNumber, tx: l.transactionHash })),
          ...soldLogs.map(l => ({ type: 'Ownership Transferred', block: l.blockNumber, tx: l.transactionHash })),
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

  if (!isMounted || isLoadingProperty) {
    return (
      <StaffRouteGuard>
        <DashboardLayout>
          <div className="flex justify-center h-64 items-center">
            <Loader2 className="w-10 h-10 animate-spin text-primary" />
          </div>
        </DashboardLayout>
      </StaffRouteGuard>
    );
  }

  if (!property) {
    return (
      <StaffRouteGuard>
        <DashboardLayout>
          <GlassCard className="p-8 text-center">
            <h2 className="text-xl font-bold text-destructive">Property Not Found</h2>
            <p className="text-muted-foreground mt-2">This property doesn't exist or has been removed.</p>
            <Link href="/dashboard">
              <Button variant="hero" className="mt-4">Back to Dashboard</Button>
            </Link>
          </GlassCard>
        </DashboardLayout>
      </StaffRouteGuard>
    );
  }

  const isOwner = address && (property as any).owner.toLowerCase() === address.toLowerCase();
  const propertyState = Number((property as any).state);

  return (
    <StaffRouteGuard>
      <DashboardLayout>
        <div className="mb-4">
          <Button variant="ghost" className="pl-0 hover:bg-transparent hover:text-primary" onClick={() => router.back()}>
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Dashboard
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column: Images & Map */}
          <div className="lg:col-span-2 space-y-6">
            {/* Main Cover Image */}
            <GlassCard className="p-2 overflow-hidden relative aspect-video group">
              {metadata?.image ? (
                <Image
                  src={getIPFSUrl(metadata.image)}
                  alt={metadata.name || "Property"}
                  fill
                  className="object-cover rounded-lg"
                  unoptimized
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-secondary/30 rounded-lg">
                  <ImageOff className="w-12 h-12 text-muted-foreground" />
                </div>
              )}

              {/* Status Badge */}
              <div className={`absolute top-4 right-4 px-3 py-1 rounded-full font-bold text-sm border ${StateColors[propertyState]}`}>
                {PropertyState[propertyState]}
              </div>

              {isOwner && (
                <div className="absolute top-4 left-4 px-2 py-1 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center gap-1">
                  <Tag className="w-3 h-3" /> Your Property
                </div>
              )}
            </GlassCard>

            {/* Photo Gallery */}
            {metadata?.properties?.photos && metadata.properties.photos.length > 0 && (
              <div className="grid grid-cols-4 gap-4">
                {metadata.properties.photos.map((photo, i) => (
                  <div key={i} className="aspect-square relative rounded-lg overflow-hidden border border-border cursor-pointer hover:opacity-80 transition-opacity">
                    <Image src={getIPFSUrl(photo)} alt={`Photo ${i}`} fill className="object-cover" unoptimized />
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

              {/* Address */}
              {metadata?.properties?.location?.address && (
                <div className="mt-4 p-3 bg-secondary/30 rounded">
                  <p className="text-xs text-muted-foreground mb-1">Address</p>
                  <p className="text-sm">{metadata.properties.location.address}</p>
                </div>
              )}
            </GlassCard>

            {/* History Timeline */}
            <GlassCard className="p-6">
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                <History className="w-5 h-5 text-primary" /> History
              </h3>
              <div className="relative border-l border-border ml-3 pl-6 space-y-4">
                {historyEvents.map((event, i) => (
                  <div key={i} className="relative bg-secondary/10 p-3 rounded-lg border border-border/50">
                    <div className="absolute -left-[37px] top-4 w-4 h-4 rounded-full bg-primary border-4 border-background" />
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                      <div>
                        <p className="font-bold text-foreground text-sm">{event.type}</p>
                        <p className="text-xs text-muted-foreground font-mono">Block: {event.block?.toString()}</p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(`https://sepolia.etherscan.io/tx/${event.tx}`, '_blank')}
                        className="h-7 text-xs shrink-0"
                      >
                        View <ExternalLink className="w-3 h-3 ml-2" />
                      </Button>
                    </div>
                    {/* Full Transaction Hash */}
                    <div className="mt-2 pt-2 border-t border-border/30">
                      <p className="text-xs text-muted-foreground">Transaction Hash:</p>
                      <p className="text-xs font-mono text-foreground/80 break-all">{event.tx}</p>
                    </div>
                  </div>
                ))}
                {historyEvents.length === 0 && (
                  <p className="text-sm text-muted-foreground">No history events found.</p>
                )}
              </div>
            </GlassCard>
          </div>

          {/* Right Column: Details */}
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
                  <span className="font-mono text-xs">
                    {(property as any).owner.slice(0, 6)}...{(property as any).owner.slice(-4)}
                  </span>
                </div>

                <div className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Eye className="w-4 h-4" /> Status
                  </div>
                  <span className={`px-2 py-1 rounded text-xs font-bold ${StateColors[propertyState]}`}>
                    {PropertyState[propertyState]}
                  </span>
                </div>

                {metadata?.properties?.deed && (
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => window.open(getIPFSUrl(metadata.properties.deed), '_blank')}
                  >
                    <FileText className="w-4 h-4 mr-2" /> View Deed Document
                  </Button>
                )}
              </div>
            </GlassCard>

            {/* Owner Actions */}
            {isOwner && (
              <GlassCard className="p-6 border-primary/20 bg-primary/5">
                <h3 className="font-bold mb-4">Owner Actions</h3>
                <div className="space-y-3">
                  {propertyState === 4 ? (
                    <Link href="/marketplace/my-sales">
                      <Button variant="hero" className="w-full">
                        <Tag className="w-4 h-4 mr-2" /> Manage Sale
                      </Button>
                    </Link>
                  ) : propertyState === 2 ? (
                    <Link href="/dashboard">
                      <Button variant="hero" className="w-full">
                        <Tag className="w-4 h-4 mr-2" /> List for Sale
                      </Button>
                    </Link>
                  ) : (
                    <Link href="/track">
                      <Button variant="outline" className="w-full">
                        <Eye className="w-4 h-4 mr-2" /> Track Progress
                      </Button>
                    </Link>
                  )}
                </div>
              </GlassCard>
            )}
          </div>
        </div>
      </DashboardLayout>
    </StaffRouteGuard>
  );
}

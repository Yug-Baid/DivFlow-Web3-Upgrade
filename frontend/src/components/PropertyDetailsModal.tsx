"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, MapPin, FileText, Image as ImageIcon, User, Info, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { resolveIPFS, getIPFSUrl, PropertyMetadata } from "@/lib/ipfs";
import { UserInfoModal } from "@/components/UserInfoModal";
import Image from "next/image";
import dynamic from 'next/dynamic';

const DynamicMap = dynamic(() => import('@/components/PropertyMap'), {
    ssr: false,
    loading: () => <div className="h-48 w-full bg-secondary/30 animate-pulse rounded-lg" />
});

interface PropertyDetailsModalProps {
    isOpen: boolean;
    onClose: () => void;
    property: {
        propertyId: bigint;
        locationId: bigint;
        revenueDepartmentId: bigint;
        surveyNumber: bigint;
        owner: string;
        area: bigint;
        price: bigint;
        ipfsHash: string;
        state: number;
    } | null;
}

export function PropertyDetailsModal({ isOpen, onClose, property }: PropertyDetailsModalProps) {
    const [metadata, setMetadata] = useState<PropertyMetadata | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [selectedUserAddress, setSelectedUserAddress] = useState<string | null>(null);
    const [selectedImage, setSelectedImage] = useState<string | null>(null); // For image gallery

    // Fetch metadata when property changes
    useEffect(() => {
        const fetchMetadata = async () => {
            if (!property?.ipfsHash) return;
            setIsLoading(true);
            try {
                const { isMetadata, data } = await resolveIPFS(property.ipfsHash);
                if (isMetadata) {
                    setMetadata(data as PropertyMetadata);
                }
            } catch (e) {
                console.error("Error fetching metadata:", e);
            }
            setIsLoading(false);
        };
        if (isOpen && property) {
            fetchMetadata();
        }
    }, [isOpen, property]);


    // Reset when closed
    useEffect(() => {
        if (!isOpen) {
            setMetadata(null);
            setSelectedImage(null);
        }
    }, [isOpen]);

    if (!property) return null;

    return (
        <>
            <AnimatePresence>
                {isOpen && (
                    <>
                        {/* Backdrop */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={onClose}
                            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50"
                        />

                        {/* Modal */}
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="fixed inset-0 z-50 flex items-center justify-center p-4"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="bg-card border border-border/50 rounded-2xl shadow-2xl overflow-hidden w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                                {/* Header */}
                                <div className="p-4 border-b border-border/50 flex justify-between items-center bg-secondary/30 sticky top-0 z-10">
                                    <div>
                                        <h3 className="font-bold text-lg text-foreground">
                                            {metadata?.name || `Property #${property.propertyId.toString()}`}
                                        </h3>
                                        <p className="text-xs text-muted-foreground">
                                            Survey No: {property.surveyNumber.toString()} | Area: {property.area.toString()} sq.ft
                                        </p>
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

                                {isLoading ? (
                                    <div className="flex items-center justify-center p-12">
                                        <Loader2 className="w-8 h-8 animate-spin text-primary" />
                                    </div>
                                ) : (
                                    <div className="p-4 space-y-4">
                                        {/* Main Image - Shows selected or cover */}
                                        {(selectedImage || metadata?.image) && (
                                            <div className="relative aspect-video rounded-lg overflow-hidden border border-border">
                                                <Image
                                                    src={getIPFSUrl(selectedImage || metadata?.image || "")}
                                                    alt={metadata?.name || "Property"}
                                                    fill
                                                    className="object-cover transition-transform duration-300"
                                                    unoptimized
                                                />
                                            </div>
                                        )}

                                        {/* Thumbnail Gallery - Clickable */}
                                        {metadata && (metadata.image || (metadata.properties?.photos && metadata.properties.photos.length > 0)) && (
                                            <div className="grid grid-cols-4 gap-2">
                                                {/* Cover as first thumbnail */}
                                                {metadata.image && (
                                                    <div 
                                                        onClick={() => setSelectedImage(metadata.image)}
                                                        className={`aspect-square relative rounded-md overflow-hidden border-2 cursor-pointer transition-all duration-200 hover:scale-105 ${
                                                            (!selectedImage || selectedImage === metadata.image) 
                                                                ? 'border-primary ring-2 ring-primary/30' 
                                                                : 'border-border hover:border-primary/50'
                                                        }`}
                                                    >
                                                        <Image src={getIPFSUrl(metadata.image)} alt="Cover" fill className="object-cover" unoptimized />
                                                    </div>
                                                )}
                                                {/* Additional photos */}
                                                {metadata.properties?.photos?.map((photo, i) => (
                                                    <div 
                                                        key={i}
                                                        onClick={() => setSelectedImage(photo)}
                                                        className={`aspect-square relative rounded-md overflow-hidden border-2 cursor-pointer transition-all duration-200 hover:scale-105 ${
                                                            selectedImage === photo 
                                                                ? 'border-primary ring-2 ring-primary/30' 
                                                                : 'border-border hover:border-primary/50'
                                                        }`}
                                                    >
                                                        <Image src={getIPFSUrl(photo)} alt={`Photo ${i + 1}`} fill className="object-cover" unoptimized />
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        {/* Description */}
                                        {metadata?.description && (
                                            <div className="p-3 bg-secondary/30 rounded-lg border border-border/50">
                                                <p className="text-sm text-foreground">{metadata.description}</p>
                                            </div>
                                        )}

                                        {/* Location Map */}
                                        {metadata?.properties?.location?.lat && metadata?.properties?.location?.lng && (
                                            <div className="space-y-2">
                                                <h4 className="text-sm font-semibold flex items-center gap-2">
                                                    <MapPin className="w-4 h-4 text-primary" /> Location
                                                </h4>
                                                <div className="h-48 rounded-lg overflow-hidden border border-border/50">
                                                    <DynamicMap
                                                        pos={[metadata.properties.location.lat, metadata.properties.location.lng]}
                                                        zoom={15}
                                                    />
                                                </div>
                                                {metadata.properties.location.address && (
                                                    <p className="text-xs text-muted-foreground p-2 bg-secondary/20 rounded">
                                                        📍 {metadata.properties.location.address}
                                                    </p>
                                                )}
                                            </div>
                                        )}

                                        {/* Property Details Grid */}
                                        <div className="grid grid-cols-2 gap-3 text-sm">
                                            <div className="p-3 bg-secondary/30 rounded-lg border border-border/50">
                                                <span className="text-xs text-muted-foreground block">Location ID</span>
                                                <span className="font-mono">{property.locationId.toString()}</span>
                                            </div>
                                            <div className="p-3 bg-secondary/30 rounded-lg border border-border/50">
                                                <span className="text-xs text-muted-foreground block">Revenue Dept ID</span>
                                                <span className="font-mono">{property.revenueDepartmentId.toString()}</span>
                                            </div>
                                            <div className="p-3 bg-secondary/30 rounded-lg border border-border/50">
                                                <span className="text-xs text-muted-foreground block">Survey Number</span>
                                                <span className="font-mono">{property.surveyNumber.toString()}</span>
                                            </div>
                                            <div className="p-3 bg-secondary/30 rounded-lg border border-border/50">
                                                <span className="text-xs text-muted-foreground block">Area</span>
                                                <span className="font-mono">{property.area.toString()} sq.ft</span>
                                            </div>
                                        </div>

                                        {/* Owner */}
                                        <div className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg border border-border/50">
                                            <div className="flex items-center gap-2">
                                                <User className="w-4 h-4 text-muted-foreground" />
                                                <span className="text-sm text-muted-foreground">Owner</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="font-mono text-xs">
                                                    {property.owner.slice(0, 6)}...{property.owner.slice(-4)}
                                                </span>
                                                <Button
                                                    size="icon"
                                                    variant="ghost"
                                                    className="h-6 w-6"
                                                    onClick={() => setSelectedUserAddress(property.owner)}
                                                >
                                                    <Info className="w-3 h-3" />
                                                </Button>
                                            </div>
                                        </div>

                                        {/* Documents */}
                                        <div className="space-y-2">
                                            <h4 className="text-sm font-semibold">Documents</h4>
                                            <div className="flex gap-2 flex-wrap">
                                                {metadata?.image && (
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => window.open(getIPFSUrl(metadata.image), '_blank')}
                                                    >
                                                        <ImageIcon className="w-4 h-4 mr-2" /> Cover Image
                                                    </Button>
                                                )}
                                                {metadata?.properties?.deed && (
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => window.open(getIPFSUrl(metadata.properties.deed), '_blank')}
                                                    >
                                                        <FileText className="w-4 h-4 mr-2" /> View Deed
                                                    </Button>
                                                )}
                                                {metadata?.properties?.photos?.map((photo, i) => (
                                                    <Button
                                                        key={i}
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => window.open(getIPFSUrl(photo), '_blank')}
                                                    >
                                                        <ImageIcon className="w-4 h-4 mr-2" /> Photo {i + 1}
                                                    </Button>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                )}

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

            {/* Nested User Info Modal */}
            <UserInfoModal
                isOpen={!!selectedUserAddress}
                onClose={() => setSelectedUserAddress(null)}
                userAddress={selectedUserAddress || ""}
            />
        </>
    );
}

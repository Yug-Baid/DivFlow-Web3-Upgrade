"use client";

import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents, Popup, Polygon, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix for default marker icon in Leaflet with Next.js
const iconUrl = 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png';
const iconRetinaUrl = 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png';
const shadowUrl = 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png';

// Create a custom icon instance
const DefaultIcon = L.icon({
    iconUrl,
    iconRetinaUrl,
    shadowUrl,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

// Set default icon for all markers
L.Marker.prototype.options.icon = DefaultIcon;

// Tile layer configurations
const STREET_TILES = {
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
};

const SATELLITE_TILES = {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
};

interface LeafletMapProps {
    onLocationSelect?: (lat: number, lng: number) => void;
    initialLat?: number;
    initialLng?: number;
    readonly?: boolean;
    polygon?: [number, number][]; // Polygon coordinates to display
}

// Component to handle click events on the map
function LocationMarker({ onSelect, initialPos }: { onSelect?: (lat: number, lng: number) => void, initialPos: [number, number] | null }) {
    const [position, setPosition] = useState<L.LatLng | null>(initialPos ? L.latLng(initialPos[0], initialPos[1]) : null);

    const map = useMapEvents({
        click(e) {
            if (onSelect) {
                setPosition(e.latlng);
                onSelect(e.latlng.lat, e.latlng.lng);
                map.flyTo(e.latlng, map.getZoom());
            }
        },
    });

    return position === null ? null : (
        <Marker position={position}>
            <Popup>
                Selected Location <br />
                Lat: {position.lat.toFixed(4)} <br />
                Lng: {position.lng.toFixed(4)}
            </Popup>
        </Marker>
    );
}

// Component to fit map bounds to polygon
function FitPolygonBounds({ polygon }: { polygon: [number, number][] }) {
    const map = useMap();
    
    useEffect(() => {
        if (polygon && polygon.length > 2) {
            const bounds = L.latLngBounds(polygon.map(coord => L.latLng(coord[0], coord[1])));
            map.fitBounds(bounds, { padding: [50, 50] });
        }
    }, [map, polygon]);
    
    return null;
}

// Layer Toggle Component - Street/Satellite view switch
function LayerToggle({ 
    isSatellite, 
    onToggle 
}: { 
    isSatellite: boolean; 
    onToggle: (satellite: boolean) => void;
}) {
    return (
        <div className="absolute bottom-4 left-4 z-[1000] flex gap-1 bg-white/95 dark:bg-zinc-900/95 rounded-lg shadow-lg p-1 border border-border">
            <button
                type="button"
                onClick={() => onToggle(false)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                    !isSatellite 
                        ? 'bg-primary text-primary-foreground shadow-sm' 
                        : 'bg-transparent text-muted-foreground hover:bg-muted'
                }`}
            >
                Street
            </button>
            <button
                type="button"
                onClick={() => onToggle(true)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                    isSatellite 
                        ? 'bg-primary text-primary-foreground shadow-sm' 
                        : 'bg-transparent text-muted-foreground hover:bg-muted'
                }`}
            >
                Satellite
            </button>
        </div>
    );
}

// Dynamic Tile Layer that changes based on view mode
function DynamicTileLayer({ isSatellite }: { isSatellite: boolean }) {
    const tiles = isSatellite ? SATELLITE_TILES : STREET_TILES;
    return <TileLayer url={tiles.url} attribution={tiles.attribution} />;
}

export default function LeafletMap({ onLocationSelect, initialLat, initialLng, readonly = false, polygon }: LeafletMapProps) {
    const [isSatellite, setIsSatellite] = useState(false);
    
    // Calculate center from polygon if available, otherwise use initial coords
    const getCenter = (): [number, number] => {
        if (polygon && polygon.length > 0) {
            const avgLat = polygon.reduce((sum, c) => sum + c[0], 0) / polygon.length;
            const avgLng = polygon.reduce((sum, c) => sum + c[1], 0) / polygon.length;
            return [avgLat, avgLng];
        }
        if (initialLat && initialLng) {
            return [initialLat, initialLng];
        }
        return [20.5937, 78.9629]; // Default: India center
    };

    const center = getCenter();
    const zoom = (polygon && polygon.length > 0) || (initialLat && initialLng) ? 16 : 5;
    const hasPolygon = polygon && polygon.length >= 3;

    return (
        <div className="h-[400px] w-full rounded-lg overflow-hidden border border-border z-0 relative">
            <MapContainer center={center} zoom={zoom} scrollWheelZoom={true} style={{ height: '100%', width: '100%' }}>
                {/* Dynamic tile layer - switches between street and satellite */}
                <DynamicTileLayer isSatellite={isSatellite} />
                
                {/* Interactive mode - for selecting location */}
                {!readonly && (
                    <LocationMarker
                        onSelect={onLocationSelect}
                        initialPos={initialLat && initialLng ? [initialLat, initialLng] : null}
                    />
                )}
                
                {/* Readonly mode with polygon - show the property boundary */}
                {readonly && hasPolygon && (
                    <>
                        <Polygon 
                            positions={polygon!.map(coord => [coord[0], coord[1]] as [number, number])}
                            pathOptions={{
                                color: '#3b82f6',
                                fillColor: '#3b82f6',
                                fillOpacity: 0.3,
                                weight: 2
                            }}
                        >
                            <Popup>Property Boundary</Popup>
                        </Polygon>
                        <FitPolygonBounds polygon={polygon!} />
                    </>
                )}
                
                {/* Readonly mode without polygon - show marker for backward compatibility */}
                {readonly && !hasPolygon && initialLat && initialLng && (
                    <Marker position={[initialLat, initialLng]}>
                        <Popup>
                            Property Location
                        </Popup>
                    </Marker>
                )}
                
                {/* Street/Satellite view toggle */}
                <LayerToggle isSatellite={isSatellite} onToggle={setIsSatellite} />
            </MapContainer>
        </div>
    );
}

"use client";

import { useState, useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polygon, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

// Fix for default marker icon in Leaflet with Next.js
const iconUrl = "https://unpkg.com/leaflet@1.9.3/dist/images/marker-icon.png";
const iconRetinaUrl = "https://unpkg.com/leaflet@1.9.3/dist/images/marker-icon-2x.png";
const shadowUrl = "https://unpkg.com/leaflet@1.9.3/dist/images/marker-shadow.png";

// Create a custom icon instance
const customIcon = new L.Icon({
    iconUrl: iconUrl,
    iconRetinaUrl: iconRetinaUrl,
    shadowUrl: shadowUrl,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

// Tile layer configurations
const STREET_TILES = {
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
};

const SATELLITE_TILES = {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
};

interface MapProps {
    pos: [number, number];
    zoom?: number;
    polygon?: [number, number][]; // Polygon coordinates to display
}

// Layer Toggle Component
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

// Dynamic Tile Layer
function DynamicTileLayer({ isSatellite }: { isSatellite: boolean }) {
    const tiles = isSatellite ? SATELLITE_TILES : STREET_TILES;
    return <TileLayer url={tiles.url} attribution={tiles.attribution} />;
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

const Map = ({ pos, zoom = 13, polygon }: MapProps) => {
    const [isSatellite, setIsSatellite] = useState(false);
    const hasPolygon = polygon && polygon.length >= 3;
    
    // Calculate center from polygon if available
    const center: [number, number] = hasPolygon 
        ? [
            polygon!.reduce((sum, c) => sum + c[0], 0) / polygon!.length,
            polygon!.reduce((sum, c) => sum + c[1], 0) / polygon!.length
          ]
        : pos;
    
    return (
        <div className="relative h-full w-full">
            <MapContainer
                center={center}
                zoom={hasPolygon ? 16 : zoom}
                scrollWheelZoom={true}
                style={{ height: "100%", width: "100%" }}
            >
                <DynamicTileLayer isSatellite={isSatellite} />
                
                {/* Show polygon if available */}
                {hasPolygon && (
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
                
                {/* Show marker if no polygon */}
                {!hasPolygon && (
                    <Marker position={pos} icon={customIcon}>
                        <Popup>
                            Location <br /> {pos[0].toFixed(4)}, {pos[1].toFixed(4)}
                        </Popup>
                    </Marker>
                )}
                
                {/* Street/Satellite toggle */}
                <LayerToggle isSatellite={isSatellite} onToggle={setIsSatellite} />
            </MapContainer>
        </div>
    );
};

export default Map;

"use client";

import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents, Popup } from 'react-leaflet';
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

interface LeafletMapProps {
    onLocationSelect?: (lat: number, lng: number) => void;
    initialLat?: number;
    initialLng?: number;
    readonly?: boolean;
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

export default function LeafletMap({ onLocationSelect, initialLat, initialLng, readonly = false }: LeafletMapProps) {
    // Default to a central location (e.g., India center) or provided initial coords
    const center: [number, number] = initialLat && initialLng ? [initialLat, initialLng] : [20.5937, 78.9629];
    const zoom = initialLat && initialLng ? 13 : 5;

    return (
        <div className="h-[400px] w-full rounded-lg overflow-hidden border border-border z-0 relative">
            <MapContainer center={center} zoom={zoom} scrollWheelZoom={true} style={{ height: '100%', width: '100%' }}>
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                {!readonly && (
                    <LocationMarker
                        onSelect={onLocationSelect}
                        initialPos={initialLat && initialLng ? [initialLat, initialLng] : null}
                    />
                )}
                {readonly && initialLat && initialLng && (
                    <Marker position={[initialLat, initialLng]}>
                        <Popup>
                            Property Location
                        </Popup>
                    </Marker>
                )}
            </MapContainer>
        </div>
    );
}

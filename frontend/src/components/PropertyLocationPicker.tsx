// Property Location Picker Component
// Interactive map for selecting property location with reverse geocoding

'use client';

import { useState, useCallback, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Loader2, MapPin, Navigation } from 'lucide-react';
import { Button } from '@/components/ui/button';

// Fix Leaflet default marker icon issue in Next.js
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png'
});

interface LocationData {
  lat: number;
  lng: number;
  address: string;
  formatted?: string;
  components?: {
    street?: string;
    city?: string;
    state?: string;
    postcode?: string;
    country?: string;
  };
}

interface PropertyLocationPickerProps {
  onLocationSelect: (data: LocationData) => void;
  initialPosition?: [number, number];
  initialAddress?: string;
  height?: string;
}

// Inner component that uses map events
function LocationMarker({ onLocationSelect, setLoading }: {
  onLocationSelect: (data: LocationData) => void;
  setLoading: (loading: boolean) => void;
}) {
  const [position, setPosition] = useState<[number, number] | null>(null);
  const [address, setAddress] = useState<string>('');

  const map = useMapEvents({
    click: async (e) => {
      const { lat, lng } = e.latlng;
      setPosition([lat, lng]);
      setAddress('');
      setLoading(true);

      try {
        // Call our geocoding API
        const response = await fetch(`/api/geocode?lat=${lat}&lng=${lng}`);
        const data = await response.json();

        if (data.success) {
          const locationData: LocationData = {
            lat,
            lng,
            address: data.address,
            formatted: data.formatted,
            components: data.components
          };
          
          setAddress(data.address);
          onLocationSelect(locationData);
        } else {
          // Use fallback if available
          const fallbackAddress = data.fallback?.address || `Location: ${lat.toFixed(6)}, ${lng.toFixed(6)}`;
          setAddress(fallbackAddress);
          onLocationSelect({
            lat,
            lng,
            address: fallbackAddress
          });
        }
      } catch (error) {
        console.error('Error fetching address:', error);
        const fallbackAddress = `Location: ${lat.toFixed(6)}, ${lng.toFixed(6)}`;
        setAddress(fallbackAddress);
        onLocationSelect({
          lat,
          lng,
          address: fallbackAddress
        });
      } finally {
        setLoading(false);
      }
    }
  });

  if (!position) return null;

  return (
    <Marker position={position}>
      {address && (
        <Popup>
          <div className="text-sm">
            <strong>Selected Location</strong>
            <p className="mt-1 text-xs">{address}</p>
          </div>
        </Popup>
      )}
    </Marker>
  );
}

export function PropertyLocationPicker({
  onLocationSelect,
  initialPosition = [19.0760, 72.8777], // Mumbai default
  initialAddress = '',
  height = '400px'
}: PropertyLocationPickerProps) {
  const [loading, setLoading] = useState(false);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [mapCenter, setMapCenter] = useState<[number, number]>(initialPosition);

  // Get user's current location
  const getUserLocation = useCallback(() => {
    setLoading(true);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setUserLocation([latitude, longitude]);
          setMapCenter([latitude, longitude]);
          setLoading(false);
        },
        (error) => {
          console.error('Error getting location:', error);
          setLoading(false);
        }
      );
    } else {
      console.error('Geolocation not supported');
      setLoading(false);
    }
  }, []);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium flex items-center gap-2">
          <MapPin className="w-4 h-4 text-primary" />
          Property Location
        </label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={getUserLocation}
          disabled={loading}
          className="text-xs"
        >
          {loading ? (
            <>
              <Loader2 className="w-3 h-3 mr-1 animate-spin" />
              Getting location...
            </>
          ) : (
            <>
              <Navigation className="w-3 h-3 mr-1" />
              Use My Location
            </>
          )}
        </Button>
      </div>

      <p className="text-xs text-muted-foreground">
        Click on the map to set the property location. The address will be filled automatically.
      </p>

      <div 
        className="rounded-lg overflow-hidden border-2 border-border hover:border-primary/50 transition-colors shadow-lg"
        style={{ height }}
      >
        <MapContainer
          center={mapCenter}
          zoom={13}
          style={{ height: '100%', width: '100%' }}
          scrollWheelZoom={true}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <LocationMarker 
            onLocationSelect={onLocationSelect}
            setLoading={setLoading}
          />
        </MapContainer>
      </div>

      {loading && (
        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground bg-muted/50 p-2 rounded">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Fetching address...</span>
        </div>
      )}

      <div className="text-xs text-muted-foreground bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg border border-blue-200 dark:border-blue-800">
        <strong className="text-blue-700 dark:text-blue-400">💡 Tip:</strong> Zoom in for more precise location selection. 
        You can edit the address after it's auto-filled.
      </div>
    </div>
  );
}

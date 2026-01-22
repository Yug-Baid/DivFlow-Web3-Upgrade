// Property Area Selector Component
// Interactive map for selecting property area via polygon drawing with real-time area calculation

'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { MapContainer, TileLayer, FeatureGroup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-draw/dist/leaflet.draw.css';
import 'leaflet-draw';
import { Loader2, MapPin, Trash2, Pencil, Pentagon, Layers } from 'lucide-react';
import { Button } from '@/components/ui/button';

// Fix Leaflet default marker icon issue in Next.js
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png'
});

interface PropertyAreaSelectorProps {
  onAreaSelect: (areaSqFt: number, polygonCoords: [number, number][]) => void;
  onLocationSelect?: (lat: number, lng: number, address?: string) => void;
  initialPosition?: [number, number];
  height?: string;
}

// Tile layer URLs
const STREET_TILES = {
  url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
};

const SATELLITE_TILES = {
  url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
  attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
};

// Calculate area of polygon in square meters using geodetic formula
function calculatePolygonArea(latlngs: L.LatLng[]): number {
  if (latlngs.length < 3) return 0;
  
  // Convert to radians
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  
  // Earth's radius in meters
  const R = 6371000;
  
  let total = 0;
  const points = [...latlngs, latlngs[0]]; // Close the polygon
  
  for (let i = 0; i < points.length - 1; i++) {
    const p1 = points[i];
    const p2 = points[i + 1];
    
    const lat1 = toRad(p1.lat);
    const lat2 = toRad(p2.lat);
    const lng1 = toRad(p1.lng);
    const lng2 = toRad(p2.lng);
    
    total += (lng2 - lng1) * (2 + Math.sin(lat1) + Math.sin(lat2));
  }
  
  total = Math.abs(total * R * R / 2);
  return total;
}

// Convert square meters to square feet
function sqMToSqFt(sqM: number): number {
  return sqM * 10.7639;
}

// Format area for display
function formatArea(areaSqM: number): string {
  if (areaSqM < 1000) {
    return `${areaSqM.toFixed(1)} m²`;
  } else if (areaSqM < 10000) {
    return `${(areaSqM / 1000).toFixed(2)} thousand m²`;
  } else {
    return `${(areaSqM / 10000).toFixed(2)} hectares`;
  }
}

// Draw Control Component
function DrawControl({ 
  onPolygonCreated, 
  onPolygonEdited, 
  onPolygonDeleted,
  featureGroupRef 
}: { 
  onPolygonCreated: (layer: L.Polygon) => void;
  onPolygonEdited: () => void;
  onPolygonDeleted: () => void;
  featureGroupRef: React.RefObject<L.FeatureGroup | null>;
}) {
  const map = useMap();
  const drawControlRef = useRef<L.Control.Draw | null>(null);

  useEffect(() => {
    if (!featureGroupRef.current) return;

    // Create draw control
    const drawControl = new L.Control.Draw({
      position: 'topleft',
      draw: {
        polygon: {
          allowIntersection: false,
          drawError: {
            color: '#e1e4e8',
            message: '<strong>Error:</strong> Shape edges cannot cross!'
          },
          shapeOptions: {
            color: '#3b82f6',
            fillColor: '#3b82f6',
            fillOpacity: 0.3,
            weight: 2
          },
          showArea: true,
          metric: true
        },
        polyline: false,
        circle: false,
        rectangle: false,
        marker: false,
        circlemarker: false
      },
      edit: {
        featureGroup: featureGroupRef.current,
        remove: true as any,
        edit: true as any
      }
    });

    drawControlRef.current = drawControl;
    map.addControl(drawControl);

    // Event handlers
    const handleCreated = (e: L.LeafletEvent) => {
      const event = e as L.DrawEvents.Created;
      const layer = event.layer as L.Polygon;
      
      // Clear existing polygons (only allow one at a time)
      featureGroupRef.current?.clearLayers();
      featureGroupRef.current?.addLayer(layer);
      
      onPolygonCreated(layer);
    };

    const handleEdited = () => {
      onPolygonEdited();
    };

    const handleDeleted = () => {
      onPolygonDeleted();
    };

    map.on(L.Draw.Event.CREATED, handleCreated);
    map.on(L.Draw.Event.EDITED, handleEdited);
    map.on(L.Draw.Event.DELETED, handleDeleted);

    return () => {
      map.off(L.Draw.Event.CREATED, handleCreated);
      map.off(L.Draw.Event.EDITED, handleEdited);
      map.off(L.Draw.Event.DELETED, handleDeleted);
      if (drawControlRef.current) {
        map.removeControl(drawControlRef.current);
      }
    };
  }, [map, featureGroupRef, onPolygonCreated, onPolygonEdited, onPolygonDeleted]);

  return null;
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

// Dynamic Tile Layer that changes based on view mode
function DynamicTileLayer({ isSatellite }: { isSatellite: boolean }) {
  const tiles = isSatellite ? SATELLITE_TILES : STREET_TILES;
  return <TileLayer url={tiles.url} attribution={tiles.attribution} />;
}

export function PropertyAreaSelector({
  onAreaSelect,
  onLocationSelect,
  initialPosition = [19.0760, 72.8777], // Mumbai default
  height = '450px'
}: PropertyAreaSelectorProps) {
  const [loading, setLoading] = useState(false);
  const [isSatellite, setIsSatellite] = useState(false);
  const [currentArea, setCurrentArea] = useState<number>(0);
  const [polygonCoords, setPolygonCoords] = useState<[number, number][]>([]);
  const featureGroupRef = useRef<L.FeatureGroup>(null);
  const currentPolygonRef = useRef<L.Polygon | null>(null);

  // Handle polygon creation
  const handlePolygonCreated = useCallback(async (layer: L.Polygon) => {
    currentPolygonRef.current = layer;
    const latlngs = layer.getLatLngs()[0] as L.LatLng[];
    const areaSqM = calculatePolygonArea(latlngs);
    const areaSqFt = sqMToSqFt(areaSqM);
    const coords: [number, number][] = latlngs.map(ll => [ll.lat, ll.lng]);
    
    setCurrentArea(areaSqM);
    setPolygonCoords(coords);
    onAreaSelect(Math.round(areaSqFt), coords);
    
    // Calculate center for location
    if (onLocationSelect && coords.length > 0) {
      const centerLat = coords.reduce((sum, c) => sum + c[0], 0) / coords.length;
      const centerLng = coords.reduce((sum, c) => sum + c[1], 0) / coords.length;
      
      // Fetch address using geocoding API
      setLoading(true);
      try {
        const response = await fetch(`/api/geocode?lat=${centerLat}&lng=${centerLng}`);
        const data = await response.json();
        
        if (data.success) {
          onLocationSelect(centerLat, centerLng, data.address);
        } else {
          // Fallback to coordinates if geocoding fails
          onLocationSelect(centerLat, centerLng, `Location: ${centerLat.toFixed(6)}, ${centerLng.toFixed(6)}`);
        }
      } catch (error) {
        console.error('Error fetching address:', error);
        onLocationSelect(centerLat, centerLng, `Location: ${centerLat.toFixed(6)}, ${centerLng.toFixed(6)}`);
      } finally {
        setLoading(false);
      }
    }
  }, [onAreaSelect, onLocationSelect]);

  // Handle polygon edit
  const handlePolygonEdited = useCallback(() => {
    if (!currentPolygonRef.current) return;
    
    const latlngs = currentPolygonRef.current.getLatLngs()[0] as L.LatLng[];
    const areaSqM = calculatePolygonArea(latlngs);
    const areaSqFt = sqMToSqFt(areaSqM);
    const coords: [number, number][] = latlngs.map(ll => [ll.lat, ll.lng]);
    
    setCurrentArea(areaSqM);
    setPolygonCoords(coords);
    onAreaSelect(Math.round(areaSqFt), coords);
  }, [onAreaSelect]);

  // Handle polygon deletion
  const handlePolygonDeleted = useCallback(() => {
    currentPolygonRef.current = null;
    setCurrentArea(0);
    setPolygonCoords([]);
    onAreaSelect(0, []);
  }, [onAreaSelect]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium flex items-center gap-2">
          <Pentagon className="w-4 h-4 text-primary" />
          Draw Property Boundary
        </label>
        {currentArea > 0 && (
          <span className="text-xs font-medium text-green-600 dark:text-green-400 flex items-center gap-1">
            ✓ Area: {formatArea(currentArea)} ({Math.round(sqMToSqFt(currentArea)).toLocaleString()} sq.ft)
          </span>
        )}
      </div>

      <p className="text-xs text-muted-foreground">
        Use the polygon tool (⬠) on the left to draw your property boundary. The area will be calculated automatically.
      </p>

      <div 
        className="rounded-lg overflow-hidden border-2 border-border hover:border-primary/50 transition-colors shadow-lg relative"
        style={{ height }}
      >
        <MapContainer
          center={initialPosition}
          zoom={16}
          style={{ height: '100%', width: '100%' }}
          scrollWheelZoom={true}
        >
          <DynamicTileLayer isSatellite={isSatellite} />
          
          <FeatureGroup ref={featureGroupRef}>
            <DrawControl
              featureGroupRef={featureGroupRef}
              onPolygonCreated={handlePolygonCreated}
              onPolygonEdited={handlePolygonEdited}
              onPolygonDeleted={handlePolygonDeleted}
            />
          </FeatureGroup>
          
          <LayerToggle isSatellite={isSatellite} onToggle={setIsSatellite} />
        </MapContainer>

        {/* Area display overlay */}
        {currentArea > 0 && (
          <div className="absolute top-4 right-4 z-[1000] bg-white/95 dark:bg-zinc-900/95 rounded-lg shadow-lg p-3 border border-border">
            <div className="text-xs text-muted-foreground mb-1">Selected Area</div>
            <div className="text-lg font-bold text-primary">{formatArea(currentArea)}</div>
            <div className="text-sm text-muted-foreground">
              ≈ {Math.round(sqMToSqFt(currentArea)).toLocaleString()} sq.ft
            </div>
          </div>
        )}
      </div>

      {loading && (
        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground bg-muted/50 p-2 rounded">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Processing...</span>
        </div>
      )}

      <div className="text-xs text-muted-foreground bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg border border-blue-200 dark:border-blue-800">
        <strong className="text-blue-700 dark:text-blue-400">💡 Tips:</strong>
        <ul className="mt-1 space-y-1 list-disc list-inside">
          <li>Click the <strong>polygon icon (⬠)</strong> to start drawing</li>
          <li>Click points to create vertices, double-click or click first point to finish</li>
          <li>Use <strong>edit tool (✏️)</strong> to adjust vertices after drawing</li>
          <li>Switch to <strong>Satellite view</strong> for better visibility of property boundaries</li>
        </ul>
      </div>
    </div>
  );
}

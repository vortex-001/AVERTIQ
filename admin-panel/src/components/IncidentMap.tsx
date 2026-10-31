import React, { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import { Incident, SilentZoneCell } from '../types';

interface IncidentMapProps {
  incidents: Incident[];
  silentZones?: SilentZoneCell[];
  selectedIncidentId?: string | null;
  onSelectIncident?: (incident: Incident) => void;
  showSilentZones?: boolean;
  center?: [number, number];
  zoom?: number;
  searchRadiusKm?: number;
}

export const IncidentMap: React.FC<IncidentMapProps> = ({
  incidents,
  silentZones = [],
  selectedIncidentId,
  onSelectIncident,
  showSilentZones = true,
  center = [75.8573, 30.9010], // [lon, lat] for Ludhiana
  zoom = 12,
  searchRadiusKm,
}) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);

  useEffect(() => {
    if (!mapContainer.current || mapInstance.current) return;

    const map = new maplibregl.Map({
      container: mapContainer.current,
      style: {
        version: 8,
        sources: {
          'osm-tiles': {
            type: 'raster',
            tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
            tileSize: 256,
            attribution: '© OpenStreetMap contributors',
          },
        },
        layers: [
          {
            id: 'osm-tiles-layer',
            type: 'raster',
            source: 'osm-tiles',
            minzoom: 0,
            maxzoom: 19,
          },
        ],
      },
      center: center,
      zoom: zoom,
    });

    map.addControl(new maplibregl.NavigationControl({ showCompass: true }), 'top-right');

    mapInstance.current = map;

    return () => {
      map.remove();
      mapInstance.current = null;
    };
  }, []);

  // Update center if props change
  useEffect(() => {
    if (!mapInstance.current) return;
    mapInstance.current.setCenter(center);
  }, [center[0], center[1]]);

  // Render Markers
  useEffect(() => {
    if (!mapInstance.current) return;
    const map = mapInstance.current;

    // Clear old markers
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    incidents.forEach((incident) => {
      if (incident.latitude === null || incident.longitude === null) return;

      const isSelected = incident.id === selectedIncidentId;
      const el = document.createElement('div');
      el.className = 'cursor-pointer transition-transform hover:scale-125';

      // Pin Color according to priority
      let pinColor = '#3b82f6'; // low / blue
      let ringColor = 'rgba(59, 130, 246, 0.4)';
      if (incident.priority_level === 'high') {
        pinColor = '#ef4444'; // red
        ringColor = 'rgba(239, 68, 68, 0.5)';
      } else if (incident.priority_level === 'medium') {
        pinColor = '#f59e0b'; // orange
        ringColor = 'rgba(245, 158, 11, 0.4)';
      } else if (incident.priority_level === 'unconfirmed') {
        pinColor = '#94a3b8'; // gray
        ringColor = 'rgba(148, 163, 184, 0.3)';
      }

      el.innerHTML = `
        <div style="position: relative; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center;">
          ${
            incident.priority_level === 'high'
              ? `<div style="position: absolute; width: 34px; height: 34px; border-radius: 50%; background: ${ringColor}; animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>`
              : ''
          }
          <div style="
            width: ${isSelected ? '28px' : '22px'};
            height: ${isSelected ? '28px' : '22px'};
            background: ${pinColor};
            border: 2px solid #ffffff;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 4px 10px rgba(0,0,0,0.5);
            color: #ffffff;
            font-size: 11px;
            font-weight: bold;
          ">
            ${incident.report_count > 1 ? incident.report_count : '•'}
          </div>
        </div>
      `;

      el.addEventListener('click', () => {
        if (onSelectIncident) {
          onSelectIncident(incident);
        }
      });

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([incident.longitude, incident.latitude])
        .addTo(map);

      markersRef.current.push(marker);
    });
  }, [incidents, selectedIncidentId, onSelectIncident]);

  // Render Silent Zones Grid overlay using GeoJSON
  useEffect(() => {
    if (!mapInstance.current) return;
    const map = mapInstance.current;

    const sourceId = 'silent-zones-source';
    const fillLayerId = 'silent-zones-fill';
    const lineLayerId = 'silent-zones-line';

    const updateLayers = () => {
      const geojson: GeoJSON.FeatureCollection = {
        type: 'FeatureCollection',
        features: (showSilentZones ? silentZones : []).map((cell) => ({
          type: 'Feature',
          properties: {
            id: cell.id,
            cell_code: cell.cell_code,
            risk_category: cell.risk_category,
            risk_score: cell.silent_zone_risk,
            hazard_score: cell.hazard_score,
            color:
              cell.risk_category === 'critical'
                ? '#dc2626'
                : cell.risk_category === 'high'
                ? '#ea580c'
                : cell.risk_category === 'moderate'
                ? '#eab308'
                : '#0284c7',
          },
          geometry: {
            type: 'Polygon',
            coordinates: [
              [
                [cell.min_lon, cell.min_lat],
                [cell.max_lon, cell.min_lat],
                [cell.max_lon, cell.max_lat],
                [cell.min_lon, cell.max_lat],
                [cell.min_lon, cell.min_lat],
              ],
            ],
          },
        })),
      };

      if (map.getSource(sourceId)) {
        (map.getSource(sourceId) as maplibregl.GeoJSONSource).setData(geojson);
      } else if (map.isStyleLoaded()) {
        map.addSource(sourceId, { type: 'geojson', data: geojson });

        map.addLayer({
          id: fillLayerId,
          type: 'fill',
          source: sourceId,
          paint: {
            'fill-color': ['get', 'color'],
            'fill-opacity': 0.22,
          },
        });

        map.addLayer({
          id: lineLayerId,
          type: 'line',
          source: sourceId,
          paint: {
            'line-color': ['get', 'color'],
            'line-width': 1.8,
            'line-dasharray': [2, 2],
          },
        });
      }
    };

    if (map.isStyleLoaded()) {
      updateLayers();
    } else {
      map.once('load', updateLayers);
    }
  }, [silentZones, showSilentZones]);

  return (
    <div className="relative w-full h-full rounded-xl overflow-hidden border border-slate-800 shadow-xl">
      <div ref={mapContainer} className="w-full h-full min-h-[420px]" />

      {/* Floating Map Legend */}
      <div className="absolute bottom-4 left-4 glass-panel p-3 rounded-lg text-xs space-y-1.5 pointer-events-auto shadow-lg z-10">
        <div className="font-semibold text-slate-200 border-b border-slate-700/60 pb-1 flex items-center justify-between space-x-3">
          <span>Operational Legend</span>
          <span className="text-[10px] text-slate-400 font-mono">Ludhiana Demo</span>
        </div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[11px] text-slate-300">
          <div className="flex items-center space-x-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
            <span>High Priority</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
            <span>Medium Priority</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
            <span>Low Priority</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-slate-400" />
            <span>Unconfirmed</span>
          </div>
        </div>
        {showSilentZones && (
          <div className="border-t border-slate-700/60 pt-1 mt-1 text-[10px] text-slate-400 flex items-center space-x-2">
            <span className="w-3 h-2 border border-dashed border-red-500 bg-red-500/20 rounded-sm" />
            <span>Silent Zone Deficit Overlay</span>
          </div>
        )}
      </div>
    </div>
  );
};

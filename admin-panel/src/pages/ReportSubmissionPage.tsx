import React, { useState, useEffect, useRef } from 'react';
import { api } from '../services/api';
import maplibregl from 'maplibre-gl';
import {
  Send,
  MapPin,
  AlertTriangle,
  CheckCircle2,
  Users,
  Image as ImageIcon,
  ShieldAlert,
  HelpCircle,
  RefreshCw,
  Info,
} from 'lucide-react';
import { Report } from '../types';

export const ReportSubmissionPage: React.FC = () => {
  const [description, setDescription] = useState('');
  const [incidentType, setIncidentType] = useState('flood');
  const [locationDesc, setLocationDesc] = useState('');
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [affectedCount, setAffectedCount] = useState<string>('');
  const [vulnerableGroups, setVulnerableGroups] = useState('');
  const [resourceRequests, setResourceRequests] = useState('');
  const [imageUrl, setImageUrl] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [submittedReport, setSubmittedReport] = useState<Report | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Map state for coordinate picking
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<maplibregl.Map | null>(null);
  const markerRef = useRef<maplibregl.Marker | null>(null);

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
      center: [75.8573, 30.9010], // Ludhiana
      zoom: 11,
    });

    map.addControl(new maplibregl.NavigationControl(), 'top-right');

    map.on('click', (e) => {
      const { lng, lat } = e.lngLat;
      const roundedLat = parseFloat(lat.toFixed(5));
      const roundedLng = parseFloat(lng.toFixed(5));
      setLatitude(roundedLat);
      setLongitude(roundedLng);

      if (markerRef.current) {
        markerRef.current.setLngLat([roundedLng, roundedLat]);
      } else {
        const el = document.createElement('div');
        el.className = 'w-6 h-6 bg-red-600 rounded-full border-2 border-white shadow-lg flex items-center justify-center animate-bounce';
        el.innerHTML = '<div class="w-2 h-2 bg-white rounded-full"></div>';
        markerRef.current = new maplibregl.Marker({ element: el })
          .setLngLat([roundedLng, roundedLat])
          .addTo(map);
      }
    });

    mapInstance.current = map;

    return () => {
      map.remove();
      mapInstance.current = null;
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!description.trim()) {
      setErrorMsg('Please describe the emergency incident.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        original_text: description.trim(),
        source_channel: 'web',
        latitude: latitude !== null ? latitude : undefined,
        longitude: longitude !== null ? longitude : undefined,
        location_description: locationDesc.trim() || undefined,
        affected_people_count: affectedCount ? parseInt(affectedCount, 10) : undefined,
        vulnerable_groups: vulnerableGroups.trim() || undefined,
        resource_requests: resourceRequests.trim() || undefined,
        image_url: imageUrl.trim() || undefined,
      };

      const res = await api.submitReport(payload);
      setSubmittedReport(res);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to submit report. Please retry.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = () => {
    setDescription('');
    setLocationDesc('');
    setLatitude(null);
    setLongitude(null);
    setAffectedCount('');
    setVulnerableGroups('');
    setResourceRequests('');
    setImageUrl('');
    setSubmittedReport(null);
    setErrorMsg(null);
    if (markerRef.current) {
      markerRef.current.remove();
      markerRef.current = null;
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center space-x-3">
            <span className="p-2.5 rounded-xl bg-[#EF3038]/10 text-[#EF3038] border border-[#EF3038]/20">
              <ShieldAlert className="w-6 h-6" />
            </span>
            <div>
              <h1 className="text-2xl font-black text-white tracking-tight">
                Analysed Reports & Intake
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">
                Ingested emergency intelligence & field reports • Verified by AI triage engine & emergency coordinators
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2 text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 px-3 py-1.5 rounded-lg">
          <Info className="w-4 h-4 shrink-0" />
          <span>Multilingual: Supports English, Hindi, Punjabi & Hinglish</span>
        </div>
      </div>

      {submittedReport ? (
        <div className="bg-slate-900 border border-emerald-500/30 rounded-2xl p-6 sm:p-8 space-y-6 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 to-cyan-500" />
          
          <div className="flex items-center space-x-3 text-emerald-400">
            <CheckCircle2 className="w-8 h-8" />
            <div>
              <h2 className="text-xl font-bold text-white">Emergency Report Registered</h2>
              <p className="text-xs text-slate-400">Reference Token: #{submittedReport.id}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-950/60 p-4 rounded-xl border border-slate-800/80 text-xs">
            <div>
              <span className="text-slate-400">Assigned Incident Cluster:</span>
              <p className="text-slate-200 font-medium mt-0.5">
                {submittedReport.incident_id ? `#${submittedReport.incident_id.slice(0, 8)}` : 'Queued for Clustering'}
              </p>
            </div>
            <div>
              <span className="text-slate-400">Location Status:</span>
              <p className="text-slate-200 font-medium mt-0.5 flex items-center space-x-1">
                <MapPin className="w-3.5 h-3.5 text-cyan-400" />
                <span>
                  {submittedReport.latitude && submittedReport.longitude
                    ? `${submittedReport.latitude.toFixed(4)}, ${submittedReport.longitude.toFixed(4)} (${submittedReport.location_source})`
                    : 'Unconfirmed (In coordinator queue)'}
                </span>
              </p>
            </div>
            <div>
              <span className="text-slate-400">Extracted Language:</span>
              <p className="text-slate-200 font-medium mt-0.5 uppercase tracking-wider">
                {submittedReport.language_mixture || submittedReport.language || 'English'}
              </p>
            </div>
            <div>
              <span className="text-slate-400">Report Channel:</span>
              <p className="text-slate-200 font-medium mt-0.5 capitalize">
                Web Form Portal
              </p>
            </div>
          </div>

          <div className="p-4 bg-slate-800/40 rounded-xl border border-slate-700/60">
            <h4 className="text-xs font-semibold text-slate-300 mb-1">Submitted Description:</h4>
            <p className="text-sm text-slate-100 italic">"{submittedReport.original_text}"</p>
          </div>

          <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg text-xs text-amber-300">
            <strong>Decision-Support Notice:</strong> Avertiq is an AI-assisted coordinator platform.
            Emergency reports are triaged and presented with environmental evidence to human emergency coordinators for review and action.
          </div>

          <button
            onClick={handleReset}
            className="w-full sm:w-auto px-5 py-2.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-medium text-xs transition-all flex items-center justify-center space-x-2"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Submit Another Emergency Report</span>
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          {errorMsg && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-xs flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Incident Type & Description */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 space-y-4">
            <h2 className="text-sm font-bold text-slate-200 uppercase tracking-wider flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
              <span>1. Incident Details</span>
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Incident Category
                </label>
                <select
                  value={incidentType}
                  onChange={(e) => setIncidentType(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                >
                  <option value="flood">Flood / Inundation</option>
                  <option value="fire">Fire / Blast</option>
                  <option value="earthquake">Earthquake</option>
                  <option value="cyclone">Cyclone / Storm</option>
                  <option value="landslide">Landslide</option>
                  <option value="other">Other Emergency</option>
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Estimated Affected Individuals
                </label>
                <input
                  type="number"
                  min="0"
                  placeholder="e.g. 15 (leave blank if uncertain)"
                  value={affectedCount}
                  onChange={(e) => setAffectedCount(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-medium text-slate-300">
                  Incident Description <span className="text-red-400">*</span>
                </label>
                <span className="text-[10px] text-slate-400">
                  Type in Hindi, Punjabi, Hinglish, or English
                </span>
              </div>
              <textarea
                required
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Examples:
• Flood aa gaya hai, pul ke paas paani badh raha hai. Kuch log phanse hue hain.
• Pul de kol paani chadh reha hai, 15 bande phanse hoye ne bachao.
• Water levels rising rapidly near Sutlej bridge, elderly citizens trapped on rooftops."
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500 font-mono"
              />
            </div>
          </div>

          {/* Location & Map Picker */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-200 uppercase tracking-wider flex items-center space-x-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                <span>2. Location Identification</span>
              </h2>
              <span className="text-[11px] text-slate-400">
                Click map to pinpoint or type landmark
              </span>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Landmark, Village, Road or Address
              </label>
              <input
                type="text"
                placeholder="e.g. Near Sutlej River Bridge, GT Road, Ludhiana"
                value={locationDesc}
                onChange={(e) => setLocationDesc(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">
                  Selected Latitude
                </label>
                <input
                  type="text"
                  readOnly
                  placeholder="Click on map below"
                  value={latitude !== null ? latitude.toString() : ''}
                  className="w-full bg-slate-950/60 border border-slate-800 rounded-lg px-3 py-2 text-xs text-cyan-300 font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">
                  Selected Longitude
                </label>
                <input
                  type="text"
                  readOnly
                  placeholder="Click on map below"
                  value={longitude !== null ? longitude.toString() : ''}
                  className="w-full bg-slate-950/60 border border-slate-800 rounded-lg px-3 py-2 text-xs text-cyan-300 font-mono"
                />
              </div>
            </div>

            {/* Map Container for Click to Drop Pin */}
            <div className="space-y-1">
              <div
                ref={mapContainer}
                className="h-64 w-full rounded-xl overflow-hidden border border-slate-700 relative shadow-inner"
              />
              <div className="flex items-center justify-between text-[11px] text-slate-400 px-1">
                <span>📍 Map center: Ludhiana, Punjab. Click anywhere to position marker.</span>
                {latitude !== null && (
                  <button
                    type="button"
                    onClick={() => {
                      setLatitude(null);
                      setLongitude(null);
                      if (markerRef.current) {
                        markerRef.current.remove();
                        markerRef.current = null;
                      }
                    }}
                    className="text-red-400 hover:text-red-300 underline"
                  >
                    Clear coordinates
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Vulnerable Groups & Attachments */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 space-y-4">
            <h2 className="text-sm font-bold text-slate-200 uppercase tracking-wider flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-purple-400"></span>
              <span>3. Vulnerable Groups & Resource Requirements (Optional)</span>
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Vulnerable Groups Present
                </label>
                <input
                  type="text"
                  placeholder="e.g. Children, elderly, pregnant women, injured"
                  value={vulnerableGroups}
                  onChange={(e) => setVulnerableGroups(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Specific Resources Requested
                </label>
                <input
                  type="text"
                  placeholder="e.g. Inflatable rescue boats, drinking water, first-aid"
                  value={resourceRequests}
                  onChange={(e) => setResourceRequests(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Image Attachment URL (Optional)
              </label>
              <input
                type="url"
                placeholder="https://example.com/incident-photo.jpg"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex items-center justify-end space-x-4 pt-2">
            <button
              type="button"
              onClick={handleReset}
              className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-400 hover:text-white transition-all"
            >
              Clear Form
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center space-x-2 px-6 py-2.5 rounded-lg text-xs font-bold bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white shadow-lg transition-all disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Submitting Incident...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Submit Emergency Report</span>
                </>
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  );
};


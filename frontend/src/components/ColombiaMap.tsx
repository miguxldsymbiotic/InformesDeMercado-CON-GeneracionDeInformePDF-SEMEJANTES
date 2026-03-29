import React, { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { MapContainer, GeoJSON, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Layers, ZoomIn, ZoomOut, Maximize2, Map as MapIcon, Database } from 'lucide-react';
import { fetchRelatedDepartments, fetchRelatedFromMunicipalities, DeptDistribution } from '../services/api';

interface ColombiaMapProps {
    selectedPrincipal?: string[];
    selectedOferta?: string[];
    selectedMpioPrincipal?: string[];
    selectedMpioOferta?: string[];
    distributionData?: DeptDistribution[];
    metricType?: 'count' | 'percentage' | 'score' | 'currency' | 'categorical';
    dimension?: 'principal' | 'oferta';
    viewLevel?: 'departments' | 'municipalities';
    focusedDept?: string | null;
    onDepartmentClick?: (dept: string) => void;
    onMunicipalityClick?: (mpio: string) => void;
    onResetView?: () => void;
}

const ColombiaMap: React.FC<ColombiaMapProps> = ({
    selectedPrincipal = [],
    selectedOferta = [],
    selectedMpioPrincipal = [],
    selectedMpioOferta = [],
    distributionData = [],
    metricType = 'count',
    dimension = 'oferta',
    viewLevel = 'departments',
    focusedDept = null,
    onDepartmentClick,
    onMunicipalityClick,
    onResetView
}) => {
    const [deptGeoJson, setDeptGeoJson] = useState<any>(null);
    const [mpioGeoJson, setMpioGeoJson] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [hoveredFeature, setHoveredFeature] = useState<string | null>(null);

    // Related departments from cross-filtering
    const [relatedPrincipal, setRelatedPrincipal] = useState<string[]>([]);
    const [relatedOferta, setRelatedOferta] = useState<string[]>([]);
    const [relatedFromMpioPrincipal, setRelatedFromMpioPrincipal] = useState<string[]>([]);
    const [relatedFromMpioOferta, setRelatedFromMpioOferta] = useState<string[]>([]);

    const mapRef = useRef<L.Map | null>(null);

    const formatCode = (c: any) => {
        if (!c) return '';
        const n = parseInt(c.toString());
        if (isNaN(n)) return c.toString();
        // Standard DANE codes: Dept 2 digits, Mpio 5 digits
        return n > 99 ? n.toString().padStart(5, '0') : n.toString().padStart(2, '0');
    };

    const selectedPrincipalSet = useMemo(() => new Set(selectedPrincipal.map(formatCode)), [selectedPrincipal]);
    const selectedOfertaSet = useMemo(() => new Set(selectedOferta.map(formatCode)), [selectedOferta]);
    const selectedMpioPrincipalSet = useMemo(() => new Set(selectedMpioPrincipal.map(formatCode)), [selectedMpioPrincipal]);
    const selectedMpioOfertaSet = useMemo(() => new Set(selectedMpioOferta.map(formatCode)), [selectedMpioOferta]);

    const relatedPrincipalSet = useMemo(() => new Set(relatedPrincipal.map(formatCode)), [relatedPrincipal]);
    const relatedOfertaSet = useMemo(() => new Set(relatedOferta.map(formatCode)), [relatedOferta]);
    const relatedFromMpioPrincipalSet = useMemo(() => new Set(relatedFromMpioPrincipal.map(formatCode)), [relatedFromMpioPrincipal]);
    const relatedFromMpioOfertaSet = useMemo(() => new Set(relatedFromMpioOferta.map(formatCode)), [relatedFromMpioOferta]);

    const distributionMap = useMemo(() => {
        const map = new Map<string, number>();
        distributionData.forEach(d => {
            map.set(formatCode(d.code), d.value);
        });
        return map;
    }, [distributionData]);

    const maxMetricValue = useMemo(() => {
        if (distributionData.length === 0) return 0;
        return Math.max(...distributionData.map(d => d.value));
    }, [distributionData]);

    const colorScale = useMemo(() => {
        const isPrincipal = dimension === 'principal';
        const blueScale = ['#bfdbfe', '#93c5fd', '#60a5fa', '#3b82f6', '#2563eb', '#1d4ed8', '#1e40af', '#1e3a8a'];
        const greenScale = ['#a7f3d0', '#6ee7b7', '#34d399', '#10b981', '#059669', '#047857', '#065f46', '#064e3b'];
        return isPrincipal ? blueScale : greenScale;
    }, [dimension]);

    const getHeatColor = (value: number) => {
        if (maxMetricValue === 0) return colorScale[0];
        const index = Math.min(colorScale.length - 1, Math.floor((value / maxMetricValue) * (colorScale.length - 1)));
        return colorScale[index];
    };

    useEffect(() => {
        Promise.all([
            fetch('/colombia_departments.geojson').then(r => r.json()),
            fetch('/colombia_municipalities.geojson').then(r => r.json())
        ]).then(([dept, mpio]) => {
            setDeptGeoJson(dept);
            setMpioGeoJson(mpio);
            setLoading(false);
        }).catch(err => {
            console.error('Error loading GeoJSON:', err);
            setLoading(false);
        });
    }, []);

    useEffect(() => {
        if (selectedPrincipal.length > 0 || selectedOferta.length > 0) {
            fetchRelatedDepartments(selectedPrincipal, selectedOferta)
                .then(data => {
                    setRelatedPrincipal(data.related_principal);
                    setRelatedOferta(data.related_oferta);
                }).catch(console.error);
        } else {
            setRelatedPrincipal([]);
            setRelatedOferta([]);
        }
    }, [selectedPrincipal, selectedOferta]);

    useEffect(() => {
        if (selectedMpioPrincipal.length > 0 || selectedMpioOferta.length > 0) {
            fetchRelatedFromMunicipalities(selectedMpioPrincipal, selectedMpioOferta)
                .then(data => {
                    setRelatedFromMpioPrincipal(data.related_principal);
                    setRelatedFromMpioOferta(data.related_oferta);
                }).catch(console.error);
        } else {
            setRelatedFromMpioPrincipal([]);
            setRelatedFromMpioOferta([]);
        }
    }, [selectedMpioPrincipal, selectedMpioOferta]);

    const filteredMpioGeoJson = useMemo(() => {
        if (!mpioGeoJson || !focusedDept) return null;
        const fCode = formatCode(focusedDept);
        return {
            ...mpioGeoJson,
            features: mpioGeoJson.features.filter((f: any) => formatCode(f.properties?.DPTO_CODE) === fCode)
        };
    }, [mpioGeoJson, focusedDept]);

    const getDeptStyle = useCallback((feature: any) => {
        const pCode = formatCode(feature?.properties?.DPTO_CODE || '');
        const isHovered = hoveredFeature === pCode;
        const isPrincipal = selectedPrincipalSet.has(pCode);
        const isOferta = selectedOfertaSet.has(pCode);
        const hasPrincipalChild = Array.from(selectedMpioPrincipalSet).some(m => m.startsWith(pCode));
        const hasOfertaChild = Array.from(selectedMpioOfertaSet).some(m => m.startsWith(pCode));
        const isAnchor = isPrincipal || isOferta || hasPrincipalChild || hasOfertaChild;

        if (metricType === 'categorical') {
            const isRelatedPrincipal = relatedPrincipalSet.has(pCode) || relatedFromMpioPrincipalSet.has(pCode);
            const isRelatedOferta = relatedOfertaSet.has(pCode) || relatedFromMpioOfertaSet.has(pCode);
            let fillColor = '#f8fafc';
            let fillOpacity = 0.5;
            if (isPrincipal || hasPrincipalChild) { fillColor = '#1e3a8a'; fillOpacity = 0.85; }
            else if (isOferta || hasOfertaChild) { fillColor = '#064e3b'; fillOpacity = 0.85; }
            else if (isRelatedPrincipal) { fillColor = '#93c5fd'; fillOpacity = 0.75; }
            else if (isRelatedOferta) { fillColor = '#6ee7b7'; fillOpacity = 0.75; }
            return {
                fillColor, fillOpacity: isHovered ? 0.95 : fillOpacity,
                color: isHovered ? '#3b82f6' : isAnchor ? '#1e3a8a' : '#94a3b8',
                weight: isHovered ? 2.5 : isAnchor ? 1.8 : 1.2, opacity: 1,
            };
        }

        if (distributionMap.has(pCode)) {
            const val = distributionMap.get(pCode) || 0;
            return {
                fillColor: getHeatColor(val), fillOpacity: isHovered ? 0.95 : 0.8,
                color: isHovered ? '#3b82f6' : isAnchor ? (isPrincipal || hasPrincipalChild ? '#1e3a8a' : '#064e3b') : '#cbd5e1',
                weight: isHovered ? 2.5 : isAnchor ? 2 : 1, opacity: 1
            };
        }

        return { fillColor: '#f8fafc', fillOpacity: isHovered ? 0.7 : 0.5, color: isHovered ? '#3b82f6' : '#cbd5e1', weight: 1, opacity: 1 };
    }, [distributionMap, maxMetricValue, colorScale, metricType, selectedPrincipalSet, selectedOfertaSet, relatedPrincipalSet, relatedOfertaSet, relatedFromMpioPrincipalSet, relatedFromMpioOfertaSet, selectedMpioPrincipalSet, selectedMpioOfertaSet, hoveredFeature]);

    const getMpioStyle = useCallback((feature: any) => {
        const dptoCode = feature?.properties?.DPTO_CODE?.toString().padStart(2, '0') || '';
        const mCode = feature?.properties?.MPIO_CODE?.toString().padStart(3, '0') || '';
        const fullMpioCode = dptoCode + mCode;

        const isMpioPrincipal = selectedMpioPrincipalSet.has(fullMpioCode);
        const isMpioOferta = selectedMpioOfertaSet.has(fullMpioCode);
        const isDeptPrincipal = selectedPrincipalSet.has(dptoCode);
        const isDeptOferta = selectedOfertaSet.has(dptoCode);

        if (metricType === 'categorical') {
            // Check if this specific municipality has data according to distributionData
            const hasData = distributionMap.has(fullMpioCode);
            if (!hasData) return { fillColor: '#f8fafc', fillOpacity: 0.1, color: '#94a3b8', weight: 0.7, opacity: 1 };

            const isRelatedPrincipal = relatedPrincipalSet.has(dptoCode) || relatedFromMpioPrincipalSet.has(dptoCode);
            const isRelatedOferta = relatedOfertaSet.has(dptoCode) || relatedFromMpioOfertaSet.has(dptoCode);

            if (isMpioPrincipal) return { fillColor: '#1e3a8a', fillOpacity: 0.95, color: '#1e3a8a', weight: 1, opacity: 1 };
            if (isMpioOferta) return { fillColor: '#064e3b', fillOpacity: 0.95, color: '#064e3b', weight: 1, opacity: 1 };

            // Default categorical color based on dimension if it has data
            const color = dimension === 'principal' ? '#1e3a8a' : '#064e3b';

            if (isDeptPrincipal) return { fillColor: '#1e3a8a', fillOpacity: 0.7, color: '#94a3b8', weight: 0.8, opacity: 1 };
            if (isDeptOferta) return { fillColor: '#064e3b', fillOpacity: 0.7, color: '#94a3b8', weight: 0.8, opacity: 1 };
            if (isRelatedPrincipal) return { fillColor: '#93c5fd', fillOpacity: 0.75, color: '#94a3b8', weight: 0.8, opacity: 1 };
            if (isRelatedOferta) return { fillColor: '#6ee7b7', fillOpacity: 0.75, color: '#94a3b8', weight: 0.8, opacity: 1 };

            return { fillColor: color, fillOpacity: 0.7, color: '#94a3b8', weight: 0.8, opacity: 1 };
        }

        if (distributionMap.has(fullMpioCode)) {
            const val = distributionMap.get(fullMpioCode) || 0;
            return { fillColor: getHeatColor(val), fillOpacity: 0.85, color: isMpioPrincipal ? '#1e3a8a' : isMpioOferta ? '#064e3b' : '#94a3b8', weight: (isMpioPrincipal || isMpioOferta) ? 1.5 : 0.8, opacity: 1 };
        }

        return { fillColor: '#f8fafc', fillOpacity: 0.1, color: '#94a3b8', weight: 0.7, opacity: 1 };
    }, [distributionMap, maxMetricValue, colorScale, metricType, selectedMpioPrincipalSet, selectedMpioOfertaSet, selectedPrincipalSet, selectedOfertaSet, relatedPrincipalSet, relatedOfertaSet, relatedFromMpioOfertaSet, relatedFromMpioPrincipalSet]);

    const onEachDeptFeature = useCallback((feature: any, layer: L.Layer) => {
        const name = feature?.properties?.NOMBRE_DPT || '';
        const code = formatCode(feature?.properties?.DPTO_CODE || '');
        const value = distributionMap.get(code);

        let tooltip = `<div style="font-family:Inter,sans-serif;"><div style="font-weight:800;color:#1e293b;margin-bottom:2px;">${name}</div>`;
        if (value !== undefined && metricType !== 'categorical') {
            const fmt = metricType === 'percentage' ? `${value.toFixed(2)}%` : metricType === 'score' ? value.toFixed(1) : value.toLocaleString('es-CO');
            tooltip += `<div style="font-size:11px;color:#005DC2;font-weight:600;">${fmt}</div>`;
        }
        tooltip += `</div>`;

        layer.bindTooltip(tooltip, { sticky: true, direction: 'top', offset: [0, -10], className: 'colombia-map-tooltip' });
        (layer as any).on({
            mouseover: () => setHoveredFeature(code),
            mouseout: () => setHoveredFeature(null),
            click: () => { if (onDepartmentClick) onDepartmentClick(code); }
        });
    }, [onDepartmentClick, distributionMap, metricType]);

    const onEachMpioFeature = useCallback((feature: any, layer: L.Layer) => {
        const dCode = feature?.properties?.DPTO_CODE?.toString().padStart(2, '0') || '';
        const mCode = feature?.properties?.MPIO_CODE?.toString().padStart(3, '0') || '';
        const fullMpioCode = dCode + mCode;
        const name = feature?.properties?.NOMBRE_MPIO || '';
        const value = distributionMap.get(fullMpioCode);

        let tooltip = `<div style="font-family:Inter,sans-serif;"><div style="font-weight:700;color:#1e293b;">${name}</div><div style="font-size:10px;color:#64748b;">Cód. ${fullMpioCode}</div>`;
        if (value !== undefined && metricType !== 'categorical') {
            const fmt = metricType === 'percentage' ? `${value.toFixed(2)}%` : metricType === 'score' ? value.toFixed(1) : value.toLocaleString('es-CO');
            tooltip += `<div style="font-size:11px;color:#005DC2;font-weight:600;">${fmt}</div>`;
        }
        tooltip += `</div>`;

        layer.bindTooltip(tooltip, { sticky: true, direction: 'top', offset: [0, -10], className: 'colombia-map-tooltip' });
        (layer as any).on({
            mouseover: (e: any) => { if (distributionMap.has(fullMpioCode)) e.target.setStyle({ fillOpacity: 1, weight: 2.2 }); },
            mouseout: (e: any) => e.target.setStyle(getMpioStyle(feature)),
            click: () => { if (onMunicipalityClick) onMunicipalityClick(fullMpioCode); }
        });
    }, [onMunicipalityClick, getMpioStyle, distributionMap, metricType]);

    const FitBounds: React.FC<{ geojson: any }> = ({ geojson }) => {
        const map = useMap();
        useEffect(() => {
            if (geojson) {
                const layer = L.geoJSON(geojson);
                const bounds = layer.getBounds();
                if (bounds.isValid()) map.fitBounds(bounds, { padding: [10, 10], animate: true });
            }
        }, [geojson, map]);
        return null;
    };

    if (loading) return <div className="h-[500px] flex items-center justify-center bg-slate-50/50 rounded-3xl"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-blue" /></div>;

    const focusedDeptName = focusedDept && deptGeoJson
        ? deptGeoJson.features.find((f: any) => formatCode(f.properties.DPTO_CODE) === formatCode(focusedDept))?.properties?.NOMBRE_DPT
        : 'Cobertura Nacional';

    return (
        <div className="relative h-[500px] rounded-3xl overflow-hidden border border-slate-100 shadow-inner bg-slate-50/50">
            <style>{`
                .colombia-map-tooltip { background: rgba(255,255,255,0.95)!important; border: 1px solid #e2e8f0!important; border-radius: 12px!important; padding: 8px 12px!important; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1)!important; backdrop-filter: blur(8px); }
                .leaflet-container { background: transparent!important; }
                .leaflet-control-zoom { display: none!important; }
            `}</style>

            <MapContainer center={[4.5, -73.5]} zoom={5} zoomControl={false} style={{ height: '100%', width: '100%' }} ref={mapRef} attributionControl={false}>
                <FitBounds geojson={viewLevel === 'departments' ? deptGeoJson : filteredMpioGeoJson} />
                {viewLevel === 'departments' && deptGeoJson && (
                    <GeoJSON key={`dept-${metricType}-${distributionData.length}`} data={deptGeoJson} style={getDeptStyle} onEachFeature={onEachDeptFeature} />
                )}
                {viewLevel === 'municipalities' && filteredMpioGeoJson && (
                    <GeoJSON key={`mpio-${focusedDept}-${metricType}-${distributionData.length}`} data={filteredMpioGeoJson} style={getMpioStyle} onEachFeature={onEachMpioFeature} />
                )}
            </MapContainer>

            {/* Float UI */}
            <div className="absolute top-4 left-4 z-[1000] flex flex-col gap-2">
                <div className="bg-white/90 backdrop-blur-md rounded-2xl px-4 py-2.5 shadow-xl border border-white/50 flex items-center gap-3">
                    <div className="p-1.5 bg-brand-blue/10 rounded-xl text-brand-blue"><MapIcon className="w-5 h-5" /></div>
                    <div>
                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Vista</h4>
                        <p className="text-sm font-black text-slate-800 leading-none">{focusedDeptName}</p>
                    </div>
                </div>
            </div>

            <div className="absolute top-4 right-4 z-[1000] flex flex-col gap-2">
                <button onClick={() => mapRef.current?.zoomIn()} className="w-10 h-10 bg-white/90 backdrop-blur-md rounded-xl flex items-center justify-center shadow-lg border border-white/50 hover:bg-white transition-colors"><ZoomIn className="w-5 h-5 text-slate-600" /></button>
                <button onClick={() => mapRef.current?.zoomOut()} className="w-10 h-10 bg-white/90 backdrop-blur-md rounded-xl flex items-center justify-center shadow-lg border border-white/50 hover:bg-white transition-colors"><ZoomOut className="w-5 h-5 text-slate-600" /></button>
                <button onClick={onResetView} className="w-10 h-10 bg-white/90 backdrop-blur-md rounded-xl flex items-center justify-center shadow-lg border border-white/50 hover:bg-white transition-colors"><Maximize2 className="w-5 h-5 text-slate-600" /></button>
            </div>

            {/* Legends */}
            <div className="absolute bottom-4 left-4 z-[1000] flex flex-col gap-3 pointer-events-none">
                {metricType !== 'categorical' && (distributionData.length > 0) && (
                    <div className="bg-white/90 backdrop-blur-md p-4 rounded-3xl border border-slate-100 shadow-xl w-48 pointer-events-auto">
                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-1.5"><Layers className="w-3 h-3" /> Distribución</h4>
                        <div className="h-2 w-full rounded-full bg-gradient-to-r from-slate-50 to-brand-blue mb-1" style={{ background: `linear-gradient(to right, ${colorScale[0]}, ${colorScale[colorScale.length - 1]})` }} />
                        <div className="flex justify-between text-[10px] font-black text-slate-600"><span>0</span><span>{maxMetricValue.toLocaleString('es-CO')}</span></div>
                    </div>
                )}

                {(metricType === 'categorical' || selectedPrincipalSet.size > 0 || selectedOfertaSet.size > 0) && (
                    <div className="bg-white/90 backdrop-blur-md p-4 rounded-3xl border border-slate-100 shadow-xl w-56 pointer-events-auto">
                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-1.5"><Database className="w-3 h-3" /> Convenciones</h4>
                        <div className="grid grid-cols-1 gap-2.5">
                            <div className="flex items-center gap-2.5"><div className="w-3.5 h-3.5 rounded bg-[#1e3a8a]" /><span className="text-[10px] font-bold text-slate-600">Sede Principal</span></div>
                            <div className="flex items-center gap-2.5"><div className="w-3.5 h-3.5 rounded bg-[#064e3b]" /><span className="text-[10px] font-bold text-slate-600">Territorio Oferta</span></div>
                            <div className="flex items-center gap-2.5"><div className="w-3.5 h-3.5 rounded bg-[#bfdbfe]" /><span className="text-[10px] font-bold text-slate-500">Origen Relacionado (SNIES)</span></div>
                            <div className="flex items-center gap-2.5"><div className="w-3.5 h-3.5 rounded bg-[#bbf7d0]" /><span className="text-[10px] font-bold text-slate-500">Oferta Relacionada (Cobertura)</span></div>
                        </div>
                    </div>
                )}
            </div>

            {viewLevel === 'municipalities' && (
                <div className="absolute bottom-4 right-4 z-[1000]">
                    <button onClick={onResetView} className="bg-brand-blue text-white text-[10px] font-black px-4 py-2 rounded-2xl shadow-xl flex items-center gap-2 uppercase tracking-widest hover:scale-105 transition-transform"><Layers className="w-4 h-4" /> Departamentos</button>
                </div>
            )}
        </div>
    );
};

export default ColombiaMap;

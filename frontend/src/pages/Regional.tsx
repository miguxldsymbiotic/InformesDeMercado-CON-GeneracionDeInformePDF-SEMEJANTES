import React, { useState, useEffect } from 'react';
import DashboardBase from './GeneralDashboard';
import ColombiaMap from '../components/ColombiaMap';
import { fetchMapDistribution, DeptDistribution } from '../services/api';
import { Layers, BarChart } from 'lucide-react';

interface RegionalProps {
    filters?: any;
    setFilters?: (filters: any) => void;
}

const METRIC_OPTIONS = [
    { label: 'Cobertura (Relación)', key: 'cobertura', type: 'categorical' },
    { label: 'Matrícula', key: 'matricula', type: 'count' },
    { label: 'Primer Curso', key: 'pcurso', type: 'count' },
    { label: 'Graduados', key: 'graduados', type: 'count' },
    { label: 'Deserción', key: 'desercion', type: 'percentage' },
    { label: 'Saber Pro', key: 'saberpro', type: 'score' },
    { label: 'Empleabilidad', key: 'empleabilidad', type: 'percentage' },
    { label: 'Num. IES', key: 'num_ies', type: 'count' },
    { label: 'Num. Programas', key: 'num_programs', type: 'count' },
];

const Regional: React.FC<RegionalProps> = ({ filters, setFilters }) => {
    const [mapMetric, setMapMetric] = useState('cobertura');
    const [mapDimension, setMapDimension] = useState<'oferta' | 'principal'>('oferta');
    const [viewLevel, setViewLevel] = useState<'departments' | 'municipalities'>('departments');
    const [focusedDept, setFocusedDept] = useState<string | null>(null);
    const [distributionData, setDistributionData] = useState<DeptDistribution[]>([]);
    const [loading, setLoading] = useState(false);

    const selectedPrincipal = filters?.departamento_principal || [];
    const selectedOferta = filters?.departamento || [];
    const selectedMpioPrincipal = filters?.municipio_principal || [];
    const selectedMpioOferta = filters?.municipio || [];

    useEffect(() => {
        const loadDistribution = async () => {
            setLoading(true);
            try {
                // If focused on a dept, we add it to the local filters for the distribution fetch
                const activeFilters = { ...filters };
                if (focusedDept) {
                    if (mapDimension === 'principal') activeFilters.departamento_principal = [focusedDept];
                    else activeFilters.departamento = [focusedDept];
                }

                const data = await fetchMapDistribution(
                    mapMetric,
                    mapDimension,
                    activeFilters,
                    viewLevel === 'departments' ? 'department' : 'municipality'
                );
                setDistributionData(data);
            } catch (error) {
                console.error('Error fetching map distribution:', error);
            } finally {
                setLoading(false);
            }
        };

        loadDistribution();
    }, [mapMetric, mapDimension, filters, viewLevel, focusedDept]);

    const activeMetric = METRIC_OPTIONS.find(m => m.key === mapMetric);

    const handleDepartmentClick = (code: string) => {
        setFocusedDept(code);
        setViewLevel('municipalities');
    };

    const handleResetView = () => {
        setFocusedDept(null);
        setViewLevel('departments');
    };

    const handleMunicipalityClick = (_code: string) => {
        return;
    };

    const mapSlot = (
        <div className="flex flex-col gap-4">
            {/* Map Controls */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4">
                    <div className="p-2.5 bg-brand-blue/10 rounded-2xl text-brand-blue">
                        <BarChart className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Métrica del Mapa</label>
                        <select
                            value={mapMetric}
                            onChange={(e) => setMapMetric(e.target.value)}
                            className="w-full bg-slate-50 border-none text-sm font-bold text-slate-700 focus:ring-2 focus:ring-brand-blue/20 rounded-xl px-3 py-2 cursor-pointer"
                        >
                            {METRIC_OPTIONS.map(opt => (
                                <option key={opt.key} value={opt.key}>{opt.label}</option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4">
                    <div className="p-2.5 bg-emerald-50 rounded-2xl text-emerald-600">
                        <Layers className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Dimensión Territorial</label>
                        <div className="flex bg-slate-50 p-1 rounded-xl">
                            <button
                                onClick={() => setMapDimension('oferta')}
                                className={`flex-1 py-1.5 text-xs font-black rounded-lg transition-all ${mapDimension === 'oferta' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                            >
                                Oferta (Territorio)
                            </button>
                            <button
                                onClick={() => setMapDimension('principal')}
                                className={`flex-1 py-1.5 text-xs font-black rounded-lg transition-all ${mapDimension === 'principal' ? 'bg-white text-brand-blue shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                            >
                                Principal (Sede)
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* The Map */}
            <div className="relative group">
                {loading && (
                    <div className="absolute inset-0 z-10 bg-white/40 backdrop-blur-[1px] flex items-center justify-center rounded-3xl">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-blue"></div>
                    </div>
                )}
                <ColombiaMap
                    selectedPrincipal={selectedPrincipal}
                    selectedOferta={selectedOferta}
                    selectedMpioPrincipal={selectedMpioPrincipal}
                    selectedMpioOferta={selectedMpioOferta}
                    distributionData={distributionData}
                    metricType={activeMetric?.type as any}
                    dimension={mapDimension}
                    viewLevel={viewLevel}
                    focusedDept={focusedDept}
                    onDepartmentClick={handleDepartmentClick}
                    onMunicipalityClick={handleMunicipalityClick}
                    onResetView={handleResetView}
                />
            </div>
        </div>
    );

    return (
        <DashboardBase
            filters={filters}
            setFilters={setFilters}
            title="Análisis General"
            subtitle="Inteligencia de Mercado Nacional y Regional"
            mapSlot={mapSlot}
        />
    );
};

export default Regional;

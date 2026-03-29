import React, { useEffect, useState, useCallback } from 'react';
import Plot from 'react-plotly.js';
import { NationalKPIDashboard, fetchNationalKPIs, NationalPrimerCursoEvolutionData, fetchNationalPrimerCursoEvolution, fetchNationalPrimerCursoEvolutionBySector, fetchKPIEvolution, KPIEvolutionData, fetchNationalDisciplineStats, DisciplineStats, FieldTrendData, fetchFieldTrend, DisciplineTableItem, fetchNationalDisciplineTable, IESTableItem, fetchNationalIESTable, fetchNationalIESList, SaberProDashboardData, fetchNationalSaberProStats, SaberProTrendData, fetchNationalSaberProTrend, fetchDemographicDistribution, fetchDemographicTrend } from '../services/api';
import { TrendingUp, Users, Percent, Building2, AlertCircle, Award, BarChart2, GraduationCap, BookOpen, X, ChevronRight, ChevronDown, ArrowUpDown, ArrowUp, ArrowDown, Filter } from 'lucide-react';
import {
    useReactTable,
    getCoreRowModel,
    getExpandedRowModel,
    getSortedRowModel,
    ColumnDef,
    flexRender,
    ExpandedState,
    SortingState,
} from '@tanstack/react-table';

interface NationalProps {
    filters?: any;
    setFilters?: (filters: any) => void;
    title?: string;
    subtitle?: string;
    mapSlot?: React.ReactNode;
}

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean, error: Error | null, errorInfo: React.ErrorInfo | null }> {
    constructor(props: any) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError(error: Error) {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        console.error("Uncaught error:", error, errorInfo);
        this.setState({ errorInfo });
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="p-10 bg-red-50 text-red-900 rounded-lg border border-red-200 m-8">
                    <h2 className="text-2xl font-bold mb-4">Algo salió mal (Error de Renderizado)</h2>
                    <p className="font-mono text-sm bg-white p-4 rounded border border-red-100 overflow-auto whitespace-pre-wrap">
                        {this.state.error && this.state.error.toString()}
                    </p>
                    <details className="mt-4">
                        <summary className="cursor-pointer font-bold mb-2">Detalles del Stack Trace</summary>
                        <pre className="text-xs bg-slate-900 text-slate-50 p-4 rounded overflow-auto">
                            {this.state.errorInfo && this.state.errorInfo.componentStack}
                        </pre>
                    </details>
                </div>
            );
        }

        return this.props.children;
    }
}




interface MetricConfig {
    label: string;
    key: string;
    icon: any;
    subtitle?: [string, string] | string;
    color: string;
    isLocale: boolean;
    suffix: string;
    trendKey?: string;
    invertTrendColors?: boolean;
    metricName?: string;
}

const LEVEL_GROUPS = {
    TYT: ['TECNOLOGICO', 'FORMACION TECNICA PROFESIONAL'],
    UNIVERSITARIO: ['UNIVERSITARIO'],
    POSGRADO: [
        'MAESTRIA', 'DOCTORADO', 'ESPECIALIZACION UNIVERSITARIA',
        'ESPECIALIZACION TECNOLOGICA', 'ESPECIALIZACION TECNICO PROFESIONAL',
        'ESPECIALIZACION MEDICO QUIRURGICA'
    ]
};

const KPICard = ({
    title,
    value,
    icon: Icon,
    subtitle,
    colorClass = "text-slate-900",
    trend = null,
    invertTrendColors = false,
    onClick
}: {
    title: string,
    value: string,
    icon: any,
    subtitle: string,
    colorClass?: string,
    trend?: number | null,
    invertTrendColors?: boolean,
    onClick?: () => void
}) => {
    const isPositive = trend && trend > 0;
    const isNegative = trend && trend < 0;

    return (
        <div
            onClick={onClick}
            className={`bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group ${onClick ? 'cursor-pointer hover:border-brand-blue/30' : ''}`}
        >
            <div className="flex justify-between items-start">
                <div>
                    <p className="text-[0.6rem] font-black text-slate-400 uppercase tracking-widest mb-1">{title}</p>
                    <h4 className={`text-3xl font-black ${colorClass}`}>
                        {value}
                    </h4>
                </div>
                {trend !== null && trend !== undefined && (
                    <div className={`flex items-center space-x-1 px-2 py-1 rounded-lg text-[0.7rem] font-black ${isPositive
                        ? (invertTrendColors ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600')
                        : (invertTrendColors ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600')
                        }`}>
                        {isPositive ? <TrendingUp className="w-3 h-3" /> : isNegative ? <TrendingUp className="w-3 h-3 rotate-180" /> : null}
                        <span>{trend > 0 ? '+' : ''}{trend.toFixed(1)}%</span>
                    </div>
                )}
            </div>
            <p className="text-[0.65rem] font-bold mt-4 flex items-center text-slate-500">
                <Icon className="w-3 h-3 mr-1" /> {subtitle}
            </p>
            {onClick && (
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="text-[0.55rem] font-black text-brand-blue bg-blue-50 px-2 py-0.5 rounded-full uppercase tracking-tighter">Ver Tendencia</div>
                </div>
            )}
            <div className="absolute bottom-0 left-0 h-1 bg-brand-blue/10 w-full transform scale-x-0 group-hover:scale-x-100 transition-transform origin-left"></div>
        </div>
    );
};

const TrendModal = ({
    isOpen,
    onClose,
    metricLabel,
    data
}: {
    isOpen: boolean,
    onClose: () => void,
    metricLabel: string,
    data: KPIEvolutionData | null
}) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose}></div>
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl relative z-10 overflow-hidden animate-in fade-in zoom-in duration-200">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                    <div>
                        <h3 className="text-xl font-black text-slate-800 tracking-tight">Evolución Histórica: {metricLabel}</h3>
                        <p className="text-[0.65rem] font-bold text-slate-400 uppercase tracking-widest mt-1">Tendencia Consolidada</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                        <X className="w-6 h-6 text-slate-500" />
                    </button>
                </div>
                <div className="p-8 h-[400px]">
                    {!data ? (
                        <div className="flex items-center justify-center h-full">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-blue"></div>
                        </div>
                    ) : (
                        <Plot
                            data={data.series ? data.series.map((s) => {
                                const getSeriesColor = (name: string) => {
                                    switch (name) {
                                        case 'Oficial': return '#004fe5';
                                        case 'Privado': return '#fbbf24';
                                        case 'T&T': return '#004fe5'; // Blue
                                        case 'Universitario': return '#eab308'; // Yellow
                                        case 'Posgrado': return '#10b981'; // Green
                                        default: return '#004fe5';
                                    }
                                };
                                const color = getSeriesColor(s.name);
                                return {
                                    x: data.years,
                                    y: s.data,
                                    type: 'scatter',
                                    mode: 'lines+markers',
                                    marker: { color: color, size: 10 },
                                    line: { color: color, width: 4, shape: 'linear' },
                                    name: s.name
                                };
                            }) : [
                                {
                                    x: data.years,
                                    y: data.values,
                                    type: 'scatter',
                                    mode: 'lines+markers',
                                    marker: { color: '#004fe5', size: 10 },
                                    line: { color: '#004fe5', width: 4, shape: 'linear' },
                                    name: metricLabel
                                }
                            ]}
                            layout={{
                                autosize: true,
                                margin: { l: 60, r: 20, t: 30, b: 60 },
                                showlegend: !!data.series,
                                legend: { orientation: 'h', y: -0.2, font: { size: 12, family: 'Inter, sans-serif' } },
                                paper_bgcolor: 'rgba(0,0,0,0)',
                                plot_bgcolor: 'rgba(0,0,0,0)',
                                xaxis: {
                                    gridcolor: '#f1f5f9',
                                    zeroline: false,
                                    dtick: 1,
                                    tickfont: { size: 10, family: 'Inter, sans-serif', weight: 'bold' },
                                    tickformat: 'd'
                                },
                                yaxis: {
                                    gridcolor: '#f1f5f9',
                                    zeroline: false,
                                    rangemode: 'normal',
                                    tickfont: { size: 10, family: 'Inter, sans-serif', weight: 'bold' },
                                    ticksuffix:
                                        ["Deserción Anual", "Empleabilidad"].includes(metricLabel) ? "%" : ""
                                }
                            }}
                            config={{ responsive: true, displayModeBar: false }}
                            style={{ width: '100%', height: '100%' }}
                        />
                    )}
                </div>
            </div>
        </div>
    );
};
const GenericTableModal = ({
    isOpen,
    onClose,
    data,
    columns,
    title,
    subtitle,
    isLoading = false
}: {
    isOpen: boolean,
    onClose: () => void,
    data: any[],
    columns: any,
    title: string,
    subtitle: string,
    isLoading?: boolean
}) => {
    const [sorting, setSorting] = React.useState<SortingState>([]);
    const [expanded, setExpanded] = React.useState<ExpandedState>({});

    const tableInstance = useReactTable({
        data,
        columns,
        state: {
            sorting,
            expanded,
        },
        onSortingChange: setSorting,
        onExpandedChange: setExpanded,
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getExpandedRowModel: getExpandedRowModel(),
        getSubRows: (row: any) => row.children || row.subRows,
    });

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            <div
                className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            />

            <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden relative flex flex-col border border-slate-200 animate-in fade-in zoom-in duration-300">
                {/* Header */}
                <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                    <div>
                        <h4 className="text-3xl font-black text-slate-900 tracking-tight">{title}</h4>
                        <p className="text-[0.7rem] font-bold text-slate-400 uppercase tracking-[0.2em] mt-2">{subtitle}</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-3 hover:bg-slate-200 rounded-2xl transition-colors text-slate-400 hover:text-slate-600"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Table Content */}
                <div className="flex-1 overflow-auto custom-scroll p-4">
                    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm">
                        <table className="w-full text-left border-collapse">
                            <thead className="sticky top-0 z-10 bg-slate-50 shadow-sm">
                                {tableInstance.getHeaderGroups().map((headerGroup: any) => (
                                    <tr key={headerGroup.id}>
                                        {headerGroup.headers.map((header: any) => {
                                            const isTextRight = ['total_matricula', 'total_pcurso', 'total_graduados'].includes(header.column.id);
                                            const isTextCenter = ['num_ies', 'num_programs', 'avg_desercion', 'avg_saberpro', 'avg_empleabilidad'].includes(header.column.id);

                                            return (
                                                <th
                                                    key={header.id}
                                                    className={`px-4 py-4 text-[0.6rem] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 ${isTextRight ? 'text-right' : isTextCenter ? 'text-center' : 'text-left'}`}
                                                >
                                                    {flexRender(header.column.columnDef.header, header.getContext())}
                                                </th>
                                            );
                                        })}
                                    </tr>
                                ))}
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {tableInstance.getRowModel().rows && tableInstance.getRowModel().rows.length > 0 ? (
                                    tableInstance.getRowModel().rows.map((row: any) => (
                                        <tr key={row.id} className="hover:bg-slate-50/80 transition-colors group">
                                            {row.getVisibleCells().map((cell: any) => {
                                                const isTextRight = ['total_matricula', 'total_pcurso', 'total_graduados'].includes(cell.column.id);
                                                const isTextCenter = ['num_ies', 'num_programs', 'avg_desercion', 'avg_saberpro', 'avg_empleabilidad'].includes(cell.column.id);

                                                return (
                                                    <td key={cell.id} className={`px-4 py-3 text-[0.7rem] border-b border-slate-100 ${isTextRight ? 'text-right' : isTextCenter ? 'text-center' : 'text-left'}`}>
                                                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                                    </td>
                                                );
                                            })}
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={10} className="px-6 py-20 text-center font-bold text-slate-400 italic">
                                            No se encontraron programas para los filtros seleccionados
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex justify-center text-[0.65rem] font-black text-slate-400 uppercase tracking-widest text-slate-500">
                    {isLoading ? (
                        <div className="flex items-center space-x-2">
                            <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-brand-blue"></div>
                            <span>Cargando datos...</span>
                        </div>
                    ) : (
                        <span>Total: {data.length} Registros</span>
                    )}
                </div>
            </div>
        </div>
    );
};

const IESModal = ({
    isOpen,
    onClose,
    data,
    isLoading,
    columns
}: {
    isOpen: boolean,
    onClose: () => void,
    data: IESTableItem[],
    isLoading: boolean,
    columns: any
}) => {
    const [sorting, setSorting] = React.useState<SortingState>([]);

    const tableInstance = useReactTable({
        data,
        columns,
        state: {
            sorting,
        },
        onSortingChange: setSorting,
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
    });

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            <div
                className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            />

            <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden relative flex flex-col border border-slate-200 animate-in fade-in zoom-in duration-300">
                {/* Header */}
                <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                    <div>
                        <h4 className="text-3xl font-black text-slate-900 tracking-tight">Instituciones (IES)</h4>
                        <p className="text-[0.7rem] font-bold text-slate-400 uppercase tracking-[0.2em] mt-2">Relación Detallada de Instituciones Activas</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-3 hover:bg-slate-200 rounded-2xl transition-colors text-slate-400 hover:text-slate-600"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Table Content */}
                <div className="flex-1 overflow-auto custom-scroll p-4">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center h-64 space-y-4">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-blue"></div>
                            <span className="text-[0.7rem] font-black text-slate-600 uppercase tracking-widest">Cargando datos...</span>
                        </div>
                    ) : (
                        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm">
                            <table className="w-full text-left border-collapse">
                                <thead className="sticky top-0 z-10 bg-slate-50 shadow-sm">
                                    {tableInstance.getHeaderGroups().map((headerGroup: any) => (
                                        <tr key={headerGroup.id}>
                                            {headerGroup.headers.map((header: any) => {
                                                const isTextRight = ['total_matricula', 'total_pcurso', 'total_graduados'].includes(header.column.id);
                                                const isTextCenter = ['num_programs', 'avg_desercion', 'avg_saberpro', 'avg_empleabilidad'].includes(header.column.id);

                                                return (
                                                    <th
                                                        key={header.id}
                                                        className={`px-4 py-4 text-[0.6rem] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 ${isTextRight ? 'text-right' : isTextCenter ? 'text-center' : 'text-left'}`}
                                                    >
                                                        {flexRender(header.column.columnDef.header, header.getContext())}
                                                    </th>
                                                );
                                            })}
                                        </tr>
                                    ))}
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {tableInstance.getRowModel().rows && tableInstance.getRowModel().rows.length > 0 ? (
                                        tableInstance.getRowModel().rows.map((row: any) => (
                                            <tr key={row.id} className="hover:bg-slate-50/80 transition-colors group">
                                                {row.getVisibleCells().map((cell: any) => {
                                                    const isTextRight = ['total_matricula', 'total_pcurso', 'total_graduados'].includes(cell.column.id);
                                                    const isTextCenter = ['num_programs', 'avg_desercion', 'avg_saberpro', 'avg_empleabilidad'].includes(cell.column.id);

                                                    return (
                                                        <td key={cell.id} className={`px-4 py-3 text-[0.7rem] border-b border-slate-100 ${isTextRight ? 'text-right' : isTextCenter ? 'text-center' : 'text-left'}`}>
                                                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                                        </td>
                                                    );
                                                })}
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan={10} className="px-6 py-20 text-center font-bold text-slate-400 italic">
                                                No se encontraron instituciones para los filtros seleccionados
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex justify-center text-[0.65rem] font-black text-slate-400 uppercase tracking-widest text-slate-500">
                    Total: {data.length} Instituciones encontradas
                </div>
            </div>
        </div>
    );
};

// Static Data - Moved outside of component
const tabsConfig = [
    { id: 0, label: 'Resumen y Evolución', icon: <TrendingUp className="w-4 h-4" /> },
    { id: 1, label: 'Análisis por Sector', icon: <Building2 className="w-4 h-4" /> },
    { id: 2, label: 'Nivel de Formación', icon: <GraduationCap className="w-4 h-4" /> },
    { id: 3, label: 'Disciplinas', icon: <BookOpen className="w-4 h-4" /> },
    { id: 4, label: 'Resultados Saber PRO', icon: <Award className="w-4 h-4" /> },
    { id: 5, label: 'Demografía Saber PRO', icon: <Users className="w-4 h-4" /> }
];

const National: React.FC<NationalProps> = ({ filters, title, subtitle, mapSlot }) => {
    const [kpis, setKpis] = useState<NationalKPIDashboard | null>(null);
    const [evolutionData, setEvolutionData] = useState<NationalPrimerCursoEvolutionData | null>(null);
    const [sectorEvolutionData, setSectorEvolutionData] = useState<Record<string, NationalPrimerCursoEvolutionData> | null>(null);
    const [disciplineStats, setDisciplineStats] = useState<DisciplineStats | null>(null);
    const [fieldTrend, setFieldTrend] = useState<FieldTrendData | null>(null);
    const [disciplineTable, setDisciplineTable] = useState<DisciplineTableItem[] | null>(null);
    const [iesTable, setIesTable] = useState<IESTableItem[] | null>(null);
    const [saberProData, setSaberProData] = useState<SaberProDashboardData | null>(null);
    const [isInitialLoad, setIsInitialLoad] = useState(true);
    const [isUpdating, setIsUpdating] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Filter Tracking States
    const [debouncedFilters, setDebouncedFilters] = useState(filters);
    const [lastFetchedFilters, setLastFetchedFilters] = useState<Record<number, any>>({});

    // Debounce filters effect
    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedFilters(filters);
            setLastFetchedFilters({});
        }, 800);
        return () => clearTimeout(handler);
    }, [filters]);

    // Tab Navigation State
    const [activeTab, setActiveTab] = useState<number>(0);

    // Trend Modal State
    const [selectedMetric, setSelectedMetric] = useState<{ label: string, name: string } | null>(null);
    const [trendData, setTrendData] = useState<KPIEvolutionData | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    // IES List Modal State
    const [isIESModalOpen, setIsIESModalOpen] = useState(false);
    const [iesList, setIesList] = useState<IESTableItem[]>([]);
    const [isIESListLoading, setIsIESListLoading] = useState(false);

    // Programs List Modal State
    const [isProgramsModalOpen, setIsProgramsModalOpen] = useState(false);
    const [isProgramsLoading, setIsProgramsLoading] = useState(false);

    // Sector Comparisons Modal State
    const [isSectorModalOpen, setIsSectorModalOpen] = useState(false);
    const [isSectorLoading, setIsSectorLoading] = useState(false);
    const [sectorIESList, setSectorIESList] = useState<IESTableItem[]>([]);

    // Sector Programs Modal State
    const [isSectorProgramsModalOpen, setIsSectorProgramsModalOpen] = useState(false);
    const [isSectorProgramsLoading, setIsSectorProgramsLoading] = useState(false);
    const [sectorProgramsData, setSectorProgramsData] = useState<any[]>([]);


    // Saber PRO Trend Modal State
    const [saberProTrendData, setSaberProTrendData] = useState<SaberProTrendData | null>(null);
    const [activeSaberProTrendModal, setActiveSaberProTrendModal] = useState<{ isOpen: boolean, title: string, groupKey: 'summary' | 'by_sector' | 'by_modalidad' | 'by_campo_amplio' } | null>(null);

    // Demographics State
    const [demographicDistribution, setDemographicDistribution] = useState<any>(null);
    const [demographicTrend, setDemographicTrend] = useState<any>(null);
    const [nestedDemographicTrend, setNestedDemographicTrend] = useState<any>(null); // State for nested section
    const [demogBreakdown, setDemogBreakdown] = useState<string>('');
    const [trendBreakdown, setTrendBreakdown] = useState<string>('');
    const [targetSexo, setTargetSexo] = useState<string>('');
    const [targetEstrato, setTargetEstrato] = useState<string>('');
    const [targetHoras, setTargetHoras] = useState<string>('');
    const [targetEdad, setTargetEdad] = useState<string>('');

    // Independent states for the Nested Trends section
    const [nestedTargetSexo, setNestedTargetSexo] = useState<string>('');
    const [nestedTargetEstrato, setNestedTargetEstrato] = useState<string>('');
    const [nestedTargetHoras, setNestedTargetHoras] = useState<string>('');
    const [nestedTargetEdad, setNestedTargetEdad] = useState<string>('');
    const [percentageMode, setPercentageMode] = useState<'total' | 'group' | 'state'>('total');

    // Tab 2 Metric Group Modal State
    const [activeTab2Metric, setActiveTab2Metric] = useState<MetricConfig | null>(null);
    const [tab2ModalData, setTab2ModalData] = useState<{ evoData: KPIEvolutionData | null, tableData: any[] }>({ evoData: null, tableData: [] });
    const [isTab2Loading, setIsTab2Loading] = useState(false);

    const sectorTableData = React.useMemo(() => {
        if (!kpis?.by_sector) return [];
        const sectors = [
            { name: "OFICIAL", ...kpis.by_sector['OFICIAL'] },
            { name: "PRIVADO", ...kpis.by_sector['PRIVADO'] }
        ].filter((item: any) => item.num_ies !== undefined);

        // Attach IES as subRows grouped by sector
        return sectors.map((sector: any) => ({
            ...sector,
            subRows: sectorIESList
                .filter((ies: any) => (ies.sector || '').toUpperCase() === sector.name.toUpperCase())
                .map((ies: any) => ({ ...ies, subRows: undefined }))
        }));
    }, [kpis, sectorIESList]);

    // Removed levelTableData as it is now handled by the explicit Tab 2 Tab2MetricGroup


    // --- TanStack Table Configuration ---
    // Moved before conditional return to satisfy Rules of Hooks
    const [expanded, setExpanded] = useState<ExpandedState>({});
    const [sorting, setSorting] = useState<SortingState>([]);
    const [iesExpanded, setIesExpanded] = useState<ExpandedState>({});
    const [iesSorting, setIesSorting] = useState<SortingState>([]);

    const columns = React.useMemo<ColumnDef<DisciplineTableItem>[]>(() => [
        {
            accessorKey: 'name',
            header: ({ column }) => {
                const isSorted = column.getIsSorted();
                return (
                    <button
                        className="flex items-center space-x-1 hover:text-slate-700 transition-colors"
                        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                    >
                        <span>Área de Conocimiento / NBC</span>
                        {isSorted === "asc" ? (
                            <ArrowUp className="w-3 h-3 ml-1 text-brand-blue" />
                        ) : isSorted === "desc" ? (
                            <ArrowDown className="w-3 h-3 ml-1 text-brand-blue" />
                        ) : (
                            <ArrowUpDown className="w-3 h-3 ml-1 opacity-50" />
                        )}
                    </button>
                )
            },
            cell: ({ row, getValue }) => {
                const name = getValue() as string;
                // Use fallback if name is empty
                const displayName = name || row.original.campo_amplio || row.original.campo_especifico || "N/A";

                return (
                    <div
                        className="flex items-center"
                        style={{ paddingLeft: `${row.depth * 1.5}rem` }}
                    >
                        {row.getCanExpand() && (
                            <button
                                onClick={row.getToggleExpandedHandler()}
                                className="mr-2 p-0.5 hover:bg-slate-200 rounded text-slate-500 transition-colors"
                            >
                                {row.getIsExpanded() ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                            </button>
                        )}
                        <span className={`leading-tight ${row.depth === 0 ? 'font-bold text-slate-900' : row.depth === 1 ? 'font-medium text-slate-700' : 'text-slate-600'}`}>
                            {displayName}
                        </span>
                    </div>
                );
            },
        },
        {
            accessorKey: 'num_ies',
            header: ({ column }) => {
                const isSorted = column.getIsSorted();
                return (
                    <div className="flex justify-center">
                        <button
                            className="flex items-center space-x-1 hover:text-slate-700 transition-colors"
                            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                        >
                            <span>IES</span>
                            {isSorted === "asc" ? (
                                <ArrowUp className="w-3 h-3 ml-1 text-brand-blue" />
                            ) : isSorted === "desc" ? (
                                <ArrowDown className="w-3 h-3 ml-1 text-brand-blue" />
                            ) : (
                                <ArrowUpDown className="w-3 h-3 ml-1 opacity-50" />
                            )}
                        </button>
                    </div>
                )
            },
            cell: info => <div className="text-center font-bold text-slate-900">{(info.getValue<number>() || 0).toLocaleString('es-CO')}</div>,
        },
        {
            accessorKey: 'num_programs',
            header: ({ column }) => {
                const isSorted = column.getIsSorted();
                return (
                    <div className="flex justify-center">
                        <button
                            className="flex items-center space-x-1 hover:text-slate-700 transition-colors"
                            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                        >
                            <span>Prog.</span>
                            {isSorted === "asc" ? (
                                <ArrowUp className="w-3 h-3 ml-1 text-brand-blue" />
                            ) : isSorted === "desc" ? (
                                <ArrowDown className="w-3 h-3 ml-1 text-brand-blue" />
                            ) : (
                                <ArrowUpDown className="w-3 h-3 ml-1 opacity-50" />
                            )}
                        </button>
                    </div>
                )
            },
            cell: info => <div className="text-center font-bold text-slate-900">{(info.getValue<number>() || 0).toLocaleString('es-CO')}</div>,
        },
        {
            accessorKey: 'total_matricula',
            header: ({ column }) => {
                const isSorted = column.getIsSorted();
                return (
                    <div className="flex justify-end">
                        <button
                            className="flex items-center space-x-1 hover:text-slate-700 transition-colors"
                            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                        >
                            <span>Matrícula</span>
                            {isSorted === "asc" ? (
                                <ArrowUp className="w-3 h-3 ml-1 text-brand-blue" />
                            ) : isSorted === "desc" ? (
                                <ArrowDown className="w-3 h-3 ml-1 text-brand-blue" />
                            ) : (
                                <ArrowUpDown className="w-3 h-3 ml-1 opacity-50" />
                            )}
                        </button>
                    </div>
                )
            },
            cell: ({ row, getValue }) => {
                const val = getValue<number>() || 0;
                const growth = row.original.total_matricula_growth;
                return (
                    <div className="flex flex-col items-end">
                        <span className="font-black text-brand-blue">{val.toLocaleString('es-CO')}</span>
                        {growth !== null && (
                            <span className={`text-[0.55rem] font-black px-1 rounded-sm mt-0.5 ${growth >= 0 ? 'text-emerald-600 bg-emerald-50' : 'text-rose-600 bg-rose-50'}`}>
                                {growth >= 0 ? '↑' : '↓'} {Math.abs(growth).toFixed(1)}%
                            </span>
                        )}
                    </div>
                );
            },
        },
        {
            accessorKey: 'total_pcurso',
            header: ({ column }) => {
                const isSorted = column.getIsSorted();
                return (
                    <div className="flex justify-end">
                        <button
                            className="flex items-center space-x-1 hover:text-slate-700 transition-colors"
                            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                        >
                            <span>Primer C.</span>
                            {isSorted === "asc" ? (
                                <ArrowUp className="w-3 h-3 ml-1 text-brand-blue" />
                            ) : isSorted === "desc" ? (
                                <ArrowDown className="w-3 h-3 ml-1 text-brand-blue" />
                            ) : (
                                <ArrowUpDown className="w-3 h-3 ml-1 opacity-50" />
                            )}
                        </button>
                    </div>
                )
            },
            cell: ({ row, getValue }) => {
                const val = getValue<number>() || 0;
                const growth = row.original.total_pcurso_growth;
                return (
                    <div className="flex flex-col items-end">
                        <span className="font-bold text-slate-700">{val.toLocaleString('es-CO')}</span>
                        {growth !== null && (
                            <span className={`text-[0.55rem] font-black px-1 rounded-sm mt-0.5 ${growth >= 0 ? 'text-emerald-600 bg-emerald-50' : 'text-rose-600 bg-rose-50'}`}>
                                {growth >= 0 ? '↑' : '↓'} {Math.abs(growth).toFixed(1)}%
                            </span>
                        )}
                    </div>
                );
            },
        },
        {
            accessorKey: 'total_graduados',
            header: ({ column }) => {
                const isSorted = column.getIsSorted();
                return (
                    <div className="flex justify-end">
                        <button
                            className="flex items-center space-x-1 hover:text-slate-700 transition-colors"
                            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                        >
                            <span>Graduados</span>
                            {isSorted === "asc" ? (
                                <ArrowUp className="w-3 h-3 ml-1 text-brand-blue" />
                            ) : isSorted === "desc" ? (
                                <ArrowDown className="w-3 h-3 ml-1 text-brand-blue" />
                            ) : (
                                <ArrowUpDown className="w-3 h-3 ml-1 opacity-50" />
                            )}
                        </button>
                    </div>
                )
            },
            cell: ({ row, getValue }) => {
                const val = getValue<number>() || 0;
                const growth = row.original.total_graduados_growth;
                return (
                    <div className="flex flex-col items-end">
                        <span className="font-bold text-slate-700">{val.toLocaleString('es-CO')}</span>
                        {growth !== null && (
                            <span className={`text-[0.55rem] font-black px-1 rounded-sm mt-0.5 ${growth >= 0 ? 'text-emerald-600 bg-emerald-50' : 'text-rose-600 bg-rose-50'}`}>
                                {growth >= 0 ? '↑' : '↓'} {Math.abs(growth).toFixed(1)}%
                            </span>
                        )}
                    </div>
                );
            },
        },
        {
            accessorKey: 'avg_desercion',
            header: ({ column }) => {
                const isSorted = column.getIsSorted();
                return (
                    <div className="flex justify-center">
                        <button
                            className="flex items-center space-x-1 hover:text-slate-700 transition-colors"
                            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                        >
                            <span>Deserción</span>
                            {isSorted === "asc" ? (
                                <ArrowUp className="w-3 h-3 ml-1 text-brand-blue" />
                            ) : isSorted === "desc" ? (
                                <ArrowDown className="w-3 h-3 ml-1 text-brand-blue" />
                            ) : (
                                <ArrowUpDown className="w-3 h-3 ml-1 opacity-50" />
                            )}
                        </button>
                    </div>
                )
            },
            cell: ({ row, getValue }) => {
                const val = getValue<number>() || 0;
                const growth = row.original.avg_desercion_growth;
                return (
                    <div className={`flex flex-col items-center font-black ${val > 15 ? 'text-rose-600' : 'text-emerald-600'}`}>
                        <span>{val > 0 ? `${val}%` : '-'}</span>
                        {growth !== null && (
                            <span className={`text-[0.55rem] font-black px-1 rounded-sm mt-0.5 ${growth <= 0 ? 'text-emerald-600 bg-emerald-50' : 'text-rose-600 bg-rose-50'}`}>
                                {growth >= 0 ? '↑' : '↓'} {Math.abs(growth).toFixed(1)}%
                            </span>
                        )}
                    </div>
                );
            },
        },
        {
            accessorKey: 'avg_saberpro',
            header: ({ column }) => {
                const isSorted = column.getIsSorted();
                return (
                    <div className="flex justify-center">
                        <button
                            className="flex items-center space-x-1 hover:text-slate-700 transition-colors"
                            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                        >
                            <span>Saber PRO</span>
                            {isSorted === "asc" ? (
                                <ArrowUp className="w-3 h-3 ml-1 text-brand-blue" />
                            ) : isSorted === "desc" ? (
                                <ArrowDown className="w-3 h-3 ml-1 text-brand-blue" />
                            ) : (
                                <ArrowUpDown className="w-3 h-3 ml-1 opacity-50" />
                            )}
                        </button>
                    </div>
                )
            },
            cell: ({ row, getValue }) => {
                const val = getValue<number>() || 0;
                const growth = row.original.avg_saberpro_growth;
                return (
                    <div className="flex flex-col items-center font-bold text-slate-700">
                        <span>{val > 0 ? val : '-'}</span>
                        {growth !== null && (
                            <span className={`text-[0.55rem] font-black px-1 rounded-sm mt-0.5 ${growth >= 0 ? 'text-emerald-600 bg-emerald-50' : 'text-rose-600 bg-rose-50'}`}>
                                {growth >= 0 ? '↑' : '↓'} {Math.abs(growth).toFixed(1)}%
                            </span>
                        )}
                    </div>
                );
            },
        },
        {
            accessorKey: 'avg_empleabilidad',
            header: ({ column }) => {
                const isSorted = column.getIsSorted();
                return (
                    <div className="flex justify-center">
                        <button
                            className="flex items-center space-x-1 hover:text-slate-700 transition-colors"
                            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                        >
                            <span>Empleabilidad</span>
                            {isSorted === "asc" ? (
                                <ArrowUp className="w-3 h-3 ml-1 text-brand-blue" />
                            ) : isSorted === "desc" ? (
                                <ArrowDown className="w-3 h-3 ml-1 text-brand-blue" />
                            ) : (
                                <ArrowUpDown className="w-3 h-3 ml-1 opacity-50" />
                            )}
                        </button>
                    </div>
                )
            },
            cell: ({ row, getValue }) => {
                const val = getValue<number>() || 0;
                const growth = row.original.avg_empleabilidad_growth;
                return (
                    <div className="flex flex-col items-center font-bold text-slate-700">
                        <span>{val > 0 ? `${val}%` : '-'}</span>
                        {growth !== null && (
                            <span className={`text-[0.55rem] font-black px-1 rounded-sm mt-0.5 ${growth >= 0 ? 'text-emerald-600 bg-emerald-50' : 'text-rose-600 bg-rose-50'}`}>
                                {growth >= 0 ? '↑' : '↓'} {Math.abs(growth).toFixed(1)}%
                            </span>
                        )}
                    </div>
                );
            },
        },
    ], []);

    const iesColumns = React.useMemo<ColumnDef<IESTableItem>[]>(() => [
        {
            accessorKey: 'name',
            header: ({ column }) => {
                const isSorted = column.getIsSorted();
                return (
                    <button
                        className="flex items-center space-x-1 hover:text-slate-700 transition-colors"
                        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                    >
                        <span>Institución / Área / NBC</span>
                        {isSorted === "asc" ? (
                            <ArrowUp className="w-3 h-3 ml-1 text-brand-blue" />
                        ) : isSorted === "desc" ? (
                            <ArrowDown className="w-3 h-3 ml-1 text-brand-blue" />
                        ) : (
                            <ArrowUpDown className="w-3 h-3 ml-1 opacity-50" />
                        )}
                    </button>
                )
            },
            cell: ({ row, getValue }) => {
                const name = getValue() as string;
                // Use fallback if name is empty
                const displayName = name || "N/A";

                return (
                    <div
                        className="flex items-center"
                        style={{ paddingLeft: `${row.depth * 1.5}rem` }}
                    >
                        {row.getCanExpand() && (
                            <button
                                onClick={row.getToggleExpandedHandler()}
                                className="mr-2 p-0.5 hover:bg-slate-200 rounded text-slate-500 transition-colors"
                            >
                                {row.getIsExpanded() ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                            </button>
                        )}
                        <span className={`leading-tight ${row.depth === 0 ? 'font-black text-brand-blue text-sm' :
                            row.depth === 1 ? 'font-bold text-slate-800 text-[0.8rem]' :
                                row.depth === 2 ? 'font-bold text-slate-600 text-[0.75rem]' :
                                    (row.original as any).level === 'programa' ? 'text-[0.65rem] font-medium text-slate-400 italic' :
                                        'text-[0.7rem] text-slate-600 font-medium'
                            }`}>
                            {displayName}
                        </span>
                    </div>
                );
            },
        },
        // Skipped Num IES
        {
            accessorKey: 'num_programs',
            header: ({ column }) => {
                const isSorted = column.getIsSorted();
                return (
                    <div className="flex justify-center">
                        <button
                            className="flex items-center space-x-1 hover:text-slate-700 transition-colors"
                            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                        >
                            <span>Prog.</span>
                            {isSorted === "asc" ? (
                                <ArrowUp className="w-3 h-3 ml-1 text-brand-blue" />
                            ) : isSorted === "desc" ? (
                                <ArrowDown className="w-3 h-3 ml-1 text-brand-blue" />
                            ) : (
                                <ArrowUpDown className="w-3 h-3 ml-1 opacity-50" />
                            )}
                        </button>
                    </div>
                )
            },
            cell: info => <div className="text-center font-bold text-slate-900">{(info.getValue<number>() || 0).toLocaleString('es-CO')}</div>,
        },
        {
            accessorKey: 'total_matricula',
            header: ({ column }) => {
                const isSorted = column.getIsSorted();
                return (
                    <div className="flex justify-end">
                        <button
                            className="flex items-center space-x-1 hover:text-slate-700 transition-colors"
                            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                        >
                            <span>Matrícula</span>
                            {isSorted === "asc" ? (
                                <ArrowUp className="w-3 h-3 ml-1 text-brand-blue" />
                            ) : isSorted === "desc" ? (
                                <ArrowDown className="w-3 h-3 ml-1 text-brand-blue" />
                            ) : (
                                <ArrowUpDown className="w-3 h-3 ml-1 opacity-50" />
                            )}
                        </button>
                    </div>
                )
            },
            cell: ({ row, getValue }) => {
                const val = getValue<number>() || 0;
                const growth = row.original.total_matricula_growth;
                return (
                    <div className="flex flex-col items-end">
                        <span className="font-black text-brand-blue">{val.toLocaleString('es-CO')}</span>
                        {growth !== null && (
                            <span className={`text-[0.55rem] font-black px-1 rounded-sm mt-0.5 ${growth >= 0 ? 'text-emerald-600 bg-emerald-50' : 'text-rose-600 bg-rose-50'}`}>
                                {growth >= 0 ? '↑' : '↓'} {Math.abs(growth).toFixed(1)}%
                            </span>
                        )}
                    </div>
                );
            },
        },
        {
            accessorKey: 'total_pcurso',
            header: ({ column }) => {
                const isSorted = column.getIsSorted();
                return (
                    <div className="flex justify-end">
                        <button
                            className="flex items-center space-x-1 hover:text-slate-700 transition-colors"
                            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                        >
                            <span>Primer C.</span>
                            {isSorted === "asc" ? (
                                <ArrowUp className="w-3 h-3 ml-1 text-brand-blue" />
                            ) : isSorted === "desc" ? (
                                <ArrowDown className="w-3 h-3 ml-1 text-brand-blue" />
                            ) : (
                                <ArrowUpDown className="w-3 h-3 ml-1 opacity-50" />
                            )}
                        </button>
                    </div>
                )
            },
            cell: ({ row, getValue }) => {
                const val = getValue<number>() || 0;
                const growth = row.original.total_pcurso_growth;
                return (
                    <div className="flex flex-col items-end">
                        <span className="font-bold text-slate-700">{val.toLocaleString('es-CO')}</span>
                        {growth !== null && (
                            <span className={`text-[0.55rem] font-black px-1 rounded-sm mt-0.5 ${growth >= 0 ? 'text-emerald-600 bg-emerald-50' : 'text-rose-600 bg-rose-50'}`}>
                                {growth >= 0 ? '↑' : '↓'} {Math.abs(growth).toFixed(1)}%
                            </span>
                        )}
                    </div>
                );
            },
        },
        {
            accessorKey: 'total_graduados',
            header: ({ column }) => {
                const isSorted = column.getIsSorted();
                return (
                    <div className="flex justify-end">
                        <button
                            className="flex items-center space-x-1 hover:text-slate-700 transition-colors"
                            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                        >
                            <span>Graduados</span>
                            {isSorted === "asc" ? (
                                <ArrowUp className="w-3 h-3 ml-1 text-brand-blue" />
                            ) : isSorted === "desc" ? (
                                <ArrowDown className="w-3 h-3 ml-1 text-brand-blue" />
                            ) : (
                                <ArrowUpDown className="w-3 h-3 ml-1 opacity-50" />
                            )}
                        </button>
                    </div>
                )
            },
            cell: ({ row, getValue }) => {
                const val = getValue<number>() || 0;
                const growth = row.original.total_graduados_growth;
                return (
                    <div className="flex flex-col items-end">
                        <span className="font-bold text-slate-700">{val.toLocaleString('es-CO')}</span>
                        {growth !== null && (
                            <span className={`text-[0.55rem] font-black px-1 rounded-sm mt-0.5 ${growth >= 0 ? 'text-emerald-600 bg-emerald-50' : 'text-rose-600 bg-rose-50'}`}>
                                {growth >= 0 ? '↑' : '↓'} {Math.abs(growth).toFixed(1)}%
                            </span>
                        )}
                    </div>
                );
            },
        },
        {
            accessorKey: 'avg_desercion',
            header: ({ column }) => {
                const isSorted = column.getIsSorted();
                return (
                    <div className="flex justify-center">
                        <button
                            className="flex items-center space-x-1 hover:text-slate-700 transition-colors"
                            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                        >
                            <span>Deserción</span>
                            {isSorted === "asc" ? (
                                <ArrowUp className="w-3 h-3 ml-1 text-brand-blue" />
                            ) : isSorted === "desc" ? (
                                <ArrowDown className="w-3 h-3 ml-1 text-brand-blue" />
                            ) : (
                                <ArrowUpDown className="w-3 h-3 ml-1 opacity-50" />
                            )}
                        </button>
                    </div>
                )
            },
            cell: ({ row, getValue }) => {
                const val = getValue<number>() || 0;
                const growth = row.original.avg_desercion_growth;
                return (
                    <div className={`flex flex-col items-center font-black ${val > 15 ? 'text-rose-600' : 'text-emerald-600'}`}>
                        <span>{val > 0 ? `${val}%` : '-'}</span>
                        {growth !== null && (
                            <span className={`text-[0.55rem] font-black px-1 rounded-sm mt-0.5 ${growth <= 0 ? 'text-emerald-600 bg-emerald-50' : 'text-rose-600 bg-rose-50'}`}>
                                {growth >= 0 ? '↑' : '↓'} {Math.abs(growth).toFixed(1)}%
                            </span>
                        )}
                    </div>
                );
            },
        },
        {
            accessorKey: 'avg_saberpro',
            header: ({ column }) => {
                const isSorted = column.getIsSorted();
                return (
                    <div className="flex justify-center">
                        <button
                            className="flex items-center space-x-1 hover:text-slate-700 transition-colors"
                            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                        >
                            <span>Saber PRO</span>
                            {isSorted === "asc" ? (
                                <ArrowUp className="w-3 h-3 ml-1 text-brand-blue" />
                            ) : isSorted === "desc" ? (
                                <ArrowDown className="w-3 h-3 ml-1 text-brand-blue" />
                            ) : (
                                <ArrowUpDown className="w-3 h-3 ml-1 opacity-50" />
                            )}
                        </button>
                    </div>
                )
            },
            cell: ({ row, getValue }) => {
                const val = getValue<number>() || 0;
                const growth = row.original.avg_saberpro_growth;
                return (
                    <div className="flex flex-col items-center font-bold text-slate-700">
                        <span>{val > 0 ? val : '-'}</span>
                        {growth !== null && (
                            <span className={`text-[0.55rem] font-black px-1 rounded-sm mt-0.5 ${growth >= 0 ? 'text-emerald-600 bg-emerald-50' : 'text-rose-600 bg-rose-50'}`}>
                                {growth >= 0 ? '↑' : '↓'} {Math.abs(growth).toFixed(1)}%
                            </span>
                        )}
                    </div>
                );
            },
        },
        {
            accessorKey: 'avg_empleabilidad',
            header: ({ column }) => {
                const isSorted = column.getIsSorted();
                return (
                    <div className="flex justify-center">
                        <button
                            className="flex items-center space-x-1 hover:text-slate-700 transition-colors"
                            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                        >
                            <span>Empleabilidad</span>
                            {isSorted === "asc" ? (
                                <ArrowUp className="w-3 h-3 ml-1 text-brand-blue" />
                            ) : isSorted === "desc" ? (
                                <ArrowDown className="w-3 h-3 ml-1 text-brand-blue" />
                            ) : (
                                <ArrowUpDown className="w-3 h-3 ml-1 opacity-50" />
                            )}
                        </button>
                    </div>
                )
            },
            cell: ({ row, getValue }) => {
                const val = getValue<number>() || 0;
                const growth = row.original.avg_empleabilidad_growth;
                return (
                    <div className="flex flex-col items-center font-bold text-slate-700">
                        <span>{val > 0 ? `${val}%` : '-'}</span>
                        {growth !== null && (
                            <span className={`text-[0.55rem] font-black px-1 rounded-sm mt-0.5 ${growth >= 0 ? 'text-emerald-600 bg-emerald-50' : 'text-rose-600 bg-rose-50'}`}>
                                {growth >= 0 ? '↑' : '↓'} {Math.abs(growth).toFixed(1)}%
                            </span>
                        )}
                    </div>
                );
            },
        },
    ], []);

    const iesListColumns = React.useMemo<ColumnDef<IESTableItem>[]>(() => [
        {
            accessorKey: 'name',
            header: ({ column }) => {
                const isSorted = column.getIsSorted();
                return (
                    <button
                        className="flex items-center space-x-1 hover:text-slate-700 transition-colors"
                        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                    >
                        <span>Institución</span>
                        {isSorted === "asc" ? (
                            <ArrowUp className="w-3 h-3 ml-1 text-brand-blue" />
                        ) : isSorted === "desc" ? (
                            <ArrowDown className="w-3 h-3 ml-1 text-brand-blue" />
                        ) : (
                            <ArrowUpDown className="w-3 h-3 ml-1 opacity-50" />
                        )}
                    </button>
                )
            },
            cell: ({ getValue }) => {
                const name = getValue() as string;
                return (
                    <span className="font-bold text-slate-800 leading-tight">
                        {name || "N/A"}
                    </span>
                );
            },
        },
        {
            accessorKey: 'num_programs',
            header: ({ column }) => {
                const isSorted = column.getIsSorted();
                return (
                    <div className="flex justify-center">
                        <button
                            className="flex items-center space-x-1 hover:text-slate-700 transition-colors"
                            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                        >
                            <span>Prog.</span>
                            {isSorted === "asc" ? (
                                <ArrowUp className="w-3 h-3 ml-1 text-brand-blue" />
                            ) : isSorted === "desc" ? (
                                <ArrowDown className="w-3 h-3 ml-1 text-brand-blue" />
                            ) : (
                                <ArrowUpDown className="w-3 h-3 ml-1 opacity-50" />
                            )}
                        </button>
                    </div>
                )
            },
            cell: info => <div className="text-center font-bold text-slate-900">{(info.getValue<number>() || 0).toLocaleString('es-CO')}</div>,
        },
        {
            accessorKey: 'total_matricula',
            header: ({ column }) => {
                const isSorted = column.getIsSorted();
                return (
                    <div className="flex justify-end">
                        <button
                            className="flex items-center space-x-1 hover:text-slate-700 transition-colors"
                            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                        >
                            <span>Matrícula</span>
                            {isSorted === "asc" ? (
                                <ArrowUp className="w-3 h-3 ml-1 text-brand-blue" />
                            ) : isSorted === "desc" ? (
                                <ArrowDown className="w-3 h-3 ml-1 text-brand-blue" />
                            ) : (
                                <ArrowUpDown className="w-3 h-3 ml-1 opacity-50" />
                            )}
                        </button>
                    </div>
                )
            },
            cell: ({ row, getValue }) => {
                const val = getValue<number>() || 0;
                const growth = row.original.total_matricula_growth;
                return (
                    <div className="flex flex-col items-end">
                        <span className="font-black text-brand-blue">{val.toLocaleString('es-CO')}</span>
                        {growth !== null && (
                            <span className={`text-[0.55rem] font-black px-1 rounded-sm mt-0.5 ${growth >= 0 ? 'text-emerald-600 bg-emerald-50' : 'text-rose-600 bg-rose-50'}`}>
                                {growth >= 0 ? '↑' : '↓'} {Math.abs(growth).toFixed(1)}%
                            </span>
                        )}
                    </div>
                );
            },
        },
        {
            accessorKey: 'total_pcurso',
            header: ({ column }) => {
                const isSorted = column.getIsSorted();
                return (
                    <div className="flex justify-end">
                        <button
                            className="flex items-center space-x-1 hover:text-slate-700 transition-colors"
                            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                        >
                            <span>Primer C.</span>
                            {isSorted === "asc" ? (
                                <ArrowUp className="w-3 h-3 ml-1 text-brand-blue" />
                            ) : isSorted === "desc" ? (
                                <ArrowDown className="w-3 h-3 ml-1 text-brand-blue" />
                            ) : (
                                <ArrowUpDown className="w-3 h-3 ml-1 opacity-50" />
                            )}
                        </button>
                    </div>
                )
            },
            cell: ({ row, getValue }) => {
                const val = getValue<number>() || 0;
                const growth = row.original.total_pcurso_growth;
                return (
                    <div className="flex flex-col items-end">
                        <span className="font-bold text-slate-700">{val.toLocaleString('es-CO')}</span>
                        {growth !== null && (
                            <span className={`text-[0.55rem] font-black px-1 rounded-sm mt-0.5 ${growth >= 0 ? 'text-emerald-600 bg-emerald-50' : 'text-rose-600 bg-rose-50'}`}>
                                {growth >= 0 ? '↑' : '↓'} {Math.abs(growth).toFixed(1)}%
                            </span>
                        )}
                    </div>
                );
            },
        },
        {
            accessorKey: 'total_graduados',
            header: ({ column }) => {
                const isSorted = column.getIsSorted();
                return (
                    <div className="flex justify-end">
                        <button
                            className="flex items-center space-x-1 hover:text-slate-700 transition-colors"
                            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                        >
                            <span>Graduados</span>
                            {isSorted === "asc" ? (
                                <ArrowUp className="w-3 h-3 ml-1 text-brand-blue" />
                            ) : isSorted === "desc" ? (
                                <ArrowDown className="w-3 h-3 ml-1 text-brand-blue" />
                            ) : (
                                <ArrowUpDown className="w-3 h-3 ml-1 opacity-50" />
                            )}
                        </button>
                    </div>
                )
            },
            cell: ({ row, getValue }) => {
                const val = getValue<number>() || 0;
                const growth = row.original.total_graduados_growth;
                return (
                    <div className="flex flex-col items-end">
                        <span className="font-bold text-slate-700">{val.toLocaleString('es-CO')}</span>
                        {growth !== null && (
                            <span className={`text-[0.55rem] font-black px-1 rounded-sm mt-0.5 ${growth >= 0 ? 'text-emerald-600 bg-emerald-50' : 'text-rose-600 bg-rose-50'}`}>
                                {growth >= 0 ? '↑' : '↓'} {Math.abs(growth).toFixed(1)}%
                            </span>
                        )}
                    </div>
                );
            },
        },
        {
            accessorKey: 'avg_desercion',
            header: ({ column }) => {
                const isSorted = column.getIsSorted();
                return (
                    <div className="flex justify-center">
                        <button
                            className="flex items-center space-x-1 hover:text-slate-700 transition-colors"
                            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                        >
                            <span>Deserción</span>
                            {isSorted === "asc" ? (
                                <ArrowUp className="w-3 h-3 ml-1 text-brand-blue" />
                            ) : isSorted === "desc" ? (
                                <ArrowDown className="w-3 h-3 ml-1 text-brand-blue" />
                            ) : (
                                <ArrowUpDown className="w-3 h-3 ml-1 opacity-50" />
                            )}
                        </button>
                    </div>
                )
            },
            cell: ({ row, getValue }) => {
                const val = getValue<number>() || 0;
                const growth = row.original.avg_desercion_growth;
                return (
                    <div className={`flex flex-col items-center font-black ${val > 15 ? 'text-rose-600' : 'text-emerald-600'}`}>
                        <span>{val > 0 ? `${val}%` : '-'}</span>
                        {growth !== null && (
                            <span className={`text-[0.55rem] font-black px-1 rounded-sm mt-0.5 ${growth <= 0 ? 'text-emerald-600 bg-emerald-50' : 'text-rose-600 bg-rose-50'}`}>
                                {growth >= 0 ? '↑' : '↓'} {Math.abs(growth).toFixed(1)}%
                            </span>
                        )}
                    </div>
                );
            },
        },
        {
            accessorKey: 'avg_saberpro',
            header: ({ column }) => {
                const isSorted = column.getIsSorted();
                return (
                    <div className="flex justify-center">
                        <button
                            className="flex items-center space-x-1 hover:text-slate-700 transition-colors"
                            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                        >
                            <span>Saber PRO</span>
                            {isSorted === "asc" ? (
                                <ArrowUp className="w-3 h-3 ml-1 text-brand-blue" />
                            ) : isSorted === "desc" ? (
                                <ArrowDown className="w-3 h-3 ml-1 text-brand-blue" />
                            ) : (
                                <ArrowUpDown className="w-3 h-3 ml-1 opacity-50" />
                            )}
                        </button>
                    </div>
                )
            },
            cell: ({ row, getValue }) => {
                const val = getValue<number>() || 0;
                const growth = row.original.avg_saberpro_growth;
                return (
                    <div className="flex flex-col items-center font-bold text-slate-700">
                        <span>{val > 0 ? val : '-'}</span>
                        {growth !== null && (
                            <span className={`text-[0.55rem] font-black px-1 rounded-sm mt-0.5 ${growth >= 0 ? 'text-emerald-600 bg-emerald-50' : 'text-rose-600 bg-rose-50'}`}>
                                {growth >= 0 ? '↑' : '↓'} {Math.abs(growth).toFixed(1)}%
                            </span>
                        )}
                    </div>
                );
            },
        },
        {
            accessorKey: 'avg_empleabilidad',
            header: ({ column }) => {
                const isSorted = column.getIsSorted();
                return (
                    <div className="flex justify-center">
                        <button
                            className="flex items-center space-x-1 hover:text-slate-700 transition-colors"
                            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                        >
                            <span>Empleabilidad</span>
                            {isSorted === "asc" ? (
                                <ArrowUp className="w-3 h-3 ml-1 text-brand-blue" />
                            ) : isSorted === "desc" ? (
                                <ArrowDown className="w-3 h-3 ml-1 text-brand-blue" />
                            ) : (
                                <ArrowUpDown className="w-3 h-3 ml-1 opacity-50" />
                            )}
                        </button>
                    </div>
                );
            },
            cell: ({ row, getValue }) => {
                const val = getValue<number>() || 0;
                const growth = row.original.avg_empleabilidad_growth;
                return (
                    <div className="flex flex-col items-center font-bold text-slate-700">
                        <span>{val > 0 ? `${val}%` : '-'}</span>
                        {growth !== null && (
                            <span className={`text-[0.55rem] font-black px-1 rounded-sm mt-0.5 ${growth >= 0 ? 'text-emerald-600 bg-emerald-50' : 'text-rose-600 bg-rose-50'}`}>
                                {growth >= 0 ? '↑' : '↓'} {Math.abs(growth).toFixed(1)}%
                            </span>
                        )}
                    </div>
                );
            },
        },
    ], []);

    // Columns for the Sector Modal (supports expansion: Sector → IES)
    const sectorModalColumns = React.useMemo<ColumnDef<any>[]>(() => [
        {
            accessorKey: 'name',
            header: ({ column }) => {
                const isSorted = column.getIsSorted();
                return (
                    <button
                        className="flex items-center space-x-1 hover:text-slate-700 transition-colors"
                        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                    >
                        <span>Sector / Institución</span>
                        {isSorted === "asc" ? (
                            <ArrowUp className="w-3 h-3 ml-1 text-brand-blue" />
                        ) : isSorted === "desc" ? (
                            <ArrowDown className="w-3 h-3 ml-1 text-brand-blue" />
                        ) : (
                            <ArrowUpDown className="w-3 h-3 ml-1 opacity-50" />
                        )}
                    </button>
                )
            },
            cell: ({ row, getValue }) => {
                const name = getValue() as string;
                const isSectorRow = row.depth === 0;
                return (
                    <div
                        className="flex items-center"
                        style={{ paddingLeft: `${row.depth * 1.5}rem` }}
                    >
                        {row.getCanExpand() && (
                            <button
                                onClick={row.getToggleExpandedHandler()}
                                className="mr-2 p-0.5 hover:bg-slate-200 rounded text-slate-500 transition-colors"
                            >
                                {row.getIsExpanded() ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                            </button>
                        )}
                        {!row.getCanExpand() && row.depth > 0 && <span className="w-6 mr-2 inline-block" />}
                        <span className={`leading-tight ${isSectorRow ? 'font-black text-brand-blue text-sm' : 'font-medium text-slate-700'}`}>
                            {name || "N/A"}
                        </span>
                    </div>
                );
            },
        },
        {
            accessorKey: 'num_ies',
            header: ({ column }) => {
                const isSorted = column.getIsSorted();
                return (
                    <div className="flex justify-center">
                        <button className="flex items-center space-x-1 hover:text-slate-700 transition-colors" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
                            <span>IES</span>
                            {isSorted === "asc" ? <ArrowUp className="w-3 h-3 ml-1 text-brand-blue" /> : isSorted === "desc" ? <ArrowDown className="w-3 h-3 ml-1 text-brand-blue" /> : <ArrowUpDown className="w-3 h-3 ml-1 opacity-50" />}
                        </button>
                    </div>
                )
            },
            cell: info => <div className="text-center font-bold text-slate-900">{(info.getValue<number>() || 0).toLocaleString('es-CO')}</div>,
        },
        {
            accessorKey: 'num_programs',
            header: ({ column }) => {
                const isSorted = column.getIsSorted();
                return (
                    <div className="flex justify-center">
                        <button className="flex items-center space-x-1 hover:text-slate-700 transition-colors" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
                            <span>Prog.</span>
                            {isSorted === "asc" ? <ArrowUp className="w-3 h-3 ml-1 text-brand-blue" /> : isSorted === "desc" ? <ArrowDown className="w-3 h-3 ml-1 text-brand-blue" /> : <ArrowUpDown className="w-3 h-3 ml-1 opacity-50" />}
                        </button>
                    </div>
                )
            },
            cell: info => <div className="text-center font-bold text-slate-900">{(info.getValue<number>() || 0).toLocaleString('es-CO')}</div>,
        },
        {
            accessorKey: 'total_matricula',
            header: ({ column }) => {
                const isSorted = column.getIsSorted();
                return (
                    <div className="flex justify-end">
                        <button className="flex items-center space-x-1 hover:text-slate-700 transition-colors" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
                            <span>Matrícula</span>
                            {isSorted === "asc" ? <ArrowUp className="w-3 h-3 ml-1 text-brand-blue" /> : isSorted === "desc" ? <ArrowDown className="w-3 h-3 ml-1 text-brand-blue" /> : <ArrowUpDown className="w-3 h-3 ml-1 opacity-50" />}
                        </button>
                    </div>
                )
            },
            cell: ({ row, getValue }) => {
                const val = getValue<number>() || 0;
                const growth = row.original.total_matricula_growth;
                return (
                    <div className="flex flex-col items-end">
                        <span className="font-black text-brand-blue">{val.toLocaleString('es-CO')}</span>
                        {growth !== null && growth !== undefined && (
                            <span className={`text-[0.55rem] font-black px-1 rounded-sm mt-0.5 ${growth >= 0 ? 'text-emerald-600 bg-emerald-50' : 'text-rose-600 bg-rose-50'}`}>
                                {growth >= 0 ? '↑' : '↓'} {Math.abs(growth).toFixed(1)}%
                            </span>
                        )}
                    </div>
                );
            },
        },
        {
            accessorKey: 'total_pcurso',
            header: ({ column }) => {
                const isSorted = column.getIsSorted();
                return (
                    <div className="flex justify-end">
                        <button className="flex items-center space-x-1 hover:text-slate-700 transition-colors" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
                            <span>P. Curso</span>
                            {isSorted === "asc" ? <ArrowUp className="w-3 h-3 ml-1 text-brand-blue" /> : isSorted === "desc" ? <ArrowDown className="w-3 h-3 ml-1 text-brand-blue" /> : <ArrowUpDown className="w-3 h-3 ml-1 opacity-50" />}
                        </button>
                    </div>
                )
            },
            cell: ({ row, getValue }) => {
                const val = getValue<number>() || 0;
                const growth = row.original.total_pcurso_growth;
                return (
                    <div className="flex flex-col items-end">
                        <span className="font-bold text-slate-700">{val.toLocaleString('es-CO')}</span>
                        {growth !== null && (
                            <span className={`text-[0.55rem] font-black px-1 rounded-sm mt-0.5 ${growth >= 0 ? 'text-emerald-600 bg-emerald-50' : 'text-rose-600 bg-rose-50'}`}>
                                {growth >= 0 ? '↑' : '↓'} {Math.abs(growth).toFixed(1)}%
                            </span>
                        )}
                    </div>
                );
            },
        },
        {
            accessorKey: 'total_graduados',
            header: ({ column }) => {
                const isSorted = column.getIsSorted();
                return (
                    <div className="flex justify-end">
                        <button className="flex items-center space-x-1 hover:text-slate-700 transition-colors" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
                            <span>Graduados</span>
                            {isSorted === "asc" ? <ArrowUp className="w-3 h-3 ml-1 text-brand-blue" /> : isSorted === "desc" ? <ArrowDown className="w-3 h-3 ml-1 text-brand-blue" /> : <ArrowUpDown className="w-3 h-3 ml-1 opacity-50" />}
                        </button>
                    </div>
                )
            },
            cell: ({ row, getValue }) => {
                const val = getValue<number>() || 0;
                const growth = row.original.total_graduados_growth;
                return (
                    <div className="flex flex-col items-end">
                        <span className="font-bold text-slate-700">{val.toLocaleString('es-CO')}</span>
                        {growth !== null && (
                            <span className={`text-[0.55rem] font-black px-1 rounded-sm mt-0.5 ${growth >= 0 ? 'text-emerald-600 bg-emerald-50' : 'text-rose-600 bg-rose-50'}`}>
                                {growth >= 0 ? '↑' : '↓'} {Math.abs(growth).toFixed(1)}%
                            </span>
                        )}
                    </div>
                );
            },
        },
        {
            accessorKey: 'avg_desercion',
            header: ({ column }) => {
                const isSorted = column.getIsSorted();
                return (
                    <div className="flex justify-center">
                        <button className="flex items-center space-x-1 hover:text-slate-700 transition-colors" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
                            <span>Deserción</span>
                            {isSorted === "asc" ? <ArrowUp className="w-3 h-3 ml-1 text-brand-blue" /> : isSorted === "desc" ? <ArrowDown className="w-3 h-3 ml-1 text-brand-blue" /> : <ArrowUpDown className="w-3 h-3 ml-1 opacity-50" />}
                        </button>
                    </div>
                )
            },
            cell: ({ getValue }) => {
                const val = getValue<number>() || 0;
                return <div className={`text-center font-black ${val > 15 ? 'text-rose-600' : 'text-emerald-600'}`}>{val > 0 ? `${val.toFixed(2)}%` : '-'}</div>;
            },
        },
        {
            accessorKey: 'avg_saberpro',
            header: ({ column }) => {
                const isSorted = column.getIsSorted();
                return (
                    <div className="flex justify-center">
                        <button className="flex items-center space-x-1 hover:text-slate-700 transition-colors" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
                            <span>Saber PRO</span>
                            {isSorted === "asc" ? <ArrowUp className="w-3 h-3 ml-1 text-brand-blue" /> : isSorted === "desc" ? <ArrowDown className="w-3 h-3 ml-1 text-brand-blue" /> : <ArrowUpDown className="w-3 h-3 ml-1 opacity-50" />}
                        </button>
                    </div>
                )
            },
            cell: ({ getValue }) => {
                const val = getValue<number>() || 0;
                return <div className="text-center font-bold text-slate-700">{val > 0 ? val.toFixed(1) : '-'}</div>;
            },
        },
        {
            accessorKey: 'avg_empleabilidad',
            header: ({ column }) => {
                const isSorted = column.getIsSorted();
                return (
                    <div className="flex justify-center">
                        <button className="flex items-center space-x-1 hover:text-slate-700 transition-colors" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
                            <span>Empleabilidad</span>
                            {isSorted === "asc" ? <ArrowUp className="w-3 h-3 ml-1 text-brand-blue" /> : isSorted === "desc" ? <ArrowDown className="w-3 h-3 ml-1 text-brand-blue" /> : <ArrowUpDown className="w-3 h-3 ml-1 opacity-50" />}
                        </button>
                    </div>
                )
            },
            cell: ({ getValue }) => {
                const val = getValue<number>() || 0;
                return <div className="text-center font-bold text-slate-700">{val > 0 ? `${val.toFixed(2)}%` : '-'}</div>;
            },
        },
    ], []);

    // fieldLevelModalColumns removed - redundant with Tab 2 explicit layout

    // Columns for the Sector Programs Modal (supports expansion: NBC → Sector)
    const fieldSectorModalColumns = React.useMemo<ColumnDef<any>[]>(() => [
        {
            accessorKey: 'name',
            header: ({ column }) => {
                const isSorted = column.getIsSorted();
                return (
                    <button
                        className="flex items-center space-x-1 hover:text-slate-700 transition-colors"
                        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                    >
                        <span>Campo / Sector</span>
                        {isSorted === "asc" ? (
                            <ArrowUp className="w-3 h-3 ml-1 text-brand-blue" />
                        ) : isSorted === "desc" ? (
                            <ArrowDown className="w-3 h-3 ml-1 text-brand-blue" />
                        ) : (
                            <ArrowUpDown className="w-3 h-3 ml-1 opacity-50" />
                        )}
                    </button>
                )
            },
            cell: ({ row, getValue }) => {
                const name = getValue() as string;
                const isTopLevel = row.depth === 0;
                return (
                    <div
                        className="flex items-center"
                        style={{ paddingLeft: `${row.depth * 1.5}rem` }}
                    >
                        {row.getCanExpand() && (
                            <button
                                onClick={row.getToggleExpandedHandler()}
                                className="mr-2 p-0.5 hover:bg-slate-200 rounded text-slate-500 transition-colors"
                            >
                                {row.getIsExpanded() ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                            </button>
                        )}
                        {!row.getCanExpand() && row.depth > 0 && <span className="w-6 mr-2 inline-block" />}
                        <span className={`leading-tight ${isTopLevel ? 'font-black text-slate-800' : 'font-black text-brand-blue'}`}>
                            {name || "N/A"}
                        </span>
                    </div>
                );
            },
        },
        {
            accessorKey: 'num_ies',
            header: ({ column }) => {
                const isSorted = column.getIsSorted();
                return (
                    <div className="flex justify-center">
                        <button className="flex items-center space-x-1 hover:text-slate-700 transition-colors" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
                            <span>IES</span>
                            {isSorted === "asc" ? <ArrowUp className="w-3 h-3 ml-1 text-brand-blue" /> : isSorted === "desc" ? <ArrowDown className="w-3 h-3 ml-1 text-brand-blue" /> : <ArrowUpDown className="w-3 h-3 ml-1 opacity-50" />}
                        </button>
                    </div>
                )
            },
            cell: info => <div className="text-center font-bold text-slate-900">{(info.getValue<number>() || 0).toLocaleString('es-CO')}</div>,
        },
        {
            accessorKey: 'num_programs',
            header: ({ column }) => {
                const isSorted = column.getIsSorted();
                return (
                    <div className="flex justify-center">
                        <button className="flex items-center space-x-1 hover:text-slate-700 transition-colors" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
                            <span>Prog.</span>
                            {isSorted === "asc" ? <ArrowUp className="w-3 h-3 ml-1 text-brand-blue" /> : isSorted === "desc" ? <ArrowDown className="w-3 h-3 ml-1 text-brand-blue" /> : <ArrowUpDown className="w-3 h-3 ml-1 opacity-50" />}
                        </button>
                    </div>
                )
            },
            cell: info => <div className="text-center font-bold text-slate-900">{(info.getValue<number>() || 0).toLocaleString('es-CO')}</div>,
        },
        {
            accessorKey: 'total_matricula',
            header: ({ column }) => {
                const isSorted = column.getIsSorted();
                return (
                    <div className="flex justify-end">
                        <button className="flex items-center space-x-1 hover:text-slate-700 transition-colors" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
                            <span>Matrícula</span>
                            {isSorted === "asc" ? <ArrowUp className="w-3 h-3 ml-1 text-brand-blue" /> : isSorted === "desc" ? <ArrowDown className="w-3 h-3 ml-1 text-brand-blue" /> : <ArrowUpDown className="w-3 h-3 ml-1 opacity-50" />}
                        </button>
                    </div>
                )
            },
            cell: ({ row, getValue }) => {
                const val = getValue<number>() || 0;
                const growth = row.original.total_matricula_growth;
                return (
                    <div className="flex flex-col items-end">
                        <span className="font-black text-brand-blue">{val.toLocaleString('es-CO')}</span>
                        {growth !== null && growth !== undefined && (
                            <span className={`text-[0.55rem] font-black px-1 rounded-sm mt-0.5 ${growth >= 0 ? 'text-emerald-600 bg-emerald-50' : 'text-rose-600 bg-rose-50'}`}>
                                {growth >= 0 ? '↑' : '↓'} {Math.abs(growth).toFixed(1)}%
                            </span>
                        )}
                    </div>
                );
            },
        },
        {
            accessorKey: 'total_pcurso',
            header: ({ column }) => {
                const isSorted = column.getIsSorted();
                return (
                    <div className="flex justify-end">
                        <button className="flex items-center space-x-1 hover:text-slate-700 transition-colors" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
                            <span>P. Curso</span>
                            {isSorted === "asc" ? <ArrowUp className="w-3 h-3 ml-1 text-brand-blue" /> : isSorted === "desc" ? <ArrowDown className="w-3 h-3 ml-1 text-brand-blue" /> : <ArrowUpDown className="w-3 h-3 ml-1 opacity-50" />}
                        </button>
                    </div>
                )
            },
            cell: ({ row, getValue }) => {
                const val = getValue<number>() || 0;
                const growth = row.original.total_pcurso_growth;
                return (
                    <div className="flex flex-col items-end">
                        <span className="font-bold text-slate-700">{val.toLocaleString('es-CO')}</span>
                        {growth !== null && (
                            <span className={`text-[0.55rem] font-black px-1 rounded-sm mt-0.5 ${growth >= 0 ? 'text-emerald-600 bg-emerald-50' : 'text-rose-600 bg-rose-50'}`}>
                                {growth >= 0 ? '↑' : '↓'} {Math.abs(growth).toFixed(1)}%
                            </span>
                        )}
                    </div>
                );
            },
        },
        {
            accessorKey: 'total_graduados',
            header: ({ column }) => {
                const isSorted = column.getIsSorted();
                return (
                    <div className="flex justify-end">
                        <button className="flex items-center space-x-1 hover:text-slate-700 transition-colors" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
                            <span>Graduados</span>
                            {isSorted === "asc" ? <ArrowUp className="w-3 h-3 ml-1 text-brand-blue" /> : isSorted === "desc" ? <ArrowDown className="w-3 h-3 ml-1 text-brand-blue" /> : <ArrowUpDown className="w-3 h-3 ml-1 opacity-50" />}
                        </button>
                    </div>
                )
            },
            cell: ({ row, getValue }) => {
                const val = getValue<number>() || 0;
                const growth = row.original.total_graduados_growth;
                return (
                    <div className="flex flex-col items-end">
                        <span className="font-bold text-slate-700">{val.toLocaleString('es-CO')}</span>
                        {growth !== null && (
                            <span className={`text-[0.55rem] font-black px-1 rounded-sm mt-0.5 ${growth >= 0 ? 'text-emerald-600 bg-emerald-50' : 'text-rose-600 bg-rose-50'}`}>
                                {growth >= 0 ? '↑' : '↓'} {Math.abs(growth).toFixed(1)}%
                            </span>
                        )}
                    </div>
                );
            },
        },
        {
            accessorKey: 'avg_desercion',
            header: ({ column }) => {
                const isSorted = column.getIsSorted();
                return (
                    <div className="flex justify-center">
                        <button className="flex items-center space-x-1 hover:text-slate-700 transition-colors" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
                            <span>Deserción</span>
                            {isSorted === "asc" ? <ArrowUp className="w-3 h-3 ml-1 text-brand-blue" /> : isSorted === "desc" ? <ArrowDown className="w-3 h-3 ml-1 text-brand-blue" /> : <ArrowUpDown className="w-3 h-3 ml-1 opacity-50" />}
                        </button>
                    </div>
                )
            },
            cell: ({ getValue }) => {
                const val = getValue<number>() || 0;
                return <div className={`text-center font-black ${val > 15 ? 'text-rose-600' : 'text-emerald-600'}`}>{val > 0 ? `${val.toFixed(2)}%` : '-'}</div>;
            },
        },
        {
            accessorKey: 'avg_saberpro',
            header: ({ column }) => {
                const isSorted = column.getIsSorted();
                return (
                    <div className="flex justify-center">
                        <button className="flex items-center space-x-1 hover:text-slate-700 transition-colors" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
                            <span>Saber PRO</span>
                            {isSorted === "asc" ? <ArrowUp className="w-3 h-3 ml-1 text-brand-blue" /> : isSorted === "desc" ? <ArrowDown className="w-3 h-3 ml-1 text-brand-blue" /> : <ArrowUpDown className="w-3 h-3 ml-1 opacity-50" />}
                        </button>
                    </div>
                )
            },
            cell: ({ getValue }) => {
                const val = getValue<number>() || 0;
                return <div className="text-center font-bold text-slate-700">{val > 0 ? val.toFixed(1) : '-'}</div>;
            },
        },
        {
            accessorKey: 'avg_empleabilidad',
            header: ({ column }) => {
                const isSorted = column.getIsSorted();
                return (
                    <div className="flex justify-center">
                        <button className="flex items-center space-x-1 hover:text-slate-700 transition-colors" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
                            <span>Empleabilidad</span>
                            {isSorted === "asc" ? <ArrowUp className="w-3 h-3 ml-1 text-brand-blue" /> : isSorted === "desc" ? <ArrowDown className="w-3 h-3 ml-1 text-brand-blue" /> : <ArrowUpDown className="w-3 h-3 ml-1 opacity-50" />}
                        </button>
                    </div>
                )
            },
            cell: ({ getValue }) => {
                const val = getValue<number>() || 0;
                return <div className="text-center font-bold text-slate-700">{val > 0 ? `${val.toFixed(2)}%` : '-'}</div>;
            },
        },
    ], []);

    // Custom columns for the disciplines modal to support expandable hierarchy
    const fieldModalColumns = React.useMemo<ColumnDef<any>[]>(() => [
        {
            accessorKey: 'name',
            header: ({ column }) => {
                const isSorted = column.getIsSorted();
                return (
                    <button
                        className="flex items-center space-x-1 hover:text-slate-700 transition-colors"
                        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                    >
                        <span>Área / Núcleo Básico</span>
                        {isSorted === "asc" ? (
                            <ArrowUp className="w-3 h-3 ml-1 text-brand-blue" />
                        ) : isSorted === "desc" ? (
                            <ArrowDown className="w-3 h-3 ml-1 text-brand-blue" />
                        ) : (
                            <ArrowUpDown className="w-3 h-3 ml-1 opacity-50" />
                        )}
                    </button>
                )
            },
            cell: ({ row, getValue }) => {
                const name = getValue() as string;
                const isTopLevel = row.depth === 0; // Area de Conocimiento
                return (
                    <div
                        className="flex items-center"
                        style={{ paddingLeft: `${row.depth * 1.5}rem` }}
                    >
                        {row.getCanExpand() && (
                            <button
                                onClick={row.getToggleExpandedHandler()}
                                className="mr-2 p-0.5 hover:bg-slate-200 rounded text-slate-500 transition-colors"
                            >
                                {row.getIsExpanded() ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                            </button>
                        )}
                        {!row.getCanExpand() && row.depth > 0 && <span className="w-6 mr-2 inline-block" />}
                        <span className={`leading-tight ${isTopLevel ? 'font-black text-brand-blue text-sm' : 'font-medium text-slate-700'}`}>
                            {name || "N/A"}
                        </span>
                    </div>
                );
            },
        },
        {
            accessorKey: 'num_ies',
            header: ({ column }) => {
                const isSorted = column.getIsSorted();
                return (
                    <div className="flex justify-center">
                        <button className="flex items-center space-x-1 hover:text-slate-700 transition-colors" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
                            <span>IES</span>
                            {isSorted === "asc" ? <ArrowUp className="w-3 h-3 ml-1 text-brand-blue" /> : isSorted === "desc" ? <ArrowDown className="w-3 h-3 ml-1 text-brand-blue" /> : <ArrowUpDown className="w-3 h-3 ml-1 opacity-50" />}
                        </button>
                    </div>
                )
            },
            cell: info => <div className="text-center font-bold text-slate-900">{(info.getValue<number>() || 0).toLocaleString('es-CO')}</div>,
        },
        {
            accessorKey: 'num_programs',
            header: ({ column }) => {
                const isSorted = column.getIsSorted();
                return (
                    <div className="flex justify-center">
                        <button className="flex items-center space-x-1 hover:text-slate-700 transition-colors" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
                            <span>Prog.</span>
                            {isSorted === "asc" ? <ArrowUp className="w-3 h-3 ml-1 text-brand-blue" /> : isSorted === "desc" ? <ArrowDown className="w-3 h-3 ml-1 text-brand-blue" /> : <ArrowUpDown className="w-3 h-3 ml-1 opacity-50" />}
                        </button>
                    </div>
                )
            },
            cell: info => <div className="text-center font-bold text-slate-900">{(info.getValue<number>() || 0).toLocaleString('es-CO')}</div>,
        },
        {
            accessorKey: 'total_matricula',
            header: ({ column }) => {
                const isSorted = column.getIsSorted();
                return (
                    <div className="flex justify-end">
                        <button className="flex items-center space-x-1 hover:text-slate-700 transition-colors" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
                            <span>Matrícula</span>
                            {isSorted === "asc" ? <ArrowUp className="w-3 h-3 ml-1 text-brand-blue" /> : isSorted === "desc" ? <ArrowDown className="w-3 h-3 ml-1 text-brand-blue" /> : <ArrowUpDown className="w-3 h-3 ml-1 opacity-50" />}
                        </button>
                    </div>
                )
            },
            cell: ({ row, getValue }) => {
                const val = getValue<number>() || 0;
                const growth = row.original.total_matricula_growth;
                return (
                    <div className="flex flex-col items-end">
                        <span className="font-black text-brand-blue">{val.toLocaleString('es-CO')}</span>
                        {growth !== null && growth !== undefined && (
                            <span className={`text-[0.55rem] font-black px-1 rounded-sm mt-0.5 ${growth >= 0 ? 'text-emerald-600 bg-emerald-50' : 'text-rose-600 bg-rose-50'}`}>
                                {growth >= 0 ? '↑' : '↓'} {Math.abs(growth).toFixed(1)}%
                            </span>
                        )}
                    </div>
                );
            },
        },
        {
            accessorKey: 'total_pcurso',
            header: ({ column }) => {
                const isSorted = column.getIsSorted();
                return (
                    <div className="flex justify-end">
                        <button className="flex items-center space-x-1 hover:text-slate-700 transition-colors" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
                            <span>P. Curso</span>
                            {isSorted === "asc" ? <ArrowUp className="w-3 h-3 ml-1 text-brand-blue" /> : isSorted === "desc" ? <ArrowDown className="w-3 h-3 ml-1 text-brand-blue" /> : <ArrowUpDown className="w-3 h-3 ml-1 opacity-50" />}
                        </button>
                    </div>
                )
            },
            cell: ({ row, getValue }) => {
                const val = getValue<number>() || 0;
                const growth = row.original.total_pcurso_growth;
                return (
                    <div className="flex flex-col items-end">
                        <span className="font-bold text-slate-700">{val.toLocaleString('es-CO')}</span>
                        {growth !== null && (
                            <span className={`text-[0.55rem] font-black px-1 rounded-sm mt-0.5 ${growth >= 0 ? 'text-emerald-600 bg-emerald-50' : 'text-rose-600 bg-rose-50'}`}>
                                {growth >= 0 ? '↑' : '↓'} {Math.abs(growth).toFixed(1)}%
                            </span>
                        )}
                    </div>
                );
            },
        },
        {
            accessorKey: 'total_graduados',
            header: ({ column }) => {
                const isSorted = column.getIsSorted();
                return (
                    <div className="flex justify-end">
                        <button className="flex items-center space-x-1 hover:text-slate-700 transition-colors" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
                            <span>Graduados</span>
                            {isSorted === "asc" ? <ArrowUp className="w-3 h-3 ml-1 text-brand-blue" /> : isSorted === "desc" ? <ArrowDown className="w-3 h-3 ml-1 text-brand-blue" /> : <ArrowUpDown className="w-3 h-3 ml-1 opacity-50" />}
                        </button>
                    </div>
                )
            },
            cell: ({ row, getValue }) => {
                const val = getValue<number>() || 0;
                const growth = row.original.total_graduados_growth;
                return (
                    <div className="flex flex-col items-end">
                        <span className="font-bold text-slate-700">{val.toLocaleString('es-CO')}</span>
                        {growth !== null && (
                            <span className={`text-[0.55rem] font-black px-1 rounded-sm mt-0.5 ${growth >= 0 ? 'text-emerald-600 bg-emerald-50' : 'text-rose-600 bg-rose-50'}`}>
                                {growth >= 0 ? '↑' : '↓'} {Math.abs(growth).toFixed(1)}%
                            </span>
                        )}
                    </div>
                );
            },
        },
        {
            accessorKey: 'avg_desercion',
            header: ({ column }) => {
                const isSorted = column.getIsSorted();
                return (
                    <div className="flex justify-center">
                        <button className="flex items-center space-x-1 hover:text-slate-700 transition-colors" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
                            <span>Deserción</span>
                            {isSorted === "asc" ? <ArrowUp className="w-3 h-3 ml-1 text-brand-blue" /> : isSorted === "desc" ? <ArrowDown className="w-3 h-3 ml-1 text-brand-blue" /> : <ArrowUpDown className="w-3 h-3 ml-1 opacity-50" />}
                        </button>
                    </div>
                )
            },
            cell: ({ getValue }) => {
                const val = getValue<number>() || 0;
                return <div className={`text-center font-black ${val > 15 ? 'text-rose-600' : 'text-emerald-600'}`}>{val > 0 ? `${val.toFixed(2)}%` : '-'}</div>;
            },
        },
        {
            accessorKey: 'avg_saberpro',
            header: ({ column }) => {
                const isSorted = column.getIsSorted();
                return (
                    <div className="flex justify-center">
                        <button className="flex items-center space-x-1 hover:text-slate-700 transition-colors" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
                            <span>Saber PRO</span>
                            {isSorted === "asc" ? <ArrowUp className="w-3 h-3 ml-1 text-brand-blue" /> : isSorted === "desc" ? <ArrowDown className="w-3 h-3 ml-1 text-brand-blue" /> : <ArrowUpDown className="w-3 h-3 ml-1 opacity-50" />}
                        </button>
                    </div>
                )
            },
            cell: ({ getValue }) => {
                const val = getValue<number>() || 0;
                return <div className="text-center font-bold text-slate-700">{val > 0 ? val.toFixed(1) : '-'}</div>;
            },
        },
        {
            accessorKey: 'avg_empleabilidad',
            header: ({ column }) => {
                const isSorted = column.getIsSorted();
                return (
                    <div className="flex justify-center">
                        <button className="flex items-center space-x-1 hover:text-slate-700 transition-colors" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
                            <span>Empleabilidad</span>
                            {isSorted === "asc" ? <ArrowUp className="w-3 h-3 ml-1 text-brand-blue" /> : isSorted === "desc" ? <ArrowDown className="w-3 h-3 ml-1 text-brand-blue" /> : <ArrowUpDown className="w-3 h-3 ml-1 opacity-50" />}
                        </button>
                    </div>
                )
            },
            cell: ({ getValue }) => {
                const val = getValue<number>() || 0;
                return <div className="text-center font-bold text-slate-700">{val > 0 ? `${val.toFixed(2)}%` : '-'}</div>;
            },
        },
    ], []);

    // Columns for the Level Modal (supports expansion: Nivel → IES)
    const levelModalColumns = React.useMemo<ColumnDef<any>[]>(() => [
        {
            accessorKey: 'name',
            header: ({ column }) => {
                const isSorted = column.getIsSorted();
                return (
                    <button
                        className="flex items-center space-x-1 hover:text-slate-700 transition-colors"
                        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                    >
                        <span>Nivel / Institución</span>
                        {isSorted === "asc" ? (
                            <ArrowUp className="w-3 h-3 ml-1 text-brand-blue" />
                        ) : isSorted === "desc" ? (
                            <ArrowDown className="w-3 h-3 ml-1 text-brand-blue" />
                        ) : (
                            <ArrowUpDown className="w-3 h-3 ml-1 opacity-50" />
                        )}
                    </button>
                )
            },
            cell: ({ row, getValue }) => {
                const name = getValue() as string;
                const isLevelRow = row.depth === 0;
                return (
                    <div
                        className="flex items-center"
                        style={{ paddingLeft: `${row.depth * 1.5}rem` }}
                    >
                        {row.getCanExpand() && (
                            <button
                                onClick={row.getToggleExpandedHandler()}
                                className="mr-2 p-0.5 hover:bg-slate-200 rounded text-slate-500 transition-colors"
                            >
                                {row.getIsExpanded() ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                            </button>
                        )}
                        {!row.getCanExpand() && row.depth > 0 && <span className="w-6 mr-2 inline-block" />}
                        <span className={`leading-tight ${isLevelRow ? 'font-black text-brand-blue text-sm' : 'font-medium text-slate-700'}`}>
                            {name || "N/A"}
                        </span>
                    </div>
                );
            },
        },
        {
            accessorKey: 'num_ies',
            header: ({ column }) => {
                const isSorted = column.getIsSorted();
                return (
                    <div className="flex justify-center">
                        <button className="flex items-center space-x-1 hover:text-slate-700 transition-colors" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
                            <span>IES</span>
                            {isSorted === "asc" ? <ArrowUp className="w-3 h-3 ml-1 text-brand-blue" /> : isSorted === "desc" ? <ArrowDown className="w-3 h-3 ml-1 text-brand-blue" /> : <ArrowUpDown className="w-3 h-3 ml-1 opacity-50" />}
                        </button>
                    </div>
                )
            },
            cell: info => <div className="text-center font-bold text-slate-900">{(info.getValue<number>() || 0).toLocaleString('es-CO')}</div>,
        },
        {
            accessorKey: 'num_programs',
            header: ({ column }) => {
                const isSorted = column.getIsSorted();
                return (
                    <div className="flex justify-center">
                        <button className="flex items-center space-x-1 hover:text-slate-700 transition-colors" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
                            <span>Prog.</span>
                            {isSorted === "asc" ? <ArrowUp className="w-3 h-3 ml-1 text-brand-blue" /> : isSorted === "desc" ? <ArrowDown className="w-3 h-3 ml-1 text-brand-blue" /> : <ArrowUpDown className="w-3 h-3 ml-1 opacity-50" />}
                        </button>
                    </div>
                )
            },
            cell: info => <div className="text-center font-bold text-slate-900">{(info.getValue<number>() || 0).toLocaleString('es-CO')}</div>,
        },
        {
            accessorKey: 'total_matricula',
            header: ({ column }) => {
                const isSorted = column.getIsSorted();
                return (
                    <div className="flex justify-end">
                        <button className="flex items-center space-x-1 hover:text-slate-700 transition-colors" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
                            <span>Matrícula</span>
                            {isSorted === "asc" ? <ArrowUp className="w-3 h-3 ml-1 text-brand-blue" /> : isSorted === "desc" ? <ArrowDown className="w-3 h-3 ml-1 text-brand-blue" /> : <ArrowUpDown className="w-3 h-3 ml-1 opacity-50" />}
                        </button>
                    </div>
                )
            },
            cell: ({ row, getValue }) => {
                const val = getValue<number>() || 0;
                const growth = row.original.total_matricula_growth;
                return (
                    <div className="flex flex-col items-end">
                        <span className="font-black text-brand-blue">{val.toLocaleString('es-CO')}</span>
                        {growth !== null && growth !== undefined && (
                            <span className={`text-[0.55rem] font-black px-1 rounded-sm mt-0.5 ${growth >= 0 ? 'text-emerald-600 bg-emerald-50' : 'text-rose-600 bg-rose-50'}`}>
                                {growth >= 0 ? '↑' : '↓'} {Math.abs(growth).toFixed(1)}%
                            </span>
                        )}
                    </div>
                );
            },
        },
        {
            accessorKey: 'total_pcurso',
            header: ({ column }) => {
                const isSorted = column.getIsSorted();
                return (
                    <div className="flex justify-end">
                        <button className="flex items-center space-x-1 hover:text-slate-700 transition-colors" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
                            <span>P. Curso</span>
                            {isSorted === "asc" ? <ArrowUp className="w-3 h-3 ml-1 text-brand-blue" /> : isSorted === "desc" ? <ArrowDown className="w-3 h-3 ml-1 text-brand-blue" /> : <ArrowUpDown className="w-3 h-3 ml-1 opacity-50" />}
                        </button>
                    </div>
                )
            },
            cell: ({ row, getValue }) => {
                const val = getValue<number>() || 0;
                const growth = row.original.total_pcurso_growth;
                return (
                    <div className="flex flex-col items-end">
                        <span className="font-bold text-slate-700">{val.toLocaleString('es-CO')}</span>
                        {growth !== null && (
                            <span className={`text-[0.55rem] font-black px-1 rounded-sm mt-0.5 ${growth >= 0 ? 'text-emerald-600 bg-emerald-50' : 'text-rose-600 bg-rose-50'}`}>
                                {growth >= 0 ? '↑' : '↓'} {Math.abs(growth).toFixed(1)}%
                            </span>
                        )}
                    </div>
                );
            },
        },
        {
            accessorKey: 'total_graduados',
            header: ({ column }) => {
                const isSorted = column.getIsSorted();
                return (
                    <div className="flex justify-end">
                        <button className="flex items-center space-x-1 hover:text-slate-700 transition-colors" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
                            <span>Graduados</span>
                            {isSorted === "asc" ? <ArrowUp className="w-3 h-3 ml-1 text-brand-blue" /> : isSorted === "desc" ? <ArrowDown className="w-3 h-3 ml-1 text-brand-blue" /> : <ArrowUpDown className="w-3 h-3 ml-1 opacity-50" />}
                        </button>
                    </div>
                )
            },
            cell: ({ row, getValue }) => {
                const val = getValue<number>() || 0;
                const growth = row.original.total_graduados_growth;
                return (
                    <div className="flex flex-col items-end">
                        <span className="font-bold text-slate-700">{val.toLocaleString('es-CO')}</span>
                        {growth !== null && (
                            <span className={`text-[0.55rem] font-black px-1 rounded-sm mt-0.5 ${growth >= 0 ? 'text-emerald-600 bg-emerald-50' : 'text-rose-600 bg-rose-50'}`}>
                                {growth >= 0 ? '↑' : '↓'} {Math.abs(growth).toFixed(1)}%
                            </span>
                        )}
                    </div>
                );
            },
        },
        {
            accessorKey: 'avg_desercion',
            header: ({ column }) => {
                const isSorted = column.getIsSorted();
                return (
                    <div className="flex justify-center">
                        <button className="flex items-center space-x-1 hover:text-slate-700 transition-colors" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
                            <span>Deserción</span>
                            {isSorted === "asc" ? <ArrowUp className="w-3 h-3 ml-1 text-brand-blue" /> : isSorted === "desc" ? <ArrowDown className="w-3 h-3 ml-1 text-brand-blue" /> : <ArrowUpDown className="w-3 h-3 ml-1 opacity-50" />}
                        </button>
                    </div>
                )
            },
            cell: ({ getValue }) => {
                const val = getValue<number>() || 0;
                return <div className={`text-center font-black ${val > 15 ? 'text-rose-600' : 'text-emerald-600'}`}>{val > 0 ? `${val.toFixed(2)}%` : '-'}</div>;
            },
        },
        {
            accessorKey: 'avg_saberpro',
            header: ({ column }) => {
                const isSorted = column.getIsSorted();
                return (
                    <div className="flex justify-center">
                        <button className="flex items-center space-x-1 hover:text-slate-700 transition-colors" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
                            <span>Saber PRO</span>
                            {isSorted === "asc" ? <ArrowUp className="w-3 h-3 ml-1 text-brand-blue" /> : isSorted === "desc" ? <ArrowDown className="w-3 h-3 ml-1 text-brand-blue" /> : <ArrowUpDown className="w-3 h-3 ml-1 opacity-50" />}
                        </button>
                    </div>
                )
            },
            cell: ({ getValue }) => {
                const val = getValue<number>() || 0;
                return <div className="text-center font-bold text-slate-700">{val > 0 ? val.toFixed(1) : '-'}</div>;
            },
        },
        {
            accessorKey: 'avg_empleabilidad',
            header: ({ column }) => {
                const isSorted = column.getIsSorted();
                return (
                    <div className="flex justify-center">
                        <button className="flex items-center space-x-1 hover:text-slate-700 transition-colors" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
                            <span>Empleabilidad</span>
                            {isSorted === "asc" ? <ArrowUp className="w-3 h-3 ml-1 text-brand-blue" /> : isSorted === "desc" ? <ArrowDown className="w-3 h-3 ml-1 text-brand-blue" /> : <ArrowUpDown className="w-3 h-3 ml-1 opacity-50" />}
                        </button>
                    </div>
                )
            },
            cell: ({ getValue }) => {
                const val = getValue<number>() || 0;
                return <div className="text-center font-bold text-slate-700">{val > 0 ? `${val.toFixed(2)}%` : '-'}</div>;
            },
        },
    ], []);

    const table = useReactTable({
        data: disciplineTable || [],
        columns,

        state: {
            expanded,
            sorting,
        },
        onExpandedChange: setExpanded,
        onSortingChange: setSorting,
        getSubRows: (row) => row.children,
        getCoreRowModel: getCoreRowModel(),
        getExpandedRowModel: getExpandedRowModel(),
        getSortedRowModel: getSortedRowModel(),
        autoResetExpanded: false,
    });

    const iesTableInstance = useReactTable({
        data: iesTable || [],
        columns: iesColumns,
        state: {
            expanded: iesExpanded,
            sorting: iesSorting,
        },
        onExpandedChange: setIesExpanded,
        onSortingChange: setIesSorting,
        getSubRows: (row) => row.children,
        getCoreRowModel: getCoreRowModel(),
        getExpandedRowModel: getExpandedRowModel(),
        getSortedRowModel: getSortedRowModel(),
        autoResetExpanded: false,
    });

    // Check if fetch is needed
    const needsFetch = useCallback((tabIndex: number) => {
        return lastFetchedFilters[tabIndex] !== debouncedFilters;
    }, [lastFetchedFilters, debouncedFilters]);

    const markFetched = useCallback((tabIndex: number) => {
        setLastFetchedFilters(prev => ({ ...prev, [tabIndex]: debouncedFilters }));
    }, [debouncedFilters]);

    // Tab 0 effect: Resumen y Evolución (Always loaded on initial to check connectivity)
    useEffect(() => {
        if (!isInitialLoad && activeTab !== 0 && activeTab !== 2) return; // Tab 2 uses same KPI data
        if (!needsFetch(0)) return;

        const loadTab0 = async () => {
            !isInitialLoad && setIsUpdating(true);
            try {
                const [kpiRes, evoRes] = await Promise.all([
                    fetchNationalKPIs(debouncedFilters),
                    fetchNationalPrimerCursoEvolution(debouncedFilters)
                ]);
                setKpis(kpiRes);
                setEvolutionData(evoRes);
                markFetched(0);
                markFetched(2); // Tab 2 uses KPI data
                setError(null);
            } catch (err) {
                console.error("Error loading tab 0/2 data:", err);
                setError(err instanceof Error ? err.message : String(err));
            } finally {
                setIsInitialLoad(false);
                setIsUpdating(false);
            }
        };
        loadTab0();
    }, [debouncedFilters, activeTab, isInitialLoad, needsFetch, markFetched]);

    // Tab 1 effect: Análisis por Sector
    useEffect(() => {
        if (activeTab !== 1 || !needsFetch(1)) return;
        const loadTab1 = async () => {
            setIsUpdating(true);
            try {
                const sectorEvoRes = await fetchNationalPrimerCursoEvolutionBySector(debouncedFilters);
                setSectorEvolutionData(sectorEvoRes);
                markFetched(1);
            } catch (err) {
                console.error("Error loading tab 1 data:", err);
            } finally {
                setIsUpdating(false);
            }
        };
        loadTab1();
    }, [debouncedFilters, activeTab, needsFetch, markFetched]);

    // Tab 3 effect: Disciplinas
    useEffect(() => {
        if (activeTab !== 3 || !needsFetch(3)) return;
        const loadTab3 = async () => {
            setIsUpdating(true);
            try {
                const [statsRes, fieldTrendRes, tableRes, iesTableRes] = await Promise.all([
                    fetchNationalDisciplineStats(debouncedFilters),
                    fetchFieldTrend(debouncedFilters),
                    fetchNationalDisciplineTable(debouncedFilters),
                    fetchNationalIESTable(debouncedFilters)
                ]);
                setDisciplineStats(statsRes);
                setFieldTrend(fieldTrendRes);
                setDisciplineTable(tableRes);
                setIesTable(iesTableRes);
                markFetched(3);
            } catch (err) {
                console.error("Error loading tab 3 data:", err);
            } finally {
                setIsUpdating(false);
            }
        };
        loadTab3();
    }, [debouncedFilters, activeTab, needsFetch, markFetched]);

    // Tab 4 effect: Resultados Saber PRO
    useEffect(() => {
        if (activeTab !== 4 || !needsFetch(4)) return;
        const loadTab4 = async () => {
            setIsUpdating(true);
            try {
                const [saberRes, saberProTrendRes] = await Promise.all([
                    fetchNationalSaberProStats(debouncedFilters),
                    fetchNationalSaberProTrend(debouncedFilters)
                ]);
                setSaberProData(saberRes);
                setSaberProTrendData(saberProTrendRes);
                markFetched(4);
            } catch (err) {
                console.error("Error loading tab 4 data:", err);
            } finally {
                setIsUpdating(false);
            }
        };
        loadTab4();
    }, [debouncedFilters, activeTab, needsFetch, markFetched]);

    // Tab 5 effect: Demografía Saber PRO
    useEffect(() => {
        if (activeTab !== 5) return;

        const currentDistParams = { ...debouncedFilters, breakdown_column: demogBreakdown || undefined };
        const currentTrendParams = {
            ...debouncedFilters,
            breakdown_column: trendBreakdown || undefined,
            target_sexo: trendBreakdown ? targetSexo : undefined,
            target_estrato: trendBreakdown ? targetEstrato : undefined,
            target_horas_trabajo: trendBreakdown ? targetHoras : undefined,
            target_edad: trendBreakdown ? targetEdad : undefined
        };
        const currentNestedTrendParams = {
            ...debouncedFilters,
            target_sexo: nestedTargetSexo || undefined,
            target_estrato: nestedTargetEstrato || undefined,
            target_horas_trabajo: nestedTargetHoras || undefined,
            target_edad: nestedTargetEdad || undefined,
            nested: true
        };

        const lastFilters = lastFetchedFilters[5];
        const currentTotalParams = JSON.stringify({ dist: currentDistParams, trend: currentTrendParams, nested: currentNestedTrendParams });

        if (lastFilters && lastFilters === currentTotalParams) return;

        const loadTab5 = async () => {
            setIsUpdating(true);
            try {
                const [demogDistRes, demogTrendRes, nestedDemogTrendRes] = await Promise.all([
                    fetchDemographicDistribution(currentDistParams),
                    fetchDemographicTrend(currentTrendParams),
                    fetchDemographicTrend(currentNestedTrendParams)
                ]);
                setDemographicDistribution(demogDistRes);
                setDemographicTrend(demogTrendRes);
                setNestedDemographicTrend(nestedDemogTrendRes);
                setLastFetchedFilters(prev => ({ ...prev, 5: currentTotalParams }));
            } catch (err) {
                console.error("Error loading tab 5 data:", err);
            } finally {
                setIsUpdating(false);
            }
        };
        loadTab5();
    }, [debouncedFilters, activeTab, demogBreakdown, trendBreakdown, targetSexo, targetEstrato, targetHoras, targetEdad, nestedTargetSexo, nestedTargetEstrato, nestedTargetHoras, nestedTargetEdad, lastFetchedFilters]);

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center h-full space-y-4">
                <div className="p-6 bg-red-50 border border-red-200 rounded-3xl text-center max-w-md">
                    <h3 className="text-red-800 font-black text-lg mb-2">Error al cargar datos</h3>
                    <p className="text-red-600 text-sm font-medium">{error}</p>
                    <button
                        onClick={() => window.location.reload()}
                        className="mt-6 px-6 py-2.5 bg-red-600 text-white rounded-xl font-bold text-xs uppercase tracking-wider hover:bg-red-700 transition-all"
                    >
                        Reintentar
                    </button>
                </div>
            </div>
        );
    }

    if (isInitialLoad && !kpis) {
        return (
            <div className="flex flex-col items-center justify-center h-full">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-blue mb-4"></div>
                <p className="text-slate-400 font-bold animate-pulse">Iniciando SymbiAnalytics...</p>
            </div>
        );
    }

    // DEBUG: Remove this later
    if (false && kpis) {
        return <pre className="text-[10px] p-2 bg-slate-100 overflow-auto max-h-screen">{JSON.stringify(kpis, null, 2)}</pre>;
    }

    const summary = kpis?.summary;
    const official = kpis?.by_sector['OFICIAL'];
    const privateSector = kpis?.by_sector['PRIVADO'];
    const levels = kpis?.by_level;

    const formatValue = (value: number | null | undefined, isLocale: boolean = false, suffix: string = "") => {
        if (value === null || value === undefined) return "N/D";
        if (isLocale) return value.toLocaleString('es-CO');
        return `${value}${suffix}`;
    };





    // --- Internal components for the new Nivel de Formación layout ---
    const GenericTableContent = ({ data, columns }: { data: any[], columns: any }) => {
        const [sorting, setSorting] = React.useState<SortingState>([]);
        const [expanded, setExpanded] = React.useState<ExpandedState>({});

        const tableInstance = useReactTable({
            data,
            columns,
            state: { sorting, expanded },
            onSortingChange: setSorting,
            onExpandedChange: setExpanded,
            getCoreRowModel: getCoreRowModel(),
            getSortedRowModel: getSortedRowModel(),
            getExpandedRowModel: getExpandedRowModel(),
            getSubRows: (row: any) => row.children || row.subRows,
        });

        if (!data || data.length === 0) return (
            <div className="flex items-center justify-center p-10 text-slate-400 italic text-xs font-bold">
                No hay datos disponibles para la selección actual
            </div>
        )

        return (
            <table className="w-full text-left border-collapse bg-white rounded-2xl overflow-hidden shadow-sm border border-slate-100">
                <thead className="bg-slate-50 border-b border-slate-100">
                    {tableInstance.getHeaderGroups().map((headerGroup: any) => (
                        <tr key={headerGroup.id}>
                            {headerGroup.headers.map((header: any) => {
                                const isTextRight = ['total_matricula', 'total_pcurso', 'total_graduados'].includes(header.column.id);
                                const isTextCenter = ['num_ies', 'num_programs', 'avg_desercion', 'avg_saberpro', 'avg_empleabilidad'].includes(header.column.id);
                                return (
                                    <th key={header.id} className={`px-3 py-3 text-[0.55rem] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 ${isTextRight ? 'text-right' : isTextCenter ? 'text-center' : 'text-left'}`}>
                                        {flexRender(header.column.columnDef.header, header.getContext())}
                                    </th>
                                )
                            })}
                        </tr>
                    ))}
                </thead>
                <tbody className="divide-y divide-slate-50">
                    {tableInstance.getRowModel().rows.map((row: any) => (
                        <tr key={row.id} className="hover:bg-slate-50/80 transition-colors">
                            {row.getVisibleCells().map((cell: any) => {
                                const isTextRight = ['total_matricula', 'total_pcurso', 'total_graduados'].includes(cell.column.id);
                                const isTextCenter = ['num_ies', 'num_programs', 'avg_desercion', 'avg_saberpro', 'avg_empleabilidad'].includes(cell.column.id);
                                return (
                                    <td key={cell.id} className={`px-3 py-2 text-[0.65rem] border-b border-slate-50 font-medium text-slate-600 ${isTextRight ? 'text-right' : isTextCenter ? 'text-center' : 'text-left'}`}>
                                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                    </td>
                                )
                            })}
                        </tr>
                    ))}
                </tbody>
            </table>
        );
    }

    const Tab2MetricGroup = ({ metric, onOpenModal, levels, formatValue }: { metric: MetricConfig, onOpenModal: (m: MetricConfig) => void, levels: any, formatValue: any }) => {
        return (
            <div className="bg-white/60 backdrop-blur-lg p-6 rounded-[2.5rem] border border-slate-200 shadow-sm hover:shadow-md transition-all group flex flex-col space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div className="flex items-center space-x-3">
                        <div className="p-2 bg-slate-50 text-brand-blue group-hover:bg-brand-blue group-hover:text-white transition-colors duration-300 rounded-xl">
                            <metric.icon className="w-5 h-5" />
                        </div>
                        <h4 className="text-[0.75rem] font-black text-slate-800 tracking-tight uppercase">{metric.label}</h4>
                    </div>
                </div>

                <div className="flex flex-col gap-3">
                    <KPICard
                        title="T&T"
                        value={formatValue((levels?.['T&T'] as any)?.[metric.key], metric.isLocale, metric.suffix)}
                        icon={metric.icon}
                        subtitle="Técnico/Tecnol."
                        colorClass={metric.color}
                        trend={metric.trendKey ? (levels?.['T&T'] as any)?.[metric.trendKey] : null}
                        invertTrendColors={metric.invertTrendColors}
                    />
                    <KPICard
                        title="Universitario"
                        value={formatValue((levels?.['Universitario'] as any)?.[metric.key], metric.isLocale, metric.suffix)}
                        icon={metric.icon}
                        subtitle="Pregrado Univ."
                        colorClass={metric.color}
                        trend={metric.trendKey ? (levels?.['Universitario'] as any)?.[metric.trendKey] : null}
                        invertTrendColors={metric.invertTrendColors}
                    />
                    <KPICard
                        title="Posgrado"
                        value={formatValue((levels?.['Posgrado'] as any)?.[metric.key], metric.isLocale, metric.suffix)}
                        icon={metric.icon}
                        subtitle="Especialización+"
                        colorClass={metric.color}
                        trend={metric.trendKey ? (levels?.['Posgrado'] as any)?.[metric.trendKey] : null}
                        invertTrendColors={metric.invertTrendColors}
                    />
                </div>

                <button
                    onClick={() => onOpenModal(metric)}
                    className="w-full py-2.5 bg-brand-blue/5 hover:bg-brand-blue text-brand-blue hover:text-white rounded-2xl text-[0.6rem] font-black uppercase tracking-widest transition-all mt-2 border border-brand-blue/10"
                >
                    Ver Desglose
                </button>
            </div>
        );
    }

    return (

        <ErrorBoundary>
            <div className={`space-y-12 pb-20 transition-opacity duration-300 ${isUpdating ? 'opacity-40 pointer-events-none' : 'opacity-100'}`}>
                {/* Loading Overlay for updates */}
                {isUpdating && (
                    <div className="fixed top-20 right-10 z-50">
                        <div className="bg-white/80 backdrop-blur-sm px-4 py-2 rounded-full shadow-lg border border-slate-200 flex items-center space-x-2">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-brand-blue"></div>
                            <span className="text-[0.7rem] font-black text-slate-600 uppercase tracking-widest">Actualizando...</span>
                        </div>
                    </div>
                )}
                {/* Header */}
                <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between space-y-4 lg:space-y-0">
                    <div>
                        <h2 className="text-4xl font-black text-slate-900 tracking-tighter mb-2">{title || 'Informe Nacional de Educación'}</h2>
                        <div className="flex items-center space-x-2 text-slate-500 font-medium">
                            <span>{subtitle || 'Consolidado País'}</span>
                            <span>&bull;</span>
                            <span className="text-brand-blue font-bold">SNIES / SPADIES / OLE / ICFES</span>
                        </div>
                    </div>
                </div>

                {/* Tab Navigation */}
                <div className="bg-white p-2 rounded-2xl border border-slate-200 shadow-sm overflow-x-auto hide-scrollbar sticky top-0 z-40">
                    <div className="flex space-x-2 min-w-max">
                        {tabsConfig.map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex items-center space-x-2 px-4 py-3 rounded-xl font-bold text-xs uppercase tracking-wider transition-all duration-200 ${activeTab === tab.id
                                    ? 'bg-brand-blue text-white shadow-md transform scale-[1.02]'
                                    : 'bg-transparent text-slate-500 hover:bg-slate-50 hover:text-slate-700'
                                    }`}
                            >
                                {tab.icon}
                                <span>{tab.label}</span>
                            </button>
                        ))}
                    </div>
                </div>

                <TrendModal
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    metricLabel={selectedMetric?.label || ""}
                    data={trendData}
                />

                <IESModal
                    isOpen={isIESModalOpen}
                    onClose={() => setIsIESModalOpen(false)}
                    data={iesList}
                    isLoading={isIESListLoading}
                    columns={iesListColumns}
                />

                <GenericTableModal
                    isOpen={isProgramsModalOpen}
                    onClose={() => setIsProgramsModalOpen(false)}
                    data={disciplineTable || []}
                    columns={fieldModalColumns}
                    title="Programas Académicos"
                    subtitle="Detalle por Área de Conocimiento y Núcleo Básico"
                    isLoading={isProgramsLoading}
                />

                <GenericTableModal
                    isOpen={isSectorModalOpen}
                    onClose={() => setIsSectorModalOpen(false)}
                    data={sectorTableData}
                    columns={sectorModalColumns}
                    title="Instituciones (IES) por Sector"
                    subtitle="Comparativo Oficial vs Privado — Expande cada sector para ver las IES"
                    isLoading={isSectorLoading}
                />

                <GenericTableModal
                    isOpen={isSectorProgramsModalOpen}
                    onClose={() => setIsSectorProgramsModalOpen(false)}
                    data={sectorProgramsData}
                    columns={fieldSectorModalColumns}
                    title="Programas Académicos por Sector"
                    subtitle="Comparativo por Nucleo Básico de Conocimiento (NBC) — Expande cada campo para ver el desglose Oficial vs Privado"
                    isLoading={isSectorProgramsLoading}
                />

                {/* GenericTableModal for Level and LevelPrograms removed — replaced by explicit Tab 2 layout */}

                {/* --- TAB 0: Resumen y Evolución --- */}
                {activeTab === 0 && (
                    <>
                        {/* --- Ámbito Nacional: Resumen General --- */}
                        <div className="space-y-6">
                            <div className="flex items-center space-x-3">
                                <div className="w-2 h-8 bg-brand-blue rounded-full"></div>
                                <h3 className="text-2xl font-black text-slate-800 tracking-tight">{title ? 'Resumen Ámbito Regional' : 'Resumen Ámbito Nacional'}</h3>
                            </div>

                            {mapSlot ? (
                                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                                    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                                        {mapSlot}
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 content-start">
                                        <KPICard
                                            title="Instituciones (IES)"
                                            value={formatValue(summary?.num_ies, true)}
                                            icon={Building2}
                                            subtitle="Activas con Registro"
                                            onClick={async () => {
                                                setIsIESModalOpen(true);
                                                setIsIESListLoading(true);
                                                try {
                                                    const data = await fetchNationalIESList(debouncedFilters);
                                                    setIesList(data);
                                                } catch (err) {
                                                    console.error("Error fetching IES list:", err);
                                                } finally {
                                                    setIsIESListLoading(false);
                                                }
                                            }}
                                        />
                                        <KPICard
                                            title="No. Programas"
                                            value={formatValue(summary?.num_programs, true)}
                                            icon={BookOpen}
                                            subtitle="Vigentes con Registro"
                                            onClick={async () => {
                                                setIsProgramsModalOpen(true);
                                                setIsProgramsLoading(true);
                                                try {
                                                    const data = await fetchNationalDisciplineTable(debouncedFilters);
                                                    setDisciplineTable(data);
                                                } catch (err) {
                                                    console.error("Error fetching discipline table:", err);
                                                } finally {
                                                    setIsProgramsLoading(false);
                                                }
                                            }}
                                        />
                                        <KPICard
                                            title="No. Primer Curso"
                                            value={formatValue(summary?.total_pcurso, true)}
                                            icon={TrendingUp}
                                            subtitle={`Nuevos Ingresos (${summary?.pcurso_year})`}
                                            trend={summary?.total_pcurso_growth}
                                            onClick={async () => {
                                                setSelectedMetric({ label: "Primer Curso", name: "pcurso" });
                                                setTrendData(null);
                                                setIsModalOpen(true);
                                                try {
                                                    const data = await fetchKPIEvolution("pcurso", debouncedFilters);
                                                    setTrendData(data);
                                                } catch (err) {
                                                    console.error("Error fetching trend data:", err);
                                                }
                                            }}
                                        />
                                        <KPICard
                                            title="No. Matriculados"
                                            value={formatValue(summary?.total_matricula, true)}
                                            icon={Users}
                                            subtitle={`Total Estudiantes (${summary?.matricula_year})`}
                                            trend={summary?.total_matricula_growth}
                                            onClick={async () => {
                                                setSelectedMetric({ label: "Matriculados", name: "matricula" });
                                                setTrendData(null);
                                                setIsModalOpen(true);
                                                try {
                                                    const data = await fetchKPIEvolution("matricula", debouncedFilters);
                                                    setTrendData(data);
                                                } catch (err) {
                                                    console.error("Error fetching trend data:", err);
                                                }
                                            }}
                                        />
                                        <KPICard
                                            title="No. Graduados"
                                            value={formatValue(summary?.total_graduados, true)}
                                            icon={GraduationCap}
                                            subtitle={`Titulados Año (${summary?.graduados_year})`}
                                            trend={summary?.total_graduados_growth}
                                            onClick={async () => {
                                                setSelectedMetric({ label: "Graduados", name: "graduados" });
                                                setTrendData(null);
                                                setIsModalOpen(true);
                                                try {
                                                    const data = await fetchKPIEvolution("graduados", debouncedFilters);
                                                    setTrendData(data);
                                                } catch (err) {
                                                    console.error("Error fetching trend data:", err);
                                                }
                                            }}
                                        />
                                        <KPICard
                                            title="Deserción Anual"
                                            value={formatValue(summary?.avg_desercion, false, "%")}
                                            icon={AlertCircle}
                                            subtitle={`Promedio Programas (${summary?.desercion_year})`}
                                            colorClass="text-red-600"
                                            trend={summary?.avg_desercion_growth}
                                            invertTrendColors={true}
                                            onClick={async () => {
                                                setSelectedMetric({ label: "Deserción Anual", name: "desercion" });
                                                setTrendData(null);
                                                setIsModalOpen(true);
                                                try {
                                                    const data = await fetchKPIEvolution("desercion", debouncedFilters);
                                                    setTrendData(data);
                                                } catch (err) {
                                                    console.error("Error fetching trend data:", err);
                                                }
                                            }}
                                        />
                                        <KPICard
                                            title="Empleabilidad"
                                            value={formatValue(summary?.avg_empleabilidad, false, "%")}
                                            icon={BarChart2}
                                            subtitle={`Tasa de Cotización (${summary?.empleabilidad_year})`}
                                            colorClass="text-brand-blue"
                                            trend={summary?.avg_empleabilidad_growth}
                                            onClick={async () => {
                                                setSelectedMetric({ label: "Empleabilidad", name: "empleabilidad" });
                                                setTrendData(null);
                                                setIsModalOpen(true);
                                                try {
                                                    const data = await fetchKPIEvolution("empleabilidad", debouncedFilters);
                                                    setTrendData(data);
                                                } catch (err) {
                                                    console.error("Error fetching trend data:", err);
                                                }
                                            }}
                                        />
                                        <KPICard
                                            title="Puntaje Saber PRO"
                                            value={formatValue(summary?.avg_saberpro)}
                                            icon={Award}
                                            subtitle={`Competencias Genéricas (${summary?.saberpro_year})`}
                                            colorClass="text-purple-600"
                                            trend={summary?.avg_saberpro_growth}
                                            onClick={async () => {
                                                setSelectedMetric({ label: "Puntaje Saber PRO", name: "saberpro" });
                                                setTrendData(null);
                                                setIsModalOpen(true);
                                                try {
                                                    const data = await fetchKPIEvolution("saberpro", debouncedFilters);
                                                    setTrendData(data);
                                                } catch (err) {
                                                    console.error("Error fetching trend data:", err);
                                                }
                                            }}
                                        />
                                    </div>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                                    <KPICard
                                        title="Instituciones (IES)"
                                        value={formatValue(summary?.num_ies, true)}
                                        icon={Building2}
                                        subtitle="Activas con Registro"
                                        onClick={async () => {
                                            setIsIESModalOpen(true);
                                            setIsIESListLoading(true);
                                            try {
                                                const data = await fetchNationalIESList(debouncedFilters);
                                                setIesList(data);
                                            } catch (err) {
                                                console.error("Error fetching IES list:", err);
                                            } finally {
                                                setIsIESListLoading(false);
                                            }
                                        }}
                                    />
                                    <KPICard
                                        title="No. Programas"
                                        value={formatValue(summary?.num_programs, true)}
                                        icon={BookOpen}
                                        subtitle="Vigentes con Registro"
                                        onClick={async () => {
                                            setIsProgramsModalOpen(true);
                                            setIsProgramsLoading(true);
                                            try {
                                                const data = await fetchNationalDisciplineTable(debouncedFilters);
                                                setDisciplineTable(data);
                                            } catch (err) {
                                                console.error("Error fetching discipline table:", err);
                                            } finally {
                                                setIsProgramsLoading(false);
                                            }
                                        }}
                                    />
                                    <KPICard
                                        title="No. Primer Curso"
                                        value={formatValue(summary?.total_pcurso, true)}
                                        icon={TrendingUp}
                                        subtitle={`Nuevos Ingresos (${summary?.pcurso_year})`}
                                        trend={summary?.total_pcurso_growth}
                                        onClick={async () => {
                                            setSelectedMetric({ label: "Primer Curso", name: "pcurso" });
                                            setTrendData(null);
                                            setIsModalOpen(true);
                                            try {
                                                const data = await fetchKPIEvolution("pcurso", debouncedFilters);
                                                setTrendData(data);
                                            } catch (err) {
                                                console.error("Error fetching trend data:", err);
                                            }
                                        }}
                                    />
                                    <KPICard
                                        title="No. Matriculados"
                                        value={formatValue(summary?.total_matricula, true)}
                                        icon={Users}
                                        subtitle={`Total Estudiantes (${summary?.matricula_year})`}
                                        trend={summary?.total_matricula_growth}
                                        onClick={async () => {
                                            setSelectedMetric({ label: "Matriculados", name: "matricula" });
                                            setTrendData(null);
                                            setIsModalOpen(true);
                                            try {
                                                const data = await fetchKPIEvolution("matricula", debouncedFilters);
                                                setTrendData(data);
                                            } catch (err) {
                                                console.error("Error fetching trend data:", err);
                                            }
                                        }}
                                    />
                                    <KPICard
                                        title="No. Graduados"
                                        value={formatValue(summary?.total_graduados, true)}
                                        icon={GraduationCap}
                                        subtitle={`Titulados Año (${summary?.graduados_year})`}
                                        trend={summary?.total_graduados_growth}
                                        onClick={async () => {
                                            setSelectedMetric({ label: "Graduados", name: "graduados" });
                                            setTrendData(null);
                                            setIsModalOpen(true);
                                            try {
                                                const data = await fetchKPIEvolution("graduados", debouncedFilters);
                                                setTrendData(data);
                                            } catch (err) {
                                                console.error("Error fetching trend data:", err);
                                            }
                                        }}
                                    />
                                    <KPICard
                                        title="Deserción Anual"
                                        value={formatValue(summary?.avg_desercion, false, "%")}
                                        icon={AlertCircle}
                                        subtitle={`Promedio Programas (${summary?.desercion_year})`}
                                        colorClass="text-red-600"
                                        trend={summary?.avg_desercion_growth}
                                        invertTrendColors={true}
                                        onClick={async () => {
                                            setSelectedMetric({ label: "Deserción Anual", name: "desercion" });
                                            setTrendData(null);
                                            setIsModalOpen(true);
                                            try {
                                                const data = await fetchKPIEvolution("desercion", debouncedFilters);
                                                setTrendData(data);
                                            } catch (err) {
                                                console.error("Error fetching trend data:", err);
                                            }
                                        }}
                                    />
                                    <KPICard
                                        title="Empleabilidad"
                                        value={formatValue(summary?.avg_empleabilidad, false, "%")}
                                        icon={BarChart2}
                                        subtitle={`Tasa de Cotización (${summary?.empleabilidad_year})`}
                                        colorClass="text-brand-blue"
                                        trend={summary?.avg_empleabilidad_growth}
                                        onClick={async () => {
                                            setSelectedMetric({ label: "Empleabilidad", name: "empleabilidad" });
                                            setTrendData(null);
                                            setIsModalOpen(true);
                                            try {
                                                const data = await fetchKPIEvolution("empleabilidad", debouncedFilters);
                                                setTrendData(data);
                                            } catch (err) {
                                                console.error("Error fetching trend data:", err);
                                            }
                                        }}
                                    />
                                    <KPICard
                                        title="Puntaje Saber PRO"
                                        value={formatValue(summary?.avg_saberpro)}
                                        icon={Award}
                                        subtitle={`Competencias Genéricas (${summary?.saberpro_year})`}
                                        colorClass="text-purple-600"
                                        trend={summary?.avg_saberpro_growth}
                                        onClick={async () => {
                                            setSelectedMetric({ label: "Puntaje Saber PRO", name: "saberpro" });
                                            setTrendData(null);
                                            setIsModalOpen(true);
                                            try {
                                                const data = await fetchKPIEvolution("saberpro", debouncedFilters);
                                                setTrendData(data);
                                            } catch (err) {
                                                console.error("Error fetching trend data:", err);
                                            }
                                        }}
                                    />
                                </div>
                            )}
                        </div>

                        {/* --- Evolución Nuevos Ingresos (General) --- */}
                        <div className="space-y-8 pt-6">
                            <div className="flex items-center space-x-3">
                                <div className="w-2 h-8 bg-brand-blue rounded-full"></div>
                                <h3 className="text-2xl font-black text-slate-800 tracking-tight">Evolución Nuevos Ingresos (General)</h3>
                            </div>

                            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                                {['T&T', 'Universitario', 'Posgrado'].map((level) => {
                                    const levelData = evolutionData?.[level];
                                    if (!levelData) return null;

                                    return (
                                        <div key={level} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4 hover:shadow-md transition-all">
                                            <h4 className="text-lg font-black text-slate-800 border-b border-slate-100 pb-3 flex items-center justify-between">
                                                {level}
                                                <TrendingUp className="w-5 h-5 text-brand-blue/40" />
                                            </h4>
                                            <div className="h-[350px]">
                                                <Plot
                                                    data={levelData.series.map(s => ({
                                                        x: levelData.years,
                                                        y: s.data,
                                                        name: s.name,
                                                        type: 'scatter',
                                                        mode: 'lines+markers',
                                                        line: { shape: 'linear', width: 3 },
                                                        marker: { size: 6 }
                                                    }))}
                                                    layout={{
                                                        autosize: true,
                                                        height: 350,
                                                        margin: { l: 40, r: 20, t: 20, b: 40 },
                                                        legend: { orientation: 'h', y: -0.2, font: { size: 10 } },
                                                        paper_bgcolor: 'rgba(0,0,0,0)',
                                                        plot_bgcolor: 'rgba(0,0,0,0)',
                                                        xaxis: { gridcolor: '#f1f5f9', zeroline: false },
                                                        yaxis: { gridcolor: '#f1f5f9', zeroline: false, title: "No. Estudiantes" }
                                                    }}
                                                    config={{ responsive: true, displayModeBar: false }}
                                                    style={{ width: '100%' }}
                                                />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </>
                )}

                {/* --- TAB 1: Análisis por Sector --- */}
                {activeTab === 1 && (
                    <>
                        {/* --- Ámbito Sector: Oficial vs Privado --- */}
                        <div className="space-y-8 pt-6 border-t border-slate-100">
                            <div className="flex items-center space-x-3">
                                <div className="w-2 h-8 bg-brand-gold rounded-full"></div>
                                <h3 className="text-2xl font-black text-slate-800 tracking-tight">Análisis Comparativo por Sector</h3>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-x-8 gap-y-10">
                                {([
                                    { label: "Instituciones (IES)", key: "num_ies", icon: Building2, subtitle: ["Oficial", "Privada"], color: "text-slate-900", isLocale: false, suffix: "" },
                                    { label: "No. Matriculados", key: "total_matricula", icon: Users, subtitle: ["Oficial", "Privado"], color: "text-slate-900", isLocale: true, suffix: "", trendKey: "total_matricula_growth", metricName: "matricula" },
                                    { label: "Primer Curso", key: "total_pcurso", icon: TrendingUp, subtitle: ["Oficial", "Privado"], color: "text-slate-900", isLocale: true, suffix: "", trendKey: "total_pcurso_growth", metricName: "pcurso" },
                                    { label: "No. Graduados", key: "total_graduados", icon: GraduationCap, subtitle: ["Oficial", "Privado"], color: "text-slate-900", isLocale: true, suffix: "", trendKey: "total_graduados_growth", metricName: "graduados" },
                                    { label: "No. Programas", key: "num_programs", icon: BookOpen, subtitle: ["Oficial", "Privado"], color: "text-slate-900", isLocale: false, suffix: "" },
                                    { label: "Promedio Deserción", key: "avg_desercion", icon: AlertCircle, subtitle: ["Oficial", "Privado"], color: "text-red-600", suffix: "%", isLocale: false, trendKey: "avg_desercion_growth", invertTrendColors: true, metricName: "desercion" },
                                    { label: "Puntaje Saber PRO", key: "avg_saberpro", icon: Award, subtitle: ["Oficial", "Privado"], color: "text-purple-600", isLocale: false, suffix: "", trendKey: "avg_saberpro_growth", metricName: "saberpro" },
                                    { label: "Empleabilidad", key: "avg_empleabilidad", icon: BarChart2, subtitle: ["Oficial", "Privado"], color: "text-brand-blue", suffix: "%", isLocale: false, trendKey: "avg_empleabilidad_growth", metricName: "empleabilidad" },
                                ] as MetricConfig[]).map((metric) => (
                                    <div key={metric.key} className="bg-slate-100/40 p-5 rounded-3xl border border-slate-200 shadow-sm space-y-4 hover:border-slate-300 transition-all hover:shadow-md">
                                        <div className="flex justify-between items-center px-1">
                                            <h4 className="text-[0.65rem] font-black text-slate-600 uppercase tracking-widest">{metric.label}</h4>
                                            <div className="p-1.5 bg-white rounded-xl shadow-sm border border-slate-200">
                                                <metric.icon className="w-3.5 h-3.5 text-slate-500" />
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                            <KPICard
                                                title="Oficial"
                                                value={formatValue((official as any)?.[metric.key], metric.isLocale, metric.suffix)}
                                                icon={metric.icon}
                                                subtitle={Array.isArray(metric.subtitle) ? metric.subtitle[0] : (metric.subtitle || '')}
                                                colorClass={metric.color}
                                                trend={metric.trendKey ? (official as any)?.[metric.trendKey] : null}
                                                invertTrendColors={metric.invertTrendColors}
                                                onClick={metric.key === "num_ies" ? async () => {
                                                    setIsSectorModalOpen(true);
                                                    setIsSectorLoading(true);
                                                    try {
                                                        const list = await fetchNationalIESList(debouncedFilters);
                                                        setSectorIESList(list);
                                                    } catch (err) {
                                                        console.error("Error fetching IES list for sector modal:", err);
                                                    } finally {
                                                        setIsSectorLoading(false);
                                                    }
                                                } : metric.key === "num_programs" ? async () => {
                                                    setIsSectorProgramsModalOpen(true);
                                                    setIsSectorProgramsLoading(true);
                                                    try {
                                                        const [off, priv] = await Promise.all([
                                                            fetchNationalDisciplineTable({ ...debouncedFilters, sector: ["OFICIAL"] }),
                                                            fetchNationalDisciplineTable({ ...debouncedFilters, sector: ["PRIVADO"] })
                                                        ]);

                                                        const fieldMap = new Map();
                                                        const mergeItem = (item: DisciplineTableItem, sectorName: string) => {
                                                            const name = item.name || "N/A";
                                                            if (!fieldMap.has(name)) {
                                                                fieldMap.set(name, {
                                                                    ...item,
                                                                    subRows: []
                                                                });
                                                            }
                                                            const entry = fieldMap.get(name);
                                                            entry.subRows.push({
                                                                ...item,
                                                                name: sectorName,
                                                                subRows: undefined
                                                            });
                                                        };

                                                        off.forEach(item => mergeItem(item, "OFICIAL"));
                                                        priv.forEach(item => mergeItem(item, "PRIVADO"));

                                                        // Aggregated top-level values for fields found only in one sector
                                                        // (The current logic above already copies the item, but we need to ensure 
                                                        // top-level has sum if it exists in both)
                                                        priv.forEach(privItem => {
                                                            const offItem = off.find(o => o.name === privItem.name);
                                                            if (offItem) {
                                                                const entry = fieldMap.get(privItem.name);
                                                                entry.num_ies = (offItem.num_ies || 0) + (privItem.num_ies || 0);
                                                                entry.num_programs = (offItem.num_programs || 0) + (privItem.num_programs || 0);
                                                                entry.total_matricula = (offItem.total_matricula || 0) + (privItem.total_matricula || 0);
                                                                entry.total_pcurso = (offItem.total_pcurso || 0) + (privItem.total_pcurso || 0);
                                                                entry.total_graduados = (offItem.total_graduados || 0) + (privItem.total_graduados || 0);

                                                                const totalMat = entry.total_matricula || 1;
                                                                const totalGrad = entry.total_graduados || 1;

                                                                // Weighted averages
                                                                entry.avg_desercion = ((offItem.avg_desercion || 0) * (offItem.total_matricula || 0) + (privItem.avg_desercion || 0) * (privItem.total_matricula || 0)) / totalMat;
                                                                entry.avg_saberpro = ((offItem.avg_saberpro || 0) * (offItem.total_matricula || 0) + (privItem.avg_saberpro || 0) * (privItem.total_matricula || 0)) / totalMat;
                                                                entry.avg_empleabilidad = ((offItem.avg_empleabilidad || 0) * (offItem.total_graduados || 0) + (privItem.avg_empleabilidad || 0) * (privItem.total_graduados || 0)) / totalGrad;
                                                            }
                                                        });

                                                        setSectorProgramsData(Array.from(fieldMap.values()));
                                                    } catch (err) {
                                                        console.error("Error fetching programs by sector:", err);
                                                    } finally {
                                                        setIsSectorProgramsLoading(false);
                                                    }
                                                } : metric.metricName ? async () => {
                                                    setSelectedMetric({ label: metric.label, name: metric.metricName || "" });
                                                    setTrendData(null);
                                                    setIsModalOpen(true);
                                                    try {
                                                        const [officialData, privateData] = await Promise.all([
                                                            fetchKPIEvolution(metric.metricName!, { ...debouncedFilters, sector: ["OFICIAL"] }),
                                                            fetchKPIEvolution(metric.metricName!, { ...debouncedFilters, sector: ["PRIVADO"] })
                                                        ]);

                                                        // Combine years and ensure they are sorted
                                                        const allYears = Array.from(new Set([...officialData.years, ...privateData.years])).sort((a, b) => a - b);

                                                        // Align data to the combined years
                                                        const alignData = (sourceData: KPIEvolutionData) => {
                                                            if (!sourceData.years.length) return allYears.map(() => null);
                                                            const map = new Map(sourceData.years.map((y, i) => [y, sourceData.values[i]]));
                                                            return allYears.map(y => map.get(y) ?? null);
                                                        };

                                                        setTrendData({
                                                            years: allYears,
                                                            values: [], // Not used when series is present
                                                            series: [
                                                                { name: 'Oficial', data: alignData(officialData) },
                                                                { name: 'Privado', data: alignData(privateData) }
                                                            ]
                                                        });
                                                    } catch (err) {
                                                        console.error("Error fetching trend data:", err);
                                                    }
                                                } : undefined}
                                            />
                                            <KPICard
                                                title="Privado"
                                                value={formatValue((privateSector as any)?.[metric.key], metric.isLocale, metric.suffix)}
                                                icon={metric.icon}
                                                subtitle={Array.isArray(metric.subtitle) ? metric.subtitle[1] : (metric.subtitle || '')}
                                                colorClass={metric.color}
                                                trend={metric.trendKey ? (privateSector as any)?.[metric.trendKey] : null}
                                                invertTrendColors={metric.invertTrendColors}
                                                onClick={metric.key === "num_ies" ? async () => {
                                                    setIsSectorModalOpen(true);
                                                    setIsSectorLoading(true);
                                                    try {
                                                        const list = await fetchNationalIESList(debouncedFilters);
                                                        setSectorIESList(list);
                                                    } catch (err) {
                                                        console.error("Error fetching IES list for sector modal:", err);
                                                    } finally {
                                                        setIsSectorLoading(false);
                                                    }
                                                } : metric.key === "num_programs" ? async () => {
                                                    setIsSectorProgramsModalOpen(true);
                                                    setIsSectorProgramsLoading(true);
                                                    try {
                                                        const [off, priv] = await Promise.all([
                                                            fetchNationalDisciplineTable({ ...debouncedFilters, sector: ["OFICIAL"] }),
                                                            fetchNationalDisciplineTable({ ...debouncedFilters, sector: ["PRIVADO"] })
                                                        ]);

                                                        const fieldMap = new Map();
                                                        const mergeItem = (item: DisciplineTableItem, sectorName: string) => {
                                                            const name = item.name || "N/A";
                                                            if (!fieldMap.has(name)) {
                                                                fieldMap.set(name, {
                                                                    ...item,
                                                                    subRows: []
                                                                });
                                                            }
                                                            const entry = fieldMap.get(name);
                                                            entry.subRows.push({
                                                                ...item,
                                                                name: sectorName,
                                                                subRows: undefined
                                                            });
                                                        };

                                                        off.forEach(item => mergeItem(item, "OFICIAL"));
                                                        priv.forEach(item => mergeItem(item, "PRIVADO"));

                                                        priv.forEach(privItem => {
                                                            const offItem = off.find(o => o.name === privItem.name);
                                                            if (offItem) {
                                                                const entry = fieldMap.get(privItem.name);
                                                                entry.num_ies = (offItem.num_ies || 0) + (privItem.num_ies || 0);
                                                                entry.num_programs = (offItem.num_programs || 0) + (privItem.num_programs || 0);
                                                                entry.total_matricula = (offItem.total_matricula || 0) + (privItem.total_matricula || 0);
                                                                entry.total_pcurso = (offItem.total_pcurso || 0) + (privItem.total_pcurso || 0);
                                                                entry.total_graduados = (offItem.total_graduados || 0) + (privItem.total_graduados || 0);
                                                                const totalMat = entry.total_matricula || 1;
                                                                entry.avg_desercion = ((offItem.avg_desercion || 0) * (offItem.total_matricula || 0) + (privItem.avg_desercion || 0) * (privItem.total_matricula || 0)) / totalMat;
                                                            }
                                                        });

                                                        setSectorProgramsData(Array.from(fieldMap.values()));
                                                    } catch (err) {
                                                        console.error("Error fetching programs by sector:", err);
                                                    } finally {
                                                        setIsSectorProgramsLoading(false);
                                                    }
                                                } : metric.metricName ? async () => {
                                                    setSelectedMetric({ label: metric.label, name: metric.metricName || "" });
                                                    setTrendData(null);
                                                    setIsModalOpen(true);
                                                    try {
                                                        const [officialData, privateData] = await Promise.all([
                                                            fetchKPIEvolution(metric.metricName!, { ...debouncedFilters, sector: ["OFICIAL"] }),
                                                            fetchKPIEvolution(metric.metricName!, { ...debouncedFilters, sector: ["PRIVADO"] })
                                                        ]);

                                                        // Combine years and ensure they are sorted
                                                        const allYears = Array.from(new Set([...officialData.years, ...privateData.years])).sort((a, b) => a - b);

                                                        // Align data to the combined years
                                                        const alignData = (sourceData: KPIEvolutionData) => {
                                                            if (!sourceData.years.length) return allYears.map(() => null);
                                                            const map = new Map(sourceData.years.map((y, i) => [y, sourceData.values[i]]));
                                                            return allYears.map(y => map.get(y) ?? null);
                                                        };

                                                        setTrendData({
                                                            years: allYears,
                                                            values: [], // Not used when series is present
                                                            series: [
                                                                { name: 'Oficial', data: alignData(officialData) },
                                                                { name: 'Privado', data: alignData(privateData) }
                                                            ]
                                                        });
                                                    } catch (err) {
                                                        console.error("Error fetching trend data:", err);
                                                    }
                                                } : undefined}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* --- Evolución por Sector --- */}
                        {
                            ['OFICIAL', 'PRIVADO'].map((sector) => (
                                <div key={sector} className="space-y-8 pt-10 border-t border-slate-100">
                                    <div className="flex items-center space-x-3">
                                        <div className={`w-2 h-8 ${sector === 'OFICIAL' ? 'bg-brand-blue' : 'bg-brand-gold'} rounded-full`}></div>
                                        <h3 className="text-2xl font-black text-slate-800 tracking-tight">
                                            Evolución Nuevos Ingresos - Sector {sector === 'OFICIAL' ? 'Oficial' : 'Privado'}
                                        </h3>
                                    </div>

                                    <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                                        {['T&T', 'Universitario', 'Posgrado'].map((level) => {
                                            const levelData = sectorEvolutionData?.[sector]?.[level];
                                            if (!levelData) return null;

                                            return (
                                                <div key={`${sector}-${level}`} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4 hover:shadow-md transition-all">
                                                    <h4 className="text-lg font-black text-slate-800 border-b border-slate-100 pb-3 flex items-center justify-between">
                                                        {level}
                                                        <TrendingUp className="w-5 h-5 text-brand-blue/40" />
                                                    </h4>
                                                    <div className="h-[350px]">
                                                        <Plot
                                                            data={levelData.series.map(s => ({
                                                                x: levelData.years,
                                                                y: s.data,
                                                                name: s.name,
                                                                type: 'scatter',
                                                                mode: 'lines+markers',
                                                                line: { shape: 'linear', width: 3 },
                                                                marker: { size: 6 }
                                                            }))}
                                                            layout={{
                                                                autosize: true,
                                                                height: 350,
                                                                margin: { l: 40, r: 20, t: 20, b: 40 },
                                                                legend: { orientation: 'h', y: -0.2, font: { size: 10 } },
                                                                paper_bgcolor: 'rgba(0,0,0,0)',
                                                                plot_bgcolor: 'rgba(0,0,0,0)',
                                                                xaxis: { gridcolor: '#f1f5f9', zeroline: false },
                                                                yaxis: { gridcolor: '#f1f5f9', zeroline: false, title: "No. Estudiantes" }
                                                            }}
                                                            config={{ responsive: true, displayModeBar: false }}
                                                            style={{ width: '100%' }}
                                                        />
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))
                        }
                    </>
                )}

                {/* --- TAB 2: Nivel de Formación --- */}
                {activeTab === 2 && (
                    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
                        {/* Title Section */}
                        <div className="flex flex-col space-y-2">
                            <div className="flex items-center space-x-3">
                                <div className="w-2 h-10 bg-brand-blue rounded-full shadow-[0_0_15px_rgba(0,79,229,0.4)]"></div>
                                <h3 className="text-3xl font-black text-slate-800 tracking-tight">Análisis por Nivel de Formación</h3>
                            </div>
                            <p className="text-slate-500 font-medium ml-5">Exploración detallada por niveles: Técnico/Tecnológico, Universitario y Posgrado. Pulse en "Ver Desglose" para ver detalles históricos y tablas.</p>
                        </div>

                        {/* 4 Groups per Row */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                            {([
                                { label: "Instituciones (IES)", key: "num_ies", icon: Building2, color: "text-slate-900", isLocale: false, suffix: "" },
                                { label: "Programas", key: "num_programs", icon: BookOpen, color: "text-slate-900", isLocale: false, suffix: "" },
                                { label: "Primer Curso", key: "total_pcurso", icon: TrendingUp, color: "text-slate-900", isLocale: true, suffix: "", trendKey: "total_pcurso_growth", metricName: "pcurso" },
                                { label: "Matriculados", key: "total_matricula", icon: Users, color: "text-slate-900", isLocale: true, suffix: "", trendKey: "total_matricula_growth", metricName: "matricula" },
                                { label: "Graduados", key: "total_graduados", icon: GraduationCap, color: "text-slate-900", isLocale: true, suffix: "", trendKey: "total_graduados_growth", metricName: "graduados" },
                                { label: "Deserción", key: "avg_desercion", icon: AlertCircle, color: "text-red-600", suffix: "%", isLocale: false, trendKey: "avg_desercion_growth", invertTrendColors: true, metricName: "desercion" },
                                { label: "Empleabilidad", key: "avg_empleabilidad", icon: BarChart2, color: "text-brand-blue", suffix: "%", isLocale: false, trendKey: "avg_empleabilidad_growth", metricName: "empleabilidad" },
                                { label: "Saber PRO", key: "avg_saberpro", icon: Award, color: "text-purple-600", isLocale: false, suffix: "", trendKey: "avg_saberpro_growth", metricName: "saberpro" },
                            ] as MetricConfig[]).map((metric) => (
                                <Tab2MetricGroup
                                    key={metric.key}
                                    metric={metric}
                                    levels={levels}
                                    formatValue={formatValue}
                                    onOpenModal={async (m) => {
                                        setActiveTab2Metric(m);
                                        setTab2ModalData({ evoData: null, tableData: [] });
                                        setIsTab2Loading(true);
                                        try {
                                            const { nivel_de_formacion, ...otherFilters } = debouncedFilters || {};
                                            if (m.key === 'num_ies') {
                                                const [tyt, uni, pos] = await Promise.all([
                                                    fetchNationalIESList({ ...otherFilters, nivel_de_formacion: LEVEL_GROUPS.TYT }),
                                                    fetchNationalIESList({ ...otherFilters, nivel_de_formacion: LEVEL_GROUPS.UNIVERSITARIO }),
                                                    fetchNationalIESList({ ...otherFilters, nivel_de_formacion: LEVEL_GROUPS.POSGRADO })
                                                ]);
                                                setTab2ModalData({
                                                    evoData: null,
                                                    tableData: [
                                                        { name: 'T&T', ...(levels?.['T&T'] as any), subRows: tyt },
                                                        { name: 'Universitario', ...(levels?.['Universitario'] as any), subRows: uni },
                                                        { name: 'Posgrado', ...(levels?.['Posgrado'] as any), subRows: pos }
                                                    ].filter(g => (g as any).num_ies !== undefined)
                                                });
                                            } else if (m.key === 'num_programs') {
                                                const [tyt, uni, pos] = await Promise.all([
                                                    fetchNationalDisciplineTable({ ...otherFilters, nivel_de_formacion: LEVEL_GROUPS.TYT }),
                                                    fetchNationalDisciplineTable({ ...otherFilters, nivel_de_formacion: LEVEL_GROUPS.UNIVERSITARIO }),
                                                    fetchNationalDisciplineTable({ ...otherFilters, nivel_de_formacion: LEVEL_GROUPS.POSGRADO })
                                                ]);
                                                const fieldMap = new Map<string, any>();
                                                const mergeData = (data: DisciplineTableItem[], levelName: string) => {
                                                    data.forEach(item => {
                                                        const key = item.name || item.campo_amplio || "N/A";
                                                        if (!fieldMap.has(key)) {
                                                            fieldMap.set(key, { name: key, subRows: [] });
                                                        }
                                                        fieldMap.get(key).subRows.push({ ...item, name: levelName });
                                                    });
                                                };
                                                mergeData(tyt, 'T&T');
                                                mergeData(uni, 'Universitario');
                                                mergeData(pos, 'Posgrado');

                                                const merged = Array.from(fieldMap.values());
                                                merged.forEach(entry => {
                                                    const subs = entry.subRows;
                                                    entry.num_ies = subs.reduce((s: number, r: any) => s + (r.num_ies || 0), 0);
                                                    entry.num_programs = subs.reduce((s: number, r: any) => s + (r.num_programs || 0), 0);
                                                    entry.total_matricula = subs.reduce((s: number, r: any) => s + (r.total_matricula || 0), 0);
                                                    entry.total_pcurso = subs.reduce((s: number, r: any) => s + (r.total_pcurso || 0), 0);
                                                    entry.total_graduados = subs.reduce((s: number, r: any) => s + (r.total_graduados || 0), 0);
                                                    const totalMat = entry.total_matricula || 1;
                                                    const totalGrad = entry.total_graduados || 1;
                                                    entry.avg_desercion = subs.reduce((s: number, r: any) => s + (r.avg_desercion || 0) * (r.total_matricula || 0), 0) / (totalMat || 1);
                                                    entry.avg_saberpro = subs.reduce((s: number, r: any) => s + (r.avg_saberpro || 0) * (r.total_matricula || 0), 0) / (totalMat || 1);
                                                    entry.avg_empleabilidad = subs.reduce((s: number, r: any) => s + (r.avg_empleabilidad || 0) * (r.total_graduados || 0), 0) / (totalGrad || 1);
                                                });
                                                setTab2ModalData({ evoData: null, tableData: merged });
                                            } else {
                                                const [tyt, uni, pos] = await Promise.all([
                                                    fetchKPIEvolution(m.metricName!, { ...otherFilters, nivel_de_formacion: LEVEL_GROUPS.TYT }),
                                                    fetchKPIEvolution(m.metricName!, { ...otherFilters, nivel_de_formacion: LEVEL_GROUPS.UNIVERSITARIO }),
                                                    fetchKPIEvolution(m.metricName!, { ...otherFilters, nivel_de_formacion: LEVEL_GROUPS.POSGRADO })
                                                ]);
                                                const allYears = Array.from(new Set([...tyt.years, ...uni.years, ...pos.years])).sort((a, b) => a - b);
                                                const align = (src: any) => {
                                                    const map = new Map(src.years.map((y: any, i: any) => [y, src.values[i]]));
                                                    return allYears.map(y => map.get(y) ?? null);
                                                };
                                                setTab2ModalData({
                                                    evoData: {
                                                        years: allYears,
                                                        series: [
                                                            { name: 'T&T', data: align(tyt) },
                                                            { name: 'Universitario', data: align(uni) },
                                                            { name: 'Posgrado', data: align(pos) }
                                                        ]
                                                    } as any,
                                                    tableData: []
                                                });
                                            }
                                        } catch (err) {
                                            console.error("Error fetching Tab 2 modal data:", err);
                                        } finally {
                                            setIsTab2Loading(false);
                                        }
                                    }}
                                />
                            ))}
                        </div>
                    </div>
                )}

                {/* --- TAB 3: Disciplinas --- */}
                {activeTab === 3 && (
                    <>
                        {/* --- Distribución por Área de Conocimiento --- */}
                        <div className="space-y-8 pt-10 border-t border-slate-100">
                            <div className="flex items-center space-x-3">
                                <div className="w-2 h-8 bg-brand-blue rounded-full"></div>
                                <h3 className="text-2xl font-black text-slate-800 tracking-tight">Estadísticas por Área de Conocimiento</h3>
                            </div>

                            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                                {/* Left Chart: Programs count */}
                                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-6 hover:shadow-md transition-all">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <h4 className="text-sm font-black text-slate-800">No. de Programas por área de conocimiento</h4>
                                            <p className="text-[0.6rem] font-bold text-slate-400 uppercase tracking-widest mt-1">Distribución por Sector</p>
                                        </div>
                                        <BarChart2 className="w-5 h-5 text-brand-blue/30" />
                                    </div>

                                    <div className="h-[550px]">
                                        {disciplineStats && disciplineStats.labels.length > 0 ? (
                                            <Plot
                                                data={disciplineStats.series.map(s => ({
                                                    y: disciplineStats.labels,
                                                    x: s.data,
                                                    name: s.name,
                                                    type: 'bar',
                                                    orientation: 'h',
                                                    text: s.data.map(val => val > 0 ? val.toLocaleString('es-CO') : ''),
                                                    textposition: 'inside',
                                                    insidetextanchor: 'middle',
                                                    textfont: { color: '#ffffff', size: 9, weight: 'bold' },
                                                    marker: { color: s.name === 'OFICIAL' ? '#004fe5' : '#fbbf24' }
                                                }))}
                                                layout={{
                                                    autosize: true,
                                                    barmode: 'stack',
                                                    margin: { l: 350, r: 20, t: 10, b: 40 },
                                                    legend: { orientation: 'h', y: -0.1, font: { size: 10 } },
                                                    paper_bgcolor: 'rgba(0,0,0,0)',
                                                    plot_bgcolor: 'rgba(0,0,0,0)',
                                                    xaxis: { gridcolor: '#f1f5f9', zeroline: false, tickfont: { size: 9 } },
                                                    yaxis: {
                                                        gridcolor: 'rgba(0,0,0,0)',
                                                        zeroline: false,
                                                        autorange: 'reversed',
                                                        tickfont: { size: 9, weight: 'bold' }
                                                    }
                                                }}
                                                config={{ responsive: true, displayModeBar: false }}
                                                style={{ width: '100%', height: '100%' }}
                                            />
                                        ) : (
                                            <div className="flex items-center justify-center h-full text-slate-400 font-bold italic">N/D</div>
                                        )}
                                    </div>
                                </div>

                                {/* Right Chart: New Enrollment Trend */}
                                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-6 hover:shadow-md transition-all">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <h4 className="text-sm font-black text-slate-800">Tendencia Primer Curso</h4>
                                            <p className="text-[0.6rem] font-bold text-slate-400 uppercase tracking-widest mt-1">Evolución por Nucleo Básico de Conocimiento (NBC)</p>
                                        </div>
                                        <TrendingUp className="w-5 h-5 text-brand-blue/30" />
                                    </div>

                                    <div className="h-[550px]">
                                        {fieldTrend && fieldTrend.series.length > 0 ? (
                                            <Plot
                                                data={fieldTrend.series.map(s => ({
                                                    x: fieldTrend.years,
                                                    y: s.data,
                                                    name: s.name,
                                                    type: 'scatter',
                                                    mode: 'lines+markers',
                                                    line: { width: 2, shape: 'linear' },
                                                    marker: { size: 5 }
                                                }))}
                                                layout={{
                                                    autosize: true,
                                                    margin: { l: 50, r: 20, t: 10, b: 80 },
                                                    legend: {
                                                        orientation: 'h',
                                                        y: -0.3,
                                                        font: { size: 8 },
                                                        x: 0,
                                                        itemwidth: 30
                                                    },
                                                    paper_bgcolor: 'rgba(0,0,0,0)',
                                                    plot_bgcolor: 'rgba(0,0,0,0)',
                                                    xaxis: { gridcolor: '#f1f5f9', zeroline: false, tickfont: { size: 9 } },
                                                    yaxis: { gridcolor: '#f1f5f9', zeroline: false, tickfont: { size: 9 } }
                                                }}
                                                config={{ responsive: true, displayModeBar: false }}
                                                style={{ width: '100%', height: '100%' }}
                                            />
                                        ) : (
                                            <div className="flex items-center justify-center h-full text-slate-400 font-bold italic">N/D</div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* --- Tabla Detallada por Área de Conocimiento --- */}
                            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden hover:shadow-md transition-all">
                                <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                                    <div>
                                        <h4 className="text-lg font-black text-slate-800">Detalle por Área de Conocimiento</h4>
                                        <p className="text-[0.65rem] font-bold text-slate-400 uppercase tracking-widest mt-1">Consolidado de Indicadores por área de conocimiento específica</p>
                                    </div>
                                </div>

                                <div className="overflow-x-auto custom-scroll">
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            {table.getHeaderGroups().map(headerGroup => (
                                                <tr key={headerGroup.id} className="bg-slate-50">
                                                    {headerGroup.headers.map(header => {
                                                        const isTextRight = ['total_matricula', 'total_pcurso', 'total_graduados'].includes(header.column.id);
                                                        const isTextCenter = ['num_ies', 'num_programs', 'avg_desercion', 'avg_saberpro', 'avg_empleabilidad'].includes(header.column.id);
                                                        const isName = header.column.id === 'name';

                                                        return (
                                                            <th
                                                                key={header.id}
                                                                colSpan={header.colSpan}
                                                                className={`px-4 py-4 text-[0.6rem] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 ${isTextRight ? 'text-right' : isTextCenter ? 'text-center' : 'text-left'} ${isName ? 'sticky left-0 bg-slate-50 z-10' : ''}`}
                                                            >
                                                                {header.isPlaceholder
                                                                    ? null
                                                                    : flexRender(
                                                                        header.column.columnDef.header,
                                                                        header.getContext()
                                                                    )}
                                                            </th>
                                                        )
                                                    })}
                                                </tr>
                                            ))}
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {table.getRowModel().rows && table.getRowModel().rows.length > 0 ? (
                                                table.getRowModel().rows.map((row) => (
                                                    <tr key={row.id} className={`hover:bg-slate-50/80 transition-colors group ${row.depth > 0 ? 'bg-slate-50/30' : ''}`}>
                                                        {row.getVisibleCells().map(cell => {
                                                            // Apply specific alignments based on column ID or index if needed, 
                                                            // but for now we put className logic in basic td, or we can move padding/align logic to Column Def meta or check ID.
                                                            // Actually, the column defs return <div>s with classes, so the <td> can be generic.
                                                            // But the headers had alignment classes. Let's replicate strict alignment for cells.

                                                            const isTextRight = ['total_matricula', 'total_pcurso', 'total_graduados'].includes(cell.column.id);
                                                            const isTextCenter = ['num_ies', 'num_programs', 'avg_desercion', 'avg_saberpro', 'avg_empleabilidad'].includes(cell.column.id);

                                                            return (
                                                                <td key={cell.id} className={`px-4 py-3 text-[0.7rem] border-b border-slate-100 ${isTextRight ? 'text-right' : isTextCenter ? 'text-center' : 'text-left'}`}>
                                                                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                                                </td>
                                                            )
                                                        })}
                                                    </tr>
                                                ))
                                            ) : (
                                                <tr>
                                                    <td colSpan={10} className="px-6 py-12 text-center text-slate-400 font-bold italic">
                                                        Cargando datos detallados...
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>

                        {/* --- Tabla Detallada por Institución (IES) --- */}
                        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden hover:shadow-md transition-all mt-12">
                            <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                                <div>
                                    <h4 className="text-lg font-black text-slate-800">Detalle por Institución de Educación Superior (IES)</h4>
                                    <p className="text-[0.65rem] font-bold text-slate-400 uppercase tracking-widest mt-1">Consolidado por Institución y Campo de Conocimiento</p>
                                </div>
                            </div>

                            <div className="overflow-x-auto overflow-y-auto custom-scroll max-h-[600px]">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        {iesTableInstance.getHeaderGroups().map(headerGroup => (
                                            <tr key={headerGroup.id} className="bg-slate-50 shadow-sm">
                                                {headerGroup.headers.map(header => {
                                                    const isTextRight = ['total_matricula', 'total_pcurso', 'total_graduados'].includes(header.column.id);
                                                    const isTextCenter = ['num_programs', 'avg_desercion', 'avg_saberpro', 'avg_empleabilidad'].includes(header.column.id);
                                                    const isName = header.column.id === 'name';

                                                    return (
                                                        <th
                                                            key={header.id}
                                                            colSpan={header.colSpan}
                                                            className={`px-4 py-4 text-[0.6rem] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 ${isTextRight ? 'text-right' : isTextCenter ? 'text-center' : 'text-left'} sticky top-0 bg-slate-50 ${isName ? 'left-0 z-20 shadow-[1px_0_0_0_rgba(203,213,225,0.4)]' : 'z-10'}`}
                                                        >
                                                            {header.isPlaceholder
                                                                ? null
                                                                : flexRender(
                                                                    header.column.columnDef.header,
                                                                    header.getContext()
                                                                )}
                                                        </th>
                                                    )
                                                })}
                                            </tr>
                                        ))}
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {iesTableInstance.getRowModel().rows && iesTableInstance.getRowModel().rows.length > 0 ? (
                                            iesTableInstance.getRowModel().rows.map((row) => (
                                                <tr key={row.id} className={`hover:bg-slate-50/80 transition-colors group ${row.depth > 0 ? 'bg-slate-50/30' : ''}`}>
                                                    {row.getVisibleCells().map(cell => {
                                                        const isTextRight = ['total_matricula', 'total_pcurso', 'total_graduados'].includes(cell.column.id);
                                                        const isTextCenter = ['num_programs', 'avg_desercion', 'avg_saberpro', 'avg_empleabilidad'].includes(cell.column.id);

                                                        return (
                                                            <td key={cell.id} className={`px-4 py-3 text-[0.7rem] border-b border-slate-100 ${isTextRight ? 'text-right' : isTextCenter ? 'text-center' : 'text-left'}`}>
                                                                {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                                            </td>
                                                        )
                                                    })}
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan={9} className="px-6 py-12 text-center text-slate-400 font-bold italic">
                                                    Cargando datos de IES...
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </>
                )}

                {/* --- TAB 4: Resultados Saber PRO --- */}
                {activeTab === 4 && (
                    <>
                        {/* --- Nueva Sección: Análisis de Calidad Saber PRO --- */}
                        <div className="space-y-12 pt-12 border-t border-slate-100">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-3">
                                    <div className="w-2 h-8 bg-purple-600 rounded-full"></div>
                                    <div>
                                        <h3 className="text-2xl font-black text-slate-800 tracking-tight">Análisis Detallado Saber PRO {saberProData?.year}</h3>
                                        <p className="text-sm font-medium text-slate-500 leading-tight">
                                            Distribución a nivel de estudiante. <span className="text-[0.65rem] font-bold text-slate-400 block mt-1 uppercase italic">* Los promedios pueden diferir de las tarjetas KPI ya que estas se calculan por institución, mientras que el análisis detallado se genera registro a registro por estudiante.</span>
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Graphs Grid */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                {/* 1. Global (Full width row 1) */}
                                <div className="bg-white p-6 rounded-[2.5rem] border border-slate-200 shadow-sm lg:col-span-2">
                                    <div className="flex justify-between items-center mb-4 px-2">
                                        <h5 className="text-lg font-black text-slate-800">Consolidado Nacional</h5>
                                        <button
                                            onClick={() => setActiveSaberProTrendModal({ isOpen: true, title: 'Consolidado Nacional', groupKey: 'summary' })}
                                            className="flex items-center space-x-1.5 px-3 py-1.5 bg-brand-blue/5 hover:bg-brand-blue/10 text-brand-blue rounded-xl transition-colors"
                                        >
                                            <TrendingUp className="w-4 h-4" />
                                            <span className="text-xs font-black uppercase tracking-wider hidden sm:inline">Evolución</span>
                                        </button>
                                    </div>
                                    <SaberProGroupedChart
                                        data={saberProData?.summary ? { "Nacional": saberProData.summary } : {}}
                                        height={250}
                                    />
                                </div>

                                {/* 2. By Sector (Row 2 Left) */}
                                <div className="bg-white p-6 rounded-[2.5rem] border border-slate-200 shadow-sm">
                                    <div className="flex justify-between items-center mb-4 px-2">
                                        <div>
                                            <h5 className="text-lg font-black text-slate-800">Comparativa por Sector</h5>
                                            <span className="text-[0.6rem] font-bold text-slate-400 uppercase tracking-widest">Público vs Privado</span>
                                        </div>
                                        <button
                                            onClick={() => setActiveSaberProTrendModal({ isOpen: true, title: 'Comparativa por Sector', groupKey: 'by_sector' })}
                                            className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-100 hover:bg-brand-blue/10 hover:text-brand-blue text-slate-600 rounded-xl transition-colors"
                                        >
                                            <TrendingUp className="w-4 h-4" />
                                            <span className="text-[0.65rem] font-black uppercase tracking-wider hidden sm:inline">Evolución</span>
                                        </button>
                                    </div>
                                    <SaberProGroupedChart
                                        data={saberProData?.by_sector || {}}
                                        height={350}
                                    />
                                </div>

                                {/* 3. By Modalidad (Row 2 Right) */}
                                <div className="bg-white p-6 rounded-[2.5rem] border border-slate-200 shadow-sm">
                                    <div className="flex justify-between items-center mb-4 px-2">
                                        <h5 className="text-lg font-black text-slate-800">Comparativa por Modalidad</h5>
                                        <button
                                            onClick={() => setActiveSaberProTrendModal({ isOpen: true, title: 'Comparativa por Modalidad', groupKey: 'by_modalidad' })}
                                            className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-100 hover:bg-brand-blue/10 hover:text-brand-blue text-slate-600 rounded-xl transition-colors"
                                        >
                                            <TrendingUp className="w-4 h-4" />
                                            <span className="text-[0.65rem] font-black uppercase tracking-wider hidden sm:inline">Evolución</span>
                                        </button>
                                    </div>
                                    <SaberProGroupedChart
                                        data={Object.fromEntries(
                                            Object.entries(saberProData?.by_modalidad || {})
                                                .filter(([m]) => ['PRESENCIAL', 'VIRTUAL', 'A DISTANCIA'].includes(m.toUpperCase()))
                                        )}
                                        height={350}
                                    />
                                </div>

                                {/* 4. By Nucleo Básico de Conocimiento (NBC) (Full width row 3) */}
                                <div className="bg-white p-6 rounded-[2.5rem] border border-slate-200 shadow-sm lg:col-span-2">
                                    <div className="flex justify-between items-center mb-4 px-2">
                                        <h5 className="text-lg font-black text-slate-800">Comparativa por Nucleo Básico de Conocimiento (NBC)</h5>
                                        <button
                                            onClick={() => setActiveSaberProTrendModal({ isOpen: true, title: 'Comparativa por Nucleo Básico de Conocimiento (NBC)', groupKey: 'by_campo_amplio' })}
                                            className="flex items-center space-x-1.5 px-3 py-1.5 bg-brand-blue/5 hover:bg-brand-blue/10 text-brand-blue rounded-xl transition-colors"
                                        >
                                            <TrendingUp className="w-4 h-4" />
                                            <span className="text-xs font-black uppercase tracking-wider hidden sm:inline">Evolución Histórica</span>
                                        </button>
                                    </div>
                                    <SaberProGroupedChart
                                        data={saberProData?.by_campo_amplio || {}}
                                        height={1000}
                                        legendOrientation="v"
                                    />
                                </div>
                            </div>

                            {/* Hierarchical Table */}
                            <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden">
                                <div className="flex items-center justify-between mb-8">
                                    <div>
                                        <h5 className="text-xl font-black text-slate-800">Desglose Estadístico Multinivel</h5>
                                        <p className="text-[0.65rem] font-bold text-slate-400 uppercase tracking-widest">Nacional &gt; Sector &gt; Modalidad &gt; Área &gt; NBC &gt; SNIES - Programa</p>
                                    </div>
                                </div>
                                <SaberProHierarchicalTable data={saberProData?.hierarchy || []} />
                            </div>

                            <div className="p-6 bg-slate-50 rounded-[2rem] border border-slate-100">
                                <p className="text-[0.65rem] text-slate-500 leading-relaxed italic">
                                    <span className="font-black text-slate-700 uppercase">Nota técnica:</span> El análisis utiliza diagramas de caja para visualizar la dispersión (min, Q1, mediana, Q3, max) calculada directamente sobre la población estudiantil evaluada. Se excluyen registros con puntaje cero para mayor precisión. La desviación estándar indica qué tan dispersos están los resultados respecto al promedio poblacional.
                                </p>
                            </div>
                        </div>
                    </>
                )}

                {/* --- TAB 5: Demografía Saber PRO --- */}
                {activeTab === 5 && (
                    <>
                        {/* --- Nueva Sección: Análisis Demográfico Saber PRO --- */}
                        <div className="space-y-12 pt-12 border-t border-slate-100">
                            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                                <div className="flex items-center space-x-3">
                                    <div className="w-2 h-10 bg-sky-500 rounded-full"></div>
                                    <div>
                                        <h3 className="text-3xl font-black text-slate-800 tracking-tight">Análisis Demográfico Saber PRO</h3>
                                        <p className="text-sm font-medium text-slate-500 leading-tight mt-1">
                                            Características socioeconómicas y demográficas de los evaluados.
                                        </p>
                                    </div>
                                </div>

                                <div className="flex flex-col md:flex-row items-center gap-4">
                                    <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-4 min-w-[250px] w-full md:w-auto">
                                        <div className="p-2 bg-sky-50 rounded-2xl text-sky-600">
                                            <Users className="w-5 h-5" />
                                        </div>
                                        <div className="flex-1">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Desglose Adicional</label>
                                            <select
                                                value={demogBreakdown}
                                                onChange={(e) => setDemogBreakdown(e.target.value)}
                                                className="w-full bg-slate-50 border-none text-sm font-bold text-slate-700 focus:ring-2 focus:ring-sky-500/20 rounded-xl px-2 py-2 cursor-pointer outline-none"
                                            >
                                                <option value="">Sin Desglose</option>
                                                <option value="nivel_de_formacion">Nivel de Formación</option>
                                                <option value="sector">Sector</option>
                                                <option value="modalidad">Modalidad</option>
                                                <option value="area_de_conocimiento">Área de Conocimiento</option>
                                                <option value="nucleo_basico_del_conocimiento">Núcleo Básico de Conocimiento</option>
                                            </select>
                                        </div>
                                    </div>

                                    {demogBreakdown && (
                                        <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-4 min-w-[250px] w-full md:w-auto animate-in zoom-in-95 duration-200">
                                            <div className="p-2 bg-indigo-50 rounded-2xl text-indigo-600">
                                                <Percent className="w-5 h-5" />
                                            </div>
                                            <div className="flex-1">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Modo de Porcentaje</label>
                                                <select
                                                    value={percentageMode}
                                                    onChange={(e) => setPercentageMode(e.target.value as 'total' | 'group' | 'state')}
                                                    className="w-full bg-slate-50 border-none text-sm font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500/20 rounded-xl px-2 py-2 cursor-pointer outline-none"
                                                >
                                                    <option value="total">% del Total General</option>
                                                    <option value="group">% del Grupo (Segmento)</option>
                                                    <option value="state">% del Estado (Categoría)</option>
                                                </select>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {demographicDistribution && demographicTrend ? (
                                <div className="space-y-16 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                    {/* --- Section 1: Distribución Actual --- */}
                                    <div className="space-y-8">
                                        <div className="flex items-center space-x-3">
                                            <div className="w-1.5 h-6 bg-brand-blue rounded-full"></div>
                                            <h4 className="text-xl font-black text-slate-800 tracking-tight">Distribución Actual (Último Año)</h4>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                            <DemographicSection
                                                title="Sexo"
                                                distributionData={demographicDistribution.sexo}
                                                percentageMode={percentageMode}
                                            />
                                            <DemographicSection
                                                title="Estrato"
                                                distributionData={demographicDistribution.estrato}
                                                percentageMode={percentageMode}
                                            />
                                            <DemographicSection
                                                title="Trabajo Semanal"
                                                distributionData={demographicDistribution.horas_trabajo}
                                                percentageMode={percentageMode}
                                            />
                                            <DemographicSection
                                                title="Grupo de Edad"
                                                distributionData={demographicDistribution.edad}
                                                percentageMode={percentageMode}
                                            />
                                        </div>
                                    </div>

                                    {/* --- Section 2: Tendencia Socio-demográfica --- */}
                                    <div className="space-y-8 pt-12 border-t border-slate-100">
                                        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                                            <div className="flex items-center space-x-3">
                                                <div className="w-1.5 h-6 bg-emerald-500 rounded-full"></div>
                                                <h4 className="text-xl font-black text-slate-800 tracking-tight">Tendencia Socio-demográfica (Filtros Independientes)</h4>
                                            </div>

                                            {/* Advanced Trend Filters */}
                                            <div className="flex flex-wrap items-center gap-4 bg-slate-50/80 backdrop-blur-sm p-3 rounded-2xl border border-slate-100 shadow-sm">
                                                <div className="min-w-[150px]">
                                                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1 ml-1">Nivel de Desglose</label>
                                                    <select
                                                        value={trendBreakdown}
                                                        onChange={(e) => setTrendBreakdown(e.target.value)}
                                                        className="w-full bg-white border-none text-[11px] font-bold text-slate-700 focus:ring-2 focus:ring-emerald-500/20 rounded-xl px-2 py-1.5 cursor-pointer outline-none shadow-sm"
                                                    >
                                                        <option value="">Sin Desglose (General)</option>
                                                        <option value="sector">Por Sector (Oficial/Privado)</option>
                                                        <option value="modalidad">Por Modalidad</option>
                                                        <option value="nivel_de_formacion">Por Nivel de Formación</option>
                                                    </select>
                                                </div>

                                                {trendBreakdown && (
                                                    <div className="flex flex-wrap gap-3 animate-in fade-in slide-in-from-right-2 duration-300">
                                                        <div className="h-8 w-px bg-slate-200 self-end mb-1"></div>
                                                        <div className="min-w-[120px]">
                                                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1 ml-1">Sexo</label>
                                                            <select value={targetSexo} onChange={(e) => setTargetSexo(e.target.value)} className="w-full bg-white border-none text-[10px] font-bold text-slate-700 rounded-lg px-2 py-1 shadow-sm">
                                                                <option value="">Todas las categorías</option>
                                                                {demographicDistribution?.sexo?.data?.filter((d: any) => !d.breakdown).map((d: any) => (<option key={d.category} value={d.category}>{d.category}</option>))}
                                                            </select>
                                                        </div>
                                                        <div className="min-w-[120px]">
                                                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1 ml-1">Estrato</label>
                                                            <select value={targetEstrato} onChange={(e) => setTargetEstrato(e.target.value)} className="w-full bg-white border-none text-[10px] font-bold text-slate-700 rounded-lg px-2 py-1 shadow-sm">
                                                                <option value="">Todas las categorías</option>
                                                                {demographicDistribution?.estrato?.data?.filter((d: any) => !d.breakdown).map((d: any) => (<option key={d.category} value={d.category}>{d.category}</option>))}
                                                            </select>
                                                        </div>
                                                        <div className="min-w-[120px]">
                                                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1 ml-1">Trabajo</label>
                                                            <select value={targetHoras} onChange={(e) => setTargetHoras(e.target.value)} className="w-full bg-white border-none text-[10px] font-bold text-slate-700 rounded-lg px-2 py-1 shadow-sm">
                                                                <option value="">Todas las categorías</option>
                                                                {demographicDistribution?.horas_trabajo?.data?.filter((d: any) => !d.breakdown).map((d: any) => (<option key={d.category} value={d.category}>{d.category}</option>))}
                                                            </select>
                                                        </div>
                                                        <div className="min-w-[120px]">
                                                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1 ml-1">Edad</label>
                                                            <select value={targetEdad} onChange={(e) => setTargetEdad(e.target.value)} className="w-full bg-white border-none text-[10px] font-bold text-slate-700 rounded-lg px-2 py-1 shadow-sm">
                                                                <option value="">Todas las categorías</option>
                                                                {demographicDistribution?.edad?.data?.filter((d: any) => !d.breakdown).map((d: any) => (<option key={d.category} value={d.category}>{d.category}</option>))}
                                                            </select>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                            {[
                                                { title: `Evolución ${trendBreakdown ? (targetSexo ? `de ${targetSexo}` : 'todas las cats. Sexo') : 'por Sexo'}`, data: demographicTrend.sexo },
                                                { title: `Evolución ${trendBreakdown ? (targetEstrato ? `de Estrato ${targetEstrato}` : 'todos Estratos') : 'por Estrato'}`, data: demographicTrend.estrato },
                                                { title: `Evolución ${trendBreakdown ? (targetHoras ? `de ${targetHoras}` : 'todas cat. Trabajo') : 'Horas Trabajo'}`, data: demographicTrend.horas_trabajo },
                                                { title: `Evolución ${trendBreakdown ? (targetEdad ? `de ${targetEdad}` : 'todas Edades') : 'Grupo de Edad'}`, data: demographicTrend.edad },
                                            ].map((trend, idx) => (
                                                <div key={idx} className="bg-white p-6 rounded-[2.5rem] border border-slate-200 shadow-sm flex flex-col h-[450px]">
                                                    <h5 className="text-sm font-black text-slate-700 mb-4">{trend.title}</h5>
                                                    <div className="flex-1 min-h-0">
                                                        <DemographicTrendChart trendData={trend.data} />
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* --- Section 3: Tendencia Socio-demográfica (Anidados) --- */}
                                    <div className="space-y-8 pt-12 border-t border-slate-100">
                                        <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-6">
                                            <div className="flex flex-col space-y-2">
                                                <div className="flex items-center space-x-3">
                                                    <div className="w-1.5 h-6 bg-violet-500 rounded-full"></div>
                                                    <h4 className="text-xl font-black text-slate-800 tracking-tight">Tendencia Socio-demográfica (Filtros Anidados)</h4>
                                                </div>
                                                <p className="text-sm font-medium text-slate-500 max-w-2xl px-4">
                                                    Estos filtros se aplican a todas las gráficas de manera conjunta. Seleccionar múltiples opciones mostrará el cruce correspondiente.
                                                </p>
                                            </div>

                                            {/* Nested Global Filters */}
                                            <div className="flex flex-wrap items-center gap-4 bg-slate-50/80 backdrop-blur-sm p-4 rounded-3xl border border-slate-200 shadow-sm">
                                                <div className="flex items-center gap-2">
                                                    <Filter className="w-4 h-4 text-violet-500" />
                                                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Filtros Globales:</span>
                                                </div>
                                                <div className="flex flex-wrap gap-4">
                                                    <div className="min-w-[140px]">
                                                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1.5 ml-2">Sexo</label>
                                                        <select value={nestedTargetSexo} onChange={(e) => setNestedTargetSexo(e.target.value)} className="w-full bg-white border border-slate-200 focus:border-violet-500 text-[11px] font-bold text-slate-700 rounded-xl px-3 py-2 shadow-sm transition-colors outline-none cursor-pointer">
                                                            <option value="">Todos</option>
                                                            {demographicDistribution?.sexo?.data?.filter((d: any) => !d.breakdown).map((d: any) => (<option key={d.category} value={d.category}>{d.category}</option>))}
                                                        </select>
                                                    </div>
                                                    <div className="min-w-[140px]">
                                                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1.5 ml-2">Estrato</label>
                                                        <select value={nestedTargetEstrato} onChange={(e) => setNestedTargetEstrato(e.target.value)} className="w-full bg-white border border-slate-200 focus:border-violet-500 text-[11px] font-bold text-slate-700 rounded-xl px-3 py-2 shadow-sm transition-colors outline-none cursor-pointer">
                                                            <option value="">Todos</option>
                                                            {demographicDistribution?.estrato?.data?.filter((d: any) => !d.breakdown).map((d: any) => (<option key={d.category} value={d.category}>{d.category}</option>))}
                                                        </select>
                                                    </div>
                                                    <div className="min-w-[140px]">
                                                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1.5 ml-2">Trabajo Semanal</label>
                                                        <select value={nestedTargetHoras} onChange={(e) => setNestedTargetHoras(e.target.value)} className="w-full bg-white border border-slate-200 focus:border-violet-500 text-[11px] font-bold text-slate-700 rounded-xl px-3 py-2 shadow-sm transition-colors outline-none cursor-pointer">
                                                            <option value="">Todos</option>
                                                            {demographicDistribution?.horas_trabajo?.data?.filter((d: any) => !d.breakdown).map((d: any) => (<option key={d.category} value={d.category}>{d.category}</option>))}
                                                        </select>
                                                    </div>
                                                    <div className="min-w-[140px]">
                                                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1.5 ml-2">Grupo de Edad</label>
                                                        <select value={nestedTargetEdad} onChange={(e) => setNestedTargetEdad(e.target.value)} className="w-full bg-white border border-slate-200 focus:border-violet-500 text-[11px] font-bold text-slate-700 rounded-xl px-3 py-2 shadow-sm transition-colors outline-none cursor-pointer">
                                                            <option value="">Todos</option>
                                                            {demographicDistribution?.edad?.data?.filter((d: any) => !d.breakdown).map((d: any) => (<option key={d.category} value={d.category}>{d.category}</option>))}
                                                        </select>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                            {[
                                                { title: `Evolución por Sexo`, data: nestedDemographicTrend?.sexo },
                                                { title: `Evolución por Estrato`, data: nestedDemographicTrend?.estrato },
                                                { title: `Evolución Horas Trabajo`, data: nestedDemographicTrend?.horas_trabajo },
                                                { title: `Evolución Grupo de Edad`, data: nestedDemographicTrend?.edad },
                                            ].map((trend, idx) => (
                                                <div key={idx} className="bg-white p-6 rounded-[2.5rem] border border-slate-200 shadow-sm flex flex-col h-[450px]">
                                                    <h5 className="text-sm font-black text-slate-700 mb-4">{trend.title}</h5>
                                                    <div className="flex-1 min-h-0">
                                                        <DemographicTrendChart trendData={trend.data} />
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center py-20 bg-slate-50/50 rounded-[3rem] border-2 border-dashed border-slate-200">
                                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sky-500 mb-4"></div>
                                    <p className="text-slate-400 font-bold animate-pulse">Cargando datos demográficos...</p>
                                </div>
                            )}
                        </div>
                    </>
                )}
            </div>

            {/* Saber PRO Trend Modal */}
            <SaberProTrendModal
                isOpen={activeSaberProTrendModal !== null}
                onClose={() => setActiveSaberProTrendModal(null)}
                title={activeSaberProTrendModal?.title || ''}
                trendData={activeSaberProTrendModal && saberProTrendData ? saberProTrendData[activeSaberProTrendModal.groupKey] : undefined}
            />

            {/* Tab 2 Detail Modal */}
            <Tab2DetailModal
                isOpen={activeTab2Metric !== null}
                onClose={() => setActiveTab2Metric(null)}
                metric={activeTab2Metric}
                data={tab2ModalData}
                isLoading={isTab2Loading}
                columnDefs={{ levelModalColumns, fieldModalColumns }}
                GenericTableContent={GenericTableContent}
            />
        </ErrorBoundary>
    );
};

const Tab2DetailModal = ({
    isOpen,
    onClose,
    metric,
    data,
    isLoading,
    columnDefs,
    GenericTableContent
}: {
    isOpen: boolean;
    onClose: () => void;
    metric: MetricConfig | null;
    data: { evoData: KPIEvolutionData | null, tableData: any[] };
    isLoading: boolean;
    columnDefs: { levelModalColumns: any[], fieldModalColumns: any[] };
    GenericTableContent: any;
}) => {
    if (!isOpen || !metric) return null;

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose}></div>
            <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-6xl relative z-10 overflow-hidden animate-in fade-in zoom-in duration-200 flex flex-col max-h-[90vh]">
                <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 shrink-0">
                    <div className="flex items-center space-x-4">
                        <div className={`p-3 rounded-2xl bg-brand-blue text-white shadow-lg`}>
                            <metric.icon className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="text-2xl font-black text-slate-800 tracking-tight">Desglose Detallado: {metric.label}</h3>
                            <p className="text-[0.65rem] font-bold text-slate-400 uppercase tracking-widest mt-1">Comparativa Transversal por Nivel de Formación</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-3 bg-white border border-slate-200 hover:bg-slate-100 rounded-full transition-colors group shadow-sm">
                        <X className="w-6 h-6 text-slate-400 group-hover:text-rose-500 transition-colors" />
                    </button>
                </div>

                <div className="flex-1 overflow-auto p-8 min-h-0">
                    <div className="bg-slate-50/50 rounded-[2rem] p-8 border border-slate-100 relative min-h-[450px] flex flex-col">
                        {isLoading && (
                            <div className="absolute inset-0 flex items-center justify-center bg-white/60 backdrop-blur-sm z-10 rounded-[2rem]">
                                <div className="flex flex-col items-center space-y-4">
                                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brand-blue"></div>
                                    <span className="text-xs font-black text-slate-500 uppercase tracking-widest animate-pulse">Consultando base de datos...</span>
                                </div>
                            </div>
                        )}

                        {['num_ies', 'num_programs'].includes(metric.key) ? (
                            <div className="flex-1 min-h-0 overflow-auto custom-scroll">
                                <GenericTableContent
                                    data={data.tableData}
                                    columns={metric.key === 'num_ies' ? columnDefs.levelModalColumns : columnDefs.fieldModalColumns}
                                />
                            </div>
                        ) : (
                            <div className="flex-1 min-h-[400px]">
                                <Plot
                                    data={data.evoData?.series?.map((s: any) => {
                                        const colors: any = { 'T&T': '#004fe5', 'Universitario': '#eab308', 'Posgrado': '#10b981' };
                                        return {
                                            x: data.evoData?.years,
                                            y: s.data,
                                            name: s.name,
                                            type: 'scatter',
                                            mode: 'lines+markers',
                                            line: { color: colors[s.name], width: 4, shape: 'linear' },
                                            marker: { color: colors[s.name], size: 10 }
                                        };
                                    }) || []}
                                    layout={{
                                        autosize: true,
                                        margin: { l: 60, r: 40, t: 20, b: 80 },
                                        showlegend: true,
                                        legend: { orientation: 'h', y: -0.2, font: { size: 12, family: 'Inter, sans-serif' }, x: 0.5, xanchor: 'center' },
                                        paper_bgcolor: 'rgba(0,0,0,0)',
                                        plot_bgcolor: 'rgba(0,0,0,0)',
                                        xaxis: { gridcolor: '#f1f5f9', zeroline: false, dtick: 1, tickfont: { size: 11, weight: 'bold' } },
                                        yaxis: {
                                            gridcolor: '#f1f5f9',
                                            zeroline: false,
                                            tickfont: { size: 11, weight: 'bold' },
                                            ticksuffix: ["avg_desercion", "avg_empleabilidad"].includes(metric.key) ? "%" : ""
                                        }
                                    }}
                                    config={{ responsive: true, displayModeBar: false }}
                                    style={{ width: '100%', height: '100%' }}
                                />
                            </div>
                        )}
                    </div>
                </div>

                <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex justify-between items-center text-[0.6rem] font-black text-slate-400 uppercase tracking-widest px-10">
                    <div className="flex items-center space-x-6">
                        <div className="flex items-center"><div className="w-2 h-2 bg-[#004fe5] rounded-full mr-2"></div> T&T </div>
                        <div className="flex items-center"><div className="w-2 h-2 bg-[#eab308] rounded-full mr-2"></div> Universitario </div>
                        <div className="flex items-center"><div className="w-2 h-2 bg-[#10b981] rounded-full mr-2"></div> Posgrado </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const SaberProTrendModal = ({
    isOpen,
    onClose,
    title,
    trendData
}: {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    trendData: Record<string, Record<string, Record<string, number>>> | undefined;
}) => {
    const [selectedMetric, setSelectedMetric] = useState<string>("pro_gen_punt_global");

    if (!isOpen) return null;

    const labelsMap: Record<string, string> = {
        "pro_gen_punt_global": "Puntaje Global",
        "pro_gen_mod_razona_cuantitat_punt": "Razonamiento Cuantitativo",
        "pro_gen_mod_lectura_critica_punt": "Lectura Crítica",
        "pro_gen_mod_competen_ciudada_punt": "Competencias Ciudadanas",
        "pro_gen_mod_ingles_punt": "Inglés",
        "pro_gen_mod_comuni_escrita_punt": "Comunicación Escrita"
    };

    const colors = [
        '#4f46e5', '#9333ea', '#06b6d4', '#10b981', '#f59e0b', '#ef4444',
        '#6366f1', '#a855f7', '#22d3ee', '#34d399', '#fbbf24', '#f87171'
    ];

    let traces: any[] = [];
    if (trendData) {
        traces = Object.entries(trendData).map(([groupName, yearsData], idx) => {
            const sortedYears = Object.keys(yearsData).map(Number).sort();
            return {
                x: sortedYears,
                y: sortedYears.map(y => yearsData[y]?.[selectedMetric] || null),
                name: groupName,
                type: 'scatter',
                mode: 'lines+markers',
                marker: { color: colors[idx % colors.length], size: 8 },
                line: { color: colors[idx % colors.length], width: 3, shape: 'linear' }
            };
        });
    }

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose}></div>
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-5xl xl:max-w-6xl relative z-10 overflow-hidden animate-in fade-in zoom-in duration-200">
                <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row md:justify-between md:items-center bg-slate-50/50 gap-4">
                    <div>
                        <h3 className="text-xl font-black text-slate-800 tracking-tight">Evolución Histórica Saber PRO</h3>
                        <p className="text-[0.65rem] font-bold text-brand-blue uppercase tracking-widest mt-1">{title}</p>
                    </div>
                    <div className="flex items-center space-x-4">
                        <select
                            value={selectedMetric}
                            onChange={(e) => setSelectedMetric(e.target.value)}
                            className="bg-white border border-slate-200 text-slate-700 text-sm rounded-lg focus:ring-brand-blue border-brand-blue px-3 py-2 outline-none font-medium shadow-sm cursor-pointer"
                        >
                            {Object.entries(labelsMap).map(([key, label]) => (
                                <option key={key} value={key}>{label}</option>
                            ))}
                        </select>
                        <button onClick={onClose} className="p-2 bg-white border border-slate-200 hover:bg-slate-100 rounded-full transition-colors group shadow-sm">
                            <X className="w-5 h-5 text-slate-500 group-hover:text-rose-500 transition-colors" />
                        </button>
                    </div>
                </div>
                <div className="p-8 h-[500px]">
                    {!trendData ? (
                        <div className="flex items-center justify-center h-full">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-blue"></div>
                        </div>
                    ) : (
                        <Plot
                            data={traces}
                            layout={{
                                autosize: true,
                                margin: { l: 50, r: 20, t: 30, b: 60 },
                                showlegend: true,
                                legend: { orientation: 'h', y: -0.15, font: { size: 10, family: 'Inter, sans-serif' } },
                                paper_bgcolor: 'rgba(0,0,0,0)',
                                plot_bgcolor: 'rgba(0,0,0,0)',
                                xaxis: {
                                    gridcolor: '#f1f5f9',
                                    zeroline: false,
                                    dtick: 1,
                                    tickfont: { size: 11, family: 'Inter, sans-serif', weight: 'bold' },
                                    tickformat: 'd'
                                },
                                yaxis: {
                                    gridcolor: '#f1f5f9',
                                    zeroline: false,
                                    tickfont: { size: 11, family: 'Inter, sans-serif', weight: 'bold' }
                                }
                            }}
                            config={{ responsive: true, displayModeBar: false }}
                            style={{ width: '100%', height: '100%' }}
                        />
                    )}
                </div>
            </div>
        </div>
    );
};

const SaberProGroupedChart = ({ data, height = 300, legendOrientation = 'h' }: { data: Record<string, any>, height?: number, legendOrientation?: 'h' | 'v' }) => {
    const labelsMap: Record<string, string> = {
        "pro_gen_punt_global": "Puntaje Global",
        "pro_gen_mod_razona_cuantitat_punt": "Cuantitativo",
        "pro_gen_mod_lectura_critica_punt": "Lectura Crítica",
        "pro_gen_mod_competen_ciudada_punt": "Ciudadanas",
        "pro_gen_mod_ingles_punt": "Inglés",
        "pro_gen_mod_comuni_escrita_punt": "Escrita"
    };

    const orderedKeys = Object.keys(labelsMap).reverse();

    const colors = [
        '#4f46e5', '#9333ea', '#06b6d4', '#10b981', '#f59e0b', '#ef4444',
        '#6366f1', '#a855f7', '#22d3ee', '#34d399', '#fbbf24', '#f87171'
    ];

    const traces = Object.entries(data).map(([groupName, groupStats], idx) => ({
        name: groupName,
        y: orderedKeys.map(k => labelsMap[k]),
        q1: orderedKeys.map(k => groupStats[k]?.q1),
        median: orderedKeys.map(k => groupStats[k]?.median),
        q3: orderedKeys.map(k => groupStats[k]?.q3),
        lowerfence: orderedKeys.map(k => groupStats[k]?.min),
        upperfence: orderedKeys.map(k => groupStats[k]?.max),
        mean: orderedKeys.map(k => groupStats[k]?.mean),
        type: 'box' as const,
        orientation: 'h' as const,
        boxpoints: false as const,
        marker: { color: colors[idx % colors.length] },
        line: { width: 1.5 }
    }));

    return (
        <div style={{ height }}>
            <Plot
                data={traces}
                layout={{
                    autosize: true,
                    margin: {
                        l: 120,
                        r: legendOrientation === 'v' ? 200 : 20,
                        t: 10,
                        b: legendOrientation === 'h' ? 60 : 40
                    },
                    showlegend: true,
                    legend: legendOrientation === 'v'
                        ? { orientation: 'v', x: 1.02, y: 1, font: { size: 8 } }
                        : { orientation: 'h', y: -0.2, font: { size: 9 } },
                    paper_bgcolor: 'rgba(0,0,0,0)',
                    plot_bgcolor: 'rgba(0,0,0,0)',
                    boxmode: 'group',
                    xaxis: {
                        gridcolor: '#f1f5f9',
                        zeroline: false,
                        tickfont: { size: 8 },
                        range: [0, 305]
                    },
                    yaxis: {
                        gridcolor: 'rgba(0,0,0,0)',
                        zeroline: false,
                        tickfont: { size: 9, family: 'Inter, sans-serif', weight: 'bold' }
                    }
                }}
                config={{ responsive: true, displayModeBar: false }}
                style={{ width: '100%', height: '100%' }}
            />
        </div>
    );
};

const SaberProHierarchicalTable = ({ data }: { data: any[] }) => {
    const [expanded, setExpanded] = useState<Record<string, boolean>>({});

    const columns = [
        "pro_gen_punt_global",
        "pro_gen_mod_razona_cuantitat_punt",
        "pro_gen_mod_lectura_critica_punt",
        "pro_gen_mod_competen_ciudada_punt",
        "pro_gen_mod_ingles_punt",
        "pro_gen_mod_comuni_escrita_punt"
    ];

    const toggle = (id: string) => setExpanded(prev => ({ ...prev, [id]: !prev[id] }));

    // Process flat rollup into hierarchical view
    const nationalRaw = data.find(r => r.sector === null);
    const sectors = Array.from(new Set(data.filter(r => r.sector !== null).map(r => r.sector)));

    if (!nationalRaw) return null;

    return (
        <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[1000px]">
                <thead>
                    <tr className="bg-slate-100/50">
                        <th className="px-4 py-4 text-[0.65rem] font-black text-slate-500 uppercase tracking-widest border-b border-slate-200 sticky left-0 bg-slate-50 z-10 w-[300px]">Agrupación</th>
                        {columns.map(c => (
                            <th key={c} className="px-4 py-4 text-[0.65rem] font-black text-slate-500 uppercase tracking-widest border-b border-slate-200 text-center min-w-[120px]">
                                {c.replace("pro_gen_mod_", "").replace("_punt", "").replace("pro_gen_punt_", "").replace("_", " ")}
                                <div className="text-[0.45rem] font-bold text-slate-400 mt-1">PROMEDIO (± DESV)</div>
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {/* Level 0: National */}
                    <tr className="bg-purple-50 group">
                        <td className="px-4 py-4 sticky left-0 bg-purple-50 z-10">
                            <div className="flex items-center font-black text-purple-900 text-sm">
                                <Building2 className="w-4 h-4 mr-2 text-purple-400" />
                                Nivel Nacional
                            </div>
                        </td>
                        {columns.map(c => (
                            <td key={c} className="px-4 py-4 text-center">
                                <div className="text-sm font-black text-purple-900">{nationalRaw[`${c}_mean`]?.toFixed(1) || '0.0'}</div>
                                <div className="text-[0.6rem] font-bold text-purple-400">± {nationalRaw[`${c}_stddev`]?.toFixed(1) || '0.0'}</div>
                                <div className="text-[0.55rem] font-medium text-slate-400 mt-1">{nationalRaw[`${c}_count`]?.toLocaleString()} est.</div>
                            </td>
                        ))}
                    </tr>

                    {/* Level 1: Sectors */}
                    {sectors.map(sector => {
                        const sId = `s-${sector}`;
                        const isExp = expanded[sId];
                        const sRaw = data.find(r => r.sector === sector && r.modalidad === null);
                        if (!sRaw) return null;

                        const modalities = Array.from(new Set(data.filter(r => r.sector === sector && r.modalidad !== null).map(r => r.modalidad)));

                        return (
                            <React.Fragment key={sId}>
                                <tr className="hover:bg-slate-50 transition-colors cursor-pointer" onClick={() => toggle(sId)}>
                                    <td className="px-4 py-4 sticky left-0 bg-white group-hover:bg-slate-50 z-10">
                                        <div className="flex items-center pl-4 font-black text-slate-700 text-[0.8rem]">
                                            {isExp ? <ChevronDown className="w-4 h-4 mr-2 text-brand-blue" /> : <ChevronRight className="w-4 h-4 mr-2 text-slate-300" />}
                                            Sector: {sector}
                                        </div>
                                    </td>
                                    {columns.map(c => (
                                        <td key={c} className="px-4 py-4 text-center">
                                            <div className="text-[0.85rem] font-black text-slate-700">{sRaw[`${c}_mean`]?.toFixed(1) || '0.0'}</div>
                                            <div className="text-[0.6rem] font-bold text-slate-400">± {sRaw[`${c}_stddev`]?.toFixed(1) || '0.0'}</div>
                                            <div className="text-[0.55rem] font-medium text-slate-400 mt-0.5">{sRaw[`${c}_count`]?.toLocaleString()} est.</div>
                                        </td>
                                    ))}
                                </tr>

                                {/* Level 2: Modalidad */}
                                {isExp && modalities.map(mod => {
                                    const mId = `m-${sector}-${mod}`;
                                    const isMExp = expanded[mId];
                                    const mRaw = data.find(r => r.sector === sector && r.modalidad === mod && r.area === null);
                                    if (!mRaw) return null;

                                    const areas = Array.from(new Set(data.filter(r => r.sector === sector && r.modalidad === mod && r.area !== null).map(r => r.area)));

                                    return (
                                        <React.Fragment key={mId}>
                                            <tr className="bg-slate-50/30 hover:bg-slate-100/50 transition-colors cursor-pointer" onClick={(e) => { e.stopPropagation(); toggle(mId); }}>
                                                <td className="px-4 py-3 sticky left-0 bg-slate-50/30 z-10">
                                                    <div className="flex items-center pl-10 font-bold text-slate-600 text-[0.75rem]">
                                                        {isMExp ? <ChevronDown className="w-3 h-3 mr-2 text-brand-blue" /> : <ChevronRight className="w-3 h-3 mr-2 text-slate-400" />}
                                                        Modalidad: {mod}
                                                    </div>
                                                </td>
                                                {columns.map(c => (
                                                    <td key={c} className="px-4 py-3 text-center">
                                                        <div className="text-[0.75rem] font-black text-slate-600">{mRaw[`${c}_mean`]?.toFixed(1) || '0.0'}</div>
                                                        <div className="text-[0.55rem] font-medium text-slate-400 leading-none">{mRaw[`${c}_count`]?.toLocaleString()} est.</div>
                                                    </td>
                                                ))}
                                            </tr>

                                            {/* Level 3: Areas */}
                                            {isMExp && areas.map(area => {
                                                const aId = `a-${sector}-${mod}-${area}`;
                                                const isAExp = expanded[aId];
                                                const aRaw = data.find(r => r.sector === sector && r.modalidad === mod && r.area === area && r.nbc === null);
                                                if (!aRaw) return null;

                                                const nbcs = Array.from(new Set(data.filter(r => r.sector === sector && r.modalidad === mod && r.area === area && r.nbc !== null).map(r => r.nbc)));

                                                return (
                                                    <React.Fragment key={aId}>
                                                        <tr className="bg-white hover:bg-slate-50 transition-colors cursor-pointer" onClick={(e) => { e.stopPropagation(); toggle(aId); }}>
                                                            <td className="px-4 py-2 sticky left-0 bg-white z-10">
                                                                <div className="flex items-center pl-16 font-bold text-slate-500 text-[0.7rem] italic">
                                                                    {isAExp ? <ChevronDown className="w-2.5 h-2.5 mr-2 text-brand-blue" /> : <ChevronRight className="w-2.5 h-2.5 mr-2 text-slate-300" />}
                                                                    {area}
                                                                </div>
                                                            </td>
                                                            {columns.map(c => (
                                                                <td key={c} className="px-4 py-2 text-center text-[0.65rem] font-medium text-slate-400">
                                                                    {aRaw[`${c}_mean`]?.toFixed(1) || '0.0'}
                                                                </td>
                                                            ))}
                                                        </tr>

                                                        {/* Level 4: NBC */}
                                                        {isAExp && nbcs.map(nbc => {
                                                            const nId = `n-${sector}-${mod}-${area}-${nbc}`;
                                                            const isNExp = expanded[nId];
                                                            const nRaw = data.find(r => r.sector === sector && r.modalidad === mod && r.area === area && r.nbc === nbc && r.program === null);
                                                            if (!nRaw) return null;

                                                            const programs = data.filter(r => r.sector === sector && r.modalidad === mod && r.area === area && r.nbc === nbc && r.program !== null);

                                                            return (
                                                                <React.Fragment key={nId}>
                                                                    <tr className="bg-slate-50/20 hover:bg-white transition-colors cursor-pointer" onClick={(e) => { e.stopPropagation(); toggle(nId); }}>
                                                                        <td className="px-4 py-2 sticky left-0 bg-white z-10 border-l-2 border-brand-blue/10">
                                                                            <div className="flex items-center pl-20 font-medium text-slate-500 text-[0.65rem]">
                                                                                {isNExp ? <ChevronDown className="w-2.5 h-2.5 mr-2 text-brand-blue" /> : <ChevronRight className="w-2.5 h-2.5 mr-2 text-slate-400" />}
                                                                                NBC: {nbc}
                                                                            </div>
                                                                        </td>
                                                                        {columns.map(c => (
                                                                            <td key={c} className="px-4 py-2 text-center text-[0.65rem] font-bold text-slate-500">
                                                                                {nRaw[`${c}_mean`]?.toFixed(1) || '0.0'}
                                                                            </td>
                                                                        ))}
                                                                    </tr>

                                                                    {/* Level 5: Programs */}
                                                                    {isNExp && programs.map(pRaw => (
                                                                        <tr key={`p-${pRaw.program}`} className="bg-slate-50/40 hover:bg-slate-100/60 transition-colors">
                                                                            <td className="px-4 py-1.5 sticky left-0 bg-white z-10 border-l-2 border-brand-blue/30">
                                                                                <div className="pl-28 text-[0.6rem] font-medium text-slate-400 truncate max-w-[350px]" title={pRaw.program}>
                                                                                    {pRaw.program}
                                                                                </div>
                                                                            </td>
                                                                            {columns.map(c => (
                                                                                <td key={c} className="px-4 py-1.5 text-center">
                                                                                    <div className="text-[0.65rem] font-bold text-slate-400">
                                                                                        {pRaw[`${c}_mean`]?.toFixed(1) || '0.0'}
                                                                                        <span className="text-[0.55rem] font-medium text-slate-300 ml-1">({pRaw[`${c}_count`]?.toLocaleString()})</span>
                                                                                    </div>
                                                                                </td>
                                                                            ))}
                                                                        </tr>
                                                                    ))}
                                                                </React.Fragment>
                                                            );
                                                        })}
                                                    </React.Fragment>
                                                );
                                            })}
                                        </React.Fragment>
                                    );
                                })}
                            </React.Fragment>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
};

const DemographicTrendChart = ({ trendData }: { trendData: any }) => {
    const colors = [
        '#0ea5e9', '#8b5cf6', '#f59e0b', '#10b981', '#ec4899', '#6366f1',
        '#ef4444', '#14b8a6', '#f97316', '#84cc16'
    ];

    if (!trendData || !trendData.series || trendData.series.length === 0) {
        return <div className="flex h-full items-center justify-center text-slate-400 italic">Sin datos históricos</div>;
    }

    const traces = trendData.series.map((s: any, idx: number) => ({
        x: trendData.years,
        y: s.data,
        name: s.name,
        type: 'scatter',
        mode: 'lines+markers',
        line: { width: 3, shape: 'linear' },
        marker: { size: 6 },
        color: colors[idx % colors.length]
    }));

    return (
        <Plot
            data={traces}
            layout={{
                autosize: true,
                margin: { l: 40, r: 20, t: 10, b: 60 },
                showlegend: true,
                legend: { orientation: 'h', y: -0.2, font: { size: 9 }, x: 0, xanchor: 'left' },
                paper_bgcolor: 'rgba(0,0,0,0)',
                plot_bgcolor: 'rgba(0,0,0,0)',
                xaxis: {
                    gridcolor: '#f1f5f9',
                    zeroline: false,
                    dtick: 1,
                    tickfont: { size: 9 }
                },
                yaxis: {
                    gridcolor: '#f1f5f9',
                    zeroline: false,
                    ticksuffix: '%',
                    tickfont: { size: 9 }
                }
            }}
            config={{ responsive: true, displayModeBar: false }}
            style={{ width: '100%', height: '100%' }}
        />
    );
};

const DemographicSection = ({
    title,
    distributionData,
    percentageMode = 'total'
}: {
    title: string;
    distributionData: any;
    percentageMode?: 'total' | 'group' | 'state';
}) => {
    const colors = [
        '#0ea5e9', '#8b5cf6', '#f59e0b', '#10b981', '#ec4899', '#6366f1',
        '#ef4444', '#14b8a6', '#f97316', '#84cc16'
    ];

    const renderDistribution = () => {
        if (!distributionData || !distributionData.data || distributionData.data.length === 0) {
            return <div className="flex h-full items-center justify-center text-slate-400 italic">Sin datos</div>;
        }

        const data = distributionData.data;
        const hasBreakdown = data.some((d: any) => d.breakdown !== undefined);

        if (hasBreakdown) {
            const breakdownGroups: Record<string, any[]> = {};
            data.forEach((d: any) => {
                const b = d.breakdown || 'Total';
                if (!breakdownGroups[b]) breakdownGroups[b] = [];
                breakdownGroups[b].push(d);
            });

            const categories = Array.from(new Set(data.map((d: any) => d.category)));

            const traces = Object.entries(breakdownGroups).map(([bName, bData], idx) => {
                const values = categories.map(cat => {
                    const found = bData.find((d: any) => d.category === cat);
                    if (!found) return 0;
                    if (percentageMode === 'total') return found.percentage;
                    if (percentageMode === 'group') return found.percentage_breakdown;
                    return found.percentage_category;
                });

                const modeLabel = percentageMode === 'total' ? 'del total general'
                    : percentageMode === 'group' ? 'del segmento'
                        : 'de la categoría';

                return {
                    x: values,
                    y: categories,
                    name: bName,
                    type: 'bar',
                    orientation: 'h',
                    marker: { color: colors[idx % colors.length], opacity: 0.8 },
                    text: values.map(v => v > 0 ? `${v.toFixed(1)}%` : ''),
                    textposition: 'auto',
                    hovertemplate: `<b>%{y} - ${bName}</b><br>` +
                        `%{x:.1f}% ${modeLabel}<br>` +
                        `(%{customdata:,} estudiantes)<br>` +
                        `<extra></extra>`,
                    customdata: categories.map(cat => bData.find((d: any) => d.category === cat)?.value || 0)
                } as any;
            });

            return (
                <Plot
                    data={traces}
                    layout={{
                        autosize: true,
                        margin: { l: 80, r: 20, t: 10, b: 60 },
                        barmode: 'group',
                        showlegend: true,
                        legend: { orientation: 'h', y: -0.1, font: { size: 9 }, x: 0, xanchor: 'left' },
                        paper_bgcolor: 'rgba(0,0,0,0)',
                        plot_bgcolor: 'rgba(0,0,0,0)',
                        xaxis: {
                            gridcolor: '#f1f5f9',
                            zeroline: false,
                            tickformat: '.0f',
                            ticksuffix: '%',
                            tickfont: { size: 9, family: 'Inter, sans-serif' }
                        },
                        yaxis: {
                            tickfont: { size: 10, family: 'Inter, sans-serif', weight: 'bold' },
                            autorange: 'reversed'
                        }
                    }}
                    config={{ responsive: true, displayModeBar: false }}
                    style={{ width: '100%', height: '100%' }}
                />
            );
        }

        const sortedData = [...data].sort((a: any, b: any) => a.percentage - b.percentage);

        const trace = {
            x: sortedData.map((d: any) => d.percentage),
            y: sortedData.map((d: any) => d.category),
            type: 'bar',
            orientation: 'h',
            marker: {
                color: sortedData.map((_: any, i: number) => colors[i % colors.length]),
                opacity: 0.8,
            },
            text: sortedData.map((d: any) => `${d.percentage.toFixed(1)}%<br>(${d.value.toLocaleString()})`),
            textposition: 'auto',
            hoverinfo: 'text'
        };

        return (
            <Plot
                data={[trace as any]}
                layout={{
                    autosize: true,
                    margin: { l: 80, r: 20, t: 10, b: 40 },
                    paper_bgcolor: 'rgba(0,0,0,0)',
                    plot_bgcolor: 'rgba(0,0,0,0)',
                    xaxis: {
                        gridcolor: '#f1f5f9',
                        zeroline: false,
                        tickformat: '.0f',
                        ticksuffix: '%',
                        tickfont: { size: 10, family: 'Inter, sans-serif' }
                    },
                    yaxis: {
                        tickfont: { size: 10, family: 'Inter, sans-serif', weight: 'bold' }
                    }
                }}
                config={{ responsive: true, displayModeBar: false }}
                style={{ width: '100%', height: '100%' }}
            />
        );
    };

    return (
        <div className="bg-white p-6 rounded-[2.5rem] border border-slate-200 shadow-sm flex flex-col h-[450px]">
            <h5 className="text-lg font-black text-slate-800 mb-4">{title}</h5>
            <div className="flex-1 min-h-0">
                {renderDistribution()}
            </div>
        </div>
    );
};

export default National;

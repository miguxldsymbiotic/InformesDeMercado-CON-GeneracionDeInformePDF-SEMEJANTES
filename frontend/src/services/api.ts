// Lee la URL de la API desde las variables de entorno de Vite.
const API_URL = import.meta.env.VITE_API_URL;

// Esta comprobación detendrá la aplicación si la variable de entorno no fue configurada
// durante el proceso de build. Esto es preferible a tener URLs rotas.
// Para desarrollo local, asegúrate de tener el archivo `frontend/.env` con VITE_API_URL.
if (!API_URL) {
    console.error("REVISA EL ARCHIVO DE GITHUB (WORKFLOW) PARA LA VARIABLE DE ENTORNO VITE_API_URL");
    // En Azure, esto siempre será undefined si el YAML no la tiene.
}

export interface FilterParams {
    sector?: string[];
    modalidad?: string[];
    nivel_de_formacion?: string[];
    campo_amplio?: string[];
    campo_especifico?: string[];
    campo_detallado?: string[];
    area_de_conocimiento?: string[];
    nucleo_basico_del_conocimiento?: string[];
    departamento?: string[];
    departamento_principal?: string[];
    municipio?: string[];
    municipio_principal?: string[];
    institucion?: string[];
    palabra_clave?: string[];
    codigo_snies?: string[];
    breakdown_column?: string;
    target_sexo?: string;
    target_estrato?: string;
    target_horas_trabajo?: string;
    target_edad?: string;
    nested?: boolean;
}

const buildQueryParams = (filters?: FilterParams): string => {
    if (!filters) return '';
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, values]) => {
        if (Array.isArray(values)) {
            values.forEach(val => {
                if (val) params.append(key, val);
            });
        } else if (values) {
            params.append(key, values);
        }
    });
    return params.toString();
};

export interface SeriesData {
    years: number[];
    values: number[];
}

export interface MetricEvolution {
    main: Record<string, SeriesData>;
    pregrado: Record<string, SeriesData>;
    posgrado: Record<string, SeriesData>;
}

export interface NationalEvolutionData {
    matricula: MetricEvolution;
    primer_curso: MetricEvolution;
    graduados: MetricEvolution;
}

export interface NationalPrimerCursoEvolutionData {
    [level: string]: {
        years: number[];
        series: {
            name: string;
            data: number[];
        }[];
    };
}

export interface RegionalEvolutionData {
    years: number[];
    enrollment: number[];
}

export interface TopMunicipalitiesData {
    municipalities: string[];
    enrollment: number[];
}

export const fetchNationalEvolution = async (filters?: FilterParams): Promise<NationalEvolutionData> => {
    const params = buildQueryParams(filters);
    const response = await fetch(`${API_URL}/national/evolution?${params}`);
    if (!response.ok) {
        throw new Error('Failed to fetch national evolution data');
    }
    return response.json();
};

export interface NationalKPIs {
    num_ies: number;
    num_programs: number;
    total_matricula: number;
    total_matricula_growth?: number | null;
    matricula_year: number;
    total_pcurso: number;
    total_pcurso_growth?: number | null;
    pcurso_year: number;
    total_graduados: number;
    total_graduados_growth?: number | null;
    graduados_year: number;
    avg_desercion: number | null;
    avg_desercion_growth?: number | null;
    desercion_year: number;
    avg_saberpro: number | null;
    avg_saberpro_growth?: number | null;
    saberpro_year: number;
    avg_empleabilidad: number | null;
    avg_empleabilidad_growth?: number | null;
    empleabilidad_year: number;
}

export interface NationalKPIDashboard {
    summary: NationalKPIs;
    by_sector: Record<string, NationalKPIs>;
    by_level: Record<string, NationalKPIs>;
}

export const fetchNationalKPIs = async (filters?: FilterParams): Promise<NationalKPIDashboard> => {
    const params = buildQueryParams(filters);
    const response = await fetch(`${API_URL}/national/kpis?${params}`);
    if (!response.ok) throw new Error('Failed to fetch national KPIs');
    return response.json();
};

export interface ChartData {
    labels: string[];
    values: number[];
}

export interface NationalContext {
    ies_by_sector: ChartData;
    programs_by_modalidad: ChartData;
    students_by_level: ChartData;
    programs_by_field: ChartData;
}

export const fetchNationalContext = async (filters?: FilterParams): Promise<NationalContext> => {
    const params = buildQueryParams(filters);
    const response = await fetch(`${API_URL}/national/context?${params}`);
    if (!response.ok) throw new Error('Failed to fetch national context charts');
    return response.json();
};


export const fetchNationalPrimerCursoEvolution = async (filters?: FilterParams): Promise<NationalPrimerCursoEvolutionData> => {
    const params = buildQueryParams(filters);
    const response = await fetch(`${API_URL}/national/evolution/primer_curso?${params}`);
    if (!response.ok) throw new Error('Failed to fetch national primer curso evolution data');
    return response.json();
};

export const fetchNationalPrimerCursoEvolutionBySector = async (filters?: FilterParams): Promise<Record<string, NationalPrimerCursoEvolutionData>> => {
    // Sector breakdown usually ignores global sector filter
    const { sector, ...otherFilters } = filters || {};
    const params = buildQueryParams(otherFilters);
    const response = await fetch(`${API_URL}/national/evolution/primer_curso_sector?${params}`);
    if (!response.ok) throw new Error('Failed to fetch national primer curso evolution by sector data');
    return response.json();
};

export interface DeptOption {
    name: string;
    code: number;
}

export const fetchDepartmentsPrincipal = async (): Promise<DeptOption[]> => {
    const response = await fetch(`${API_URL}/regional/departments_principal`);
    if (!response.ok) throw new Error('Failed to fetch departments principal');
    return response.json();
};

export const fetchDepartmentsOferta = async (): Promise<DeptOption[]> => {
    const response = await fetch(`${API_URL}/regional/departments_oferta`);
    if (!response.ok) throw new Error('Failed to fetch departments oferta');
    return response.json();
};

export interface MpioOption {
    name: string;
    code: number;
}

export const fetchMunicipalitiesPrincipal = async (departamento_principal?: string[]): Promise<MpioOption[]> => {
    const params = new URLSearchParams();
    if (departamento_principal && departamento_principal.length > 0) {
        departamento_principal.forEach(d => params.append('departamento_principal', d));
    }
    const query = params.toString() ? `?${params.toString()}` : '';
    const response = await fetch(`${API_URL}/regional/municipalities_principal${query}`);
    if (!response.ok) throw new Error('Failed to fetch municipalities principal');
    return response.json();
};

export const fetchMunicipalitiesOferta = async (departamento_oferta?: string[]): Promise<MpioOption[]> => {
    const params = new URLSearchParams();
    if (departamento_oferta && departamento_oferta.length > 0) {
        departamento_oferta.forEach(d => params.append('departamento_oferta', d));
    }
    const query = params.toString() ? `?${params.toString()}` : '';
    const response = await fetch(`${API_URL}/regional/municipalities_oferta${query}`);
    if (!response.ok) throw new Error('Failed to fetch municipalities oferta');
    return response.json();
};

export interface RelatedDepartments {
    related_principal: string[];
    related_oferta: string[];
}

export const fetchRelatedDepartments = async (
    departamento_principal?: string[],
    departamento_oferta?: string[]
): Promise<RelatedDepartments> => {
    const params = new URLSearchParams();
    if (departamento_principal) {
        departamento_principal.forEach(d => params.append('departamento_principal', d));
    }
    if (departamento_oferta) {
        departamento_oferta.forEach(d => params.append('departamento_oferta', d));
    }
    const response = await fetch(`${API_URL}/regional/related_departments?${params.toString()}`);
    if (!response.ok) throw new Error('Failed to fetch related departments');
    return response.json();
};

export const fetchRelatedFromMunicipalities = async (
    municipio_principal?: string[],
    municipio_oferta?: string[]
): Promise<RelatedDepartments> => {
    const params = new URLSearchParams();
    if (municipio_principal) {
        municipio_principal.forEach(m => params.append('municipio_principal', m));
    }
    if (municipio_oferta) {
        municipio_oferta.forEach(m => params.append('municipio_oferta', m));
    }
    const response = await fetch(`${API_URL}/regional/related_from_municipalities?${params.toString()}`);
    if (!response.ok) throw new Error('Failed to fetch related from municipalities');
    return response.json();
};

export const fetchRegionalEvolution = async (department: string): Promise<RegionalEvolutionData> => {
    const response = await fetch(`${API_URL}/regional/evolution?department=${encodeURIComponent(department)}`);
    if (!response.ok) throw new Error('Failed to fetch regional evolution');
    return response.json();
};

export const fetchTopMunicipalities = async (department: string): Promise<TopMunicipalitiesData> => {
    const response = await fetch(`${API_URL}/regional/top_municipalities?department=${encodeURIComponent(department)}`);
    if (!response.ok) throw new Error('Failed to fetch top municipalities');
    return response.json();
};
export interface KPIEvolutionData {
    years: number[];
    values: (number | null)[];
    series?: {
        name: string;
        data: (number | null)[];
    }[];
}

export const fetchKPIEvolution = async (metric: string, filters?: FilterParams): Promise<KPIEvolutionData> => {
    const params = buildQueryParams(filters);
    const response = await fetch(`${API_URL}/national/evolution/kpi?metric=${metric}&${params}`);
    if (!response.ok) throw new Error('Failed to fetch KPI evolution data');
    return response.json();
};



export interface DynamicFilterOptions {
    sector: string[];
    modalidad: string[];
    nivel_de_formacion: string[];
    campo_amplio: string[];
    campo_especifico: string[];
    campo_detallado: string[];
    area_de_conocimiento: string[];
    nucleo_basico_del_conocimiento: string[];
    institucion: string[];
    departamento: string[];
    departamento_principal: string[];
    municipio: string[];
    municipio_principal: string[];
}

export const fetchDynamicFilterOptions = async (filters?: FilterParams): Promise<DynamicFilterOptions> => {
    const params = buildQueryParams(filters);
    const response = await fetch(`${API_URL}/national/dynamic-filter-options?${params}`);
    if (!response.ok) throw new Error('Failed to fetch dynamic filter options');
    return response.json();
};

export interface ProgramOption {
    sector: string;
    modalidad: string;
    nivel: string;
    amplio: string;
    especifico: string;
    detallado: string;
    area: string;
    nucleo: string;
    institucion: string;
    programa: string;
    snies: string;
    codigo_institucion: string;
    caracter_academico: string;
    departamento_principal: string;
    municipio_principal: string;
    departamento: string;
    municipio: string;
    reconocimiento_del_ministerio: string;
    fecha_de_resolucion: string;
    vigencia_annos: string;
    numero_creditos: string;
    numero_periodos_de_duracion: string;
    costo_matricula_estud_nuevos: string;
}

export const fetchProgramOptions = async (): Promise<ProgramOption[]> => {
    const response = await fetch(`${API_URL}/national/filter-options/program`);
    if (!response.ok) throw new Error('Failed to fetch program options');
    return response.json();
};

export interface DisciplineStats {
    labels: string[];
    series: {
        name: string;
        data: number[];
    }[];
}

export const fetchNationalDisciplineStats = async (filters?: FilterParams): Promise<DisciplineStats> => {
    const params = buildQueryParams(filters);
    const response = await fetch(`${API_URL}/national/discipline_stats?${params}`);
    if (!response.ok) throw new Error('Failed to fetch national discipline stats');
    return response.json();
};

export interface FieldTrendData {
    years: number[];
    series: {
        name: string;
        data: number[];
    }[];
}

export const fetchFieldTrend = async (filters?: FilterParams): Promise<FieldTrendData> => {
    const params = buildQueryParams(filters);
    const response = await fetch(`${API_URL}/national/field_trend?${params}`);
    if (!response.ok) throw new Error('Failed to fetch national field trend data');
    return response.json();
};

export interface DisciplineTableItem {
    name?: string; // For tree nodes
    level?: 'amplio' | 'especifico' | 'detallado';
    campo_amplio?: string; // For flat compatibility if needed, though structure is now tree
    campo_especifico?: string;
    num_ies: number;
    num_programs: number;
    total_matricula: number;
    total_matricula_growth: number | null;
    total_pcurso: number;
    total_pcurso_growth: number | null;
    total_graduados: number;
    total_graduados_growth: number | null;
    avg_desercion: number;
    avg_desercion_growth: number | null;
    avg_saberpro: number;
    avg_saberpro_growth: number | null;
    avg_empleabilidad: number;
    avg_empleabilidad_growth: number | null;
    children?: DisciplineTableItem[];
}

export const fetchNationalDisciplineTable = async (filters?: FilterParams): Promise<DisciplineTableItem[]> => {
    const params = buildQueryParams(filters);
    const response = await fetch(`${API_URL}/national/discipline_table?${params}`);
    if (!response.ok) throw new Error('Failed to fetch national discipline table data');
    return response.json();
};

export interface IESTableItem {
    name?: string;
    sector?: string;
    level?: 'ies' | 'nivel' | 'modalidad' | 'amplio' | 'especifico' | 'detallado';
    num_programs: number;
    total_matricula: number;
    total_matricula_growth: number | null;
    total_pcurso: number;
    total_pcurso_growth: number | null;
    total_graduados: number;
    total_graduados_growth: number | null;
    avg_desercion: number;
    avg_desercion_growth: number | null;
    avg_saberpro: number;
    avg_saberpro_growth: number | null;
    avg_empleabilidad: number;
    avg_empleabilidad_growth: number | null;
    children?: IESTableItem[];
}

export const fetchNationalIESTable = async (filters?: FilterParams): Promise<IESTableItem[]> => {
    const params = buildQueryParams(filters);
    const response = await fetch(`${API_URL}/national/ies_table?${params}`);
    if (!response.ok) throw new Error('Failed to fetch national IES table data');
    return response.json();
};

export const fetchNationalIESList = async (filters?: FilterParams): Promise<IESTableItem[]> => {
    const params = buildQueryParams(filters);
    const response = await fetch(`${API_URL}/national/ies_list?${params}`);
    if (!response.ok) throw new Error('Failed to fetch national IES list');
    return response.json();
};

export interface SaberProStat {
    min: number;
    q1: number;
    median: number;
    q3: number;
    max: number;
    mean: number;
    stddev: number;
    count: number;
}

export interface SaberProDashboardData {
    year: number;
    summary: Record<string, SaberProStat | null>;
    by_sector: Record<string, Record<string, SaberProStat>>;
    by_modalidad: Record<string, Record<string, SaberProStat>>;
    by_campo_amplio: Record<string, Record<string, SaberProStat>>;
    hierarchy: any[];
}

export const fetchNationalSaberProStats = async (filters?: FilterParams): Promise<SaberProDashboardData> => {
    const params = buildQueryParams(filters);
    const response = await fetch(`${API_URL}/national/saberpro_stats?${params}`);
    if (!response.ok) throw new Error('Failed to fetch national Saber PRO stats');
    return response.json();
};

export interface SaberProTrendData {
    summary: Record<string, Record<string, Record<string, number>>>;
    by_sector: Record<string, Record<string, Record<string, number>>>;
    by_modalidad: Record<string, Record<string, Record<string, number>>>;
    by_campo_amplio: Record<string, Record<string, Record<string, number>>>;
}

export const fetchNationalSaberProTrend = async (filters?: FilterParams): Promise<SaberProTrendData> => {
    const params = buildQueryParams(filters);
    const response = await fetch(`${API_URL}/national/saberpro_trend?${params}`);
    if (!response.ok) throw new Error('Failed to fetch national Saber PRO trend');
    return response.json();
};

export interface DeptDistribution {
    code: string;
    name: string;
    value: number;
}

export const fetchMapDistribution = async (
    metric: string,
    dimension: string,
    filters?: FilterParams,
    level: string = "department"
): Promise<DeptDistribution[]> => {
    const params = buildQueryParams(filters);
    const response = await fetch(`${API_URL}/regional/map_distribution?metric=${metric}&dimension=${dimension}&level=${level}&${params}`);
    if (!response.ok) throw new Error('Failed to fetch map distribution');
    return response.json();
};

export interface DemographicDistributionItem {
    category: string;
    value: number;
    percentage: number;
}

export interface DemographicDistribution {
    sexo: { year: number; data: DemographicDistributionItem[] };
    estrato: { year: number; data: DemographicDistributionItem[] };
    horas_trabajo: { year: number; data: DemographicDistributionItem[] };
    edad: { year: number; data: DemographicDistributionItem[] };
}

export const fetchDemographicDistribution = async (filters?: FilterParams): Promise<DemographicDistribution> => {
    const params = buildQueryParams(filters);
    const response = await fetch(`${API_URL}/national/demographics/distribution?${params}`);
    if (!response.ok) throw new Error('Failed to fetch demographic distribution');
    return response.json();
};

export interface DemographicTrend {
    sexo: { years: number[]; series: { name: string; data: number[] }[] };
    estrato: { years: number[]; series: { name: string; data: number[] }[] };
    horas_trabajo: { years: number[]; series: { name: string; data: number[] }[] };
    edad: { years: number[]; series: { name: string; data: number[] }[] };
}

export const fetchDemographicTrend = async (filters?: FilterParams): Promise<DemographicTrend> => {
    const params = buildQueryParams(filters);
    const response = await fetch(`${API_URL}/national/demographics/trend?${params}`);
    if (!response.ok) throw new Error('Failed to fetch demographic trend');
    return response.json();
};

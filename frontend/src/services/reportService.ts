import { 
    fetchProgramOptions, 
    fetchNationalKPIs, 
    fetchNationalSaberProStats,
    fetchDemographicDistribution,
    fetchKPIEvolution,
    ProgramOption,
    NationalKPIDashboard,
    SaberProDashboardData,
    DemographicDistribution,
    KPIEvolutionData,
    FilterParams
} from './api';

export interface SimilarAnalysis {
    totalNational: number;
    topDepartments: { name: string, count: number }[];
    topInstitutions: { name: string, count: number }[];
    localCompetitors: ProgramOption[];
}

export interface ReportData {
    program: ProgramOption;
    programKPIs: NationalKPIDashboard;
    areaKPIs: NationalKPIDashboard;
    nbcKPIs: NationalKPIDashboard;
    nivelKPIs: NationalKPIDashboard;
    nacionalKPIs: NationalKPIDashboard;
    matriculaEvolution: KPIEvolutionData;
    pcursoEvolution: KPIEvolutionData;
    graduadosEvolution: KPIEvolutionData;
    desercionEvolution: KPIEvolutionData;
    // Market trends (Dept + Level + Area)
    marketMatriculaEvolution: KPIEvolutionData;
    marketPcursoEvolution: KPIEvolutionData;
    marketGraduadosEvolution: KPIEvolutionData;
    marketDesercionEvolution: KPIEvolutionData;
    marketKPIs: NationalKPIDashboard;
    // Sector trends (Dept + Sector + Level + Area)
    sectorMatriculaEvolution: KPIEvolutionData;
    sectorPcursoEvolution: KPIEvolutionData;
    sectorGraduadosEvolution: KPIEvolutionData;
    sectorDesercionEvolution: KPIEvolutionData;
    sectorKPIs: NationalKPIDashboard;
    // Modality trends (Dept + Modality + Level + Area)
    modalityMatriculaEvolution: KPIEvolutionData;
    modalityPcursoEvolution: KPIEvolutionData;
    modalityGraduadosEvolution: KPIEvolutionData;
    modalityDesercionEvolution: KPIEvolutionData;
    modalityKPIs: NationalKPIDashboard;
    
    saberProProgram: SaberProDashboardData;
    saberProArea: SaberProDashboardData;
    demographics: DemographicDistribution;
    similarPrograms: ProgramOption[];
    nbcSimilarPrograms: ProgramOption[];
    similarAnalysis: SimilarAnalysis;
    nbcSimilarAnalysis: SimilarAnalysis;
    
    generatedAt: string;
}

let _cachedPrograms: ProgramOption[] | null = null;

export const getPrograms = async (): Promise<ProgramOption[]> => {
    if (_cachedPrograms) return _cachedPrograms;
    _cachedPrograms = await fetchProgramOptions();
    return _cachedPrograms;
};

export const searchPrograms = async (query: string): Promise<ProgramOption[]> => {
    const programs = await getPrograms();
    const q = query.toLowerCase().trim();
    if (!q) return [];
    return programs.filter(p =>
        p.snies.includes(q) ||
        p.programa.toLowerCase().includes(q) ||
        p.institucion.toLowerCase().includes(q) ||
        (p.departamento && p.departamento.toLowerCase().includes(q))
    ).slice(0, 20);
};

export const collectReportData = async (program: ProgramOption): Promise<ReportData> => {
    const programFilter: FilterParams = { 
        codigo_snies: [program.snies],
        departamento: [program.departamento],
        municipio: [program.municipio]
    };
    
    const areaFilter: FilterParams = { area_de_conocimiento: [program.area] };
    const nbcFilter: FilterParams = { nucleo_basico_del_conocimiento: [program.nucleo] };
    const nivelFilter: FilterParams = { nivel_de_formacion: [program.nivel] };
    
    // DEFINITIVE MARKET FILTER: Dept + Level + Area
    const marketFilter: FilterParams = { 
        departamento: [program.departamento],
        nivel_de_formacion: [program.nivel],
        area_de_conocimiento: [program.area]
    };

    // SECTOR MARKET FILTER: Dept + Sector + Level + Area
    const sectorMarketFilter: FilterParams = {
        departamento: [program.departamento],
        sector: [program.sector],
        nivel_de_formacion: [program.nivel],
        area_de_conocimiento: [program.area]
    };

    // MODALITY MARKET FILTER: Dept + Modality + Level + Area
    const modalityMarketFilter: FilterParams = {
        departamento: [program.departamento],
        modalidad: [program.modalidad],
        nivel_de_formacion: [program.nivel],
        area_de_conocimiento: [program.area]
    };
    
    const nacionalFilter: FilterParams = {};

    const safeFetch = async <T>(promise: Promise<T>, fallback: T, tag: string): Promise<T> => {
        try {
            return await promise;
        } catch (e) {
            console.warn(`API [${tag}] failed:`, e);
            return fallback;
        }
    };

    const emptyKPIs: NationalKPIDashboard = {
        summary: { num_ies: 0, num_programs: 0, total_matricula: 0, matricula_year: 0, total_pcurso: 0, pcurso_year: 0, total_graduados: 0, graduados_year: 0, avg_desercion: 0, desercion_year: 0, avg_saberpro: null, saberpro_year: 0, avg_empleabilidad: 0, empleabilidad_year: 0 },
        by_sector: {}, by_level: {}
    };

    const emptyEvolution: KPIEvolutionData = { years: [], values: [] };
    const emptySaberPro: SaberProDashboardData = { year: 0, summary: {}, by_sector: {}, by_modalidad: {}, by_campo_amplio: {}, hierarchy: [] };
    const emptyDemographics: DemographicDistribution = {
        sexo: { year: 0, data: [] }, estrato: { year: 0, data: [] }, horas_trabajo: { year: 0, data: [] }, edad: { year: 0, data: [] }
    };

    const [
        programKPIs, areaKPIs, nbcKPIs, nivelKPIs, nacionalKPIs,
        matriculaEvolution, pcursoEvolution, graduadosEvolution, desercionEvolution,
        marketMatriculaEvolution, marketPcursoEvolution, marketGraduadosEvolution, marketDesercionEvolution, marketKPIs,
        sectorMatriculaEvolution, sectorPcursoEvolution, sectorGraduadosEvolution, sectorDesercionEvolution, sectorKPIs,
        modalityMatriculaEvolution, modalityPcursoEvolution, modalityGraduadosEvolution, modalityDesercionEvolution, modalityKPIs,
        saberProProgram, saberProArea, demographics
    ] = await Promise.all([
        safeFetch(fetchNationalKPIs(programFilter), emptyKPIs, 'programKPIs'),
        safeFetch(fetchNationalKPIs(areaFilter), emptyKPIs, 'areaKPIs'),
        safeFetch(fetchNationalKPIs(nbcFilter), emptyKPIs, 'nbcKPIs'),
        safeFetch(fetchNationalKPIs(nivelFilter), emptyKPIs, 'nivelKPIs'),
        safeFetch(fetchNationalKPIs(nacionalFilter), emptyKPIs, 'nacionalKPIs'),
        
        safeFetch(fetchKPIEvolution('matricula', programFilter), emptyEvolution, 'matriculaEvolution'),
        safeFetch(fetchKPIEvolution('pcurso', programFilter), emptyEvolution, 'pcursoEvolution'),
        safeFetch(fetchKPIEvolution('graduados', programFilter), emptyEvolution, 'graduadosEvolution'),
        safeFetch(fetchKPIEvolution('desercion', programFilter), emptyEvolution, 'desercionEvolution'),
        
        // Market Trends (Location-based)
        safeFetch(fetchKPIEvolution('matricula', marketFilter), emptyEvolution, 'marketMatriculaEvolution'),
        safeFetch(fetchKPIEvolution('pcurso', marketFilter), emptyEvolution, 'marketPcursoEvolution'),
        safeFetch(fetchKPIEvolution('graduados', marketFilter), emptyEvolution, 'marketGraduadosEvolution'),
        safeFetch(fetchKPIEvolution('desercion', marketFilter), emptyEvolution, 'marketDesercionEvolution'),
        safeFetch(fetchNationalKPIs(marketFilter), emptyKPIs, 'marketKPIs'),

        // Sector Trends (Geography + Type)
        safeFetch(fetchKPIEvolution('matricula', sectorMarketFilter), emptyEvolution, 'sectorMatriculaEvolution'),
        safeFetch(fetchKPIEvolution('pcurso', sectorMarketFilter), emptyEvolution, 'sectorPcursoEvolution'),
        safeFetch(fetchKPIEvolution('graduados', sectorMarketFilter), emptyEvolution, 'sectorGraduadosEvolution'),
        safeFetch(fetchKPIEvolution('desercion', sectorMarketFilter), emptyEvolution, 'sectorDesercionEvolution'),
        safeFetch(fetchNationalKPIs(sectorMarketFilter), emptyKPIs, 'sectorKPIs'),

        // Modality Trends (Geography + Modality)
        safeFetch(fetchKPIEvolution('matricula', modalityMarketFilter), emptyEvolution, 'modalityMatriculaEvolution'),
        safeFetch(fetchKPIEvolution('pcurso', modalityMarketFilter), emptyEvolution, 'modalityPcursoEvolution'),
        safeFetch(fetchKPIEvolution('graduados', modalityMarketFilter), emptyEvolution, 'modalityGraduadosEvolution'),
        safeFetch(fetchKPIEvolution('desercion', modalityMarketFilter), emptyEvolution, 'modalityDesercionEvolution'),
        safeFetch(fetchNationalKPIs(modalityMarketFilter), emptyKPIs, 'modalityKPIs'),
        
        safeFetch(fetchNationalSaberProStats(programFilter), emptySaberPro, 'saberProProgram'),
        safeFetch(fetchNationalSaberProStats(areaFilter), emptySaberPro, 'saberProArea'),
        // USE ONLY SNIES FOR DEMOGRAPHICS TO ENSURE CONSISTENCY
        safeFetch(fetchDemographicDistribution({ codigo_snies: [program.snies] }), emptyDemographics, 'demographics'),
    ]);

    // ENCUENTRA PROGRAMAS SEMEJANTES (CLIENT-SIDE)
    const allProgs = await getPrograms();
    const findSimilar = (target: ProgramOption, others: ProgramOption[]) => {
        const stopWords = new Set(['de', 'la', 'el', 'en', 'y', 'con', 'para', 'o', 'un', 'una', 'del', 'al']);
        const tokens = target.programa.toLowerCase()
            .split(/[\s,.-]+/)
            .filter(t => t.length > 2 && !stopWords.has(t));
        
        return others
            .filter(p => p.snies !== target.snies) // No soy yo mismo
            .map(p => {
                const pTokens = p.programa.toLowerCase().split(/[\s,.-]+/);
                const matches = tokens.filter(t => pTokens.some(pt => pt.includes(t)));
                return { program: p, score: matches.length };
            })
            .filter(res => res.score >= Math.min(tokens.length, 2)) // Al menos 2 coincidencias o todas si son pocas
            .sort((a, b) => b.score - a.score)
            .map(res => res.program);
    };

    const similarPrograms = findSimilar(program, allProgs);
    
    // ENCUENTRA AFINIDAD POR NBC (MISMO NUCLEO, NOMBRES DISTINTOS)
    const findNbcSimilar = (target: ProgramOption, others: ProgramOption[]) => {
        return others
            .filter(p => p.snies !== target.snies && p.nucleo === target.nucleo)
            .map(p => {
                // Score basado en compartir Area + Detallado + Nivel
                let score = 0;
                if (p.area === target.area) score += 2;
                if (p.detallado === target.detallado) score += 1;
                if (p.nivel === target.nivel) score += 1;
                return { program: p, score };
            })
            .sort((a, b) => b.score - a.score)
            .map(res => res.program);
    };

    const nbcSimilarPrograms = findNbcSimilar(program, allProgs);

    const buildAnalysis = (progs: ProgramOption[], targetDept: string): SimilarAnalysis => {
        const deptCounts: Record<string, number> = {};
        const instCounts: Record<string, number> = {};
        
        progs.forEach(p => {
            const d = p.departamento_principal || p.departamento;
            if (d) deptCounts[d] = (deptCounts[d] || 0) + 1;
            if (p.institucion) instCounts[p.institucion] = (instCounts[p.institucion] || 0) + 1;
        });

        const topDepartments = Object.entries(deptCounts)
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 3);
            
        const topInstitutions = Object.entries(instCounts)
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 10);

        const localCompetitors = progs.filter(p => (p.departamento_principal || p.departamento) === targetDept);

        return {
            totalNational: progs.length,
            topDepartments,
            topInstitutions,
            localCompetitors
        };
    };

    const similarAnalysis = buildAnalysis(similarPrograms, program.departamento_principal || program.departamento);
    const nbcSimilarAnalysis = buildAnalysis(nbcSimilarPrograms, program.departamento_principal || program.departamento);

    return {
        program, programKPIs, areaKPIs, nbcKPIs, nivelKPIs, nacionalKPIs,
        matriculaEvolution, pcursoEvolution, graduadosEvolution, desercionEvolution,
        marketMatriculaEvolution, marketPcursoEvolution, marketGraduadosEvolution, marketDesercionEvolution, marketKPIs,
        sectorMatriculaEvolution, sectorPcursoEvolution, sectorGraduadosEvolution, sectorDesercionEvolution, sectorKPIs,
        modalityMatriculaEvolution, modalityPcursoEvolution, modalityGraduadosEvolution, modalityDesercionEvolution, modalityKPIs,
        saberProProgram, saberProArea, demographics,
        similarPrograms: similarPrograms.slice(0, 10),
        nbcSimilarPrograms: nbcSimilarPrograms.slice(0, 10),
        similarAnalysis,
        nbcSimilarAnalysis,
        generatedAt: new Date().toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' }),
    };
};

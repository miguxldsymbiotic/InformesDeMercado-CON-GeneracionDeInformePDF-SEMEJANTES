import React from 'react';
import { Infinity as InfinityIcon, ChevronDown, ChevronUp, X, Settings } from 'lucide-react';
import { useState, useEffect, useMemo, useRef } from 'react';
import { fetchProgramOptions, ProgramOption, fetchDepartmentsPrincipal, fetchDepartmentsOferta, fetchMunicipalitiesPrincipal, fetchMunicipalitiesOferta } from '../services/api';

const toTitleCase = (str: string) => {
    if (!str) return '';
    const lower = str.toLowerCase();
    const exceptions = ["de", "y", "e", "en", "la", "el", "los", "las", "o", "u", "a", "del", "por", "para", "con"];
    return lower.split(/\s+/).map((word, index) => {
        if (word.length === 0) return '';
        if (index > 0 && exceptions.includes(word)) {
            return word;
        }
        return word.charAt(0).toUpperCase() + word.slice(1);
    }).join(' ');
};

interface SidebarProps {
    isOpen: boolean;
    onClose: () => void;
    setActiveTab: (tab: string) => void;
    filters: any;
    setFilters: (filters: any) => void;
}

const MultiSelect: React.FC<{
    label: string;
    options: { value: string; label: string }[];
    selected: string[];
    onChange: (values: string[]) => void;
    searchable?: boolean;
}> = ({ label, options, selected, onChange, searchable = false }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const dropdownRef = useRef<HTMLDivElement>(null);
    const isAllSelected = selected.length === options.length && options.length > 0;

    const filteredOptions = useMemo(() => {
        if (!searchable || !searchTerm) return options;
        return options.filter(opt =>
            opt.label.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [options, searchTerm, searchable]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Reset search when closed
    useEffect(() => {
        if (!isOpen) setSearchTerm("");
    }, [isOpen]);


    const toggleAll = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (isAllSelected) {
            onChange([]);
        } else {
            // Select all CURRENTLY FILTERED options if searching, or all options if not
            // const valuesToSelect = filteredOptions.map(o => o.value);
            // Simple "Select All" selects ALL options passed to component
            onChange(options.map(o => o.value));
        }
    };

    const toggleOption = (val: string) => {
        if (selected.includes(val)) {
            onChange(selected.filter(v => v !== val));
        } else {
            onChange([...selected, val]);
        }
        // User requested to close upon selection? Original code did setIsOpen(false).
        // If sorting/filtering, maybe keep query? 
        // Original code: setIsOpen(false); // User requested to close upon selection
        // For multi-select, closing immediately is annoying. Let's keep it open?
        // The original code had: setIsOpen(false);
        // Let's COMMENT OUT setIsOpen(false) to allow multiple selections easily! 
        // Wait, user didn't ask for that change, but it's bad UX to close on every click in a multi-select.
        // I will keep it open to allow multiple selections, especially when searching.
        // setIsOpen(false); 
    };

    const getSelectedLabel = () => {
        if (selected.length === 0) return 'Todas las opciones';
        if (isAllSelected) return 'Todos seleccionados';

        const labels = options
            .filter(o => selected.includes(o.value))
            .map(o => o.label);

        if (labels.length > 2) return `${labels.length} seleccionados`;
        return labels.join(', ');
    };

    return (
        <div className="space-y-1.5" ref={dropdownRef}>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-1">
                {label}
            </label>
            <div className="relative">
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className={`
                        w-full flex items-center justify-between px-3 py-2.5 bg-white border rounded-xl transition-all text-left group
                        ${isOpen ? 'border-brand-blue ring-4 ring-brand-blue/5' : 'border-slate-200 hover:border-slate-300'}
                    `}
                >
                    <span className={`text-[11px] truncate pr-2 ${selected.length > 0 ? 'text-slate-900 font-semibold' : 'text-slate-400 font-medium'}`}>
                        {getSelectedLabel()}
                    </span>
                    {isOpen ? (
                        <ChevronUp className="w-3.5 h-3.5 text-brand-blue" />
                    ) : (
                        <ChevronDown className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-600" />
                    )}
                </button>

                {isOpen && (
                    <div className="absolute z-50 mt-1.5 w-full bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-1 duration-200">
                        {searchable && (
                            <div className="p-2 border-b border-slate-50">
                                <input
                                    type="text"
                                    placeholder="Buscar..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full px-2 py-1 text-[11px] border border-slate-200 rounded-lg focus:outline-none focus:border-brand-blue focus:ring-1 focus:ring-brand-blue/20"
                                    autoFocus
                                />
                            </div>
                        )}
                        <div className="p-2 border-b border-slate-50 bg-slate-50/50 flex justify-between items-center">
                            <span className="text-[9px] font-bold text-slate-400 uppercase px-1">Opciones</span>
                            <button
                                onClick={toggleAll}
                                className="text-[10px] font-bold text-brand-blue hover:text-blue-700 transition-colors px-1"
                            >
                                {isAllSelected ? 'Deseleccionar' : 'Todos'}
                            </button>
                        </div>
                        <div className="max-h-56 overflow-y-auto p-1.5 space-y-0.5 custom-scroll">
                            {filteredOptions.map((opt) => (
                                <label
                                    key={opt.value}
                                    className={`
                                        flex items-center space-x-2.5 p-2 rounded-lg cursor-pointer group transition-all
                                        ${selected.includes(opt.value) ? 'bg-blue-50/50' : 'hover:bg-slate-50'}
                                    `}
                                >
                                    <div className="relative flex items-center justify-center">
                                        <input
                                            type="checkbox"
                                            checked={selected.includes(opt.value)}
                                            onChange={() => toggleOption(opt.value)}
                                            className="peer w-4 h-4 rounded border-slate-300 text-brand-blue focus:ring-brand-blue/20 transition-all cursor-pointer"
                                        />
                                    </div>
                                    <span className={`
                                        text-[11px] transition-colors
                                        ${selected.includes(opt.value) ? 'text-brand-blue font-semibold' : 'text-slate-600 group-hover:text-slate-900'}
                                    `}>
                                        {opt.label}
                                    </span>
                                </label>
                            ))}
                            {filteredOptions.length === 0 && (
                                <div className="p-4 text-center">
                                    <span className="text-[11px] text-slate-400 italic">No hay resultados</span>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

const TagInput: React.FC<{
    label: string;
    placeholder?: string;
    values: string[];
    onChange: (vals: string[]) => void;
}> = ({ label, placeholder = "Agregar...", values, onChange }) => {
    const [inputValue, setInputValue] = useState("");

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter" && inputValue.trim()) {
            e.preventDefault();
            if (!values.includes(inputValue.trim())) {
                onChange([...values, inputValue.trim()]);
            }
            setInputValue("");
        }
    };

    const removeTag = (tag: string) => {
        onChange(values.filter(v => v !== tag));
    };

    return (
        <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-1">
                {label}
            </label>
            <div className="w-full flex flex-wrap items-center gap-1.5 px-2 py-2 bg-white border border-slate-200 rounded-xl transition-all focus-within:border-brand-blue focus-within:ring-4 focus-within:ring-brand-blue/5">
                {values.map((v, i) => (
                    <div key={i} className="flex items-center space-x-1 pl-2 pr-1 py-0.5 bg-brand-blue/5 text-brand-blue rounded-md border border-brand-blue/10">
                        <span className="text-[10px] font-medium">{v}</span>
                        <button type="button" onClick={() => removeTag(v)} className="p-0.5 hover:bg-brand-blue/10 rounded-full transition-colors">
                            <X className="w-3 h-3" />
                        </button>
                    </div>
                ))}
                <input
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={values.length === 0 ? placeholder : "..."}
                    className="flex-1 min-w-[60px] text-[11px] outline-none bg-transparent placeholder-slate-400"
                />
            </div>
        </div>
    );
};

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose, filters, setFilters }) => {
    const [programOptions, setProgramOptions] = useState<ProgramOption[]>([]);

    // Dynamic Filter Options State
    const [dynamicOptions, setDynamicOptions] = useState<{
        sector: string[];
        modalidad: string[];
        nivel_de_formacion: string[];
        campo_amplio: string[];
        campo_especifico: string[];
        campo_detallado: string[];
        area_de_conocimiento: string[];
        nucleo_basico_del_conocimiento: string[];
        departamento: string[];
        departamento_principal: string[];
        municipio: string[];
        municipio_principal: string[];
        institucion: string[];
    }>({
        sector: [], modalidad: [], nivel_de_formacion: [],
        campo_amplio: [], campo_especifico: [], campo_detallado: [],
        area_de_conocimiento: [], nucleo_basico_del_conocimiento: [],
        departamento: [], departamento_principal: [],
        municipio: [], municipio_principal: [], institucion: []
    });

    const [deptPrincipalBase, setDeptPrincipalBase] = useState<{ code: string; label: string }[]>([]);
    const [deptOfertaBase, setDeptOfertaBase] = useState<{ code: string; label: string }[]>([]);
    const [mpioPrincipalBase, setMpioPrincipalBase] = useState<{ code: string; label: string }[]>([]);
    const [mpioOfertaBase, setMpioOfertaBase] = useState<{ code: string; label: string }[]>([]);

    const [isLoadingOptions, setIsLoadingOptions] = useState(false);

    // Initial base data fetch
    useEffect(() => {
        fetchProgramOptions().then(setProgramOptions).catch(console.error);
        fetchDepartmentsPrincipal().then(depts => {
            setDeptPrincipalBase(depts.map(d => ({ code: Math.floor(d.code).toString(), label: d.name })));
        }).catch(console.error);
        fetchDepartmentsOferta().then(depts => {
            setDeptOfertaBase(depts.map(d => ({ code: Math.floor(d.code).toString(), label: d.name })));
        }).catch(console.error);
        fetchMunicipalitiesPrincipal().then(mpios => {
            setMpioPrincipalBase(mpios.map(m => ({ code: Math.floor(m.code).toString(), label: m.name })));
        }).catch(console.error);
        fetchMunicipalitiesOferta().then(mpios => {
            setMpioOfertaBase(mpios.map(m => ({ code: Math.floor(m.code).toString(), label: m.name })));

        }).catch(console.error);
    }, []);

    // Debounced fetch for dynamic options
    useEffect(() => {
        const handler = setTimeout(() => {
            setIsLoadingOptions(true);
            import('../services/api').then(({ fetchDynamicFilterOptions }) => {
                fetchDynamicFilterOptions(filters).then(opts => {
                    setDynamicOptions(opts);
                    setIsLoadingOptions(false);
                }).catch(err => {
                    console.error("Error fetching dynamic options", err);
                    setIsLoadingOptions(false);
                });
            });
        }, 300); // 300ms debounce

        return () => clearTimeout(handler);
    }, [filters]);


    // Computed options mapped to labels
    const getMappedOptions = (validValues: string[], baseMap: { code?: string, value?: string, label: string }[], isStringBase = false) => {
        if (isStringBase) {
            return validValues.map(v => ({ value: v, label: v }));
        }
        return validValues.map(v => {
            const found = baseMap.find(b => (b.code || b.value) === v);
            return { value: v, label: found ? found.label : v };
        }).sort((a, b) => a.label.localeCompare(b.label));
    };

    const deptPrincipalOptions = useMemo(() => getMappedOptions(dynamicOptions.departamento_principal, deptPrincipalBase), [dynamicOptions.departamento_principal, deptPrincipalBase]);
    const deptOfertaOptions = useMemo(() => getMappedOptions(dynamicOptions.departamento, deptOfertaBase), [dynamicOptions.departamento, deptOfertaBase]);
    const mpioPrincipalOptions = useMemo(() => getMappedOptions(dynamicOptions.municipio_principal, mpioPrincipalBase), [dynamicOptions.municipio_principal, mpioPrincipalBase]);
    const mpioOfertaOptions = useMemo(() => getMappedOptions(dynamicOptions.municipio, mpioOfertaBase), [dynamicOptions.municipio, mpioOfertaBase]);
    const institucionOptions = useMemo(() => getMappedOptions(dynamicOptions.institucion || [], [], true), [dynamicOptions.institucion]);

    const getFilteredPrograms = (currentKey?: string) => {
        return programOptions.filter(p => {
            // Check cross-filters: if an option is selected in another category, keep only programs matching that
            if (currentKey !== 'sector' && filters.sector.length > 0 && !filters.sector.includes(p.sector)) return false;
            if (currentKey !== 'modalidad' && filters.modalidad.length > 0 && !filters.modalidad.includes(p.modalidad)) return false;
            if (currentKey !== 'nivel_de_formacion' && filters.nivel_de_formacion.length > 0 && !filters.nivel_de_formacion.includes(p.nivel)) return false;
            if (currentKey !== 'campo_amplio' && filters.campo_amplio.length > 0 && !filters.campo_amplio.includes(p.amplio)) return false;
            if (currentKey !== 'campo_especifico' && filters.campo_especifico.length > 0 && !filters.campo_especifico.includes(p.especifico)) return false;
            if (currentKey !== 'campo_detallado' && filters.campo_detallado.length > 0 && !filters.campo_detallado.includes(p.detallado)) return false;
            if (currentKey !== 'area_de_conocimiento' && (filters.area_de_conocimiento || []).length > 0 && !(filters.area_de_conocimiento || []).includes(p.area)) return false;
            if (currentKey !== 'nucleo_basico_del_conocimiento' && (filters.nucleo_basico_del_conocimiento || []).length > 0 && !(filters.nucleo_basico_del_conocimiento || []).includes(p.nucleo)) return false;

            if (currentKey !== 'institucion' && (filters.institucion || []).length > 0 && !(filters.institucion || []).includes(p.institucion)) return false;
            if (currentKey !== 'codigo_snies' && (filters.codigo_snies || []).length > 0 && !(filters.codigo_snies || []).includes(p.snies)) return false;
            if (currentKey !== 'palabra_clave' && (filters.palabra_clave || []).length > 0) {
                const searchLower = (filters.palabra_clave || []).map((v: string) => v.toLowerCase());
                const progLower = (p.programa || "").toLowerCase();
                if (!searchLower.some((val: string) => progLower.includes(val))) return false;
            }

            return true;
        });
    };

    const formatLabel = (key: string, value: string) => {
        const labels: Record<string, Record<string, string>> = {
            nivel_de_formacion: {
                "UNIVERSITARIO": "Pregrado Universitario",
                "TECNOLOGICO": "Tecnológico",
                "FORMACION TECNICA PROFESIONAL": "Técnico Profesional",
                "MAESTRIA": "Maestría",
                "DOCTORADO": "Doctorado",
                "ESPECIALIZACION UNIVERSITARIA": "Especialización Univ.",
                "ESPECIALIZACION TECNOLOGICA": "Especialización Tecnológica",
                "ESPECIALIZACION TECNICO PROFESIONAL": "Especialización Técnico Pro.",
                "ESPECIALIZACION MEDICO QUIRURGICA": "Especialización Médico Quir."
            },
            sector: {
                "PRIVADO": "Privado",
                "OFICIAL": "Oficial"
            },
            modalidad: {
                "PRESENCIAL": "Presencial",
                "VIRTUAL": "Virtual",
                "A DISTANCIA": "A Distancia",
                "DUAL": "Dual",
                "HIBRIDA PRESENCIAL VIRTUAL": "Híbrida Pres.-Virtual",
                "HIBRIDA A DISTANCIA VIRTUAL": "Híbrida Dist.-Virtual"
            }
        };

        // Long mappings directly requested or standardized
        if (labels[key]?.[value]) return labels[key][value];

        // Specific truncations for extremely long common fields if needed, or simply title case.
        if (value && value.length > 50) {
            // E.g. "INGENIERIA, ARQUITECTURA, URBANISMO Y AFINES"
            if (value === "INGENIERIA, ARQUITECTURA, URBANISMO Y AFINES") return "Ingeniería, Arq. y Afines";
            if (value === "MATEMATICAS Y CIENCIAS NATURALES") return "Matemáticas y Ciencias";
            if (value === "ECONOMIA, ADMINISTRACION, CONTADURIA Y AFINES") return "Econ., Admon. y Contaduría";
            if (value === "AGRONOMIA, VETERINARIA Y AFINES") return "Agronomía y Veterinaria";
            if (value === "BELLAS ARTES") return "Bellas Artes";
            if (value === "CIENCIAS DE LA EDUCACION") return "Ciencias de la Educación";
            if (value === "CIENCIAS DE LA SALUD") return "Ciencias de la Salud";
            if (value === "CIENCIAS SOCIALES Y HUMANAS") return "Ciencias Sociales y Humanas";
        }

        return toTitleCase(value);
    };

    const sectorOptions = useMemo(() => Array.from(new Set(getFilteredPrograms('sector').map(p => p.sector))).filter(Boolean).sort().map(v => ({ value: v, label: formatLabel('sector', v) })), [programOptions, filters]);
    const modalidadOptions = useMemo(() => Array.from(new Set(getFilteredPrograms('modalidad').map(p => p.modalidad))).filter(Boolean).sort().map(v => ({ value: v, label: formatLabel('modalidad', v) })), [programOptions, filters]);
    const nivelOptions = useMemo(() => Array.from(new Set(getFilteredPrograms('nivel_de_formacion').map(p => p.nivel))).filter(Boolean).sort().map(v => ({ value: v, label: formatLabel('nivel_de_formacion', v) })), [programOptions, filters]);

    const amplioOptions = useMemo(() => Array.from(new Set(getFilteredPrograms('campo_amplio').map(p => p.amplio))).filter(Boolean).sort().map(v => ({ value: v, label: formatLabel('campo_amplio', v) })), [programOptions, filters]);
    const especificoOptions = useMemo(() => Array.from(new Set(getFilteredPrograms('campo_especifico').map(p => p.especifico))).filter(Boolean).sort().map(v => ({ value: v, label: formatLabel('campo_especifico', v) })), [programOptions, filters]);
    const detalladoOptions = useMemo(() => Array.from(new Set(getFilteredPrograms('campo_detallado').map(p => p.detallado))).filter(Boolean).sort().map(v => ({ value: v, label: formatLabel('campo_detallado', v) })), [programOptions, filters]);

    const areaConocimientoOptions = useMemo(() => Array.from(new Set(getFilteredPrograms('area_de_conocimiento').map(p => p.area))).filter(Boolean).sort().map(v => ({ value: v, label: formatLabel('area_de_conocimiento', v) })), [programOptions, filters]);
    const nucleoBasicoOptions = useMemo(() => Array.from(new Set(getFilteredPrograms('nucleo_basico_del_conocimiento').map(p => p.nucleo))).filter(Boolean).sort().map(v => ({ value: v, label: formatLabel('nucleo_basico_del_conocimiento', v) })), [programOptions, filters]);

    const handleFilterChange = (key: string, values: string[]) => {
        setFilters({ ...filters, [key]: values });
    };



    const clearFilters = () => {
        setFilters({
            sector: [],
            modalidad: [],
            nivel_de_formacion: [],
            campo_amplio: [],
            campo_especifico: [],
            campo_detallado: [],
            area_de_conocimiento: [],
            nucleo_basico_del_conocimiento: [],
            departamento: [],
            departamento_principal: [],
            municipio: [],
            municipio_principal: [],
            institucion: [],
            palabra_clave: [],
            codigo_snies: []
        });
    };

    const hasFilters = filters.sector.length > 0 || filters.modalidad.length > 0 || filters.nivel_de_formacion.length > 0 ||
        (filters.campo_amplio && filters.campo_amplio.length > 0) ||
        (filters.campo_especifico && filters.campo_especifico.length > 0) ||
        (filters.campo_detallado && filters.campo_detallado.length > 0) ||
        (filters.area_de_conocimiento && filters.area_de_conocimiento.length > 0) ||
        (filters.nucleo_basico_del_conocimiento && filters.nucleo_basico_del_conocimiento.length > 0) ||
        (filters.departamento && filters.departamento.length > 0) ||
        (filters.departamento_principal && filters.departamento_principal.length > 0) ||
        (filters.institucion && filters.institucion.length > 0) ||
        (filters.palabra_clave && filters.palabra_clave.length > 0) ||
        (filters.codigo_snies && filters.codigo_snies.length > 0);

    return (
        <aside
            className={`
                fixed left-0 top-0 h-full w-64 bg-white border-r border-slate-200 shadow-2xl z-40 transition-transform duration-300 ease-in-out
                ${isOpen ? 'translate-x-0' : '-translate-x-full'}
                flex flex-col
            `}
        >
            <div className="h-16 px-6 border-b border-slate-200 flex justify-between items-center bg-white">
                <div className="flex items-center space-x-2">
                    <InfinityIcon className="w-6 h-6 text-brand-blue" />
                    <span className="font-bold text-slate-900 tracking-tight">SymbiAnalytics</span>
                </div>
                <button onClick={onClose} className="p-1 hover:bg-slate-200 rounded-full transition-colors lg:hidden">
                    <X className="w-5 h-5 text-slate-500" />
                </button>
            </div>

            <nav className="p-4 flex-1 overflow-y-auto custom-scroll">

                {/* Filters Section for Analysis (formerly Regional) */}
                <div className="pt-2">
                    <h3 className="px-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 flex items-center justify-between">
                        Filtros de Análisis
                        {isLoadingOptions && <div className="w-3 h-3 border-2 border-brand-blue border-t-transparent rounded-full animate-spin"></div>}
                    </h3>

                    <div className="px-4 space-y-3 pb-6">
                        <MultiSelect
                            label="Departamento Principal"
                            options={deptPrincipalOptions}
                            selected={filters.departamento_principal || []}
                            onChange={(vals) => handleFilterChange('departamento_principal', vals)}
                            searchable={true}
                        />

                        <MultiSelect
                            label="Municipio Principal"
                            options={mpioPrincipalOptions}
                            selected={filters.municipio_principal || []}
                            onChange={(vals) => handleFilterChange('municipio_principal', vals)}
                            searchable={true}
                        />

                        <MultiSelect
                            label="Departamento de Oferta"
                            options={deptOfertaOptions}
                            selected={filters.departamento || []}
                            onChange={(vals) => handleFilterChange('departamento', vals)}
                            searchable={true}
                        />

                        <MultiSelect
                            label="Municipio de Oferta"
                            options={mpioOfertaOptions}
                            selected={filters.municipio || []}
                            onChange={(vals) => handleFilterChange('municipio', vals)}
                            searchable={true}
                        />

                        <div className="pt-4 pb-1">
                            <div className="h-px bg-slate-100 w-full mb-4"></div>
                            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3">Filtros Generales</h4>
                        </div>

                        <MultiSelect
                            label="Nivel de Formación"
                            options={nivelOptions}
                            selected={filters.nivel_de_formacion}
                            onChange={(vals) => handleFilterChange('nivel_de_formacion', vals)}
                        />

                        <MultiSelect
                            label="Sector"
                            options={sectorOptions}
                            selected={filters.sector}
                            onChange={(vals) => handleFilterChange('sector', vals)}
                        />

                        <MultiSelect
                            label="Modalidad"
                            options={modalidadOptions}
                            selected={filters.modalidad}
                            onChange={(vals) => handleFilterChange('modalidad', vals)}
                        />

                        <div className="pt-4 pb-1">
                            <div className="h-px bg-slate-100 w-full mb-4"></div>
                            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3">Clasificación</h4>
                        </div>

                        <MultiSelect
                            label="Área de Conocimiento"
                            options={areaConocimientoOptions}
                            selected={filters.area_de_conocimiento || []}
                            onChange={(vals) => handleFilterChange('area_de_conocimiento', vals)}
                            searchable={true}
                        />

                        <MultiSelect
                            label="Núcleo Básico del Conocimiento"
                            options={nucleoBasicoOptions}
                            selected={filters.nucleo_basico_del_conocimiento || []}
                            onChange={(vals) => handleFilterChange('nucleo_basico_del_conocimiento', vals)}
                            searchable={true}
                        />

                        <div className="pt-4 pb-1">
                            <div className="h-px bg-slate-100 w-full mb-4"></div>
                            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3">Disciplina (CINE)</h4>
                        </div>

                        <MultiSelect
                            label="Campo Amplio"
                            options={amplioOptions}
                            selected={filters.campo_amplio || []}
                            onChange={(vals) => handleFilterChange('campo_amplio', vals)}
                            searchable={true}
                        />

                        <MultiSelect
                            label="Campo Específico"
                            options={especificoOptions}
                            selected={filters.campo_especifico || []}
                            onChange={(vals) => handleFilterChange('campo_especifico', vals)}
                            searchable={true}
                        />

                        <MultiSelect
                            label="Campo Detallado"
                            options={detalladoOptions}
                            selected={filters.campo_detallado || []}
                            onChange={(vals) => handleFilterChange('campo_detallado', vals)}
                            searchable={true}
                        />

                        <div className="pt-4 pb-1">
                            <div className="h-px bg-slate-100 w-full mb-4"></div>
                            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3">Programa / Institución</h4>
                        </div>

                        <MultiSelect
                            label="IES (Institución)"
                            options={institucionOptions}
                            selected={filters.institucion || []}
                            onChange={(vals) => handleFilterChange('institucion', vals)}
                            searchable={true}
                        />

                        <TagInput
                            label="Palabra Clave"
                            placeholder="Ej. Software..."
                            values={filters.palabra_clave || []}
                            onChange={(vals) => handleFilterChange('palabra_clave', vals)}
                        />

                        <TagInput
                            label="Código SNIES"
                            placeholder="Ej. 101234..."
                            values={filters.codigo_snies || []}
                            onChange={(vals) => handleFilterChange('codigo_snies', vals)}
                        />

                        {/* Clear Filters */}
                        {hasFilters && (
                            <div className="pt-4">
                                <button
                                    onClick={clearFilters}
                                    className="w-full py-2.5 text-[10px] font-bold text-red-500 bg-red-50 hover:bg-red-100 rounded-xl transition-all border border-red-100 uppercase tracking-wider"
                                >
                                    Limpiar Filtros
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </nav>

            <div className="p-6 border-t border-slate-100 bg-slate-50">
                <div className="flex items-center space-x-3 text-slate-500 hover:text-brand-blue cursor-pointer transition-colors">
                    <Settings className="w-5 h-5" />
                    <span className="text-sm font-semibold">Configuración</span>
                </div>
            </div>
        </aside >
    );
};

export default Sidebar;

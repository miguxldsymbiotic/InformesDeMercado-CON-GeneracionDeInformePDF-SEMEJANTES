import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Search, FileText, Download, Loader2, X, Building2, BookOpen, MapPin } from 'lucide-react';
import { ProgramOption } from '../services/api';
import { searchPrograms, collectReportData } from '../services/reportService';
import { generateReportHTML } from '../services/reportTemplate';

const ReportGenerator: React.FC = () => {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<ProgramOption[]>([]);
    const [selectedProgram, setSelectedProgram] = useState<ProgramOption | null>(null);
    const [isSearching, setIsSearching] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [showResults, setShowResults] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const searchRef = useRef<HTMLDivElement>(null);

    // Close dropdown on outside click
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
                setShowResults(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Debounced search
    useEffect(() => {
        if (!query.trim()) {
            setResults([]);
            setShowResults(false);
            return;
        }
        const timer = setTimeout(async () => {
            setIsSearching(true);
            try {
                const found = await searchPrograms(query);
                setResults(found);
                setShowResults(true);
            } catch (err) {
                console.error('Error searching programs:', err);
            } finally {
                setIsSearching(false);
            }
        }, 300);
        return () => clearTimeout(timer);
    }, [query]);

    const handleSelect = (program: ProgramOption) => {
        setSelectedProgram(program);
        setQuery('');
        setShowResults(false);
        setError(null);
    };

    const handleClear = () => {
        setSelectedProgram(null);
        setQuery('');
        setError(null);
    };

    const handleGenerate = useCallback(async () => {
        if (!selectedProgram) return;

        setIsGenerating(true);
        setError(null);
        try {
            const reportData = await collectReportData(selectedProgram);
            const html = generateReportHTML(reportData);
            
            // Create a hidden iframe for printing to bypass all popup blockers
            const iframe = document.createElement('iframe');
            iframe.style.display = 'none';
            document.body.appendChild(iframe);

            if (!iframe.contentWindow) {
                throw new Error("No se pudo crear el entorno de impresión (Iframe).");
            }

            const doc = iframe.contentWindow.document;
            doc.open();
            doc.write(html);
            doc.close();

            // Give time for any external assets (logos) to load before printing
            setTimeout(() => {
                iframe.contentWindow?.focus();
                iframe.contentWindow?.print();
                
                // Optional cleanup: keep the iframe around just long enough for the print dialog
                setTimeout(() => {
                    if (document.body.contains(iframe)) {
                        document.body.removeChild(iframe);
                    }
                }, 10000);
            }, 800);

        } catch (err: any) {
            console.error('CRITICAL: Error generating report:', err);
            const msg = err.message || JSON.stringify(err);
            setError(`Error detallado: ${msg}. Intente de nuevo o revise la consola.`);
        } finally {
            setIsGenerating(false);
        }
    }, [selectedProgram]);

    return (
        <div className="max-w-4xl mx-auto">
            {/* Header */}
            <div className="mb-10">
                <div className="flex items-center space-x-4 mb-3">
                    <div className="p-3 bg-slate-100 rounded-2xl">
                        <FileText className="w-7 h-7 text-slate-700" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Informe de Mercado</h1>
                        <p className="text-[0.7rem] font-bold text-slate-400 uppercase tracking-[0.2em] mt-1">
                            Generador de Reportes PDF
                        </p>
                    </div>
                </div>
                <p className="text-sm text-slate-500 leading-relaxed max-w-2xl">
                    Busque un programa academico por Codigo SNIES, nombre del programa o institucion. 
                    El informe se generara automaticamente con datos oficiales del SNIES, OLE, SPADIES y Saber PRO.
                </p>
            </div>

            {/* Search */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 mb-6" ref={searchRef}>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] block mb-3">
                    Buscar Programa Academico
                </label>
                <div className="relative">
                    <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus-within:border-slate-400 focus-within:ring-4 focus-within:ring-slate-100 transition-all">
                        {isSearching ? (
                            <Loader2 className="w-5 h-5 text-slate-400 animate-spin mr-3" />
                        ) : (
                            <Search className="w-5 h-5 text-slate-400 mr-3" />
                        )}
                        <input
                            type="text"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="Ej: 1456, Ingenieria de Sistemas, Universidad Nacional..."
                            className="flex-1 bg-transparent outline-none text-sm text-slate-700 placeholder-slate-400"
                        />
                    </div>

                    {/* Results Dropdown */}
                    {showResults && results.length > 0 && (
                        <div className="absolute z-50 mt-2 w-full bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden max-h-80 overflow-y-auto">
                            {results.map((prog, i) => (
                                <button
                                    key={`${prog.snies}-${i}`}
                                    onClick={() => handleSelect(prog)}
                                    className="w-full text-left px-4 py-3 hover:bg-slate-50 transition-colors border-b border-slate-50 last:border-0"
                                >
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1 min-w-0">
                                            <div className="text-xs font-bold text-slate-900 truncate">
                                                {prog.programa}
                                            </div>
                                            <div className="text-[10px] text-slate-500 truncate mt-0.5">
                                                {prog.institucion}
                                            </div>
                                        </div>
                                        <div className="ml-3 text-[10px] font-black text-slate-400 bg-slate-100 px-2 py-1 rounded-md whitespace-nowrap">
                                            SNIES {prog.snies}
                                        </div>
                                    </div>
                                    <div className="flex items-center space-x-3 mt-1.5">
                                        <span className="text-[9px] font-bold text-slate-400 uppercase">{prog.nivel}</span>
                                        <span className="text-[9px] text-slate-300">&bull;</span>
                                        <span className="text-[9px] font-bold text-slate-400 uppercase">{prog.modalidad}</span>
                                        <span className="text-[9px] text-slate-300">&bull;</span>
                                        <span className="text-[9px] font-bold text-slate-400 uppercase">{prog.sector}</span>
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}

                    {showResults && results.length === 0 && query.trim() && !isSearching && (
                        <div className="absolute z-50 mt-2 w-full bg-white border border-slate-200 rounded-xl shadow-xl p-6 text-center">
                            <p className="text-sm text-slate-400">No se encontraron programas para "{query}"</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Selected Program Card */}
            {selectedProgram && (
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 mb-6">
                    <div className="flex items-start justify-between mb-4">
                        <div>
                            <div className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">
                                Programa Seleccionado
                            </div>
                            <h3 className="text-lg font-black text-slate-900 tracking-tight">
                                {selectedProgram.programa}
                            </h3>
                        </div>
                        <button
                            onClick={handleClear}
                            className="p-2 hover:bg-slate-100 rounded-xl transition-colors"
                        >
                            <X className="w-4 h-4 text-slate-400" />
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="flex items-center space-x-3 p-3 bg-slate-50 rounded-xl">
                            <Building2 className="w-4 h-4 text-slate-400" />
                            <div>
                                <div className="text-[9px] font-bold text-slate-400 uppercase">Institucion</div>
                                <div className="text-xs font-bold text-slate-700">{selectedProgram.institucion}</div>
                            </div>
                        </div>
                        <div className="flex items-center space-x-3 p-3 bg-slate-50 rounded-xl">
                            <BookOpen className="w-4 h-4 text-slate-400" />
                            <div>
                                <div className="text-[9px] font-bold text-slate-400 uppercase">SNIES / Nivel</div>
                                <div className="text-xs font-bold text-slate-700">{selectedProgram.snies} &bull; {selectedProgram.nivel}</div>
                            </div>
                        </div>
                        <div className="flex items-center space-x-3 p-3 bg-slate-50 rounded-xl">
                            <MapPin className="w-4 h-4 text-slate-400" />
                            <div>
                                <div className="text-[9px] font-bold text-slate-400 uppercase">Ubicacion</div>
                                <div className="text-xs font-bold text-slate-700">
                                    {selectedProgram.municipio_principal || 'N/D'}, {selectedProgram.departamento_principal || 'N/D'}
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center space-x-3 p-3 bg-slate-50 rounded-xl">
                            <FileText className="w-4 h-4 text-slate-400" />
                            <div>
                                <div className="text-[9px] font-bold text-slate-400 uppercase">Sector / Modalidad</div>
                                <div className="text-xs font-bold text-slate-700">{selectedProgram.sector} &bull; {selectedProgram.modalidad}</div>
                            </div>
                        </div>
                    </div>

                    {/* Generate Button */}
                    <div className="mt-6">
                        <button
                            onClick={handleGenerate}
                            disabled={isGenerating}
                            className={`
                                w-full flex items-center justify-center space-x-3 py-4 rounded-xl font-bold text-sm uppercase tracking-wider transition-all
                                ${isGenerating
                                    ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                                    : 'bg-slate-900 text-white hover:bg-slate-800 shadow-lg shadow-slate-900/10 active:scale-[0.98]'
                                }
                            `}
                        >
                            {isGenerating ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    <span>Generando Informe...</span>
                                </>
                            ) : (
                                <>
                                    <Download className="w-5 h-5" />
                                    <span>Descargar Informe de Mercado</span>
                                </>
                            )}
                        </button>
                    </div>

                    {error && (
                        <div className="mt-4 p-3 bg-red-50 border border-red-100 rounded-xl text-xs text-red-600 font-medium">
                            {error}
                        </div>
                    )}
                </div>
            )}

            {/* Empty State */}
            {!selectedProgram && (
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-12 text-center">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-slate-100 rounded-2xl mb-4">
                        <Search className="w-8 h-8 text-slate-400" />
                    </div>
                    <h3 className="text-lg font-black text-slate-700 mb-2">Seleccione un Programa</h3>
                    <p className="text-sm text-slate-400 max-w-md mx-auto">
                        Use el buscador de arriba para encontrar un programa por codigo SNIES, nombre o institucion. 
                        El informe incluira indicadores comparativos, evolucion historica y perfil demografico.
                    </p>
                </div>
            )}
        </div>
    );
};

export default ReportGenerator;

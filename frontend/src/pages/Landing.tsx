import React from 'react';
import { Infinity as InfinityIcon, Map as MapIcon, BookOpen } from 'lucide-react';

interface LandingProps {
    onNavigate: (view: string) => void;
}

const Landing: React.FC<LandingProps> = ({ onNavigate }) => {
    return (
        <div className="flex-1 overflow-y-auto custom-scroll h-full scroll-smooth bg-white">
            {/* Navbar (Static for Landing) */}
            <nav className="h-24 flex items-center justify-between px-10 absolute w-full z-50">
                <div className="flex items-center space-x-3 group cursor-pointer">
                    <div className="bg-white p-2 rounded-xl shadow-lg border border-slate-100">
                        <InfinityIcon className="text-brand-blue w-6 h-6" />
                    </div>
                    <div className="text-white">
                        <span className="text-2xl font-black tracking-tight block">SymbiAnalytics</span>
                        <span className="block text-[10px] font-black uppercase tracking-[0.2em] text-brand-yellow leading-none">by Symbiotic</span>
                    </div>
                </div>
                <button
                    onClick={() => onNavigate('regional')}
                    className="bg-brand-yellow hover:bg-brand-gold text-dark-deep hover:text-white px-7 py-3 rounded-full font-extrabold text-xs transition-all shadow-xl shadow-yellow-900/20 uppercase tracking-widest"
                >
                    Nueva Consulta
                </button>
            </nav>

            {/* Hero Section */}
            <section className="relative h-[600px] flex items-center px-10 md:px-20 mb-12 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-brand-blue/90 to-dark-deep/95 z-0"></div>
                {/* Background Image Overlay would go here if we had the asset, using color for now */}
                <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=1920&q=80')] bg-cover bg-center mix-blend-overlay opacity-40 z-0"></div>

                <div className="max-w-4xl text-white mt-12 relative z-10">
                    <h2 className="text-5xl md:text-7xl font-black leading-tight tracking-tighter mb-6">
                        Inteligencia de Mercado para Líderes Académicos.
                    </h2>
                    <p className="text-xl md:text-2xl text-slate-300 font-medium max-w-2xl leading-relaxed">
                        Decodificamos el microdato del sistema de educación superior colombiano para entregarle una ventaja competitiva real.
                    </p>
                </div>
            </section>

            {/* Metrics Ticker */}
            <section className="max-w-7xl mx-auto -mt-24 px-10 relative z-20 mb-20">
                <div className="bg-white rounded-[2rem] shadow-xl p-12 border border-slate-100 grid grid-cols-1 md:grid-cols-4 gap-12 text-center">
                    <div>
                        <h4 className="text-4xl font-extrabold text-brand-blue">2.5M+</h4>
                        <p className="text-[0.7rem] font-bold text-slate-400 uppercase tracking-widest mt-1">Datos Procesados</p>
                    </div>
                    <div>
                        <h4 className="text-4xl font-extrabold text-brand-blue">300+</h4>
                        <p className="text-[0.7rem] font-bold text-slate-400 uppercase tracking-widest mt-1">IES Monitoreadas</p>
                    </div>
                    <div>
                        <h4 className="text-4xl font-extrabold text-brand-gold">12k+</h4>
                        <p className="text-[0.7rem] font-bold text-slate-400 uppercase tracking-widest mt-1">Oferta Vigente</p>
                    </div>
                    <div>
                        <h4 className="text-4xl font-extrabold text-brand-blue">100%</h4>
                        <p className="text-[0.7rem] font-bold text-slate-400 uppercase tracking-widest mt-1">Fuentes Oficiales</p>
                    </div>
                </div>
            </section>

            {/* Services Grid */}
            <section className="max-w-7xl mx-auto px-10 mb-32">
                <div className="text-center mb-16">
                    <h3 className="text-4xl font-black text-slate-900 mb-4">Ecosistema de Análisis</h3>
                    <p className="text-slate-500 font-medium text-lg">Módulos especializados para la toma de decisiones estratégicas.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-12 max-w-5xl mx-auto">
                    {/* General Analysis Card (formerly Regional) */}
                    <div className="bg-white rounded-[1.5rem] p-10 border border-slate-200 hover:border-brand-gold hover:-translate-y-2 hover:shadow-2xl transition-all duration-300 group flex flex-col justify-between">
                        <div>
                            <div className="inline-block p-4 bg-blue-50 rounded-2xl mb-6 text-brand-blue group-hover:bg-brand-blue group-hover:text-white transition-colors">
                                <MapIcon className="w-8 h-8" />
                            </div>
                            <h4 className="text-2xl font-extrabold text-slate-800 mb-3 group-hover:text-brand-blue transition-colors">Análisis General</h4>
                            <p className="text-slate-500 text-sm mb-8 leading-relaxed">
                                Visión integral del sistema con segmentación por departamentos y municipios. Identifique vacíos locales y tendencias consolidadas.
                            </p>
                        </div>
                        <button onClick={() => onNavigate('regional')} className="w-full py-4 bg-brand-blue text-white rounded-xl font-bold text-sm hover:bg-blue-800 transition-all shadow-lg shadow-blue-900/10 active:scale-95">
                            Explorar Módulo
                        </button>
                    </div>

                    {/* Program Card (Placeholder) */}
                    <div className="bg-white rounded-[1.5rem] p-10 border border-slate-200 hover:border-brand-gold hover:-translate-y-2 hover:shadow-2xl transition-all duration-300 group flex flex-col justify-between">
                        <div>
                            <div className="inline-block p-4 bg-amber-50 rounded-2xl mb-6 text-brand-gold group-hover:bg-brand-gold group-hover:text-white transition-colors">
                                <BookOpen className="w-8 h-8" />
                            </div>
                            <h4 className="text-2xl font-extrabold text-slate-800 mb-3 group-hover:text-brand-blue transition-colors">Programa Individual</h4>
                            <p className="text-slate-500 text-sm mb-8 leading-relaxed">
                                Micro-análisis por código SNIES: Salud de permanencia, calidad específica y comportamiento de graduados.
                            </p>
                        </div>
                        <button onClick={() => onNavigate('program')} className="w-full py-4 bg-slate-900 text-white rounded-xl font-bold text-sm hover:bg-slate-800 transition-all shadow-lg shadow-slate-900/10 active:scale-95">
                            Próximamente
                        </button>
                    </div>
                </div>
            </section>

            <footer className="bg-dark-deep py-20 px-10 text-center text-white/50">
                <p className="text-[10px] font-black uppercase tracking-[0.4em]">SymbiAnalytics by Symbiotic &bull; 2024</p>
            </footer>
        </div>
    );
};

export default Landing;

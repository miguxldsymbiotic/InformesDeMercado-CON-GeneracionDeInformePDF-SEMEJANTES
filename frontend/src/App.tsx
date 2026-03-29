import { useState } from 'react';
import Regional from './pages/Regional';
import Landing from './pages/Landing';
import Sidebar from './components/Sidebar';
import ReportGenerator from './pages/ReportGenerator';
import { Menu, Map, BookOpen, FileText } from 'lucide-react';

type ViewMode = 'landing' | 'dashboard';
type DashboardTab = 'regional' | 'program' | 'reports';

function App() {
  const [viewMode, setViewMode] = useState<ViewMode>('landing');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [activeTab, setActiveTab] = useState<DashboardTab>('regional');

  const [filters, setFilters] = useState<{
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
    palabra_clave: string[];
    codigo_snies: string[];
  }>({
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

  const handleNavigate = (target: string) => {
    setViewMode('dashboard');
    setActiveTab(target as DashboardTab);
  };

  const handleGoHome = () => {
    setViewMode('landing');
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'regional':
        return <Regional filters={filters} setFilters={setFilters} />;
      case 'program':
        return <div className="p-10 font-bold text-slate-400">Módulo Programa en construcción...</div>;
      case 'reports':
        return <ReportGenerator />;
      default:
        return <Regional filters={filters} setFilters={setFilters} />;
    }
  };

  if (viewMode === 'landing') {
    return <Landing onNavigate={handleNavigate} />;
  }

  return (
    <div className="flex h-screen bg-bg-main overflow-hidden text-slate-900 font-sans">
      <Sidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        setActiveTab={(t: string) => setActiveTab(t as DashboardTab)}
        filters={filters}
        setFilters={setFilters}
      />

      <div className={`flex-1 flex flex-col min-w-0 relative h-full transition-all duration-300 ${isSidebarOpen ? 'ml-64' : 'ml-0'}`}>
        {/* Dashboard Header */}
        <div className="bg-white border-b border-slate-200 px-8 py-3 flex justify-between items-center shadow-sm z-30 sticky top-0 h-16">
          <div className="flex items-center space-x-6">
            {!isSidebarOpen && (
              <button
                onClick={() => setIsSidebarOpen(true)}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-600 mr-2"
              >
                <Menu className="w-5 h-5" />
              </button>
            )}

            {/* Navigation Tabs in Header */}
            <nav className="flex items-center space-x-1">
              {[
                { id: 'regional', label: 'Análisis General', icon: Map },
                { id: 'program', label: 'Programa Específico', icon: BookOpen },
                { id: 'reports', label: 'Reportes PDF', icon: FileText },
              ].map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id as DashboardTab)}
                  className={`
                    flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all
                    ${activeTab === item.id
                      ? 'bg-brand-blue/5 text-brand-blue border border-brand-blue/10'
                      : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'}
                  `}
                >
                  <item.icon className={`w-4 h-4 ${activeTab === item.id ? 'text-brand-blue' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </button>
              ))}
            </nav>
          </div>

          <div className="flex items-center space-x-4">
            <button
              onClick={handleGoHome}
              className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-[10px] font-black uppercase tracking-[0.15em] transition-all shadow-lg shadow-slate-900/10 active:scale-95"
            >
              Cerrar Módulo
            </button>
          </div>
        </div>

        <main className="flex-1 overflow-y-auto custom-scroll p-8">
          {renderContent()}
        </main>
      </div>
    </div>

  );
}

export default App;

import React, { useState } from 'react';
import Sidebar from './Sidebar';
import { Menu } from 'lucide-react';

interface LayoutProps {
    children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [filters, setFilters] = useState({});

    return (
        <div className="flex h-screen bg-bg-main overflow-hidden">
            <Sidebar
                isOpen={isSidebarOpen}
                onClose={() => setIsSidebarOpen(false)}
                setActiveTab={() => { }}
                filters={filters}
                setFilters={setFilters}
            />

            <div className="flex-1 flex flex-col min-w-0 relative h-full transition-all duration-300"
                style={{ marginLeft: isSidebarOpen ? '16rem' : '0' }}>

                {/* Header for Toggle (Mobile/Desktop) */}
                {!isSidebarOpen && (
                    <div className="absolute top-4 left-4 z-50">
                        <button
                            onClick={() => setIsSidebarOpen(true)}
                            className="p-2 bg-white rounded-lg shadow-md hover:bg-slate-50 transition-all text-slate-600"
                        >
                            <Menu className="w-6 h-6" />
                        </button>
                    </div>
                )}

                <main className="flex-1 overflow-y-auto custom-scroll p-8">
                    {children}
                </main>
            </div>
        </div>
    );
};

export default Layout;

import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import GestionUsuarios from './components/GestionUsuarios';
import Prestamos from './components/Prestamos';
import Cronograma from './components/Cronograma';

// Componente principal: El "Cascarón" con la barra a la izquierda
function AdminLayout({ children, esOscuro, setEsOscuro }) {
  const navigate = useNavigate();
  const location = useLocation();

  // 🎨 ESTILOS SOBRIOS Y PROFESIONALES (Sin neón)
  // Cuando está activo, usa un fondo azul grisáceo muy elegante con texto esmeralda oscuro.
  const isActive = (path) => location.pathname === path 
    ? 'flex items-center gap-4 px-6 py-3.5 bg-slate-200/50 dark:bg-slate-800/80 text-emerald-700 dark:text-emerald-400 font-bold text-sm w-full text-left cursor-pointer transition-all border-l-4 border-emerald-600 dark:border-emerald-500 rounded-r-lg' 
    : 'flex items-center gap-4 px-6 py-3.5 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/40 text-sm font-medium w-full text-left cursor-pointer transition-all border-l-4 border-transparent';

  return (
    // Fondo general: Gris muy suave de día, Pizarra oscuro (no negro) de noche
    <div className="flex min-h-screen font-sans antialiased bg-[#F1F5F9] dark:bg-[#0F172A] text-slate-800 dark:text-slate-200 transition-colors duration-300">
      
      {/* ================= BARRA LATERAL IZQUIERDA (SIDEBAR) ================= */}
      <aside className="w-72 bg-white dark:bg-[#1E293B] border-r border-slate-300 dark:border-slate-700/50 flex flex-col justify-between transition-colors duration-300 shrink-0 shadow-sm z-10">
        <div>
          {/* Logo Corporativo */}
          <div className="flex items-center gap-3 px-8 py-7 border-b border-slate-200 dark:border-slate-700/50">
            <div className="w-9 h-9 rounded-lg bg-emerald-600 flex items-center justify-center shadow-md">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path>
              </svg>
            </div>
            <div>
              <h1 className="text-xl font-extrabold tracking-tight text-slate-800 dark:text-white leading-none">LabAccess</h1>
              <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Portal Administrativo</span>
            </div>
          </div>

          {/* Menú de Navegación */}
          <div className="mt-6 pr-4">
            <span className="text-xs font-bold text-slate-400 dark:text-slate-500 block px-8 mb-4 uppercase tracking-wider">Menú Principal</span>
            <nav className="flex flex-col gap-1">
              <button onClick={() => navigate('/dashboard')} className={isActive('/dashboard')}>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>
                Panel General
              </button>
              <button onClick={() => navigate('/usuarios')} className={isActive('/usuarios')}>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                Gestión de Personal
              </button>
              <button onClick={() => navigate('/prestamos')} className={isActive('/prestamos')}>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                Reservas Extra.
              </button>
              <button onClick={() => navigate('/cronograma')} className={isActive('/cronograma')}>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                Cronograma
              </button>
            </nav>
          </div>
        </div>

        {/* Perfil Inferior */}
        <div className="p-6 border-t border-slate-200 dark:border-slate-700/50 bg-slate-50 dark:bg-[#1E293B]">
          <div className="flex items-center gap-4 mb-4 px-2">
            <div className="w-10 h-10 rounded-full bg-slate-300 dark:bg-slate-700 flex items-center justify-center font-bold text-sm text-slate-700 dark:text-slate-300">
              AD
            </div>
            <div>
              <p className="text-sm font-bold text-slate-800 dark:text-white leading-tight">Administrador</p>
              <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mt-0.5">ID: ESP32-Dev</p>
            </div>
          </div>
          <button 
            onClick={() => navigate('/')} 
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 font-bold text-sm transition-colors cursor-pointer shadow-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
            Cerrar Sesión
          </button>
        </div>
      </aside>

      {/* ================= AREA DE CONTENIDO PRINCIPAL ================= */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        
        {/* Barra Superior */}
        <header className="flex items-center justify-end px-10 py-4 bg-white dark:bg-[#1E293B] border-b border-slate-300 dark:border-slate-700/50 gap-5 shrink-0 transition-colors duration-300 shadow-sm z-0">
          
          {/* Indicador de conexión sutil */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[11px] font-bold text-slate-600 dark:text-slate-400">
            <span className="w-2 h-2 rounded-full bg-emerald-600 dark:bg-emerald-500"></span>
            SISTEMA EN LÍNEA
          </div>

          {/* Botón Claro / Oscuro */}
          <button 
            onClick={() => setEsOscuro(!esOscuro)} 
            className="p-2.5 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer bg-white dark:bg-slate-800 shadow-sm"
            title="Cambiar Apariencia"
          >
            {esOscuro ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>
            )}
          </button>
        </header>

        {/* Las vistas (Dashboard, Usuarios, etc) aparecen aquí */}
        <main className="flex-1 overflow-y-auto p-10">
          {children}
        </main>
      </div>
    </div>
  );
}

export default function App() {
  // MODIFICADO: Cambiado a true para que inicie siempre en Modo Oscuro (Pizarra corporativo) por defecto
  const [esOscuro, setEsOscuro] = useState(true);

  useEffect(() => {
    if (esOscuro) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [esOscuro]);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/dashboard" element={<AdminLayout esOscuro={esOscuro} setEsOscuro={setEsOscuro}><Dashboard /></AdminLayout>} />
        <Route path="/usuarios" element={<AdminLayout esOscuro={esOscuro} setEsOscuro={setEsOscuro}><GestionUsuarios /></AdminLayout>} />
        <Route path="/prestamos" element={<AdminLayout esOscuro={esOscuro} setEsOscuro={setEsOscuro}><Prestamos /></AdminLayout>} />
        <Route path="/cronograma" element={<AdminLayout esOscuro={esOscuro} setEsOscuro={setEsOscuro}><Cronograma /></AdminLayout>} />
      </Routes>
    </BrowserRouter>
  );
}
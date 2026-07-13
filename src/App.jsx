import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, useNavigate, useLocation, Link} from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth } from './firebase';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import GestionUsuarios from './components/GestionUsuarios';
import Prestamos from './components/Prestamos';
import Cronograma from './components/Cronograma';
import Reportes from './components/Reportes';
import GestionAdministradores from './components/GestionAdministradores';
import AuditoriaWeb from './components/AuditoriaWeb';
import {RutaProtegida} from './components/ProtectedRoute';

// Componente principal: El "Cascarón" con la barra a la izquierda
function AdminLayout({ children, esOscuro, setEsOscuro }) {
  const navigate = useNavigate();
  const location = useLocation();
  const rolUsuario = localStorage.getItem('adminRol');

  // ESTILOS SOBRIOS Y PROFESIONALES (Actualizados para encajar con el nuevo tono oscuro)
  const isActive = (path) => location.pathname === path 
    ? 'flex items-center gap-4 px-6 py-3.5 bg-slate-100 dark:bg-slate-800/60 text-emerald-700 dark:text-emerald-400 font-bold text-sm w-full text-left cursor-pointer transition-all border-l-4 border-emerald-600 dark:border-emerald-500 rounded-r-lg' 
    : 'flex items-center gap-4 px-6 py-3.5 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/30 text-sm font-medium w-full text-left cursor-pointer transition-all border-l-4 border-transparent';

  return (
    // Fondo general: Gris muy suave de día, Gris Carbón de Medianoche Profundo de noche
    <div className="flex min-h-screen font-sans antialiased bg-[#F8FAFC] dark:bg-[#0B0F17] text-slate-800 dark:text-slate-200 transition-colors duration-300">
      
      {/* ================= BARRA LATERAL IZQUIERDA (SIDEBAR) ================= */}
      <aside className="w-72 bg-white dark:bg-[#111827] border-r border-slate-200 dark:border-slate-800 flex flex-col justify-between transition-colors duration-300 shrink-0 shadow-sm z-10">
        <div>
          {/* Logo Corporativo */}
          <div className="flex items-center gap-3 px-8 py-7 border-b border-slate-200 dark:border-slate-800">
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
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                Gestión de Personal
              </button>
              <button onClick={() => navigate('/prestamos')} className={isActive('/prestamos')}>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                Reservas Extra.
              </button>
              <button onClick={() => navigate('/cronograma')} className={isActive('/cronograma')}>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                Cronograma
              </button>
              <button onClick={() => navigate('/reportes')} className={isActive('/reportes')}>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                Reportes / Auditoría
              </button>
              {rolUsuario === 'SUPER_ADMIN' && (
                <>
                <button onClick={() => navigate('/gestion-admins')} className={isActive('/gestion-admins')}>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 3a5 5 0 00-5 5v1.28A2 2 0 005 11.2V13a1 1 0 001 1h12a1 1 0 001-1v-1.8a2 2 0 00-2-1.92V8a5 5 0 00-5-5zm-3 6V8a3 3 0 116 0v1H9zm-2 4h10" /></svg>
                  Gestión de Administradores
                </button>
                <button onClick={() => navigate('/auditoria-web')} className={isActive('/auditoria-web')}>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 3a5 5 0 00-5 5v1.28A2 2 0 005 11.2V13a1 1 0 001 1h12a1 1 0 001-1v-1.8a2 2 0 00-2-1.92V8a5 5 0 00-5-5zm-3 6V8a3 3 0 116 0v1H9zm-2 4h10" /></svg>
                  Auditoría Web
                </button></>)}
            </nav>
          </div>
        </div>

        {/* Perfil Inferior */}
        <div className="p-6 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#161F30]">
          <button 
            onClick={async () =>{
              await signOut(auth); // 1. Cierra sesión en Google/Firebase
              localStorage.removeItem('adminRol'); // 2. Borra tu credencial del navegador
              localStorage.removeItem('adminSede'); 
              localStorage.removeItem('adminEmail'); 
              localStorage.removeItem('adminUid');
              navigate('/'); // 3. Te manda al Login
            }}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 font-bold text-sm transition-colors cursor-pointer shadow-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
            Cerrar Sesión
          </button>
        </div>
      </aside>

      {/* ================= AREA DE CONTENIDO PRINCIPAL ================= */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        
        {/* Barra Superior */}
        <header className="flex items-center justify-end px-10 py-4 bg-white dark:bg-[#111827] border-b border-slate-200 dark:border-slate-800 gap-5 shrink-0 transition-colors duration-300 shadow-sm z-0">
          
          {/* Indicador de conexión sutil */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[11px] font-bold text-slate-600 dark:text-slate-400">
            <span className="w-2 h-2 rounded-full bg-emerald-600 dark:bg-emerald-500"></span>
            SISTEMA EN LÍNEA
          </div>

          {/* Botón Claro / Oscuro */}
          <button 
            onClick={() => setEsOscuro(!esOscuro)} 
            className="p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer bg-white dark:bg-slate-800 shadow-sm"
            title="Cambiar Apariencia"
          >
            {esOscuro ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>
            )}
          </button>
        </header>

        {/* Las vistas se inyectan aquí */}
        <main className="flex-1 overflow-y-auto p-10">
          {children}
        </main>
      </div>
    </div>
  );
}

export default function App() {
  // 1. CAMBIO AQUÍ: Ahora empieza en "false" para cargar en Modo Claro/Blanco de forma predeterminada
  const [esOscuro, setEsOscuro] = useState(false);

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
        <Route path="/dashboard" element={<RutaProtegida><AdminLayout esOscuro={esOscuro} setEsOscuro={setEsOscuro}><Dashboard /></AdminLayout></RutaProtegida>} />
        <Route path="/usuarios" element={<RutaProtegida><AdminLayout esOscuro={esOscuro} setEsOscuro={setEsOscuro}><GestionUsuarios /></AdminLayout></RutaProtegida>} />
        <Route path="/prestamos" element={<RutaProtegida><AdminLayout esOscuro={esOscuro} setEsOscuro={setEsOscuro}><Prestamos /></AdminLayout></RutaProtegida>} />
        <Route path="/cronograma" element={<RutaProtegida><AdminLayout esOscuro={esOscuro} setEsOscuro={setEsOscuro}><Cronograma /></AdminLayout></RutaProtegida>} />
        <Route path="/reportes" element={<RutaProtegida><AdminLayout esOscuro={esOscuro} setEsOscuro={setEsOscuro}><Reportes /></AdminLayout></RutaProtegida>} />

        <Route path="/gestion-admins" element={<RutaProtegida rolRequerido="SUPER_ADMIN"><AdminLayout esOscuro={esOscuro} setEsOscuro={setEsOscuro}><GestionAdministradores /></AdminLayout></RutaProtegida>} />
        <Route path="/auditoria-web" element={<RutaProtegida rolRequerido="SUPER_ADMIN"><AdminLayout esOscuro={esOscuro} setEsOscuro={setEsOscuro}><AuditoriaWeb /></AdminLayout></RutaProtegida>} />
      </Routes>
    </BrowserRouter>
  );
}
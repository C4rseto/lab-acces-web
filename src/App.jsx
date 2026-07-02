import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import GestionUsuarios from './components/GestionUsuarios';
import Prestamos from './components/Prestamos';
import Cronograma from './components/Cronograma';

// Recibimos esOscuro y setEsOscuro como props
function AdminLayout({ children, esOscuro, setEsOscuro }) {
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = (path) => location.pathname === path 
    ? 'text-[#0BB885] border-b-2 border-[#0BB885]' 
    : 'text-slate-400 hover:text-white transition-colors';

  // Clases dinámicas dependiendo del tema
  const bgClass = esOscuro ? "bg-[#020617] text-slate-200" : "bg-[#f8fafc] text-slate-800";
  const navClass = esOscuro ? "bg-[#0B1320] border-slate-800/50" : "bg-white border-slate-200";

  return (
    <div className={`min-h-screen font-sans antialiased pb-12 transition-colors duration-300 ${bgClass}`}>
      <nav className={`flex items-center justify-between px-8 py-4 border-b shadow-md transition-colors duration-300 ${navClass}`}>
        <div className="flex items-center gap-8">
          <span className={`text-xl font-bold flex items-center gap-2 tracking-tight ${esOscuro ? 'text-white' : 'text-slate-800'}`}>
            <svg className="w-6 h-6 text-[#0BB885]" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 1.944A11.954 11.954 0 012.166 5C2.056 5.649 2 6.319 2 7c0 5.225 3.34 9.67 8 11.317C14.66 16.67 18 12.225 18 7c0-.682-.057-1.35-.166-1.998A11.954 11.954 0 0110 1.944zM11 14a1 1 0 11-2 0 1 1 0 012 0zm0-7a1 1 0 10-2 0v3a1 1 0 102 0V7z" clipRule="evenodd" />
            </svg>
            LabAccess
          </span>
          <div className="flex gap-5 text-[13px] font-semibold">
            <button onClick={() => navigate('/dashboard')} className={`bg-transparent border-0 cursor-pointer pb-2 ${isActive('/dashboard')}`}>Panel General</button>
            <button onClick={() => navigate('/usuarios')} className={`bg-transparent border-0 cursor-pointer pb-2 ${isActive('/usuarios')}`}>Gestión de Personal</button>
            <button onClick={() => navigate('/prestamos')} className={`bg-transparent border-0 cursor-pointer pb-2 ${isActive('/prestamos')}`}>Reservas Extra.</button>
            <button onClick={() => navigate('/cronograma')} className={`bg-transparent border-0 cursor-pointer pb-2 ${isActive('/cronograma')}`}>Cronograma</button>
          </div>
        </div>
        <div className="flex items-center gap-4 text-xs">
          
          {/* BOTÓN DEL TEMA */}
          <button 
            onClick={() => setEsOscuro(!esOscuro)} 
            className="bg-transparent border border-slate-500 rounded px-2 py-1 cursor-pointer hover:opacity-70 transition-opacity text-lg"
            title="Cambiar tema"
          >
            {esOscuro ? '☀️' : '🌙'}
          </button>

          <span className={`px-3 py-1.5 rounded-lg border ${esOscuro ? 'bg-[#1e293b] text-slate-300 border-slate-700' : 'bg-slate-200 text-slate-700 border-slate-300'}`}>ID: ESP32-DevkitV1</span>
          <button onClick={() => navigate('/')} className="text-red-500 hover:text-red-400 bg-transparent border-0 cursor-pointer font-bold">Cerrar Sesión</button>
        </div>
      </nav>
      <main className="max-w-7xl mx-auto px-6 mt-8">
        {children}
      </main>
    </div>
  );
}

export default function App() {
  // Estado que controla toda la aplicación
  const [esOscuro, setEsOscuro] = useState(true);

  // Aplica la clase al body para afectar los componentes hijos
  useEffect(() => {
    if (esOscuro) {
      document.body.classList.add('modo-oscuro');
      document.body.classList.remove('modo-claro');
    } else {
      document.body.classList.add('modo-claro');
      document.body.classList.remove('modo-oscuro');
    }
  }, [esOscuro]);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        {/* Pasamos el estado a los Layouts */}
        <Route path="/dashboard" element={<AdminLayout esOscuro={esOscuro} setEsOscuro={setEsOscuro}><Dashboard /></AdminLayout>} />
        <Route path="/usuarios" element={<AdminLayout esOscuro={esOscuro} setEsOscuro={setEsOscuro}><GestionUsuarios /></AdminLayout>} />
        <Route path="/prestamos" element={<AdminLayout esOscuro={esOscuro} setEsOscuro={setEsOscuro}><Prestamos /></AdminLayout>} />
        <Route path="/cronograma" element={<AdminLayout esOscuro={esOscuro} setEsOscuro={setEsOscuro}><Cronograma /></AdminLayout>} />
      </Routes>
    </BrowserRouter>
  );
}
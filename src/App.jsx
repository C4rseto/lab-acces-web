import React from 'react';
import { BrowserRouter, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import GestionUsuarios from './components/GestionUsuarios';
import Prestamos from './components/Prestamos';
import Cronograma from './components/Cronograma';

// Creamos un molde (Layout) para que tu Navbar Premium aparezca en todas las pantallas
function AdminLayout({ children }) {
  const navigate = useNavigate();
  const location = useLocation();

  // Función para pintar de verde la pestaña activa según la URL
  const isActive = (path) => location.pathname === path 
    ? 'text-[#0BB885] border-b-2 border-[#0BB885]' 
    : 'text-slate-400 hover:text-white';

  return (
    <div className="min-h-screen bg-[#020617] text-slate-200 font-sans antialiased pb-12">
      <nav className="flex items-center justify-between px-8 py-4 bg-[#0B1320] border-b border-slate-800/50 shadow-md">
        <div className="flex items-center gap-8">
          <span className="text-xl font-bold text-white flex items-center gap-2 tracking-tight">
            <svg className="w-6 h-6 text-[#0BB885]" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 1.944A11.954 11.954 0 012.166 5C2.056 5.649 2 6.319 2 7c0 5.225 3.34 9.67 8 11.317C14.66 16.67 18 12.225 18 7c0-.682-.057-1.35-.166-1.998A11.954 11.954 0 0110 1.944zM11 14a1 1 0 11-2 0 1 1 0 012 0zm0-7a1 1 0 10-2 0v3a1 1 0 102 0V7z" clipRule="evenodd" />
            </svg>
            LabAccess
          </span>
          <div className="flex gap-6 text-sm font-semibold">
            <button onClick={() => navigate('/dashboard')} className={`bg-transparent border-0 cursor-pointer pb-2 ${isActive('/dashboard')}`}>Panel de Control</button>
            <button onClick={() => navigate('/usuarios')} className={`bg-transparent border-0 cursor-pointer pb-2 ${isActive('/usuarios')}`}>Gestión de Usuarios</button>
            <button onClick={() => navigate('/prestamos')} className={`bg-transparent border-0 cursor-pointer pb-2 ${isActive('/prestamos')}`}>Préstamos / Reservas</button>
            <button onClick={() => navigate('/cronograma')} className={`bg-transparent border-0 cursor-pointer pb-2 ${isActive('/cronograma')}`}>Cronograma Semanal</button>
          </div>
        </div>
        <div className="flex items-center gap-4 text-xs">
          <span className="bg-[#1e293b] text-slate-300 px-3 py-1.5 rounded-lg border border-slate-700">ID: ESP32-DevkitV1</span>
          <button onClick={() => navigate('/')} className="text-red-400 hover:text-red-300 bg-transparent border-0 cursor-pointer font-bold">Cerrar Sesión</button>
        </div>
      </nav>
      
      {/* Aquí abajo se inyecta la pantalla que elijas */}
      <main className="max-w-7xl mx-auto px-6 mt-8">
        {children}
      </main>
    </div>
  );
}

// Este es el Router principal que le faltaba a la página
export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Ruta del Login de tu amigo (Sin Navbar) */}
        <Route path="/" element={<Login />} />
        
        {/* Rutas del Sistema Pulido (Con Navbar) */}
        <Route path="/dashboard" element={<AdminLayout><Dashboard /></AdminLayout>} />
        <Route path="/usuarios" element={<AdminLayout><GestionUsuarios /></AdminLayout>} />
        <Route path="/prestamos" element={<AdminLayout><Prestamos /></AdminLayout>} />
        <Route path="/cronograma" element={<AdminLayout><Cronograma /></AdminLayout>} />
      </Routes>
    </BrowserRouter>
  );
}
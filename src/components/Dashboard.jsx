import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../firebase';
import { ref, onValue } from 'firebase/database';

export default function Dashboard() {
  const navigate = useNavigate();
  const [auditoria, setAuditoria] = useState([]);
  const [docentes, setDocentes] = useState([]);
  
  // Estados de Telemetría
  const [pestilloAbierto, setPestilloAbierto] = useState(false);
  const [ocupacion, setOcupacion] = useState(0); // NUEVO: Contador de personas
  
  // Estados para contadores
  const [alertasSeguridad, setAlertasSeguridad] = useState(0);
  const [reservasPendientes, setReservasPendientes] = useState(0);

  useEffect(() => {
    // 1. Escuchar Docentes (para cruzar Nombres)
    onValue(ref(db, 'docentes'), (snapshot) => {
      const data = snapshot.val();
      setDocentes(data ? Object.values(data) : []);
    });

    // 2. Escuchar Telemetría Física (ESP32)
    onValue(ref(db, 'telemetria'), (snapshot) => {
      const val = snapshot.val();
      if (val) {
        setPestilloAbierto(val.pestilloAbierto || false);
        // Leemos la cantidad de personas que el ESP32 cuenta
        setOcupacion(val.ocupacion || 0); 
      }
    });

    // 3. Escuchar Auditoría y Contar Alertas (Accesos Denegados)
    onValue(ref(db, 'auditoria'), (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const logs = Object.keys(data).map(key => ({ id: key, ...data[key] }));
        logs.sort((a, b) => b.fechaHora.localeCompare(a.fechaHora));
        setAuditoria(logs);
        
        const fallos = logs.filter(log => log.esExito === false).length;
        setAlertasSeguridad(fallos);
      } else {
        setAuditoria([]);
        setAlertasSeguridad(0);
      }
    });

    // 4. Escuchar Reservas Móviles para contar pendientes
    onValue(ref(db, 'reservas'), (snapshot) => {
      const data = snapshot.val();
      if (data) {
        // Convertimos el objeto en un arreglo
        const list = Object.values(data);
        
        // Filtramos las que estén pendientes (ignorando mayúsculas/minúsculas por seguridad)
        const pendientes = list.filter(s => s.estado && s.estado.toLowerCase() === 'pendiente').length;
        
        setReservasPendientes(pendientes);
      } else {
        setReservasPendientes(0);
      }
    });
  }, []);

  const obtenerPropietario = (uidCard) => {
    if (uidCard === 'SENSOR-MAG') return 'Sistema (Magnético)';
    if (uidCard === 'BOTON-INT') return 'Pulsador Interno';
    const encontrado = docentes.find(d => d.uid.replace(/\s+/g, '').toUpperCase() === uidCard.replace(/\s+/g, '').toUpperCase());
    return encontrado ? encontrado.nombre : '⚠️ Desconocido / Inválido';
  };

  return (
    <div className="space-y-8">
      {/* CABECERA */}
      <div>
        <h1 className="text-[22px] font-extrabold text-white flex items-center gap-3">
          Panel de Control Global 
          <span className="bg-blue-900/40 text-blue-400 border border-blue-700/50 text-[9px] px-2 py-0.5 rounded uppercase tracking-wider font-bold">Modo Administrador</span>
        </h1>
        <p className="text-slate-400 mt-1 text-xs">Monitoreo de accesos, ocupación y alertas en tiempo real desde el ESP32.</p>
      </div>

      {/* 4 TARJETAS DE MÉTRICAS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* TARJETA 1: PESTILLO */}
        <div className="bg-[#0B1320] p-5 rounded-2xl border border-slate-800/80 shadow-lg flex flex-col justify-between min-h-[120px]">
          <h3 className="text-slate-500 text-[10px] font-black uppercase tracking-wider mb-1">Estado del Pestillo</h3>
          <p className={`text-3xl font-black ${pestilloAbierto ? 'text-[#0BB885]' : 'text-red-500'}`}>
            {pestilloAbierto ? 'ABIERTO' : 'CERRADO'}
          </p>
          <div className="flex items-center gap-1.5 mt-2">
            <span className={`w-1.5 h-1.5 rounded-full ${pestilloAbierto ? 'bg-[#0BB885]' : 'bg-red-500'}`}></span>
            <span className="text-[10px] text-slate-400">{pestilloAbierto ? 'Paso liberado' : 'Bloqueo Activo'}</span>
          </div>
        </div>

        {/* TARJETA 2: OCUPACIÓN ACTUAL (NUEVA) */}
        <div className="bg-[#0B1320] p-5 rounded-2xl border border-slate-800/80 shadow-lg flex flex-col justify-between min-h-[120px] relative">
          <div className="flex justify-between items-start">
            <h3 className="text-slate-400 text-[10px] font-black uppercase tracking-wider mb-1">Ocupación Actual</h3>
            {/* Icono de personas oscuro */}
            <div className="bg-emerald-900/20 border border-emerald-800/30 p-1.5 rounded-lg">
              <svg className="w-4 h-4 text-emerald-600" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
              </svg>
            </div>
          </div>
          
          <p className="text-4xl font-black text-white flex items-baseline gap-1 mt-1">
            {ocupacion} <span className="text-sm font-normal text-slate-400 mb-1">personas</span>
          </p>
          <div className="flex items-center gap-1.5 mt-1">
            <span className={`text-[11px] font-semibold ${ocupacion === 0 ? 'text-[#0BB885]' : 'text-blue-400'}`}>
              {ocupacion === 0 ? 'Nadie en el laboratorio' : 'Personas en el interior'}
            </span>
          </div>
        </div>

        {/* TARJETA 3: ALERTAS */}
        <div className="bg-[#0B1320] p-5 rounded-2xl border border-slate-800/80 shadow-lg flex flex-col justify-between min-h-[120px]">
          <h3 className="text-slate-500 text-[10px] font-black uppercase tracking-wider mb-1">Alertas de Seguridad</h3>
          <p className="text-3xl font-black text-white flex items-baseline gap-1">
            {alertasSeguridad} <span className="text-xs font-normal text-slate-400 mb-1">alertas hoy</span>
          </p>
          <div className="flex items-center gap-1.5 mt-2">
            <span className="w-1.5 h-1.5 rounded-full bg-orange-400"></span>
            <span className="text-[10px] text-slate-400">Intentos fuera de horario</span>
          </div>
        </div>

        {/* TARJETA 4: APP MÓVIL */}
        <div className="bg-[#0B1320] p-5 rounded-2xl border border-slate-800/80 shadow-lg flex flex-col justify-between min-h-[120px]">
          <h3 className="text-slate-500 text-[10px] font-black uppercase tracking-wider mb-1">App Móvil: Reservas</h3>
          <p className="text-3xl font-black text-white flex items-baseline gap-1">
            {reservasPendientes} <span className="text-xs font-normal text-slate-400 mb-1">pendientes</span>
          </p>
          <div className="flex items-center gap-1.5 mt-2">
            <button 
              onClick={() => navigate('/prestamos')}
              className="text-[10px] text-blue-400 hover:text-blue-300 font-semibold cursor-pointer bg-transparent border-0 p-0 transition-colors"
            >
              → Ir a pestaña Préstamos
            </button>
          </div>
        </div>

      </div>

      {/* TABLA DE AUDITORÍA */}
      <div className="bg-[#0B1320] rounded-2xl border border-slate-800/80 overflow-hidden shadow-2xl">
        <div className="px-5 py-4 border-b border-slate-800/80 flex justify-between items-center">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <svg className="w-4 h-4 text-[#0BB885]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4"></path></svg>
            Auditoría en Tiempo Real <span className="font-normal text-slate-400">(Telemetría ESP32)</span>
          </h2>
          <div className="bg-[#121B2A] border border-slate-700/60 px-3 py-1.5 rounded-full flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[#0BB885] animate-pulse"></span>
            <span className="text-[9px] text-slate-300 uppercase tracking-wider font-bold">Sincronizado con Base de Datos</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#0B1320] text-[9px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-800/80">
                <th className="px-5 py-3">Fecha y Hora</th>
                <th className="px-5 py-3">Docente / Credencial</th>
                <th className="px-5 py-3">Método de Entrada</th>
                <th className="px-5 py-3">Resultado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/40 text-xs text-slate-300">
              {auditoria.map((log, idx) => {
                const propietario = obtenerPropietario(log.idCredencial);
                return (
                  <tr key={log.id || idx} className="hover:bg-slate-800/20 transition-colors">
                    <td className="px-5 py-4 text-slate-400 font-mono text-[11px]">{log.fechaHora}</td>
                    <td className="px-5 py-4">
                      <div className={`font-bold ${propietario.includes('⚠️') ? 'text-red-400' : 'text-slate-200'}`}>{propietario}</div>
                      <div className="text-[10px] text-slate-500 font-mono mt-0.5">{log.idCredencial}</div>
                    </td>
                    <td className="px-5 py-4">{log.metodo || 'Lector RFID ESP32'}</td>
                    <td className="px-5 py-4">
                      <span className={`px-2.5 py-1 rounded text-[10px] font-bold border ${log.esExito ? 'text-[#0BB885] bg-[#0BB885]/10 border-[#0BB885]/20' : 'text-red-400 bg-red-400/10 border-red-500/20'}`}>
                        {log.esExito ? 'Acceso Permitido' : 'Acceso Denegado'}
                      </span>
                    </td>
                  </tr>
                );
              })}
              {auditoria.length === 0 && (
                <tr><td colSpan="4" className="p-8 text-center text-slate-500 italic text-xs">Esperando eventos en vivo desde el microcontrolador...</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
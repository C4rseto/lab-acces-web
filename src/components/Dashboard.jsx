import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../firebase';
import { ref, onValue } from 'firebase/database';

export default function Dashboard() {
  const navigate = useNavigate();
  
  // 1. SELECTOR SIN LA OPCIÓN "TODOS"
  const laboratorios = ['💻 Lab. Cómputo', '⚡ Lab. Electrónica', '🧪 Lab. Química'];
  // Empezamos por defecto en el primer laboratorio
  const [labSeleccionado, setLabSeleccionado] = useState('💻 Lab. Cómputo');

  const [docentes, setDocentes] = useState([]);
  const [todasAuditorias, setTodasAuditorias] = useState([]);
  const [todasReservas, setTodasReservas] = useState([]);
  
  const [pestilloAbierto, setPestilloAbierto] = useState(false);
  const [ocupacion, setOcupacion] = useState(0);

  // =========================================================
  // TU LÓGICA DE FIREBASE Y HARDWARE INTACTA (Prohibido tocar)
  // =========================================================
  useEffect(() => {
    onValue(ref(db, 'docentes'), (snapshot) => {
      const data = snapshot.val();
      setDocentes(data ? Object.values(data) : []);
    });

    onValue(ref(db, 'laboratorio/auditoria'), (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const logs = Object.keys(data).map(key => ({ id: key, ...data[key] }));
        logs.sort((a, b) => b.hora.localeCompare(a.hora));
        setTodasAuditorias(logs);
      } else {
        setTodasAuditorias([]);
      }
    });

    onValue(ref(db, 'reservas'), (snapshot) => {
      const data = snapshot.val();
      setTodasReservas(data ? Object.values(data) : []);
    });
  }, []);

  useEffect(() => {
    let nodoFirebase = '';
    if (labSeleccionado.includes('Cómputo')) nodoFirebase = 'LAB_COMPUTO';
    if (labSeleccionado.includes('Electrónica')) nodoFirebase = 'LAB_ELECTRONICA';
    if (labSeleccionado.includes('Química')) nodoFirebase = 'LAB_QUIMICA';

    const unsubscribe = onValue(ref(db, `configuracion_laboratorios/${nodoFirebase}`), (snapshot) => {
      const val = snapshot.val();
      if (val) {
        setPestilloAbierto(val.estado_puerta === 'ABIERTA');
        setOcupacion(val.ocupacion || 0);
      } else {
        setPestilloAbierto(false);
        setOcupacion(0);
      }
    });

    return () => unsubscribe();
  }, [labSeleccionado]);

  const coincideLab = (labDB) => {
    if (!labDB) return false;
    if (labSeleccionado.includes('Cómputo') && labDB.includes('Cómputo')) return true;
    if (labSeleccionado.includes('Electrónica') && labDB.includes('Electrónica')) return true;
    if (labSeleccionado.includes('Química') && labDB.includes('Química')) return true;
    return false;
  };

  const auditoriaFiltrada = todasAuditorias.filter(log => coincideLab(log.laboratorio));

  const alertasSeguridad = auditoriaFiltrada.filter(log => 
    log.evento === 'ACCESO_DENEGADO' || log.evento === 'PUERTA_ABANDONADA'
  ).length;

  const reservasPendientes = todasReservas.filter(res => {
    const esPendiente = res.estado && res.estado.toLowerCase() === 'pendiente';
    return esPendiente && coincideLab(res.laboratorio);
  }).length;

  const obtenerPropietario = (uidCard) => {
    if (!uidCard) return 'Desconocido';
    if (uidCard === 'SISTEMA') return 'Monitor de Hardware';
    if (uidCard === 'BOTON_INTERIOR') return 'Pulsador de Salida (REX)';
    
    const encontrado = docentes.find(d => 
      d.uid && d.uid.replace(/\s+/g, '').toUpperCase() === uidCard.replace(/\s+/g, '').toUpperCase()
    );
    return encontrado ? encontrado.nombre : '⚠️ Credencial No Registrada';
  };
  // =========================================================

  return (
    <div className="space-y-8 animate-fade-in-up">
      
      {/* TÍTULO Y FILTRADO SUPERIOR */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white flex items-center gap-3">
            Panel de Control 
            <span className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 text-xs px-2.5 py-1 rounded-md uppercase tracking-wider font-bold shadow-sm">
              Modo Administrador
            </span>
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1.5 text-sm font-medium">Monitoreo de accesos, aforo y sincronización móvil en tiempo real.</p>
        </div>

        <div className="flex items-center gap-3 bg-white dark:bg-[#1E293B] px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm transition-all">
          <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Supervisar:</label>
          <select 
            className="bg-transparent text-slate-800 dark:text-white border-none outline-none cursor-pointer font-bold text-sm appearance-none focus:ring-0"
            value={labSeleccionado}
            onChange={(e) => setLabSeleccionado(e.target.value)}
          >
            {laboratorios.map(lab => (
              <option key={lab} value={lab} className="bg-white dark:bg-[#1E293B] text-slate-800 dark:text-white font-medium">
                {lab}
              </option>
            ))}
          </select>
          <svg className="w-4 h-4 text-emerald-600 dark:text-emerald-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7"></path></svg>
        </div>
      </div>

      {/* RECUADRO DE TARJETAS (MÁXIMA INTERACTIVIDAD) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        
        {/* Tarjeta 1: Pestillo */}
        <div className="bg-white dark:bg-[#1E293B] p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between min-h-[130px] transition-all">
          <h3 className="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">Estado del Pestillo</h3>
          <p className={`text-3xl font-black tracking-tight ${pestilloAbierto ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
            {pestilloAbierto ? 'ABIERTO' : 'CERRADO'}
          </p>
          <div className="flex items-center gap-2 mt-3">
            <span className={`w-2 h-2 rounded-full ${pestilloAbierto ? 'bg-emerald-600 dark:bg-emerald-500' : 'bg-rose-500'}`}></span>
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              {pestilloAbierto ? 'Paso liberado' : 'Bloqueo Activo'}
            </span>
          </div>
        </div>

        {/* Tarjeta 2: Ocupación */}
        <div className="bg-white dark:bg-[#1E293B] p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between min-h-[130px] relative transition-all">
          <div className="flex justify-between items-start">
            <h3 className="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">Ocupación Actual</h3>
            <div className="bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-2 rounded-lg">
              <svg className="w-4 h-4 text-slate-600 dark:text-slate-400" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
              </svg>
            </div>
          </div>
          <p className="text-4xl font-black text-slate-900 dark:text-white flex items-baseline gap-1.5 mt-1">
            {ocupacion} <span className="text-sm font-semibold text-slate-500 dark:text-slate-400 mb-1">personas</span>
          </p>
          <div className="flex items-center gap-1.5 mt-2">
            <span className={`text-xs font-bold ${ocupacion === 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-blue-600 dark:text-blue-400'}`}>
              {ocupacion === 0 ? 'Nadie en el laboratorio' : 'Aforo ocupado'}
            </span>
          </div>
        </div>

        {/* Tarjeta 3: Alertas */}
        <div className="bg-white dark:bg-[#1E293B] p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between min-h-[130px] transition-all">
          <h3 className="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">Alertas de Seguridad</h3>
          <p className="text-4xl font-black text-slate-900 dark:text-white flex items-baseline gap-1.5 mt-1">
            {alertasSeguridad} <span className="text-sm font-semibold text-slate-500 dark:text-slate-400 mb-1">hoy</span>
          </p>
          <div className="flex items-center gap-2 mt-2">
            <span className={`w-2 h-2 rounded-full ${alertasSeguridad > 0 ? 'bg-amber-500' : 'bg-slate-300 dark:bg-slate-600'}`}></span>
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Intentos en este laboratorio</span>
          </div>
        </div>

        {/* ================= TARJETA 4 MEJORADA: APP MÓVIL RESERVAS (INTERACTIVA) ================= */}
        <div className={`p-6 rounded-2xl border shadow-sm flex flex-col justify-between min-h-[130px] transition-all duration-300 relative ${reservasPendientes > 0 ? 'bg-amber-50/40 dark:bg-amber-950/10 border-amber-400 dark:border-amber-600/70 ring-2 ring-amber-500/20' : 'bg-white dark:bg-[#1E293B] border-slate-200 dark:border-slate-800'}`}>
          
          {/* Indicador parpadeante en tiempo real si hay pendientes */}
          {reservasPendientes > 0 && (
            <span className="absolute top-4 right-4 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-500 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
            </span>
          )}

          <div className="flex justify-between items-start">
            <h3 className="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">App Móvil: Reservas</h3>
            <div className={`p-2 rounded-lg ${reservasPendientes > 0 ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>
              {/* Ícono vectorial de un celular/sincronización */}
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"></path></svg>
            </div>
          </div>
          
          <p className={`text-4xl font-black flex items-baseline gap-1.5 mt-1 ${reservasPendientes > 0 ? 'text-amber-800 dark:text-amber-400' : 'text-slate-900 dark:text-white'}`}>
            {reservasPendientes} <span className="text-sm font-semibold text-slate-500 dark:text-slate-400 mb-1">pendientes</span>
          </p>
          
          <div className="flex items-center gap-1.5 mt-2">
            <button 
              onClick={() => navigate('/prestamos')}
              className={`text-xs font-extrabold cursor-pointer bg-transparent border-0 p-0 transition-all flex items-center gap-1 font-sans group ${reservasPendientes > 0 ? 'text-amber-700 hover:text-amber-800 dark:text-amber-400 dark:hover:text-amber-300' : 'text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300'}`}
            >
              Revisar solicitudes <span className="group-hover:translate-x-1 transition-transform">→</span>
            </button>
          </div>
        </div>

      </div>

      {/* HISTORIAL DE AUDITORÍA */}
      <div className="bg-white dark:bg-[#1E293B] rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm transition-all duration-300">
        <div className="px-6 py-5 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-transparent">
          <h2 className="text-base font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <svg className="w-5 h-5 text-slate-600 dark:text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4"></path></svg>
            Historial de Auditoría <span className="font-medium text-slate-500 dark:text-slate-400 ml-1">({labSeleccionado})</span>
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-[#111827]/40 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                <th className="px-6 py-4">Fecha y Hora</th>
                <th className="px-6 py-4">Docente / Credencial</th>
                <th className="px-6 py-4">Método de Entrada</th>
                <th className="px-6 py-4">Resultado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/40 text-sm text-slate-700 dark:text-slate-300">
              {auditoriaFiltrada.length === 0 ? (
                <tr>
                  <td colSpan="4" className="px-6 py-12 text-center text-slate-500 font-medium italic bg-white dark:bg-[#1E293B]">
                    No hay registros de auditoría para mostrar en este laboratorio.
                  </td>
                </tr>
              ) : (
                auditoriaFiltrada.map((log, idx) => {
                  const propietario = obtenerPropietario(log.uid);
                  const esExito = log.evento === 'ACCESO_CONCEDIDO';
                  const esAlarmaFisica = log.evento === 'PUERTA_ABANDONADA';
                  const esDenegado = log.evento === 'ACCESO_DENEGADO';

                  return (
                    <tr key={log.id || idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                      <td className="px-6 py-4 text-slate-500 dark:text-slate-400 font-mono text-xs">{log.hora}</td>
                      <td className="px-6 py-4">
                        <div className={`font-bold ${propietario.includes('⚠️') ? 'text-rose-600 dark:text-rose-400' : 'text-slate-800 dark:text-slate-200'}`}>
                          {propietario}
                        </div>
                        <div className="text-xs text-slate-500 font-mono mt-1">{log.uid}</div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-slate-600 dark:text-slate-300 font-mono text-xs font-bold bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2.5 py-1.5 rounded-md">
                          {log.modo || 'RFID'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {esExito && <span className="px-3 py-1.5 rounded-md text-xs font-bold border text-emerald-800 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/40">ACCESO PERMITIDO</span>}
                        {esDenegado && <span className="px-3 py-1.5 rounded-md text-xs font-bold border text-rose-800 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/40">ACCESO DENEGADO</span>}
                        {esAlarmaFisica && <span className="px-3 py-1.5 rounded-md text-xs font-bold border text-amber-800 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/40">ALARMA: PUERTA ABIERTA</span>}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
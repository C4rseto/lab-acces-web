import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../firebase';
import { ref, onValue } from 'firebase/database';

export default function Dashboard() {
  const navigate = useNavigate();
  
  // 1. ESTADO DEL SELECTOR DE LABORATORIOS
  const laboratorios = ['Todos', '💻 Lab. Cómputo', '⚡ Lab. Electrónica', '🧪 Lab. Química'];
  const [labSeleccionado, setLabSeleccionado] = useState('Todos');

  // 2. ESTADOS DE DATOS CRUDOS (Todo lo que viene de Firebase)
  const [docentes, setDocentes] = useState([]);
  const [todasAuditorias, setTodasAuditorias] = useState([]);
  const [todasReservas, setTodasReservas] = useState([]);
  
  // 3. ESTADOS DE TELEMETRÍA FÍSICA (Cambiantes según el lab)
  const [pestilloAbierto, setPestilloAbierto] = useState(false);
  const [ocupacion, setOcupacion] = useState(0);

  // EFECTO 1: Descargar datos generales (Docentes, Auditoría completa y Reservas)
  useEffect(() => {
    // Escuchar Docentes
    onValue(ref(db, 'docentes'), (snapshot) => {
      const data = snapshot.val();
      setDocentes(data ? Object.values(data) : []);
    });

    // Escuchar Auditoría completa
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

    // Escuchar Reservas completas
    onValue(ref(db, 'reservas'), (snapshot) => {
      const data = snapshot.val();
      setTodasReservas(data ? Object.values(data) : []);
    });
  }, []);

  // EFECTO 2: Escuchar la telemetría dinámica de la puerta seleccionada
  useEffect(() => {
    if (labSeleccionado === 'Todos') {
      setPestilloAbierto(false);
      setOcupacion(0);
      return;
    }

    // Convertimos el nombre visual a la llave de Firebase
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

  // 4. CÁLCULOS FILTRADOS (Se actualizan solos cuando cambias el select)
  const auditoriaFiltrada = todasAuditorias.filter(log => {
    if (labSeleccionado === 'Todos') return true;
    // IMPORTANTE: Asegúrate de que el ESP32 envíe el campo 'laboratorio' en el log
    return log.laboratorio === labSeleccionado; 
  });

  const alertasSeguridad = auditoriaFiltrada.filter(log => 
    log.evento === 'ACCESO_DENEGADO' || log.evento === 'PUERTA_ABANDONADA'
  ).length;

  const reservasPendientes = todasReservas.filter(res => {
    const esPendiente = res.estado && res.estado.toLowerCase() === 'pendiente';
    const esDelLab = labSeleccionado === 'Todos' || res.laboratorio === labSeleccionado;
    return esPendiente && esDelLab;
  }).length;

  // FUNCIÓN HELPER
  const obtenerPropietario = (uidCard) => {
    if (!uidCard) return 'Desconocido';
    if (uidCard === 'SISTEMA') return 'Monitor de Hardware';
    if (uidCard === 'BOTON_INTERIOR') return 'Pulsador de Salida (REX)';
    
    const encontrado = docentes.find(d => 
      d.uid && d.uid.replace(/\s+/g, '').toUpperCase() === uidCard.replace(/\s+/g, '').toUpperCase()
    );
    return encontrado ? encontrado.nombre : '⚠️ Credencial No Registrada';
  };

  return (
    <div className="space-y-8">
      {/* CABECERA Y SELECTOR */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-[22px] font-extrabold text-white flex items-center gap-3">
            Panel de Control Global 
            <span className="bg-blue-900/40 text-blue-400 border border-blue-700/50 text-[9px] px-2 py-0.5 rounded uppercase tracking-wider font-bold">Modo Administrador</span>
          </h1>
          <p className="text-slate-400 mt-1 text-xs">Monitoreo de accesos, ocupación y alertas en tiempo real.</p>
        </div>

        {/* SELECTOR DE LABORATORIO */}
        <div className="flex items-center gap-3 bg-[#0B1320] px-4 py-2 rounded-xl border border-slate-700/80 shadow-lg">
          <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Supervisar:</label>
          <select 
            className="bg-transparent text-white border-none outline-none cursor-pointer font-semibold text-sm appearance-none focus:ring-0"
            value={labSeleccionado}
            onChange={(e) => setLabSeleccionado(e.target.value)}
          >
            {laboratorios.map(lab => (
              <option key={lab} value={lab} className="bg-[#0f172a] text-white">
                {lab}
              </option>
            ))}
          </select>
          <svg className="w-4 h-4 text-[#0BB885] pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
        </div>
      </div>

      {/* 4 TARJETAS DE MÉTRICAS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* TARJETA 1: PESTILLO */}
        <div className="bg-[#0B1320] p-5 rounded-2xl border border-slate-800/80 shadow-lg flex flex-col justify-between min-h-[120px]">
          <h3 className="text-slate-500 text-[10px] font-black uppercase tracking-wider mb-1">Estado del Pestillo</h3>
          
          {labSeleccionado === 'Todos' ? (
            <p className="text-xl font-bold text-slate-500 mt-2">SELECCIONE LAB</p>
          ) : (
            <p className={`text-3xl font-black ${pestilloAbierto ? 'text-[#0BB885]' : 'text-red-500'}`}>
              {pestilloAbierto ? 'ABIERTO' : 'CERRADO'}
            </p>
          )}

          <div className="flex items-center gap-1.5 mt-2">
            <span className={`w-1.5 h-1.5 rounded-full ${labSeleccionado === 'Todos' ? 'bg-slate-600' : (pestilloAbierto ? 'bg-[#0BB885]' : 'bg-red-500')}`}></span>
            <span className="text-[10px] text-slate-400">
              {labSeleccionado === 'Todos' ? 'Vista global' : (pestilloAbierto ? 'Paso liberado' : 'Bloqueo Activo')}
            </span>
          </div>
        </div>

        {/* TARJETA 2: OCUPACIÓN ACTUAL */}
        <div className="bg-[#0B1320] p-5 rounded-2xl border border-slate-800/80 shadow-lg flex flex-col justify-between min-h-[120px] relative">
          <div className="flex justify-between items-start">
            <h3 className="text-slate-400 text-[10px] font-black uppercase tracking-wider mb-1">Ocupación Actual</h3>
            <div className="bg-emerald-900/20 border border-emerald-800/30 p-1.5 rounded-lg">
              <svg className="w-4 h-4 text-emerald-600" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
              </svg>
            </div>
          </div>
          
          <p className="text-4xl font-black text-white flex items-baseline gap-1 mt-1">
            {labSeleccionado === 'Todos' ? '--' : ocupacion} <span className="text-sm font-normal text-slate-400 mb-1">personas</span>
          </p>
          <div className="flex items-center gap-1.5 mt-1">
            <span className={`text-[11px] font-semibold ${ocupacion === 0 ? 'text-[#0BB885]' : 'text-blue-400'}`}>
              {labSeleccionado === 'Todos' ? 'Seleccione un laboratorio' : (ocupacion === 0 ? 'Nadie en el laboratorio' : 'Personas en el interior')}
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
            <span className={`w-1.5 h-1.5 rounded-full ${alertasSeguridad > 0 ? 'bg-orange-400' : 'bg-slate-600'}`}></span>
            <span className="text-[10px] text-slate-400">
              {labSeleccionado === 'Todos' ? 'De todos los laboratorios' : 'Intentos en este laboratorio'}
            </span>
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
              → Ver panel de aprobaciones
            </button>
          </div>
        </div>

      </div>

      {/* TABLA DE AUDITORÍA */}
      <div className="bg-[#0B1320] rounded-2xl border border-slate-800/80 overflow-hidden shadow-2xl">
        <div className="px-5 py-4 border-b border-slate-800/80 flex justify-between items-center">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <svg className="w-4 h-4 text-[#0BB885]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4"></path></svg>
            Historial de Auditoría <span className="font-normal text-slate-400">({labSeleccionado})</span>
          </h2>
          <div className="bg-[#121B2A] border border-slate-700/60 px-3 py-1.5 rounded-full flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[#0BB885] animate-pulse"></span>
            <span className="text-[9px] text-slate-300 uppercase tracking-wider font-bold">En tiempo real</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#0B1320] text-[9px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-800/80">
                <th className="px-5 py-3">Fecha y Hora</th>
                {labSeleccionado === 'Todos' && <th className="px-5 py-3">Laboratorio</th>}
                <th className="px-5 py-3">Docente / Credencial</th>
                <th className="px-5 py-3">Método de Entrada</th>
                <th className="px-5 py-3">Resultado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/40 text-xs text-slate-300">
              {auditoriaFiltrada.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-5 py-8 text-center text-slate-500 italic">
                    No hay registros de auditoría para mostrar.
                  </td>
                </tr>
              ) : (
                auditoriaFiltrada.map((log, idx) => {
                  const propietario = obtenerPropietario(log.uid);
                  const esExito = log.evento === 'ACCESO_CONCEDIDO';
                  const esAlarmaFisica = log.evento === 'PUERTA_ABANDONADA';
                  const esDenegado = log.evento === 'ACCESO_DENEGADO';

                  return (
                    <tr key={log.id || idx} className="hover:bg-slate-800/20 transition-colors">
                      <td className="px-5 py-4 text-slate-400 font-mono text-[11px]">{log.hora}</td>
                      
                      {labSeleccionado === 'Todos' && (
                        <td className="px-5 py-4 font-semibold text-blue-400 text-[11px]">
                          {log.laboratorio || 'No especificado'}
                        </td>
                      )}
                      
                      <td className="px-5 py-4">
                        <div className={`font-bold ${propietario.includes('⚠️') ? 'text-red-400' : 'text-slate-200'}`}>
                          {propietario}
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono mt-0.5">{log.uid}</div>
                      </td>
                      
                      <td className="px-5 py-4">
                        <span className="text-slate-300 font-mono text-[10px] bg-slate-800/50 border border-slate-700/50 px-2 py-1 rounded">
                          {log.modo || 'NO_IDENTIFICADO'}
                        </span>
                      </td>
                      
                      <td className="px-5 py-4">
                        {esExito && (
                          <span className="px-2.5 py-1 rounded text-[10px] font-bold border text-[#0BB885] bg-[#0BB885]/10 border-[#0BB885]/20">
                            Acceso Permitido
                          </span>
                        )}
                        {esDenegado && (
                          <span className="px-2.5 py-1 rounded text-[10px] font-bold border text-red-400 bg-red-400/10 border-red-500/20">
                            Acceso Denegado
                          </span>
                        )}
                        {esAlarmaFisica && (
                          <span className="px-2.5 py-1 rounded text-[10px] font-bold border text-orange-400 bg-orange-400/10 border-orange-500/20 shadow-[0_0_10px_rgba(251,146,60,0.2)]">
                            Alarma: Puerta Abierta
                          </span>
                        )}
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
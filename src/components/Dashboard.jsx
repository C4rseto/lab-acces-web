import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../firebase';
import { ref, onValue } from 'firebase/database';

export default function Dashboard() {
  const navigate = useNavigate();
  
  // SELECTOR SIN LA OPCIÓN "TODOS"
  const laboratorios = ['💻 Lab. Cómputo', '⚡ Lab. Electrónica', '🧪 Lab. Química'];
  const [labSeleccionado, setLabSeleccionado] = useState('💻 Lab. Cómputo');

  const [docentes, setDocentes] = useState([]);
  const [todasAuditorias, setTodasAuditorias] = useState([]);
  const [todasReservas, setTodasReservas] = useState([]);
  
  const [pestilloAbierto, setPestilloAbierto] = useState(false);
  const [ocupacion, setOcupacion] = useState(0);

  // =========================================================
  // TU LÓGICA DE FIREBASE Y HARDWARE INTACTA
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

  return (
    <div className="space-y-6 animate-fade-in-up pb-10">
      
      {/* TÍTULO Y FILTRADO SUPERIOR */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b border-slate-200/50 dark:border-slate-800/80 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-3 tracking-tight">
            Panel de Control 
            <span className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 text-[10px] px-2 py-0.5 rounded-md uppercase tracking-widest font-extrabold shadow-sm">
              Modo Administrador
            </span>
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-2 text-sm font-medium">Monitoreo de accesos, aforo y sincronización móvil en tiempo real.</p>
        </div>

        {/* SELECTOR DE LABORATORIO PREMIUM */}
        <div className="flex items-center gap-2.5 bg-white dark:bg-[#111827] px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm transition-all w-full md:w-auto">
          <label className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Supervisar:</label>
          <div className="flex items-center gap-1.5 relative w-full">
            <select 
              className="bg-transparent text-slate-800 dark:text-white border-0 outline-none cursor-pointer font-bold text-xs pr-6 appearance-none focus:ring-0 w-full"
              value={labSeleccionado}
              onChange={(e) => setLabSeleccionado(e.target.value)}
            >
              {laboratorios.map(lab => (
                <option key={lab} value={lab} className="bg-white dark:bg-[#111827] text-slate-800 dark:text-slate-200 font-semibold text-xs">
                  {lab}
                </option>
              ))}
            </select>
            <svg className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 absolute right-0 pointer-events-none" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7"></path></svg>
          </div>
        </div>
      </div>

      {/* METRICAS PREMIUM EN GRID (ESTILO ENTERPRISE) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        
        {/* Tarjeta 1: Pestillo */}
        <div className="relative bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-xl p-5 overflow-hidden flex flex-col justify-between shadow-sm">
          {pestilloAbierto ? (
            <div className="absolute -top-6 -right-6 w-32 h-32 bg-emerald-500/5 dark:bg-emerald-500/10 rounded-full blur-2xl pointer-events-none"></div>
          ) : (
            <div className="absolute -top-6 -right-6 w-32 h-32 bg-rose-500/5 dark:bg-rose-500/10 rounded-full blur-2xl pointer-events-none"></div>
          )}
          <div className="flex justify-between items-start z-10">
            <div>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Estado del Pestillo</p>
              <h3 className={`text-2xl font-black tracking-tight ${pestilloAbierto ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                {pestilloAbierto ? 'ABIERTO' : 'CERRADO'}
              </h3>
            </div>
            <div className={`p-2.5 rounded-lg border ${pestilloAbierto ? 'bg-emerald-50 border-emerald-100 text-emerald-600 dark:bg-emerald-500/10 dark:border-emerald-500/20 dark:text-emerald-400' : 'bg-rose-50 border-rose-100 text-rose-600 dark:bg-rose-500/10 dark:border-rose-500/20 dark:text-rose-400'}`}>
              {pestilloAbierto ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 10.5V6.75a4.5 4.5 0 119 0v3.75M3.75 21.75h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H3.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" /></svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" /></svg>
              )}
            </div>
          </div>
          <div className="mt-4 z-10 flex items-center gap-1.5">
            <span className={`w-1.5 h-1.5 rounded-full ${pestilloAbierto ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`}></span>
            <span className="text-xs text-slate-500 dark:text-slate-500 font-medium">
              {pestilloAbierto ? 'Paso libre controlado' : 'Bloqueo magnético activo'}
            </span>
          </div>
        </div>

        {/* Tarjeta 2: Ocupación */}
        <div className="relative bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-xl p-5 overflow-hidden flex flex-col justify-between shadow-sm">
          <div className="absolute -top-6 -right-6 w-32 h-32 bg-blue-500/5 dark:bg-blue-500/10 rounded-full blur-2xl pointer-events-none"></div>
          <div className="flex justify-between items-start z-10">
            <div>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Ocupación Actual</p>
              <h3 className="text-3xl font-bold text-slate-800 dark:text-white tracking-tight">
                {ocupacion} <span className="text-xs font-bold text-slate-400 dark:text-slate-500 lowercase">pax</span>
              </h3>
            </div>
            <div className="p-2.5 bg-slate-50 dark:bg-[#1E293B] border border-slate-100 dark:border-slate-700 rounded-lg text-slate-600 dark:text-slate-400">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-2.533-3.076l-1.408-.391a4.131 4.131 0 01-2.533-3.076 4.147 4.147 0 01.168-1.932 4.147 4.147 0 011.165-1.579A3 3 0 1012.3 3.197a4.5 4.5 0 00-1.889 2.08 4.5 4.5 0 00.324 4.316l1.392 2.404a4.502 4.502 0 01-.6 5.093l-1.464 1.463zm0 0v1.213a2.25 2.25 0 002.25 2.25h3.54a2.25 2.25 0 002.25-2.25v-1.213a11.51 11.51 0 01-4.47 1.056 11.52 11.52 0 01-3.57-.456zM3.375 19.5h10.25c.621 0 1.125-.504 1.125-1.125v-1.213a11.51 11.51 0 00-4.47 1.056 11.52 11.52 0 00-3.57-.456v1.213c0 .621.504 1.125 1.125 1.125zm0 0h10.25M3.375 19.5A1.125 1.125 0 012.25 18.375v-1.213a11.51 11.51 0 014.47-1.056c1.272.33 2.476.456 3.57.456v1.213c0 .621-.504 1.125-1.125 1.125H3.375z" /></svg>
            </div>
          </div>
          <div className="mt-4 z-10">
            <span className={`text-xs font-semibold ${ocupacion === 0 ? 'text-emerald-600 dark:text-emerald-500/80' : 'text-blue-600 dark:text-blue-400/80'}`}>
              {ocupacion === 0 ? 'Instalación vacía' : 'Aforo en uso'}
            </span>
          </div>
        </div>

        {/* Tarjeta 3: Alertas */}
        <div className="relative bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-xl p-5 overflow-hidden flex flex-col justify-between shadow-sm">
          <div className="absolute -top-6 -right-6 w-32 h-32 bg-amber-500/5 dark:bg-amber-500/10 rounded-full blur-2xl pointer-events-none"></div>
          <div className="flex justify-between items-start z-10">
            <div>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Alertas de Seguridad</p>
              <h3 className="text-3xl font-bold text-slate-800 dark:text-white tracking-tight">
                {alertasSeguridad} <span className="text-xs font-bold text-slate-400 dark:text-slate-500 lowercase">hoy</span>
              </h3>
            </div>
            <div className={`p-2.5 rounded-lg border ${alertasSeguridad > 0 ? 'bg-amber-50 border-amber-100 text-amber-600 dark:bg-amber-500/10 dark:border-amber-500/20 dark:text-amber-400' : 'bg-slate-50 border-slate-100 text-slate-500 dark:bg-[#1E293B] dark:border-slate-700 dark:text-slate-400'}`}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m0-10.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.75c0 5.592 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.57-.598-3.75h-.152c-3.196 0-6.1-1.249-8.25-3.286zm0 13.036h.008v.008H12v-.008z" /></svg>
            </div>
          </div>
          <div className="mt-4 z-10">
            <span className="text-xs text-slate-500 dark:text-slate-500 font-medium">Rechazos o Puertas abandonadas</span>
          </div>
        </div>

        {/* Tarjeta 4: App Móvil */}
        <div className={`relative border rounded-xl p-5 overflow-hidden flex flex-col justify-between shadow-sm transition-all duration-300 ${reservasPendientes > 0 ? 'bg-white dark:bg-[#111827] border-amber-500/40 dark:border-amber-500/30 shadow-amber-500/5' : 'bg-white dark:bg-[#111827] border-slate-200 dark:border-slate-800'}`}>
          {reservasPendientes > 0 && (
            <div className="absolute -top-6 -right-6 w-32 h-32 bg-amber-500/10 rounded-full blur-2xl pointer-events-none animate-pulse"></div>
          )}
          <div className="flex justify-between items-start z-10">
            <div>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">App Móvil: Reservas</p>
              <h3 className={`text-3xl font-bold tracking-tight ${reservasPendientes > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-slate-800 dark:text-white'}`}>
                {reservasPendientes} <span className="text-xs font-bold text-slate-400 dark:text-slate-500 lowercase">cola</span>
              </h3>
            </div>
            <div className={`p-2.5 rounded-lg border ${reservasPendientes > 0 ? 'bg-amber-50 border-amber-200 text-amber-600 dark:bg-amber-500/10 dark:border-amber-500/20 dark:text-amber-400' : 'bg-slate-50 border-slate-100 text-slate-500 dark:bg-[#1E293B] dark:border-slate-700 dark:text-slate-400'}`}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3" /></svg>
            </div>
          </div>
          <div className="mt-4 z-10 flex items-center justify-between">
            <button 
              onClick={() => navigate('/prestamos')}
              className={`text-xs font-bold cursor-pointer bg-transparent border-0 p-0 transition-all flex items-center gap-1 group outline-none ${reservasPendientes > 0 ? 'text-amber-600 hover:text-amber-700 dark:text-amber-400 dark:hover:text-amber-300' : 'text-purple-600 hover:text-purple-700 dark:text-purple-400 dark:hover:text-purple-300'}`}
            >
              Evaluar solicitudes <span className="group-hover:translate-x-0.5 transition-transform">→</span>
            </button>
          </div>
        </div>

      </div>

      {/* SECCIÓN HISTORIAL DE AUDITORÍA MODERNIZADA */}
      <div className="bg-white dark:bg-[#111827] rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden transition-all duration-300">
        
        {/* ENCABEZADO DE TABLA */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-[#0F172A]/30">
          <h2 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 5.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125" /></svg>
            Historial de Auditoría en Tiempo Real
            <span className="text-xs font-medium text-slate-400 dark:text-slate-500 normal-case ml-1">({labSeleccionado.split(' ')[1] || labSeleccionado})</span>
          </h2>
        </div>

        {/* TABLA DE FLUJO */}
        <div className="overflow-x-auto max-h-[450px] [&::-webkit-scrollbar]:w-[4px] [&::-webkit-scrollbar-thumb]:bg-slate-300 dark:[&::-webkit-scrollbar-thumb]:bg-slate-700 [&::-webkit-scrollbar-track]:bg-transparent">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-[#1E293B] text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-10 shadow-sm">
                <th className="px-6 py-3.5">Fecha y Hora</th>
                <th className="px-6 py-3.5">Docente / Credencial</th>
                <th className="px-6 py-3.5">Método de Entrada</th>
                <th className="px-6 py-3.5 pr-6 text-right">Resultado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-sm text-slate-700 dark:text-slate-300">
              {auditoriaFiltrada.length === 0 ? (
                <tr>
                  <td colSpan="4" className="px-6 py-12 text-center text-slate-400 dark:text-slate-500 bg-white dark:bg-[#111827]">
                    <div className="flex flex-col items-center justify-center">
                      <svg className="w-9 h-9 mb-2 opacity-30" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" /></svg>
                      <span className="text-xs font-medium">No hay logs de hardware registrados hoy en este laboratorio.</span>
                    </div>
                  </td>
                </tr>
              ) : (
                auditoriaFiltrada.map((log, idx) => {
                  const propietario = obtenerPropietario(log.uid);
                  const esExito = log.evento === 'ACCESO_CONCEDIDO';
                  const esAlarmaFisica = log.evento === 'PUERTA_ABANDONADA';
                  const esDenegado = log.evento === 'ACCESO_DENEGADO';

                  return (
                    <tr key={log.id || idx} className="hover:bg-slate-50/50 dark:hover:bg-[#1E293B]/40 transition-colors">
                      <td className="px-6 py-4 text-slate-500 dark:text-slate-400 text-xs font-mono">{log.hora}</td>
                      <td className="px-6 py-4">
                        <div className={`font-semibold ${propietario.includes('⚠️') ? 'text-rose-600 dark:text-rose-400' : 'text-slate-800 dark:text-slate-200'}`}>
                          {propietario}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono mt-0.5">UID: {log.uid}</div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-slate-600 dark:text-slate-400 text-[11px] font-bold bg-slate-100 dark:bg-[#0F172A] border border-slate-200 dark:border-slate-700 px-2 py-0.5 rounded">
                          {log.modo || 'RFID'}
                        </span>
                      </td>
                      <td className="px-6 py-4 pr-6 text-right">
                        {esExito && <span className="inline-flex px-2.5 py-1 rounded-md text-[10px] font-bold tracking-wide border text-emerald-700 bg-emerald-50 border-emerald-200 dark:text-emerald-400 dark:bg-emerald-500/10 dark:border-emerald-500/20">AUTORIZADO</span>}
                        {esDenegado && <span className="inline-flex px-2.5 py-1 rounded-md text-[10px] font-bold tracking-wide border text-rose-700 bg-rose-50 border-rose-200 dark:text-rose-400 dark:bg-rose-500/10 dark:border-rose-500/20">RECHAZADO</span>}
                        {esAlarmaFisica && <span className="inline-flex px-2.5 py-1 rounded-md text-[10px] font-bold tracking-wide border text-amber-700 bg-amber-50 border-amber-200 dark:text-amber-400 dark:bg-amber-500/10 dark:border-amber-500/20">PUERTA EXPIRADA</span>}
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
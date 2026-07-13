import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { db } from '../firebase';
import { ref, onValue, update} from 'firebase/database';

export default function Dashboard() {
  const navigate = useNavigate();
  
  // NUEVOS ESTADOS DINÁMICOS
  const [laboratoriosPermitidos, setLaboratoriosPermitidos] = useState([]);
  const [labSeleccionadoId, setLabSeleccionadoId] = useState(''); // Guarda el id_terminal exacto
  const [nombreLabVisual, setNombreLabVisual] = useState('');

  const [docentes, setDocentes] = useState([]);
  const [todasAuditorias, setTodasAuditorias] = useState([]);
  const [todasReservas, setTodasReservas] = useState([]);
  
  // Estados de Hardware
  const [pestilloAbierto, setPestilloAbierto] = useState(false);
  const [ocupacion, setOcupacion] = useState(0);
  const [hardResetStatus, setHardResetStatus] = useState(false);
  const [mostrarModalReset, setMostrarModalReset] = useState(false);
  const [ultimoPing, setUltimoPing] = useState(0);
  const [terminalOffline, setTerminalOffline] = useState(false);

  useEffect(() => {
    // 1. CARGA DINÁMICA DE SEDES Y LABORATORIOS (RBAC)
    const unsubSedes = onValue(ref(db, 'sedes'), (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const rolAdmin = localStorage.getItem('adminRol');
        const sedeAdmin = localStorage.getItem('adminSede');
        let labs = [];

        // Filtrado por permisos
        if (rolAdmin === 'SUPER_ADMIN' || sedeAdmin === 'TODAS') {
          Object.values(data).forEach(sedeObj => {
            if(sedeObj.laboratorios) {
              Object.entries(sedeObj.laboratorios).forEach(([key, val]) => {
                labs.push({ id: key, nombre: val });
              });
            }
          });
        } else if (data[sedeAdmin] && data[sedeAdmin].laboratorios) {
          Object.entries(data[sedeAdmin].laboratorios).forEach(([key, val]) => {
            labs.push({ id: key, nombre: val });
          });
        }

        setLaboratoriosPermitidos(labs);
        // Autoseleccionar el primero si no hay ninguno seleccionado
        if (labs.length > 0 && !labSeleccionadoId) {
          setLabSeleccionadoId(labs[0].id);
          setNombreLabVisual(labs[0].nombre);
        }
      }
    });

    // 2. Carga de Docentes, Auditoría y Reservas (Se mantiene igual)
    const unsubDocentes = onValue(ref(db, 'docentes'), (snapshot) => {
      setDocentes(snapshot.val() ? Object.values(snapshot.val()) : []);
    });

    const unsubAuditoria = onValue(ref(db, 'laboratorio/auditoria'), (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const logs = Object.keys(data).map(key => ({ id: key, ...data[key] }));
        logs.sort((a, b) => b.hora.localeCompare(a.hora));
        setTodasAuditorias(logs);
      } else {
        setTodasAuditorias([]);
      }
    });

    const unsubReservas = onValue(ref(db, 'reservas'), (snapshot) => {
      setTodasReservas(snapshot.val() ? Object.values(snapshot.val()) : []);
    });

    return () => { unsubSedes(); unsubDocentes(); unsubAuditoria(); unsubReservas(); };
  }, []);

  // LÓGICA DE DETECCIÓN DE CAÍDA (WATCHDOG LOCAL)
  useEffect(() => {
    const interval = setInterval(() => {
      const horaActualUnix = Math.floor(Date.now() / 1000);
      setTerminalOffline(ultimoPing !== 0 && (horaActualUnix - ultimoPing > 90));
    }, 5000);
    return () => clearInterval(interval);
  }, [ultimoPing]);

  // CONEXIÓN DIRECTA CON EL HARDWARE (Usando el id_terminal exacto)
  useEffect(() => {
    if (!labSeleccionadoId) return;

    // Ya no hacemos if/includes. Apuntamos directo a la llave exacta del hardware
    const unsubscribe = onValue(ref(db, `configuracion_laboratorios/${labSeleccionadoId}`), (snapshot) => {
      const val = snapshot.val();
      if (val) {
        setPestilloAbierto(val.estado_puerta === 'ABIERTA');
        setOcupacion(val.ocupacion || 0);
        setHardResetStatus(val.hard_reset || false);
        setUltimoPing(val.ultimo_ping || 0);
      } else {
        setPestilloAbierto(false);
        setOcupacion(0);
        setHardResetStatus(false);
        setUltimoPing(0);
      }
    });

    return () => unsubscribe();
  }, [labSeleccionadoId]);

  const ejecutarReset = () => {
    if (!labSeleccionadoId) return;
    update(ref(db, `configuracion_laboratorios/${labSeleccionadoId}`), {
      hard_reset: true
    }).then(() => setMostrarModalReset(false)).catch(console.error);
  };

  // FILTRADO ULTRA RÁPIDO (Ya no usa strings parciales, usa el ID exacto)
  const auditoriaFiltrada = todasAuditorias.filter(log => log.id_terminal === labSeleccionadoId);
  const alertasSeguridad = auditoriaFiltrada.filter(log => log.evento === 'ACCESO_DENEGADO' || log.evento === 'PUERTA_ABANDONADA').length;
  
  // Limpiador universal de emojis y caracteres especiales
  const limpiarTextoLab = (lab) => lab ? lab.replace(/[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDC00-\uDFFF]/g, '').trim() : '';

  const reservasPendientes = todasReservas.filter(res => {
    const esPendiente = res.estado && res.estado.toLowerCase() === 'pendiente';
    
    // Comparamos sin emojis ni tildes para evitar falsos negativos
    const normalizar = (str) => str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();
    const labReservaLimpio = normalizar(limpiarTextoLab(res.laboratorio));
    const labSeleccionadoLimpio = normalizar(limpiarTextoLab(nombreLabVisual));
    
    return esPendiente && (labReservaLimpio.includes(labSeleccionadoLimpio) || labSeleccionadoLimpio.includes(labReservaLimpio)); 
  }).length;


  const obtenerPropietario = (uidCard) => {
    if (!uidCard) return 'Desconocido';
    if (uidCard === 'SISTEMA') return 'Monitor de Hardware';
    if (uidCard === 'BOTON_INTERIOR') return 'Pulsador de Salida (REX)';
    
    // Buscar en la lista de docentes
    const encontrado = docentes.find(d => 
      d.uid && d.uid.replace(/\s+/g, '').toUpperCase() === uidCard.replace(/\s+/g, '').toUpperCase()
    );
    
    return encontrado ? encontrado.nombre : '⚠️ Credencial No Registrada';
  };

  return (
    <div className="space-y-6 animate-fade-in-up pb-10 relative">
    
    {/* MODAL RENDERIZADO A TRAVÉS DE UN PORTAL */}
      {mostrarModalReset && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#111827] border border-rose-500/30 rounded-2xl shadow-2xl max-w-md w-full p-6 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-rose-500"></div>
            
            <div className="flex items-center gap-4 mb-4">
              <div className="bg-rose-100 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400 p-3 rounded-full">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">Confirmar Reseteo</h3>
            </div>
            
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-6 leading-relaxed">
              <strong>Advertencia de Seguridad:</strong> Si le da a continuar, la clave maestra de acceso de este laboratorio se reseteará a su valor de fábrica. El sistema quedará <span className="text-rose-600 dark:text-rose-400 font-bold">vulnerable</span> hasta que configure una nueva clave localmente.
            </p>
            
            <div className="flex gap-3 justify-end">
              <button 
                onClick={() => setMostrarModalReset(false)}
                className="cursor-pointer px-4 py-2 rounded-lg text-sm font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 dark:text-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 transition-colors"
              >
                Cancelar (NO)
              </button>
              <button 
                onClick={ejecutarReset}
                className="cursor-pointer px-4 py-2 rounded-lg text-sm font-bold text-white bg-rose-600 hover:bg-rose-700 shadow-md shadow-rose-500/20 transition-colors"
              >
                Confirmar (SÍ)
              </button>
            </div>
          </div>
        </div>,
        document.body // <-- EL DESTINO DEL PORTAL
      )}
      
      {/* TÍTULO Y FILTRADO SUPERIOR */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b border-slate-200/50 dark:border-slate-800/80 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-3 tracking-tight">
            Panel de Control 
            <span className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 text-[10px] px-2 py-0.5 rounded-md uppercase tracking-widest font-extrabold shadow-sm">
              Modo Administrador
            </span>
            {/* INDICADOR DE CONEXIÓN EN TIEMPO REAL */}
            <span className={`flex items-center gap-1.5 text-[10px] px-2.5 py-1 rounded-full uppercase tracking-widest font-bold ml-2 ${
              terminalOffline 
              ? 'bg-rose-100 text-rose-700 border border-rose-200 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20' 
              : 'bg-emerald-100 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${terminalOffline ? 'bg-rose-600 dark:bg-rose-500' : 'bg-emerald-600 dark:bg-emerald-500 animate-pulse'}`}></span>
              {terminalOffline ? 'HW DESCONECTADO' : 'HW EN LÍNEA'}
            </span>
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-2 text-sm font-medium">Monitoreo de accesos, aforo y sincronización móvil en tiempo real.</p>
        </div>

        {/* SELECTOR DE LABORATORIO DINÁMICO */}
        <div className="flex items-center gap-2.5 bg-white dark:bg-[#111827] px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm transition-all w-full md:w-auto">
          <label className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Supervisar:</label>
          <div className="flex items-center gap-1.5 relative w-full">
            <select 
              className="bg-transparent text-slate-800 dark:text-white border-0 outline-none cursor-pointer font-bold text-xs pr-6 appearance-none focus:ring-0 w-full"
              value={labSeleccionadoId}
              onChange={(e) => {
                const id = e.target.value;
                setLabSeleccionadoId(id);
                const labObj = laboratoriosPermitidos.find(l => l.id === id);
                if (labObj) setNombreLabVisual(labObj.nombre);
              }}
            >
              {laboratoriosPermitidos.length === 0 ? (
                <option value="">Cargando accesos...</option>
              ) : (
                laboratoriosPermitidos.map(lab => (
                  <option key={lab.id} value={lab.id} className="bg-white dark:bg-[#111827] text-slate-800 dark:text-slate-200 font-semibold text-xs">
                    {lab.nombre}
                  </option>
                ))
              )}
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

        {/* Tarjeta 2: Alertas */}
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

        {/* Tarjeta 3: App Móvil */}
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

        {/* Tarjeta 4: Control de Clave (NUEVO) */}
        <div className={`relative border rounded-xl p-5 overflow-hidden flex flex-col justify-between shadow-sm transition-all duration-300 ${hardResetStatus ? 'bg-rose-50/50 dark:bg-rose-900/10 border-rose-300 dark:border-rose-500/30' : 'bg-white dark:bg-[#111827] border-slate-200 dark:border-slate-800'}`}>
          <div className="flex justify-between items-start z-10">
            <div>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Clave Admin</p>
              
              <h3 className={`text-xl font-bold tracking-tight mt-1 ${hardResetStatus ? 'text-rose-600 dark:text-rose-400 animate-pulse' : 'text-slate-800 dark:text-white'}`}>
                {hardResetStatus ? 'RESETEANDO...' : 'OPERATIVA'}
              </h3>
            </div>
            
            {/* Ícono de Casco/Seguridad */}
            <div className={`p-2.5 rounded-lg border ${hardResetStatus ? 'bg-rose-100 border-rose-200 text-rose-600 dark:bg-rose-500/20 dark:border-rose-500/30 dark:text-rose-400' : 'bg-slate-50 border-slate-100 text-slate-500 dark:bg-[#1E293B] dark:border-slate-700 dark:text-slate-400'}`}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
              </svg>
            </div>
          </div>
          
          <div className="mt-4 z-10">
             <button 
                onClick={() => setMostrarModalReset(true)}
                disabled={hardResetStatus}
                className={`w-full py-1.5 rounded-md text-xs font-bold transition-all border outline-none ${
                  hardResetStatus 
                  ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed dark:bg-slate-800 dark:text-slate-500 dark:border-slate-700' 
                  : 'bg-rose-50 text-rose-600 border-rose-200 hover:bg-rose-100 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20 dark:hover:bg-rose-500/20'
                }`}
              >
                RESETEAR DE FÁBRICA
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
            <span className="text-xs font-medium text-slate-400 dark:text-slate-500 normal-case ml-1">({labSeleccionadoId.split(' ')[1] || labSeleccionadoId})</span>
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
import React, { useState, useEffect } from 'react';
import { db, auth } from '../firebase';
import { registrarAuditoriaWeb } from '../utils/auditLogger'; //nuevo: función de auditloger.js
import { ref, onValue, set, update, get} from 'firebase/database'; 

export default function Prestamos() {
  const [pendientes, setPendientes] = useState([]);
  const [historial, setHistorial] = useState([]);
  const [docentes, setDocentes] = useState([]);
  const [seleccionada, setSeleccionada] = useState(null);
  const [respuestaAdmin, setRespuestaAdmin] = useState(''); 
  const [conflicto, setConflicto] = useState(null);
  // NUEVO: Estado para guardar los nombres de los laboratorios permitidos 
  const [labsPermitidos, setLabsPermitidos] = useState([]);


  // Limpiador de emojis para coincidencias exactas
  const limpiarTextoLab = (lab) => lab ? lab.replace(/[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDC00-\uDFFF]/g, '').trim() : '';

  useEffect(() => {
    const rolAdmin = localStorage.getItem('adminRol');
    const sedeAdmin = localStorage.getItem('adminSede');

    const unsubSedes = onValue(ref(db, 'sedes'), (snapshot) => {
      const dataSedes = snapshot.val();
      if (dataSedes) {
        let arrayLabs = [];
        if (rolAdmin === 'SUPER_ADMIN' || sedeAdmin === 'TODAS') {
          Object.values(dataSedes).forEach(sedeObj => {
            if(sedeObj.laboratorios) Object.values(sedeObj.laboratorios).forEach(v => arrayLabs.push(limpiarTextoLab(v)));
          });
        } else if (dataSedes[sedeAdmin] && dataSedes[sedeAdmin].laboratorios) {
          Object.values(dataSedes[sedeAdmin].laboratorios).forEach(v => arrayLabs.push(limpiarTextoLab(v)));
        }
        setLabsPermitidos(arrayLabs);
      }
    });

    const unsubDocentes = onValue(ref(db, 'docentes'), (snapshot) => {
      setDocentes(snapshot.val() ? Object.values(snapshot.val()) : []);
    });

    return () => { unsubSedes(); unsubDocentes(); };
  }, []);

  useEffect(() => {
    if (labsPermitidos.length === 0) return;

    const unsubReservas = onValue(ref(db, 'reservas'), (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const lista = Object.keys(data).map(key => ({ id: key, ...data[key] }));
        
        // FILTRO RBAC + CORRECCIÓN DE EMOJIS
        const listaFiltrada = lista.filter(reserva => {
          const labReservaLimpio = limpiarTextoLab(reserva.laboratorio);
          return labsPermitidos.some(labPermitido => labPermitido.includes(labReservaLimpio) || labReservaLimpio.includes(labPermitido));
        });

        setPendientes(listaFiltrada.filter(s => s.estado === 'pendiente'));
        setHistorial(listaFiltrada.filter(s => s.estado !== 'pendiente').reverse()); 
      } else {
        setPendientes([]); setHistorial([]);
      }
    });

    return () => unsubReservas();
  }, [labsPermitidos]);

  // =========================================================
  // FUNCIONES AUXILIARES
  // =========================================================
  const convertirAMinutos = (horaStr) => {
    if (!horaStr) return 0;
    const [hora, ampm] = horaStr.split(' ');
    let [h, m] = hora.split(':').map(Number);
    if (ampm === 'PM' && h !== 12) h += 12;
    if (ampm === 'AM' && h === 12) h = 0;
    return h * 60 + m;
  };

  const obtenerDiaSemana = (fechaStr) => {
    if (!fechaStr) return null;
    const partes = fechaStr.split('/');
    if (partes.length === 3) {
      const fechaObj = new Date(partes[2], partes[1] - 1, partes[0]);
      const dias = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
      return dias[fechaObj.getDay()];
    }
    return fechaStr; 
  };

  // =========================================================
  // ALGORITMO DE DETECCIÓN INSTANTÁNEA DE CRUCES DE HORARIO
  // =========================================================
  useEffect(() => {
    if (!seleccionada) {
      setConflicto(null);
      return;
    }

    const partesF = seleccionada.fecha.split('/');
    if (partesF.length === 3) {
      const fechaResReq = new Date(partesF[2], partesF[1] - 1, partesF[0]);
      const hoy = new Date();
      hoy.setHours(0, 0, 0, 0);
      
      if (fechaResReq < hoy) {
        setConflicto("Esta solicitud pertenece a una fecha pasada. No es posible otorgar accesos físicos de manera retroactiva.");
        return; // Salimos de la función y bloqueamos el botón "Aprobar" instantáneamente
      }
    }

    const nuevoInicioMin = convertirAMinutos(seleccionada.horaInicio);
    const nuevoFinMin = convertirAMinutos(seleccionada.horaFin);
    const diaSemanaSolicitado = obtenerDiaSemana(seleccionada.fecha);

    let mensajeChoque = null;

    // Convertimos el texto de la reserva móvil a identificador estándar de hardware
    let idTerminalBuscado = 'LAB_COMPUTO';
    if (seleccionada.laboratorio.includes('Electrónica')) idTerminalBuscado = 'LAB_ELECTRONICA';
    if (seleccionada.laboratorio.includes('Química')) idTerminalBuscado = 'LAB_QUIMICA';

    // REVISIÓN 1: ¿Choca con alguna CLASE REGULAR asignada en ese bloque y terminal?
    const choqueClase = docentes.some(doc => {
      if (doc.estado === 'Habilitado' && doc.horarios) {
        return doc.horarios.some(h => {
          const internalTerm = h.id_terminal || (doc.laboratorio?.includes('Electrónica') ? 'LAB_ELECTRONICA' : doc.laboratorio?.includes('Química') ? 'LAB_QUIMICA' : 'LAB_COMPUTO');
          
          if (h.dia === diaSemanaSolicitado && internalTerm === idTerminalBuscado) {
            const claseInicio = convertirAMinutos(h.inicio);
            const claseFin = convertirAMinutos(h.fin);
            return (nuevoInicioMin < claseFin && nuevoFinMin > claseInicio);
          }
          return false;
        });
      }
      return false;
    });

    if (choqueClase) {
      mensajeChoque = `Cruce de horario con una CLASE REGULAR programada para este laboratorio.`;
    } else {
      // REVISIÓN 2: ¿Choca con otra RESERVA YA APROBADA?
      const choqueReserva = historial.some(reserva => {
        if (reserva.estado === 'aprobado' && reserva.laboratorio === seleccionada.laboratorio && reserva.fecha === seleccionada.fecha) {
          const resInicio = convertirAMinutos(reserva.horaInicio);
          const resFin = convertirAMinutos(reserva.horaFin);
          return (nuevoInicioMin < resFin && nuevoFinMin > resInicio);
        }
        return false;
      });

      if (choqueReserva) {
        mensajeChoque = `Cruce de horario con OTRA RESERVA ya aprobada en este laboratorio.`;
      }
    }

    setConflicto(mensajeChoque);
  }, [seleccionada, docentes, historial]);

  // =========================================================
  // LÓGICA DE PROCESAMIENTO
  // =========================================================
  const procesar = async (aprobada) => {
    if (seleccionada) {
      if (aprobada && conflicto) {
        alert(`⚠️ No se puede aprobar: ${conflicto}`);
        return;
      }

      const nuevoEstado = aprobada ? 'aprobado' : 'denegado';
      const updates = {};
      
      // 1. Actualización en el panel web (La app móvil lee esto)
      updates[`reservas/${seleccionada.id}/estado`] = nuevoEstado;
      updates[`reservas/${seleccionada.id}/respuestaAdmin`] = respuestaAdmin || (aprobada ? 'Aprobado sin comentarios.' : 'Solicitud denegada.');

      // 2. INYECCIÓN AL HARDWARE (IoT) - Búsqueda estricta por UID de Tarjeta
      if (aprobada) {
        // Encontramos el perfil del docente para obtener su UID de tarjeta
        const docenteEncontrado = docentes.find(d => d.nombre === seleccionada.estudiante);
        const uidTarjeta = docenteEncontrado ? docenteEncontrado.uid : null;

        if (uidTarjeta) {
          // Mapeo seguro del terminal para el hardware
          const labStr = seleccionada.laboratorio.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();
          let idTerminal = 'LAB_COMPUTO';
          if (labStr.includes('ELECTRONIC')) idTerminal = 'LAB_ELECTRONICA';
          if (labStr.includes('QUIMIC')) idTerminal = 'LAB_QUIMICA';

          const bloqueExtra = {
            dia: obtenerDiaSemana(seleccionada.fecha),
            inicio: seleccionada.horaInicio,
            fin: seleccionada.horaFin,
            id_terminal: idTerminal,
            laboratorio_texto: seleccionada.laboratorio,
            id_reserva: seleccionada.id, // Marca de agua para el Recolector de Basura
            es_extraordinaria: true
          };

          // BÚSQUEDA INTELIGENTE: Recorremos el nodo IoT para encontrar la llave exacta que tiene este UID
          const snapUsuarios = await get(ref(db, 'laboratorio/usuarios'));
          if (snapUsuarios.exists()) {
            let keyUsuarioIoT = null;
            let horariosActuales = [];
            
            snapUsuarios.forEach((childSnap) => {
              const datos = childSnap.val();
              // A nivel de hardware solo nos importa que el UID coincida
              if (datos.uid === uidTarjeta) {
                keyUsuarioIoT = childSnap.key;
                horariosActuales = datos.horarios || [];
              }
            });

            if (keyUsuarioIoT) {
              // Inyectamos el horario en la ruta exacta que el ESP32 está escuchando
              horariosActuales.push(bloqueExtra);
              updates[`laboratorio/usuarios/${keyUsuarioIoT}/horarios`] = horariosActuales;
            } else {
              alert("⚠️ Se encontró al docente, pero no tiene un perfil de hardware sincronizado. La puerta no se abrirá.");
            }
          }
        } else {
          alert("⚠️ El Docente no tiene una tarjeta RFID registrada. La puerta no se abrirá automáticamente.");
        }
      }

      // Ejecutamos todos los cambios atómicamente
      await update(ref(db), updates);
      
      await registrarAuditoriaWeb(
        auth.currentUser,
        aprobada ? "APROBO_RESERVA" : "RECHAZO_RESERVA",
        `${aprobada ? 'Aprobó' : 'Rechazó'} la reserva del docente ${seleccionada.estudiante} en ${seleccionada.laboratorio}`
      );

      setSeleccionada(null);
      setRespuestaAdmin('');
    }
  };

  const cerrarModal = () => {
    setSeleccionada(null);
    setRespuestaAdmin('');
  };

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white flex items-center gap-3 transition-colors">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center border border-emerald-100 dark:border-emerald-500/20 shadow-sm">
            <svg className="w-6 h-6 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
          </div>
          Reservas Extraordinarias
        </h1>
        <p className="text-slate-500 dark:text-slate-400 mt-2 text-sm font-medium transition-colors">Gestión de permisos especiales originados desde la aplicación móvil.</p>
      </div>

      {/* BANDEJA DE ENTRADA */}
      <div className={`bg-white dark:bg-[#1E293B] rounded-2xl border transition-all duration-300 shadow-sm overflow-hidden ${pendientes.length > 0 ? 'border-blue-300 dark:border-blue-500/50 ring-1 ring-blue-500/20' : 'border-slate-200 dark:border-slate-800'}`}>
        <div className="px-6 py-5 border-b border-slate-200 dark:border-slate-800/80 bg-slate-50/50 dark:bg-[#111827]/30 flex justify-between items-center">
          <h2 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" /></svg>
            Bandeja de Entrada 
          </h2>
          {pendientes.length > 0 && (
            <div className="flex items-center gap-2 bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/30 px-3 py-1 rounded-full shadow-sm">
              <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
              <span className="text-blue-700 dark:text-blue-400 text-xs font-bold tracking-wide">{pendientes.length} solicitudes nuevas</span>
            </div>
          )}
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-[#111827]/40 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                <th className="px-6 py-4 pl-8">Solicitante</th>
                <th className="px-6 py-4">Laboratorio Requerido</th>
                <th className="px-6 py-4">Fecha y Horario</th>
                <th className="px-6 py-4 text-center">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/40 text-sm text-slate-700 dark:text-slate-300">
              {pendientes.map(sol => (
                <tr key={sol.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                  <td className="px-6 py-4 pl-8">
                    <div className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-500 shadow-sm">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                      </div>
                      {sol.estudiante}
                    </div>
                    {sol.equipos && (
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1.5 ml-10 flex items-center gap-1 font-medium bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-700/60 px-2 py-0.5 rounded w-max">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                        {sol.equipos}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <span className="bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 shadow-sm">
                      {sol.laboratorio}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-bold text-slate-800 dark:text-white text-sm">{sol.fecha}</div>
                    <div className="text-xs font-medium text-blue-600 dark:text-blue-400 mt-0.5">{sol.horaInicio} - {sol.horaFin}</div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <button 
                      onClick={() => setSeleccionada(sol)} 
                      className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-500 text-white text-xs font-bold px-5 py-2.5 rounded-xl border-0 cursor-pointer shadow-md hover:shadow-lg transition-all flex items-center gap-1.5 mx-auto tracking-wide"
                    >
                      Evaluar Solicitud <span className="text-[10px]">→</span>
                    </button>
                  </td>
                </tr>
              ))}
              {pendientes.length === 0 && (
                <tr>
                  <td colSpan="4" className="p-12 text-center">
                    <div className="flex flex-col items-center justify-center text-slate-400 dark:text-slate-500">
                      <svg className="w-10 h-10 mb-3 opacity-50" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                      <span className="font-medium text-sm">Bandeja limpia. No hay solicitudes pendientes.</span>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* HISTORIAL DE DECISIONES */}
      <div className="bg-white dark:bg-[#1E293B] rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm transition-all duration-300">
        <div className="px-6 py-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-[#111827]/30 flex justify-between items-center">
          <h2 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" /></svg>
            Historial de Decisiones
          </h2>
        </div>
        
        <div className="max-h-[350px] overflow-y-auto [&::-webkit-scrollbar]:w-[4px] [&::-webkit-scrollbar-thumb]:bg-slate-300 dark:[&::-webkit-scrollbar-thumb]:bg-slate-700 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-track]:bg-transparent">
          <table className="w-full text-left border-collapse">
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/40 text-sm text-slate-700 dark:text-slate-300">
              {historial.map(sol => (
                <tr key={sol.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/20 transition-colors">
                  <td className="px-6 py-4 pl-8 w-1/3">
                    <div className="font-bold text-slate-800 dark:text-white text-sm">{sol.estudiante}</div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium mt-1 truncate max-w-[280px]">
                      Motivo: {sol.motivo || 'Sin especificar'}
                    </div>
                  </td>
                  <td className="px-6 py-4 w-1/3">
                    <div className="font-semibold text-xs text-slate-700 dark:text-slate-300">{sol.laboratorio}</div>
                    <div className="text-[11px] font-medium text-slate-500 mt-1 flex items-center gap-1.5">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                      {sol.fecha} • {sol.horaInicio} - {sol.horaFin}
                    </div>
                  </td>
                  <td className="px-6 py-4 pr-8 text-right w-1/3">
                    <span className={`inline-flex items-center justify-center px-3 py-1.5 rounded-xl text-[10px] font-extrabold uppercase tracking-widest border shadow-sm ${
                      sol.estado === 'aprobado' 
                      ? 'text-emerald-700 bg-emerald-50 border-emerald-200 dark:text-emerald-400 dark:bg-emerald-500/10 dark:border-emerald-500/20' 
                      : 'text-rose-700 bg-rose-50 border-rose-200 dark:text-rose-400 dark:bg-rose-500/10 dark:border-rose-500/20'
                    }`}>
                      {sol.estado}
                    </span>
                  </td>
                </tr>
              ))}
              {historial.length === 0 && (
                <tr>
                  <td colSpan="3" className="p-8 text-center text-slate-400 text-sm italic font-medium">El archivo histórico está vacío.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ======================================================================
          MODAL DE REVISIÓN CON SISTEMA POKA-YOKE (PREVENCIÓN DE ERRORES)
          ====================================================================== */}
      {seleccionada && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 dark:bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#151D2A] rounded-3xl w-full max-w-2xl border border-slate-200 dark:border-slate-700 shadow-2xl flex flex-col overflow-hidden animate-fade-in-up">
            
            {/* Cabecera del Modal */}
            <div className="flex justify-between items-start p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-[#1E293B]">
              <div>
                <h2 className="text-lg font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                  <svg className="w-5 h-5 text-blue-600 dark:text-blue-500" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                  Revisión de Permiso Extraordinario
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 font-medium tracking-wide">
                  Solicitante en App: <span className="font-bold text-slate-700 dark:text-slate-200">{seleccionada.estudiante || 'Desconocido'}</span>
                </p>
              </div>
              <button onClick={cerrarModal} className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-rose-500 transition-colors cursor-pointer shadow-sm">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            {/* Cuerpo del Modal con Scroll */}
            <div className="p-6 space-y-5 overflow-y-auto max-h-[60vh] [&::-webkit-scrollbar]:w-[4px] [&::-webkit-scrollbar-thumb]:bg-slate-300 dark:[&::-webkit-scrollbar-thumb]:bg-slate-700 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-track]:bg-transparent">
              
              {/* ⚠️ ALERTA DE CRUCE DE HORARIOS EN VIVO ⚠️ */}
              {conflicto && (
                <div className="bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/30 rounded-xl p-4 flex items-start gap-3 shadow-sm animate-fade-in-up">
                  <div className="bg-rose-100 dark:bg-rose-500/20 p-2 rounded-full text-rose-600 dark:text-rose-400 shrink-0 mt-0.5">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                  </div>
                  <div>
                    <h4 className="text-xs font-extrabold text-rose-800 dark:text-rose-400 uppercase tracking-wider mb-0.5">Aprobación Bloqueada</h4>
                    <p className="text-sm font-semibold text-rose-600 dark:text-rose-300 leading-snug">{conflicto}</p>
                    <p className="text-xs text-rose-500 dark:text-rose-400/80 mt-1 font-medium">Por motivos de seguridad y aforo, debes rechazar esta solicitud o modificar el cronograma primero.</p>
                  </div>
                </div>
              )}

              <div className="text-[10px] font-extrabold text-blue-600 dark:text-blue-400 flex items-center gap-1.5 uppercase tracking-widest">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                Datos enviados desde la App
              </div>

              {/* Fichas de Información */}
              <div className="bg-slate-50 dark:bg-[#1E293B] border border-slate-200 dark:border-slate-700 rounded-xl p-4 shadow-sm">
                <label className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider block mb-1">Laboratorio Solicitado</label>
                <div className="text-slate-800 dark:text-white font-black text-base flex items-center gap-2">
                  <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                  {seleccionada.laboratorio}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-50 dark:bg-[#1E293B] border border-slate-200 dark:border-slate-700 rounded-xl p-4 shadow-sm">
                  <label className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider block mb-1">Fecha</label>
                  <div className="text-slate-800 dark:text-slate-200 font-bold text-sm flex items-center gap-2 tracking-wide">
                    <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                    {seleccionada.fecha}
                  </div>
                </div>
                <div className="bg-slate-50 dark:bg-[#1E293B] border border-slate-200 dark:border-slate-700 rounded-xl p-4 shadow-sm">
                  <label className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider block mb-1">Horario de Acceso</label>
                  <div className={`${conflicto ? 'text-rose-600 dark:text-rose-400' : 'text-orange-600 dark:text-orange-400'} font-bold text-sm flex items-center gap-2 tracking-wide`}>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    {seleccionada.horaInicio} - {seleccionada.horaFin}
                  </div>
                </div>
              </div>

              <div className="bg-slate-50 dark:bg-[#1E293B] border border-slate-200 dark:border-slate-700 rounded-xl p-4 shadow-sm">
                <label className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider block mb-2">Motivo / Proyecto Justificado</label>
                <div className="text-slate-700 dark:text-slate-300 italic text-sm font-medium border-l-2 border-slate-300 dark:border-slate-600 pl-3">
                  "{seleccionada.motivo || 'Sin motivo especificado'}"
                </div>
              </div>

              {seleccionada.equipos && (
                <div className="bg-blue-50/50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-800/40 rounded-xl p-4 shadow-sm">
                  <label className="text-[10px] text-blue-600 dark:text-blue-400 font-bold uppercase tracking-wider block mb-1">Equipos Especiales Requeridos</label>
                  <div className="text-blue-800 dark:text-blue-300 font-bold text-sm flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                    {seleccionada.equipos}
                  </div>
                </div>
              )}

              {/* Chat de Mensaje para la App */}
              <div className="mt-2 pt-5 border-t border-slate-100 dark:border-slate-800">
                <label className="text-sm text-slate-800 dark:text-white font-bold flex items-center gap-2 mb-3">
                  <svg className="w-4 h-4 text-emerald-600 dark:text-emerald-500" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                  Mensaje para el solicitante (Notificación App)
                </label>
                <textarea 
                  value={respuestaAdmin}
                  onChange={(e) => setRespuestaAdmin(e.target.value)}
                  className="w-full bg-white dark:bg-[#1E293B] border border-slate-300 dark:border-slate-700 rounded-xl p-3.5 text-sm text-slate-800 dark:text-white min-h-[90px] outline-none focus:border-emerald-500 dark:focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30 transition-all shadow-inner resize-none font-medium"
                  placeholder={conflicto ? "Escribe el motivo del rechazo (Ej. Cruce de horarios)..." : "Escribe la respuesta que le llegará a la aplicación móvil..."}
                ></textarea>
                
                <div className="flex flex-wrap items-center gap-2 mt-3 text-[11px] font-bold tracking-wide">
                  <span className="text-slate-500 uppercase mr-1">Atajos:</span>
                  {!conflicto && (
                    <button onClick={() => setRespuestaAdmin("Solicitud aprobada. Por favor dejar el laboratorio ordenado al terminar.")} className="bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20 px-3 py-1.5 rounded-lg hover:bg-emerald-100 dark:hover:bg-emerald-500/20 transition-colors cursor-pointer shadow-sm">Aprobar con recordatorio</button>
                  )}
                  <button onClick={() => setRespuestaAdmin("Solicitud denegada. Hay un cruce de horario con una clase programada.")} className="bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-500/20 px-3 py-1.5 rounded-lg hover:bg-rose-100 dark:hover:bg-rose-500/20 transition-colors cursor-pointer shadow-sm">Rechazar (Cruce de horario)</button>
                </div>
              </div>
            </div>

            {/* BARRA DE ACCIONES INFERIOR */}
            <div className="p-5 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center gap-4 bg-slate-50 dark:bg-[#1E293B]">
              <button 
                onClick={() => procesar(false)} 
                className="w-1/3 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 font-bold py-3.5 rounded-xl hover:bg-rose-50 hover:text-rose-600 hover:border-rose-300 dark:hover:bg-rose-900/30 dark:hover:text-rose-400 dark:hover:border-rose-800 transition-all cursor-pointer shadow-sm text-sm"
              >
                Denegar Solicitud
              </button>
              
              <button 
                onClick={() => procesar(true)} 
                disabled={!!conflicto}
                className={`w-2/3 font-bold py-3.5 rounded-xl transition-all flex items-center justify-center gap-2 text-sm tracking-wide border-0
                  ${conflicto 
                    ? 'bg-slate-200 dark:bg-slate-800/50 text-slate-400 dark:text-slate-600 cursor-not-allowed' 
                    : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-500/20 cursor-pointer'
                  }`}
              >
                {conflicto ? (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg>
                    Aprobación Bloqueada
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                    Aprobar y Notificar a la App
                  </>
                )}
              </button>
            </div>
            
          </div>
        </div>
      )}
    </div>
  );
}
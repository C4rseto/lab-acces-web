import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { ref, onValue } from 'firebase/database';

// Conversor inteligente de tiempo (Mantiene el parche para detectar PM automáticamente)
const convertirAMinutos = (horaStr) => {
  if (!horaStr) return 0;
  const trimmed = horaStr.trim().toUpperCase();
  const partesEspacio = trimmed.split(/\s+/);
  const horaParte = partesEspacio[0];
  const ampm = partesEspacio[1] || null;
  
  let [h, m] = horaParte.split(':').map(Number);
  if (isNaN(h)) h = 0;
  if (isNaN(m)) m = 0;
  
  if (ampm === 'PM' && h !== 12) h += 12;
  if (ampm === 'AM' && h === 12) h = 0;
  if (!ampm && h < 7) h += 12;
  
  return h * 60 + m;
};

export default function Cronograma() {
  const [docentes, setDocentes] = useState([]);
  const [solicitudes, setSolicitudes] = useState([]);
  
  const [filtroLab, setFiltroLab] = useState('Todos'); 
  const [eventoSeleccionado, setEventoSeleccionado] = useState(null); 

  const laboratoriosDisponibles = ['Todos', 'Lab. Cómputo', 'Lab. Electrónica', 'Lab. Química'];
  const diasSemana = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

  // 🎨 PALETA COMERCIAL PARA TARJETAS EN MATRIZ
  const paletaCorporativa = [
    { bg: 'bg-blue-50/80 dark:bg-blue-900/20 hover:bg-blue-100', border: 'border-l-[3px] border-l-blue-500 border border-slate-200 dark:border-slate-700', text: 'text-slate-800 dark:text-slate-100', tag: 'bg-blue-200/50 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300' },
    { bg: 'bg-emerald-50/80 dark:bg-emerald-900/20 hover:bg-emerald-100', border: 'border-l-[3px] border-l-emerald-500 border border-slate-200 dark:border-slate-700', text: 'text-slate-800 dark:text-slate-100', tag: 'bg-emerald-200/50 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300' },
    { bg: 'bg-purple-50/80 dark:bg-purple-900/20 hover:bg-purple-100', border: 'border-l-[3px] border-l-purple-500 border border-slate-200 dark:border-slate-700', text: 'text-slate-800 dark:text-slate-100', tag: 'bg-purple-200/50 text-purple-700 dark:bg-purple-500/20 dark:text-purple-300' },
    { bg: 'bg-cyan-50/80 dark:bg-cyan-900/20 hover:bg-cyan-100', border: 'border-l-[3px] border-l-cyan-500 border border-slate-200 dark:border-slate-700', text: 'text-slate-800 dark:text-slate-100', tag: 'bg-cyan-200/50 text-cyan-700 dark:bg-cyan-500/20 dark:text-cyan-300' },
  ];
  
  const estiloPrestamo = { 
    bg: 'bg-amber-50 dark:bg-amber-500/5 hover:bg-amber-100', border: 'border-l-[3px] border-l-amber-500 border border-amber-200 dark:border-amber-500/30', text: 'text-slate-900 dark:text-white', tag: 'bg-amber-500 text-slate-900 font-black border-none' 
  };

  useEffect(() => {
    onValue(ref(db, 'docentes'), snapshot => {
      const data = snapshot.val();
      setDocentes(data ? Object.values(data) : []);
    });
    onValue(ref(db, 'reservas'), snapshot => {
      const data = snapshot.val();
      setSolicitudes(data ? Object.values(data) : []);
    });
  }, []);

  const cronogramaPorDia = () => {
    const mapa = { Lunes: [], Martes: [], Miércoles: [], Jueves: [], Viernes: [], Sábado: [] };
    const nombresUnicos = Array.from(new Set(docentes.map(d => d.nombre)));

    docentes.forEach(doc => {
      if (doc.estado === 'Habilitado') {
        const colorIndex = nombresUnicos.indexOf(doc.nombre) % paletaCorporativa.length;
        const estiloAsignado = paletaCorporativa[colorIndex];

        doc.horarios?.forEach(h => {
          if (mapa[h.dia] && (filtroLab === 'Todos' || doc.laboratorio?.includes(filtroLab))) {
            mapa[h.dia].push({ 
              tipo: 'Clase Regular', titulo: doc.nombre, lab: doc.laboratorio, 
              inicio: h.inicio, fin: h.fin, correo: doc.correo || 'No especificado',
              uid: doc.uid || 'RFID Activo', estilo: estiloAsignado 
            });
          }
        });
      }
    });

    const obtenerDiaSemana = (fechaStr) => {
      if (!fechaStr) return null;
      if (diasSemana.includes(fechaStr)) return fechaStr; 
      const partes = fechaStr.split('/');
      if (partes.length === 3) {
        const fechaObj = new Date(partes[2], partes[1] - 1, partes[0]);
        const dias = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
        return dias[fechaObj.getDay()];
      }
      return null;
    };

    solicitudes.forEach(sol => {
      const diaConvertido = obtenerDiaSemana(sol.fecha);
      if (sol.estado === 'aprobado' && diaConvertido && mapa[diaConvertido] && (filtroLab === 'Todos' || sol.laboratorio?.includes(filtroLab))) {
        mapa[diaConvertido].push({ 
          tipo: 'Reserva Especial', titulo: sol.estudiante, lab: sol.laboratorio, 
          inicio: sol.horaInicio, fin: sol.horaFin, fechaExacta: sol.fecha,
          motivo: sol.motivo || 'Práctica libre / Proyecto', equipos: sol.equipos || 'Ninguno',
          estilo: estiloPrestamo 
        });
      }
    });

    return mapa;
  };

  const limpiarTextoLab = (lab) => lab ? lab.replace(/[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDC00-\uDFFF]/g, '').trim() : '';

  const datosDia = cronogramaPorDia();
  const totalClases = Object.values(datosDia).flat().filter(e => e.tipo === 'Clase Regular').length;
  const totalExtras = Object.values(datosDia).flat().filter(e => e.tipo === 'Reserva Especial').length;

  // =========================================================
  // 🧠 GENERADOR DE BLOQUES HORARIOS ÚNICOS (MATRIZ)
  // Extrae todos los rangos de horas y los ordena de arriba hacia abajo
  // =========================================================
  const obtenerBloquesDeTiempo = () => {
    const bloquesSet = new Set();
    Object.values(datosDia).flat().forEach(ev => {
      bloquesSet.add(`${ev.inicio} - ${ev.fin}`);
    });
    
    return Array.from(bloquesSet).sort((a, b) => {
      const inicioA = convertirAMinutos(a.split(' - ')[0]);
      const inicioB = convertirAMinutos(b.split(' - ')[0]);
      return inicioA - inicioB;
    });
  };

  const bloquesHorarios = obtenerBloquesDeTiempo();

  return (
    <div className="space-y-6 animate-fade-in-up pb-10">
      
      {/* HEADER CORPORATIVO */}
      <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-4 border-b border-slate-200/50 dark:border-slate-800/80 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-3 tracking-tight">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-[#1E293B] flex items-center justify-center border border-indigo-100 dark:border-slate-700 shadow-sm">
              <svg className="w-5 h-5 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
            </div>
            Matriz de Ocupación
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-2 text-sm font-medium">Vista de tabla clásica alineada por franjas horarias.</p>
        </div>

        {/* SELECTOR DE PESTAÑAS (LABORATORIOS) */}
        <div className="flex bg-slate-100 dark:bg-[#0F172A] p-1.5 rounded-xl border border-slate-200 dark:border-slate-800 w-full lg:w-auto overflow-x-auto shadow-inner">
          {laboratoriosDisponibles.map(lab => (
            <button
              key={lab}
              onClick={() => setFiltroLab(lab)}
              className={`px-5 py-2.5 text-xs font-bold rounded-lg transition-all border-0 cursor-pointer whitespace-nowrap ${
                filtroLab === lab 
                  ? 'bg-white dark:bg-[#1E293B] text-slate-800 dark:text-white shadow-sm border border-slate-200 dark:border-slate-700' 
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 bg-transparent'
              }`}
            >
              {lab.replace(/^.\s+/, '')}
            </button>
          ))}
        </div>
      </div>

      {/* DASHBOARD RESUMEN */}
      <div className="flex flex-wrap gap-4 items-center bg-white dark:bg-[#111827] p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm text-xs font-bold text-slate-600 dark:text-slate-300">
        <div className="flex items-center gap-2.5">
          <div className="bg-slate-100 dark:bg-slate-800 p-1.5 rounded-md border border-slate-200 dark:border-slate-700">
            <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          </div>
          <span>{totalClases} CLASES REGULARES</span>
        </div>
        <div className="h-5 w-px bg-slate-200 dark:bg-slate-700 hidden sm:block"></div>
        <div className="flex items-center gap-2.5">
          <div className="bg-amber-50 dark:bg-amber-500/10 p-1.5 rounded-md border border-amber-200 dark:border-amber-500/20">
            <svg className="w-4 h-4 text-amber-500" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
          </div>
          <span>{totalExtras} RESERVAS EXTRAORDINARIAS</span>
        </div>
      </div>

      {/* 🚀 TABLA DE MATRIZ DE HORARIOS (DISEÑO UNIVERSITARIO CLÁSICO) 🚀 */}
      <div className="bg-white dark:bg-[#111827] rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto [&::-webkit-scrollbar]:h-[6px] [&::-webkit-scrollbar-thumb]:bg-slate-300 dark:[&::-webkit-scrollbar-thumb]:bg-slate-700 [&::-webkit-scrollbar-track]:bg-transparent">
          
          <table className="w-full text-left border-collapse min-w-[1000px]">
            {/* CABECERA (DÍAS DE LA SEMANA) */}
            <thead className="bg-slate-50 dark:bg-[#1E293B]">
              <tr>
                <th className="p-4 border-b border-r border-slate-200 dark:border-slate-700 w-[140px] sticky left-0 bg-slate-50 dark:bg-[#1E293B] z-20 shadow-[1px_0_0_0_rgba(226,232,240,1)] dark:shadow-[1px_0_0_0_rgba(51,65,85,1)]">
                  <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    HORARIO
                  </span>
                </th>
                {diasSemana.map(dia => (
                  <th key={dia} className="p-4 border-b border-slate-200 dark:border-slate-700 text-center w-[14%]">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">{dia}</span>
                  </th>
                ))}
              </tr>
            </thead>
            
            {/* CUERPO DE LA TABLA (FILAS POR RANGO DE HORA) */}
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              
              {bloquesHorarios.length === 0 ? (
                <tr>
                  <td colSpan="7" className="p-16 text-center">
                    <div className="flex flex-col items-center justify-center opacity-60">
                      <svg className="w-10 h-10 text-slate-400 mb-3" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" /></svg>
                      <span className="text-sm text-slate-500 font-bold uppercase tracking-widest">Sin horarios programados</span>
                    </div>
                  </td>
                </tr>
              ) : (
                bloquesHorarios.map((bloque, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors group">
                    
                    {/* COLUMNA FIJA: HORA */}
                    <td className="p-3 border-r border-slate-200 dark:border-slate-700/60 align-top sticky left-0 bg-white dark:bg-[#111827] group-hover:bg-slate-50/50 dark:group-hover:bg-slate-800/30 shadow-[1px_0_0_0_rgba(226,232,240,1)] dark:shadow-[1px_0_0_0_rgba(51,65,85,0.6)] z-10 transition-colors">
                      <div className="flex flex-col gap-0.5 mt-1">
                        <span className="text-xs font-black text-slate-800 dark:text-slate-200 font-mono tracking-tight">{bloque.split(' - ')[0]}</span>
                        <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 font-mono tracking-tight">{bloque.split(' - ')[1]}</span>
                      </div>
                    </td>

                    {/* COLUMNAS DE DÍAS */}
                    {diasSemana.map(dia => {
                      // Filtramos los eventos que caen EXACTAMENTE en este bloque de horario y en este día
                      const eventosEnCelda = datosDia[dia]?.filter(e => `${e.inicio} - ${e.fin}` === bloque) || [];

                      return (
                        <td key={dia} className="p-2.5 border-r border-slate-100 dark:border-slate-800/40 align-top last:border-r-0">
                          {eventosEnCelda.length > 0 ? (
                            <div className="flex flex-col gap-2.5">
                              {eventosEnCelda.map((ev, i) => (
                                <div 
                                  key={i} 
                                  onClick={() => setEventoSeleccionado({ ...ev, diaSemana: dia })}
                                  className={`cursor-pointer rounded-lg p-3 transition-transform hover:-translate-y-0.5 shadow-sm border ${ev.estilo.bg} ${ev.estilo.border}`}
                                >
                                  <div className="flex justify-between items-start mb-1.5">
                                    <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded tracking-widest ${ev.estilo.tag}`}>
                                      {ev.tipo === 'Clase Regular' ? 'CLASE' : 'EXTRA'}
                                    </span>
                                  </div>
                                  <h4 className={`text-xs font-bold leading-snug break-words mb-2 ${ev.estilo.text}`}>
                                    {ev.titulo}
                                  </h4>
                                  <div className="flex items-center gap-1 mt-auto pt-2 border-t border-slate-200/50 dark:border-slate-700/50">
                                    <svg className="w-3 h-3 text-slate-400" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" /></svg>
                                    <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 truncate">
                                      {limpiarTextoLab(ev.lab)}
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            // CELDA VACÍA SUTIL
                            <div className="w-full h-full min-h-[60px] flex items-center justify-center">
                              <span className="w-1.5 h-1.5 rounded-full bg-slate-200 dark:bg-slate-800"></span>
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* =========================================================
          MODAL DE CONTROL DE PERMISOS DETALLADOS (INTACTO)
         ========================================================= */}
      {eventoSeleccionado && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-xl max-w-sm w-full shadow-2xl overflow-hidden flex flex-col">
            
            <div className={`p-5 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50 dark:bg-[#1E293B] border-l-4 ${eventoSeleccionado.estilo.border}`}>
              <div className="flex justify-between items-start mb-3">
                <span className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded tracking-widest ${eventoSeleccionado.tipo === 'Clase Regular' ? 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200' : 'bg-amber-500 text-white'}`}>
                  {eventoSeleccionado.tipo}
                </span>
                <button onClick={() => setEventoSeleccionado(null)} className="p-1 rounded-full bg-slate-200 dark:bg-slate-800 hover:bg-rose-100 hover:text-rose-500 dark:hover:bg-rose-500/20 transition-colors border-0 cursor-pointer text-slate-500 dark:text-slate-400">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">{eventoSeleccionado.titulo}</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-mono">{eventoSeleccionado.diaSemana} • {eventoSeleccionado.inicio} - {eventoSeleccionado.fin}</p>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <div>
                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest block mb-1">Zona Autorizada</span>
                <div className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" /></svg>
                  {limpiarTextoLab(eventoSeleccionado.lab)}
                </div>
              </div>

              {eventoSeleccionado.tipo === 'Clase Regular' ? (
                <>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest block mb-1">Contacto</span>
                    <div className="font-medium text-slate-700 dark:text-slate-300 font-mono break-all">{eventoSeleccionado.correo}</div>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest block mb-1">Token RFID</span>
                    <div className="mt-1 bg-slate-50 dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 px-2.5 py-1.5 rounded text-slate-600 dark:text-slate-400 font-mono font-bold tracking-wider inline-block">UID: {eventoSeleccionado.uid}</div>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest block mb-1">Justificación</span>
                    <div className="bg-amber-50 dark:bg-amber-500/10 p-3 rounded border border-amber-200 dark:border-amber-500/20 italic text-amber-800 dark:text-amber-400 font-medium">"{eventoSeleccionado.motivo}"</div>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest block mb-1">Equipamiento</span>
                    <div className="font-semibold text-slate-700 dark:text-slate-300">{eventoSeleccionado.equipos}</div>
                  </div>
                </>
              )}
              <button onClick={() => setEventoSeleccionado(null)} className="w-full mt-4 bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-white py-2.5 rounded font-bold text-xs transition-colors cursor-pointer border-0 shadow-sm">Entendido</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
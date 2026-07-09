import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { ref, onValue } from 'firebase/database';

// Conversor inteligente de tiempo
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
          const internalTerm = h.id_terminal || (doc.laboratorio?.includes('Electrónica') ? 'LAB_ELECTRONICA' : doc.laboratorio?.includes('Química') ? 'LAB_QUIMICA' : 'LAB_COMPUTO');
          const txtLab = h.laboratorio_texto || doc.laboratorio || 'General';

          if (mapa[h.dia]) {
            if (filtroLab === 'Todos' || internalTerm === (filtroLab === 'Lab. Cómputo' ? 'LAB_COMPUTO' : filtroLab === 'Lab. Electrónica' ? 'LAB_ELECTRONICA' : 'LAB_QUIMICA')) {
              mapa[h.dia].push({ 
                tipo: 'Clase Regular', titulo: doc.nombre, lab: txtLab, 
                inicio: h.inicio, fin: h.fin, correo: doc.correo || 'No especificado',
                uid: doc.uid || 'RFID Activo', estilo: estiloAsignado 
              });
            }
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

  // Configuración de la cuadrícula de horas (7 AM a 10 PM)
  const horasBase = Array.from({ length: 16 }, (_, i) => i + 7); 
  const pixelPorMinuto = 1; // 60px por hora

  return (
    <div className="space-y-6 animate-fade-in-up pb-10">
      
      {/* HEADER CORPORATIVO */}
      <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-4 border-b border-slate-200/50 dark:border-slate-800/80 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-3 tracking-tight">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-[#1E293B] flex items-center justify-center border border-indigo-100 dark:border-slate-700 shadow-sm">
              <svg className="w-5 h-5 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
            </div>
            Cronograma del Laboratorio
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-2 text-sm font-medium">Vista de calendario dinámico con asignaciones en tiempo real.</p>
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

      {/* 🚀 CALENDARIO ESTILO GOOGLE CALENDAR 🚀 */}
      <div className="bg-white dark:bg-[#111827] rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex overflow-hidden">
        
        {/* Columna de Horas Fija */}
        <div className="w-[70px] flex-shrink-0 border-r border-slate-200 dark:border-slate-700/60 bg-slate-50 dark:bg-[#1E293B] pt-[50px]">
          {horasCalendario.map((hora, i) => (
            <div key={i} className="h-[60px] relative">
              <span className="absolute -top-2.5 right-3 text-[10px] font-bold text-slate-400 dark:text-slate-500 font-mono tracking-tight">
                {hora}
              </span>
            </div>
          ))}
        </div>

        {/* Contenedor scrolleable de Días */}
        <div className="flex-1 overflow-x-auto [&::-webkit-scrollbar]:h-[6px] [&::-webkit-scrollbar-thumb]:bg-slate-300 dark:[&::-webkit-scrollbar-thumb]:bg-slate-700 [&::-webkit-scrollbar-track]:bg-transparent">
          <div className="min-w-[800px] flex relative pt-[50px] pb-5">
            
            {/* Cabecera de Días Flotante */}
            <div className="absolute top-0 left-0 right-0 h-[50px] flex border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-[#111827] z-20">
              {diasSemana.map(dia => (
                <div key={dia} className="flex-1 flex items-center justify-center border-r border-slate-100 dark:border-slate-800/40 last:border-0">
                  <span className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-widest">{dia}</span>
                </div>
              ))}
            </div>

            {/* Rejilla de Fondo */}
            <div className="absolute inset-0 top-[50px] pointer-events-none flex flex-col">
              {listaHorasUI.map((_, i) => (
                <div key={i} className="h-[60px] border-b border-slate-100 dark:border-slate-800/40 w-full"></div>
              ))}
            </div>

            {/* Columnas Dinámicas de Eventos */}
            {diasSemana.map((dia) => (
              <div key={dia} className="flex-1 relative border-r border-slate-100 dark:border-slate-800/40 min-h-[900px] last:border-0">
                {datosDia[dia]?.map((ev, idx) => {
                  const inicioMinutos = convertirAMinutos(ev.inicio);
                  const finMinutos = convertirAMinutos(ev.fin);
                  const offsetBase = 7 * 60; // Arrancamos a las 7 AM
                  
                  const top = (inicioMinutos - offsetBase) * pixelPorMinuto;
                  const height = (finMinutos - inicioMinutos) * pixelPorMinuto;

                  // Evitamos renderizar si está fuera del rango
                  if (height <= 0 || top < 0) return null;

                  return (
                    <div
                      key={idx}
                      onClick={() => setEventoSeleccionado({ ...ev, diaSemana: dia })}
                      className={`absolute left-1 right-1 rounded p-1.5 cursor-pointer shadow-sm overflow-hidden transition-all hover:z-30 hover:scale-[1.02] opacity-95 flex flex-col justify-start border ${ev.estilo.bg} ${ev.estilo.border}`}
                      style={{ top: `${top}px`, height: `${height}px`, zIndex: 10 + idx }}
                    >
                      <span className="text-[9px] font-bold opacity-80 leading-none truncate mb-0.5">
                        {ev.inicio} - {ev.fin}
                      </span>
                      <h4 className={`text-[10px] font-bold leading-tight ${height < 45 ? 'truncate' : ''} ${ev.estilo.text}`}>
                        {ev.titulo}
                      </h4>
                      {height >= 50 && (
                        <span className="text-[8px] font-semibold text-slate-500 dark:text-slate-400 truncate mt-auto">
                          {limpiarTextoLab(ev.lab)}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
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
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-mono">
                {eventoSeleccionado.fechaExacta ? `${eventoSeleccionado.fechaExacta} • ` : ''}{eventoSeleccionado.diaSemana} • {eventoSeleccionado.inicio} - {eventoSeleccionado.fin}
              </p>
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

// Constantes fuera del componente para uso del render
const horasCalendario = [
  '7 AM', '8 AM', '9 AM', '10 AM', '11 AM', '12 PM', 
  '1 PM', '2 PM', '3 PM', '4 PM', '5 PM', '6 PM', '7 PM', '8 PM', '9 PM'
];
const listaHorasUI = Array.from({ length: 15 });
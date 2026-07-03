import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { ref, onValue } from 'firebase/database';

export default function Cronograma() {
  const [docentes, setDocentes] = useState([]);
  const [solicitudes, setSolicitudes] = useState([]);
  
  const [filtroLab, setFiltroLab] = useState('Todos'); 
  const [eventoSeleccionado, setEventoSeleccionado] = useState(null); 

  const laboratoriosDisponibles = ['Todos', 'Lab. Cómputo', 'Lab. Electrónica', 'Lab. Química'];
  const diasSemana = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

  // 🎨 PALETA GOOGLE CALENDAR / TIME BLOCKING (Colores Sólidos Mates, Cero Neón)
  const paletaCorporativa = [
    { bg: 'bg-[#2A4365] hover:bg-[#314E75]', border: 'border-l-[4px] border-l-[#63B3ED]', text: 'text-white', subtext: 'text-blue-100' }, // Azul Mate
    { bg: 'bg-[#22543D] hover:bg-[#276749]', border: 'border-l-[4px] border-l-[#68D391]', text: 'text-white', subtext: 'text-emerald-100' }, // Verde Mate
    { bg: 'bg-[#44337A] hover:bg-[#553C9A]', border: 'border-l-[4px] border-l-[#B794F4]', text: 'text-white', subtext: 'text-purple-100' }, // Púrpura Mate
    { bg: 'bg-[#742A2A] hover:bg-[#823030]', border: 'border-l-[4px] border-l-[#FC8181]', text: 'text-white', subtext: 'text-red-100' },   // Rojo/Granate Mate
    { bg: 'bg-[#234E52] hover:bg-[#2C6266]', border: 'border-l-[4px] border-l-[#4FD1C5]', text: 'text-white', subtext: 'text-teal-100' }, // Verde Azulado
    { bg: 'bg-[#5F370E] hover:bg-[#704212]', border: 'border-l-[4px] border-l-[#F6AD55]', text: 'text-white', subtext: 'text-orange-100' }, // Naranja Mate
  ];
  
  // Acento exclusivo para Reservas Extraordinarias (Ámbar Mate)
  const estiloPrestamo = { 
    bg: 'bg-[#744210] hover:bg-[#8A4F13]', border: 'border-l-[4px] border-l-[#FBD38D]', text: 'text-white', subtext: 'text-yellow-100' 
  };

  // =========================================================
  // TU LÓGICA DE FIREBASE Y ALGORITMOS 100% INTACTOS
  // =========================================================
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
              tipo: 'Clase Regular', 
              titulo: doc.nombre, 
              lab: doc.laboratorio, 
              inicio: h.inicio, 
              fin: h.fin,
              correo: doc.correo || 'No especificado',
              uid: doc.uid || 'RFID Activo',
              estilo: estiloAsignado 
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
          tipo: 'Reserva Especial', 
          titulo: sol.estudiante, 
          lab: sol.laboratorio, 
          inicio: sol.horaInicio, 
          fin: sol.horaFin,
          fechaExacta: sol.fecha,
          motivo: sol.motivo || 'Práctica libre / Proyecto',
          equipos: sol.equipos || 'Ninguno',
          estilo: estiloPrestamo 
        });
      }
    });

    const convertirAMinutos = (horaStr) => {
      if (!horaStr) return 0;
      const [hora, ampm] = horaStr.split(' ');
      let [h, m] = hora.split(':').map(Number);
      if (ampm === 'PM' && h !== 12) h += 12;
      if (ampm === 'AM' && h === 12) h = 0;
      return h * 60 + m;
    };

    Object.keys(mapa).forEach(dia => {
      mapa[dia].sort((a, b) => convertirAMinutos(a.inicio) - convertirAMinutos(b.inicio));
    });

    return mapa;
  };

  const limpiarTextoLab = (lab) => {
    if (!lab) return '';
    return lab.replace(/[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDC00-\uDFFF]/g, '').trim();
  };

  const datosDia = cronogramaPorDia();
  // =========================================================

  return (
    <div className="space-y-6 animate-fade-in-up">
      
      {/* HEADER DE CONTROL */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 border-b border-slate-200/50 dark:border-slate-800/80 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-3 tracking-tight">
            <svg className="w-6 h-6 text-slate-500 dark:text-slate-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
            Cronograma de Ocupación
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1.5 text-sm font-medium">Planificación semanal de clases y reservas de infraestructura.</p>
        </div>

        <div className="flex bg-slate-100 dark:bg-[#0F172A] p-1 rounded-xl border border-slate-200 dark:border-slate-800 w-full lg:w-auto shrink-0">
          {laboratoriosDisponibles.map(lab => (
            <button
              key={lab}
              onClick={() => setFiltroLab(lab)}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition-all whitespace-nowrap border-0 cursor-pointer ${
                filtroLab === lab 
                ? 'bg-white dark:bg-[#1E293B] text-slate-900 dark:text-white shadow-sm ring-1 ring-slate-200 dark:ring-slate-700' 
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 bg-transparent'
              }`}
            >
              {lab}
            </button>
          ))}
        </div>
      </div>
      
      {/* REJILLA DE COLUMNAS ESTILO TIME-BLOCKING (Sólido y Claro) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {diasSemana.map(dia => (
          <div key={dia} className="bg-slate-50 dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800/80 p-2.5 rounded-2xl flex flex-col gap-3 min-h-[600px] shadow-inner">
            
            {/* CABECERA DEL DÍA */}
            <h3 className="text-[11px] font-extrabold text-slate-500 dark:text-slate-400 uppercase text-center pb-2.5 pt-1.5 tracking-widest border-b border-slate-200 dark:border-slate-800/80">
              {dia}
            </h3>
            
            {/* Contenedor de Bloques Horarios */}
            <div className="flex flex-col gap-2 overflow-y-auto pr-0.5 pb-2 [&::-webkit-scrollbar]:w-[3px] [&::-webkit-scrollbar-thumb]:bg-slate-300 dark:[&::-webkit-scrollbar-thumb]:bg-slate-700 [&::-webkit-scrollbar-track]:bg-transparent">
              
              {datosDia[dia]?.map((ev, i) => (
                <div 
                  key={i} 
                  onClick={() => setEventoSeleccionado({ ...ev, diaSemana: dia })}
                  // Aquí aplicamos el color sólido y el borde grueso tipo Google Calendar
                  className={`p-3 rounded-lg cursor-pointer transition-all shadow-sm flex flex-col gap-1 ${ev.estilo.bg} ${ev.estilo.border}`}
                >
                  <div className="flex justify-between items-start mb-0.5">
                    {/* HORA */}
                    <div className={`font-mono text-[10px] font-bold tracking-wide ${ev.estilo.subtext}`}>
                      {ev.inicio} - {ev.fin}
                    </div>
                    {/* ETIQUETA CLARA INTEGRADA */}
                    <div className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-black/20 text-white/90 tracking-wider">
                      {ev.tipo === 'Clase Regular' ? 'CLASE' : 'RESERVA'}
                    </div>
                  </div>
                  
                  {/* TÍTULO BLANCO PURO */}
                  <div className={`text-sm font-bold leading-tight ${ev.estilo.text}`}>
                    {ev.titulo}
                  </div>
                  
                  {/* LABORATORIO */}
                  <div className={`text-[10px] font-semibold mt-1 flex items-center gap-1 uppercase tracking-wider ${ev.estilo.subtext}`}>
                    <svg className="w-3.5 h-3.5 opacity-80" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path><path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                    {limpiarTextoLab(ev.lab)}
                  </div>
                </div>
              ))}
              
              {/* Bloque de Día Libre */}
              {datosDia[dia]?.length === 0 && (
                <div className="flex flex-col items-center justify-center h-28 opacity-50 mt-2 border border-dashed border-slate-300 dark:border-slate-700 rounded-lg">
                  <span className="text-center text-slate-400 dark:text-slate-500 text-[10px] font-bold uppercase tracking-widest">Sin Actividad</span>
                </div>
              )}

            </div>
          </div>
        ))}
      </div>

      {/* =========================================================
          POPOVER DE DETALLES 
         ========================================================= */}
      {eventoSeleccionado && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 dark:bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-700 rounded-2xl max-w-sm w-full p-6 shadow-2xl animate-fade-in-up flex flex-col relative overflow-hidden">
            
            {/* Cinta superior del color del bloque para mantener contexto */}
            <div className={`absolute top-0 left-0 w-full h-2 ${eventoSeleccionado.estilo.bg} border-t-0 border-r-0 border-b-0 ${eventoSeleccionado.estilo.border}`}></div>

            <div className="flex justify-between items-start mb-4 mt-2">
              <span className="text-[10px] font-bold uppercase px-2.5 py-1 rounded-md tracking-widest bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                {eventoSeleccionado.tipo}
              </span>
              <button 
                onClick={() => setEventoSeleccionado(null)} 
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 bg-transparent border-0 cursor-pointer p-1 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <h3 className="text-2xl font-black text-slate-900 dark:text-white leading-snug mb-1">{eventoSeleccionado.titulo}</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 font-bold mb-5 flex items-center gap-1.5">
              <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              {eventoSeleccionado.diaSemana}, {eventoSeleccionado.inicio} - {eventoSeleccionado.fin}
            </p>

            <div className="space-y-5 text-sm text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-[#0F172A] p-5 rounded-xl border border-slate-100 dark:border-slate-800">
              <div className="flex items-start gap-3">
                <svg className="w-5 h-5 text-slate-400 mt-0.5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"/></svg>
                <div>
                  <div className="text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Laboratorio Asignado</div>
                  <div className="font-bold text-slate-900 dark:text-white text-base mt-0.5">{limpiarTextoLab(eventoSeleccionado.lab)}</div>
                </div>
              </div>

              {eventoSeleccionado.tipo === 'Clase Regular' && (
                <>
                  <div className="flex items-start gap-3">
                    <svg className="w-5 h-5 text-slate-400 mt-0.5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>
                    <div>
                      <div className="text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Contacto Institucional</div>
                      <div className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5">{eventoSeleccionado.correo}</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <svg className="w-5 h-5 text-slate-400 mt-0.5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 7a2 2 0 012 2m4 0a6 6 0 11-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"/></svg>
                    <div>
                      <div className="text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Acceso Físico (Hardware)</div>
                      <div className="font-mono text-xs font-bold mt-1 text-slate-800 dark:text-slate-200 bg-white dark:bg-[#1E293B] px-2.5 py-1 rounded-md border border-slate-200 dark:border-slate-700 w-max shadow-sm">
                        UID: {eventoSeleccionado.uid}
                      </div>
                    </div>
                  </div>
                </>
              )}

              {eventoSeleccionado.tipo === 'Reserva Especial' && (
                <>
                  <div className="flex items-start gap-3">
                    <svg className="w-5 h-5 text-slate-400 mt-0.5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
                    <div>
                      <div className="text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Fecha de Firebase</div>
                      <div className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5">{eventoSeleccionado.fechaExacta}</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <svg className="w-5 h-5 text-slate-400 mt-0.5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
                    <div>
                      <div className="text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Motivo / Equipos</div>
                      <div className="italic text-slate-700 dark:text-slate-300 font-medium mt-0.5">"{eventoSeleccionado.motivo}"</div>
                      {eventoSeleccionado.equipos !== 'Ninguno' && (
                        <div className="mt-2 font-bold text-xs bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2.5 py-1 rounded-md w-max">
                          Eq: {eventoSeleccionado.equipos}
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>

            <button 
              onClick={() => setEventoSeleccionado(null)} 
              className="w-full mt-4 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 py-3 rounded-xl border-0 cursor-pointer font-bold text-sm shadow-sm transition-colors tracking-wide"
            >
              Cerrar Detalle
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
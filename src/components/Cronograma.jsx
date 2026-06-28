import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { ref, onValue } from 'firebase/database';

export default function Cronograma() {
  const [docentes, setDocentes] = useState([]);
  const [solicitudes, setSolicitudes] = useState([]);
  const diasSemana = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

  // 🎨 PALETA DE COLORES PROFESIONALES
  const paletaColores = [
    { bg: 'bg-blue-900/20', border: 'border-blue-500/30', text: 'text-blue-400' },
    { bg: 'bg-emerald-900/20', border: 'border-emerald-500/30', text: 'text-emerald-400' },
    { bg: 'bg-purple-900/20', border: 'border-purple-500/30', text: 'text-purple-400' },
    { bg: 'bg-rose-900/20', border: 'border-rose-500/30', text: 'text-rose-400' },
    { bg: 'bg-cyan-900/20', border: 'border-cyan-500/30', text: 'text-cyan-400' },
    { bg: 'bg-indigo-900/20', border: 'border-indigo-500/30', text: 'text-indigo-400' },
  ];
  
  // Color exclusivo para Préstamos de alumnos
  const colorPrestamo = { bg: 'bg-amber-900/20', border: 'border-amber-500/30', text: 'text-amber-400' };

  useEffect(() => {
    onValue(ref(db, 'docentes'), snapshot => {
      const data = snapshot.val();
      setDocentes(data ? Object.values(data) : []);
    });
    
    // 🔴 CAMBIO 1: Buscamos en la carpeta 'reservas'
    onValue(ref(db, 'reservas'), snapshot => {
      const data = snapshot.val();
      setSolicitudes(data ? Object.values(data) : []);
    });
  }, []);

  const cronogramaPorDia = () => {
    const mapa = { Lunes: [], Martes: [], Miércoles: [], Jueves: [], Viernes: [], Sábado: [] };
    
    // Obtenemos los nombres únicos para asignarles un color fijo a cada uno
    const nombresUnicos = Array.from(new Set(docentes.map(d => d.nombre)));

    docentes.forEach(doc => {
      if (doc.estado === 'Habilitado') {
        // Le asignamos un color de la paleta basado en su nombre
        const colorIndex = nombresUnicos.indexOf(doc.nombre) % paletaColores.length;
        const colorAsignado = paletaColores[colorIndex];

        doc.horarios?.forEach(h => {
          if (mapa[h.dia]) {
            mapa[h.dia].push({ 
              tipo: 'clase', 
              titulo: doc.nombre, 
              lab: doc.laboratorio, 
              inicio: h.inicio, 
              fin: h.fin,
              color: colorAsignado // Pasamos el color al evento
            });
          }
        });
      }
    });

    // 🔴 NUEVA FUNCIÓN: Convierte "28/06/2026" a su día de la semana
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

      // 🔴 CAMBIO 2 y 3: Estado en minúscula y uso de horaInicio / horaFin
      if (sol.estado === 'aprobado' && diaConvertido && mapa[diaConvertido]) {
        mapa[diaConvertido].push({ 
          tipo: 'prestamo', 
          titulo: `Reserva: ${sol.estudiante}`, 
          lab: sol.laboratorio, 
          inicio: sol.horaInicio, 
          fin: sol.horaFin,
          color: colorPrestamo // Color naranja para los alumnos
        });
      }
    });

    // ⏱️ ALGORITMO PARA ORDENAR CRONOLÓGICAMENTE (De AM a PM)
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

  const datosDia = cronogramaPorDia();

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-white flex items-center gap-2">
        <svg className="w-6 h-6 text-indigo-400" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd"></path></svg>
        Cronograma de Ocupación Semanal
      </h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
        {diasSemana.map(dia => (
          <div key={dia} className="bg-[#0B1320] border border-slate-800/80 p-3 rounded-2xl flex flex-col gap-3 min-h-[500px] shadow-lg">
            <h3 className="text-[11px] font-black text-slate-400 uppercase text-center border-b border-slate-800/80 pb-2 bg-[#121B2A] rounded-lg py-2 tracking-widest">
              {dia}
            </h3>
            
            <div className="flex flex-col gap-2.5 overflow-y-auto">
              {datosDia[dia]?.map((ev, i) => (
                <div key={i} className={`p-3 rounded-xl border ${ev.color.bg} ${ev.color.border} flex flex-col justify-between transition-transform hover:-translate-y-1 duration-200 cursor-default`}>
                  <div>
                    <div className={`font-black text-[10px] tracking-wide bg-[#0B1320]/50 w-max px-2 py-0.5 rounded border border-slate-800/50 mb-1.5 ${ev.color.text}`}>
                      {ev.inicio} - {ev.fin}
                    </div>
                    <div className="text-white font-bold text-xs">{ev.titulo}</div>
                    <div className="text-[9px] font-semibold text-slate-400 mt-1 flex items-center gap-1 uppercase tracking-wider">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                      {ev.lab}
                    </div>
                  </div>
                </div>
              ))}
              
              {datosDia[dia]?.length === 0 && (
                <div className="flex flex-col items-center justify-center h-32 opacity-30 mt-4">
                  <svg className="w-8 h-8 text-slate-500 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M20 12H4"></path></svg>
                  <span className="text-center text-slate-400 text-xs font-semibold uppercase tracking-widest">Día Libre</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
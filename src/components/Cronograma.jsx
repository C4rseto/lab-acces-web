import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { ref, onValue } from 'firebase/database';

export default function Cronograma() {
  const [docentes, setDocentes] = useState([]);
  const [solicitudes, setSolicitudes] = useState([]);
  const diasSemana = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

  useEffect(() => {
    onValue(ref(db, 'docentes'), snapshot => {
      const data = snapshot.val();
      setDocentes(data ? Object.values(data) : []);
    });
    onValue(ref(db, 'solicitudes'), snapshot => {
      const data = snapshot.val();
      setSolicitudes(data ? Object.values(data) : []);
    });
  }, []);

  const cronogramaPorDia = () => {
    const mapa = { Lunes: [], Martes: [], Miércoles: [], Jueves: [], Viernes: [], Sábado: [] };
    
    docentes.forEach(doc => {
      if (doc.estado === 'Habilitado') {
        doc.horarios?.forEach(h => {
          if (mapa[h.dia]) mapa[h.dia].push({ tipo: 'clase', titulo: doc.nombre, lab: doc.laboratorio, inicio: h.inicio, fin: h.fin });
        });
      }
    });

    solicitudes.forEach(sol => {
      if (sol.estado === 'APROBADA' && mapa[sol.fecha]) {
        const [inicio, fin] = sol.horario.split(' - ');
        mapa[sol.fecha].push({ tipo: 'prestamo', titulo: sol.estudiante, lab: sol.laboratorio, inicio, fin });
      }
    });

    return mapa;
  };

  const datosDia = cronogramaPorDia();

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-white">📅 Cronograma de Ocupación Semanal</h1>
      <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
        {diasSemana.map(dia => (
          <div key={dia} className="bg-[#121B2A] border border-slate-800 p-3 rounded-xl flex flex-col gap-3 min-h-[400px]">
            <h3 className="text-xs font-black text-slate-300 uppercase text-center border-b border-slate-800 pb-2 bg-[#0f172a] rounded py-2">{dia}</h3>
            <div className="flex flex-col gap-2">
              {datosDia[dia]?.map((ev, i) => (
                <div key={i} className={`p-3 rounded-lg border text-left flex flex-col justify-between ${ev.tipo === 'clase' ? 'bg-blue-900/20 border-blue-500/30' : 'bg-amber-900/20 border-orange-500/30'}`}>
                  <div>
                    <div className={`font-bold text-xs ${ev.tipo === 'clase' ? 'text-blue-300' : 'text-orange-400'}`}>{ev.inicio} - {ev.fin}</div>
                    <div className="text-white font-semibold mt-1 text-xs">{ev.titulo}</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">📍 {ev.lab}</div>
                  </div>
                </div>
              ))}
              {datosDia[dia]?.length === 0 && <div className="text-center text-slate-600 text-xs italic mt-4">Libre</div>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
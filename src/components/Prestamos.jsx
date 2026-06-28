import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { ref, onValue, set } from 'firebase/database';

export default function Prestamos() {
  const [solicitudes, setSolicitudes] = useState([]);
  const [seleccionada, setSeleccionada] = useState(null);

  useEffect(() => {
    onValue(ref(db, 'solicitudes'), (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const lista = Object.keys(data).map(key => ({ id: key, ...data[key] }));
        setSolicitudes(lista.filter(s => s.estado === 'PENDIENTE'));
      } else {
        setSolicitudes([]);
      }
    });
  }, []);

  const procesar = async (aprobada) => {
    if (seleccionada) {
      const nuevoEstado = aprobada ? 'APROBADA' : 'DENEGADA';
      await set(ref(db, `solicitudes/${seleccionada.id}/estado`), nuevoEstado);
      setSeleccionada(null);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">Gestión de Préstamos Especiales</h1>
      <div className="bg-[#121B2A] rounded-2xl border border-slate-800 overflow-hidden shadow-2xl">
        <table className="w-full text-left border-collapse">
          <thead><tr className="bg-[#0f172a] text-[11px] text-slate-500 uppercase border-b border-slate-800"><th className="p-5">Estudiante</th><th className="p-5">Laboratorio</th><th className="p-5">Fecha y Horario</th><th className="p-5 text-center">Acción</th></tr></thead>
          <tbody className="divide-y divide-slate-800/30 text-xs">
            {solicitudes.map(sol => (
              <tr key={sol.id} className="hover:bg-slate-800/10">
                <td className="p-5">
                  <div className="font-bold text-white text-sm">{sol.estudiante}</div>
                  <div className="text-slate-400 mt-0.5">{sol.rol}</div>
                </td>
                <td className="p-5 text-[#0BB885] font-semibold">{sol.laboratorio}</td>
                <td className="p-5 text-orange-400 font-bold">{sol.fecha} <br/><span className="text-slate-400 font-normal">{sol.horario}</span></td>
                <td className="p-5 text-center"><button onClick={() => setSeleccionada(sol)} className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold px-4 py-2 rounded-lg border-0 cursor-pointer">👁️ Evaluar</button></td>
              </tr>
            ))}
            {solicitudes.length === 0 && (
              <tr><td colSpan="4" className="p-10 text-center text-slate-500 italic">No hay solicitudes móviles pendientes.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {seleccionada && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-[#0f172a] border border-slate-700 rounded-xl p-6 max-w-xl w-full flex flex-col gap-4">
            <h3 className="text-white font-bold text-lg">📄 Revisión de Solicitud de Acceso</h3>
            <div className="border border-slate-700 rounded-lg p-4 bg-[#121b2a] flex flex-col gap-2">
              <div className="text-slate-400 font-bold text-sm">🏫 {seleccionada.laboratorio}</div>
              <div className="text-white">📅 Día: {seleccionada.fecha} • Horario: {seleccionada.horario}</div>
              <div className="text-slate-300 italic mt-2">" {seleccionada.motivo} "</div>
            </div>
            <div className="flex gap-4 mt-2">
              <button onClick={() => procesar(false)} className="flex-1 bg-transparent border border-slate-600 text-slate-300 font-bold py-3 rounded-xl cursor-pointer">Denegar</button>
              <button onClick={() => procesar(true)} className="flex-1 bg-[#0BB885] text-white font-bold py-3 rounded-xl border-0 cursor-pointer">✔️ Aprobar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { ref, onValue, set } from 'firebase/database';

export default function Prestamos() {
  const [pendientes, setPendientes] = useState([]);
  const [historial, setHistorial] = useState([]);
  const [seleccionada, setSeleccionada] = useState(null);

  useEffect(() => {
    onValue(ref(db, 'solicitudes'), (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const lista = Object.keys(data).map(key => ({ id: key, ...data[key] }));
        // Separamos en dos listas
        setPendientes(lista.filter(s => s.estado === 'PENDIENTE'));
        setHistorial(lista.filter(s => s.estado !== 'PENDIENTE').reverse()); // Los más recientes primero
      } else {
        setPendientes([]);
        setHistorial([]);
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
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <svg className="w-6 h-6 text-[#0BB885]" fill="currentColor" viewBox="0 0 20 20"><path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z"></path><path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd"></path></svg>
          Reservas Extraordinarias
        </h1>
        <p className="text-slate-400 mt-1 text-xs">Gestión de permisos especiales fuera de los horarios asignados.</p>
      </div>

      {/* SECCIÓN 1: PENDIENTES */}
      <div className="bg-[#0B1320] rounded-2xl border border-slate-800/80 overflow-hidden shadow-2xl relative">
        <div className="absolute top-0 left-0 w-full h-1 bg-blue-500"></div>
        <div className="px-5 py-4 border-b border-slate-800/80">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            ⏳ Bandeja de Entrada <span className="bg-blue-600/20 text-blue-400 text-[10px] px-2 py-0.5 rounded-full">{pendientes.length}</span>
          </h2>
        </div>
        <table className="w-full text-left border-collapse">
          <thead><tr className="bg-[#121B2A] text-[10px] text-slate-500 uppercase border-b border-slate-800/80 tracking-wider"><th className="px-5 py-3">Solicitante</th><th className="px-5 py-3">Laboratorio</th><th className="px-5 py-3">Fecha y Horario</th><th className="px-5 py-3 text-center">Acción</th></tr></thead>
          <tbody className="divide-y divide-slate-800/40 text-xs">
            {pendientes.map(sol => (
              <tr key={sol.id} className="hover:bg-slate-800/20 transition-colors">
                <td className="px-5 py-4"><div className="font-bold text-white text-sm">{sol.estudiante}</div><div className="text-slate-400 mt-0.5">{sol.rol}</div></td>
                <td className="px-5 py-4 text-blue-400 font-semibold">{sol.laboratorio}</td>
                <td className="px-5 py-4 text-white font-bold">{sol.fecha} <br/><span className="text-slate-400 font-normal">{sol.horario}</span></td>
                <td className="px-5 py-4 text-center"><button onClick={() => setSeleccionada(sol)} className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold px-4 py-2 rounded-lg border-0 cursor-pointer shadow-lg transition-colors">Evaluar</button></td>
              </tr>
            ))}
            {pendientes.length === 0 && (<tr><td colSpan="4" className="p-8 text-center text-slate-500 italic text-xs">No hay solicitudes nuevas por revisar.</td></tr>)}
          </tbody>
        </table>
      </div>

      {/* SECCIÓN 2: HISTORIAL / ARCHIVO */}
      <div className="bg-[#0B1320] rounded-2xl border border-slate-800/80 overflow-hidden shadow-2xl opacity-80 hover:opacity-100 transition-opacity">
        <div className="px-5 py-4 border-b border-slate-800/80 flex justify-between items-center">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">🗄️ Historial de Decisiones</h2>
        </div>
        <div className="max-h-[300px] overflow-y-auto [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-slate-700 [&::-webkit-scrollbar-thumb]:rounded-full">
          <table className="w-full text-left border-collapse">
            <tbody className="divide-y divide-slate-800/40 text-xs text-slate-300">
              {historial.map(sol => (
                <tr key={sol.id} className="hover:bg-slate-800/10">
                  <td className="px-5 py-3">
                    <div className="font-bold text-slate-300">{sol.estudiante}</div>
                    <div className="text-[10px] text-slate-500">Motivo: {sol.motivo}</div>
                  </td>
                  <td className="px-5 py-3 text-slate-400 text-[11px]">{sol.laboratorio}<br/>{sol.fecha} • {sol.horario}</td>
                  <td className="px-5 py-3 text-right">
                    <span className={`px-2.5 py-1 rounded text-[10px] font-bold border uppercase tracking-wider ${sol.estado === 'APROBADA' ? 'text-[#0BB885] bg-[#0BB885]/10 border-[#0BB885]/20' : 'text-red-400 bg-red-400/10 border-red-500/20'}`}>
                      {sol.estado}
                    </span>
                  </td>
                </tr>
              ))}
              {historial.length === 0 && (<tr><td colSpan="3" className="p-6 text-center text-slate-500 italic text-xs">El archivo está vacío.</td></tr>)}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL DE EVALUACIÓN (Se mantiene igual) */}
      {seleccionada && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-[#0f172a] border border-slate-700 rounded-2xl p-6 max-w-md w-full flex flex-col gap-4 shadow-2xl">
            <h3 className="text-white font-bold text-lg border-b border-slate-800 pb-3">📄 Revisión de Permiso</h3>
            <div className="border border-slate-700 rounded-xl p-4 bg-[#0B1320] flex flex-col gap-2">
              <div className="text-blue-400 font-bold text-xs uppercase tracking-wider">{seleccionada.laboratorio}</div>
              <div className="text-white font-semibold text-sm">📅 {seleccionada.fecha} <span className="text-slate-500 font-normal">| {seleccionada.horario}</span></div>
              <div className="text-slate-300 italic mt-3 bg-[#121B2A] p-3 rounded-lg border border-slate-800/50 text-xs">" {seleccionada.motivo} "</div>
            </div>
            <div className="flex gap-3 mt-3">
              <button onClick={() => procesar(false)} className="flex-1 bg-transparent border border-red-500/50 text-red-400 hover:bg-red-500/10 font-bold py-2.5 rounded-xl cursor-pointer transition-colors text-sm">❌ Denegar</button>
              <button onClick={() => procesar(true)} className="flex-1 bg-[#0BB885] hover:bg-[#0aa376] text-white font-bold py-2.5 rounded-xl border-0 cursor-pointer transition-colors shadow-lg text-sm">✔️ Aprobar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
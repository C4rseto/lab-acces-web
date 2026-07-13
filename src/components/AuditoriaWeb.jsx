import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { ref, onValue } from 'firebase/database';

export default function AuditoriaWeb() {
  const [logsWeb, setLogsWeb] = useState([]);

  useEffect(() => {
    const unsub = onValue(ref(db, 'auditoria_web'), (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const listaLogs = Object.keys(data).map(key => {
          const log = data[key];
          // Convertir el Timestamp del servidor de Firebase a fecha legible
          const fechaObj = log.timestamp ? new Date(log.timestamp) : new Date();
          return {
            id: key,
            ...log,
            fechaLarga: fechaObj.toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' }),
            horaExacta: fechaObj.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
          };
        });
        
        // Ordenar del más reciente al más antiguo
        listaLogs.sort((a, b) => b.timestamp - a.timestamp);
        setLogsWeb(listaLogs);
      } else {
        setLogsWeb([]);
      }
    });

    return () => unsub();
  }, []);

  return (
    <div className="space-y-6 animate-fade-in-up pb-10">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white flex items-center gap-3">
          Auditoría del Sistema Web
          <span className="bg-rose-100 dark:bg-rose-500/10 text-rose-600 dark:text-rose-500 border border-rose-200 dark:border-rose-500/20 text-[10px] px-2 py-0.5 rounded-md uppercase tracking-widest font-extrabold shadow-sm">
            SOLO LECTURA
          </span>
        </h1>
        <p className="text-slate-500 dark:text-slate-400 mt-2 text-sm font-medium">Registro inmutable de acciones administrativas.</p>
      </div>

      <div className="bg-white dark:bg-[#1E293B] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto max-h-[600px] [&::-webkit-scrollbar]:w-[4px] [&::-webkit-scrollbar-thumb]:bg-slate-300 dark:[&::-webkit-scrollbar-thumb]:bg-slate-700">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-[#111827]/40 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-10">
                <th className="px-6 py-4">Timestamp Servidor</th>
                <th className="px-6 py-4">Autor (Administrador)</th>
                <th className="px-6 py-4">Acción / Evento</th>
                <th className="px-6 py-4 pr-6">Detalle</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/40 text-sm text-slate-700 dark:text-slate-300">
              {logsWeb.length === 0 ? (
                <tr>
                  <td colSpan="4" className="px-6 py-12 text-center text-slate-400">Sistema sin registros de actividad web.</td>
                </tr>
              ) : (
                logsWeb.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/20 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-bold text-slate-800 dark:text-white text-xs">{log.fechaLarga}</div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 font-mono mt-0.5">{log.horaExacta}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-semibold text-slate-800 dark:text-white text-sm">{log.autor?.nombre}</div>
                      <div className="text-[10px] text-slate-400 font-mono mt-0.5">UID: {log.autor?.uid}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="bg-slate-100 dark:bg-[#0F172A] border border-slate-200 dark:border-slate-700 px-2 py-1 rounded text-[10px] font-extrabold uppercase text-slate-600 dark:text-slate-400 tracking-wider">
                        {log.accion}
                      </span>
                    </td>
                    <td className="px-6 py-4 pr-6">
                      <p className="text-xs font-medium text-slate-600 dark:text-slate-300 leading-relaxed">
                        {log.detalle}
                      </p>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { ref, onValue, set } from 'firebase/database';

export default function Prestamos() {
  const [pendientes, setPendientes] = useState([]);
  const [historial, setHistorial] = useState([]);
  const [seleccionada, setSeleccionada] = useState(null);
  const [respuestaAdmin, setRespuestaAdmin] = useState(''); // <-- NUEVO ESTADO PARA LA RESPUESTA

  useEffect(() => {
    onValue(ref(db, 'reservas'), (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const lista = Object.keys(data).map(key => ({ id: key, ...data[key] }));
        setPendientes(lista.filter(s => s.estado === 'pendiente'));
        setHistorial(lista.filter(s => s.estado !== 'pendiente').reverse()); 
      } else {
        setPendientes([]);
        setHistorial([]);
      }
    });
  }, []);

  const procesar = async (aprobada) => {
    if (seleccionada) {
      const nuevoEstado = aprobada ? 'aprobado' : 'denegado';
      
      // Guardamos el estado y la respuesta que escribió el administrador
      await set(ref(db, `reservas/${seleccionada.id}/estado`), nuevoEstado);
      await set(ref(db, `reservas/${seleccionada.id}/respuestaAdmin`), respuestaAdmin || (aprobada ? 'Aprobado sin comentarios adicionales.' : 'Solicitud denegada.'));
      
      setSeleccionada(null);
      setRespuestaAdmin(''); // Limpiamos la caja de texto
    }
  };

  const cerrarModal = () => {
    setSeleccionada(null);
    setRespuestaAdmin('');
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
                <td className="px-5 py-4"><div className="font-bold text-white text-sm">{sol.estudiante}</div><div className="text-slate-400 mt-0.5 truncate max-w-[200px]">{sol.equipos}</div></td>
                <td className="px-5 py-4 text-blue-400 font-semibold">{sol.laboratorio}</td>
                <td className="px-5 py-4 text-white font-bold">{sol.fecha} <br/><span className="text-slate-400 font-normal">{sol.horaInicio} - {sol.horaFin}</span></td>
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
                    <div className="text-[10px] text-slate-500 truncate max-w-[250px]">Motivo: {sol.motivo}</div>
                  </td>
                  <td className="px-5 py-3 text-slate-400 text-[11px]">{sol.laboratorio}<br/>{sol.fecha} • {sol.horaInicio} - {sol.horaFin}</td>
                  <td className="px-5 py-3 text-right">
                    <span className={`px-2.5 py-1 rounded text-[10px] font-bold border uppercase tracking-wider ${sol.estado === 'aprobado' ? 'text-[#0BB885] bg-[#0BB885]/10 border-[#0BB885]/20' : 'text-red-400 bg-red-400/10 border-red-500/20'}`}>
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

      {/* NUEVO MODAL DE EVALUACIÓN (TIPO DISEÑO PRO) */}
      {seleccionada && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-[#0f172a] rounded-2xl w-full max-w-2xl border border-slate-700 shadow-2xl flex flex-col">
            
            {/* HEADER DEL MODAL */}
            <div className="flex justify-between items-start p-6 border-b border-slate-800">
              <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  📄 Revisión de Solicitud de Acceso
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  Enviado por: <span className="font-semibold text-slate-200">{seleccionada.estudiante || 'Desconocido'}</span>
                </p>
              </div>
              <button onClick={cerrarModal} className="bg-slate-800 hover:bg-slate-700 text-slate-400 rounded-full w-8 h-8 flex items-center justify-center transition-colors">
                ✕
              </button>
            </div>

            {/* CUERPO DEL MODAL */}
            <div className="p-6 space-y-4 overflow-y-auto max-h-[60vh]">
              <div className="text-[11px] font-bold text-blue-400 mb-2 flex items-center gap-2 tracking-wider">
                ⓘ DATOS DEL FORMULARIO (APP MÓVIL)
              </div>

              <div className="bg-[#121b2a] border border-slate-800 rounded-xl p-4">
                <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Laboratorio Solicitado</label>
                <div className="text-[#0BB885] font-bold mt-1 text-lg flex items-center gap-2">
                  🏢 {seleccionada.laboratorio}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-[#121b2a] border border-slate-800 rounded-xl p-4">
                  <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Fecha Solicitada</label>
                  <div className="text-slate-200 font-bold mt-1 text-sm">📅 {seleccionada.fecha}</div>
                </div>
                <div className="bg-[#121b2a] border border-slate-800 rounded-xl p-4">
                  <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Hora Inicio - Hora Fin</label>
                  <div className="text-orange-400 font-bold mt-1 text-sm">🕒 {seleccionada.horaInicio} - {seleccionada.horaFin}</div>
                </div>
              </div>

              <div className="bg-[#121b2a] border border-slate-800 rounded-xl p-4">
                <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Motivo / Proyecto</label>
                <div className="text-slate-300 italic mt-2 text-sm leading-relaxed">
                  "{seleccionada.motivo || 'Sin motivo especificado'}"
                </div>
              </div>

              {/* MOSTRAR EQUIPOS SI EXISTEN */}
              {seleccionada.equipos && (
                <div className="bg-[#121b2a] border border-blue-900/30 border-l-4 border-l-blue-500 rounded-r-xl p-4">
                  <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Equipos Requeridos</label>
                  <div className="text-blue-200 font-semibold mt-1 text-sm flex items-center gap-2">
                    ⚡ {seleccionada.equipos}
                  </div>
                </div>
              )}

              {/* ZONA DE RESPUESTA */}
              <div className="mt-6">
                <label className="text-sm text-white font-bold flex items-center gap-2 mb-2">
                  💬 Tu respuesta al alumno (Requerido)
                </label>
                <textarea 
                  value={respuestaAdmin}
                  onChange={(e) => setRespuestaAdmin(e.target.value)}
                  className="w-full bg-[#121b2a] border border-slate-700 rounded-xl p-4 text-sm text-white min-h-[100px] outline-none focus:border-[#0BB885] transition-colors"
                  placeholder="Redacta la respuesta que le llegará a la app del estudiante..."
                ></textarea>
                
                {/* BOTONES DE RESPUESTA RÁPIDA (Opcional, muy útil) */}
                <div className="flex items-center gap-2 mt-3 text-xs">
                  <span className="text-slate-500 mr-1">Respuestas rápidas:</span>
                  <button onClick={() => setRespuestaAdmin("Solicitud aprobada. Por favor dejar el laboratorio ordenado al terminar.")} className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-1 rounded hover:bg-emerald-500/20 transition-colors">Aprobar con recordatorio</button>
                  <button onClick={() => setRespuestaAdmin("Solicitud denegada. Hay un cruce de horario con una clase programada.")} className="bg-red-500/10 text-red-400 border border-red-500/20 px-2 py-1 rounded hover:bg-red-500/20 transition-colors">Rechazar (Cruce de horario)</button>
                </div>
              </div>
            </div>

            {/* FOOTER - BOTONES DE ACCIÓN */}
            <div className="p-6 border-t border-slate-800 flex justify-between items-center gap-4 bg-[#0B1320] rounded-b-2xl">
              <button 
                onClick={() => procesar(false)} 
                className="flex-1 bg-transparent border border-slate-600 text-slate-300 font-bold py-3.5 rounded-xl hover:bg-slate-800 hover:text-white transition-colors"
              >
                Denegar
              </button>
              <button 
                onClick={() => procesar(true)} 
                className="flex-1 bg-[#0BB885] text-white font-bold py-3.5 rounded-xl hover:bg-[#0aa376] flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/20 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                Aprobar Solicitud
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { ref, onValue, set } from 'firebase/database';

export default function Prestamos() {
  const [pendientes, setPendientes] = useState([]);
  const [historial, setHistorial] = useState([]);
  const [seleccionada, setSeleccionada] = useState(null);
  const [respuestaTexto, setRespuestaTexto] = useState(''); // Estado para guardar la respuesta

  useEffect(() => {
    onValue(ref(db, 'solicitudes'), (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const lista = Object.keys(data).map(key => ({ id: key, ...data[key] }));
        setPendientes(lista.filter(s => s.estado === 'PENDIENTE'));
        setHistorial(lista.filter(s => s.estado !== 'PENDIENTE').reverse());
      } else {
        setPendientes([]);
        setHistorial([]);
      }
    });
  }, []);

  const procesar = async (aprobada) => {
    if (seleccionada) {
      const nuevoEstado = aprobada ? 'APROBADO' : 'RECHAZADO';
      await set(ref(db, `solicitudes/${seleccionada.id}/estado`), nuevoEstado);
      if (respuestaTexto.trim() !== '') {
        await set(ref(db, `solicitudes/${seleccionada.id}/respuestaAdmin`), respuestaTexto);
      }
      setSeleccionada(null);
      setRespuestaTexto('');
    }
  };

  const aplicarRespuestaRapida = (texto) => {
    setRespuestaTexto(texto);
  };

  return (
    <div className="space-y-8">
      {/* ENCABEZADO */}
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <span className="text-[#0BB885]">📋</span> Reservas Extraordinarias
        </h1>
        <p className="text-slate-400 mt-1 text-xs">Gestión de permisos especiales fuera de los horarios asignados.</p>
      </div>

      {/* BANDEJA DE ENTRADA */}
      <div className="bg-[#0B1320] rounded-2xl border border-slate-800/80 overflow-hidden shadow-xl relative">
        <div className="absolute top-0 left-0 w-full h-1 bg-blue-600"></div>
        <div className="px-5 py-4 border-b border-slate-800/80">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            ⏳ Bandeja de Entrada <span className="bg-blue-600/20 text-blue-400 text-[10px] px-2.5 py-0.5 rounded-full">{pendientes.length}</span>
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#121B2A] text-[10px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-800/80">
                <th className="px-6 py-4">Solicitante</th>
                <th className="px-6 py-4">Laboratorio</th>
                <th className="px-6 py-4">Fecha y Horario</th>
                <th className="px-6 py-4 text-center">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/40 text-xs">
              {pendientes.map(sol => (
                <tr key={sol.id} className="hover:bg-slate-800/20 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-bold text-white text-sm">{sol.estudiante || sol.docente || sol.nombre || 'Docente'}</div>
                    <div className="text-slate-400 mt-0.5">{sol.rol || 'Docente'}</div>
                  </td>
                  <td className="px-6 py-4 text-blue-400 font-semibold">{sol.laboratorio}</td>
                  <td className="px-6 py-4">
                    <div className="text-slate-300 font-bold">{sol.fecha}</div>
                    <div className="text-slate-400 mt-0.5">{sol.horario}</div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <button onClick={() => setSeleccionada(sol)} className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold px-5 py-2 rounded-lg border-0 cursor-pointer shadow-lg transition-colors">
                      Evaluar
                    </button>
                  </td>
                </tr>
              ))}
              {pendientes.length === 0 && (<tr><td colSpan="4" className="p-8 text-center text-slate-500 italic text-xs">No hay solicitudes nuevas por revisar.</td></tr>)}
            </tbody>
          </table>
        </div>
      </div>

      {/* HISTORIAL DE DECISIONES */}
      <div className="bg-[#0B1320] rounded-2xl border border-slate-800/80 overflow-hidden shadow-xl">
        <div className="px-5 py-4 border-b border-slate-800/80">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">🗄️ Historial de Decisiones</h2>
        </div>
        <div className="max-h-[300px] overflow-y-auto [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-slate-700 [&::-webkit-scrollbar-thumb]:rounded-full">
          <table className="w-full text-left border-collapse">
            <tbody className="divide-y divide-slate-800/40 text-xs">
              {historial.map(sol => (
                <tr key={sol.id} className="hover:bg-slate-800/10">
                  <td className="px-6 py-4">
                    <div className="font-bold text-slate-200">{sol.estudiante || sol.docente || sol.nombre || 'Docente'}</div>
                    <div className="text-[10px] text-slate-500 truncate max-w-[200px]">Motivo: {sol.motivo}</div>
                  </td>
                  <td className="px-6 py-4 text-slate-400 text-[11px]">
                    <span className="text-blue-400">{sol.laboratorio}</span><br/>
                    {sol.fecha} • {sol.horario}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className={`px-3 py-1.5 rounded-md text-[10px] font-bold border uppercase tracking-wider ${sol.estado === 'APROBADO' ? 'text-[#0BB885] bg-[#0BB885]/10 border-[#0BB885]/20' : 'text-red-400 bg-red-400/10 border-red-500/20'}`}>
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

      {/* === MODAL DE REVISIÓN PREMIUM (CALCADO A TU TERCERA IMAGEN) === */}
      {seleccionada && (
        <div className="fixed inset-0 z-50 bg-[#020617]/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0B1320] border border-slate-700/50 rounded-2xl w-full max-w-2xl flex flex-col shadow-[0_0_50px_rgba(0,0,0,0.5)] overflow-hidden">
            
            {/* Cabecera del Modal */}
            <div className="px-6 py-4 border-b border-slate-800 flex justify-between items-start">
              <div>
                <h3 className="text-white font-bold text-lg flex items-center gap-2">
                  <span className="text-blue-400">📄</span> Revisión de Solicitud de Acceso
                </h3>
                <p className="text-slate-400 text-[11px] mt-1">
                  Enviado por: <span className="text-slate-200">{seleccionada.estudiante || seleccionada.docente || seleccionada.nombre || 'Docente'}</span> ({seleccionada.rol || 'Docente'})
                </p>
              </div>
              <button onClick={() => {setSeleccionada(null); setRespuestaTexto('');}} className="text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 w-8 h-8 rounded-full flex items-center justify-center transition-colors cursor-pointer border-0">
                ✕
              </button>
            </div>

            {/* Cuerpo del Modal */}
            <div className="p-6 flex flex-col gap-6">
              
              {/* Bloque de Datos */}
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-1.5 text-blue-400 text-[11px] font-bold uppercase tracking-wider mb-1">
                  <span>ⓘ</span> Datos del Formulario (App Móvil)
                </div>

                <div className="bg-[#121B2A] border border-slate-800/80 rounded-xl p-4">
                  <p className="text-[10px] text-slate-500 font-bold uppercase mb-1">Laboratorio Solicitado</p>
                  <p className="text-[#0BB885] font-bold text-sm">🏢 {seleccionada.laboratorio}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-[#121B2A] border border-slate-800/80 rounded-xl p-4">
                    <p className="text-[10px] text-slate-500 font-bold uppercase mb-1">Fecha Solicitada</p>
                    <p className="text-slate-200 font-medium text-sm">📅 {seleccionada.fecha}</p>
                  </div>
                  <div className="bg-[#121B2A] border border-slate-800/80 rounded-xl p-4">
                    <p className="text-[10px] text-slate-500 font-bold uppercase mb-1">Hora Inicio - Hora Fin</p>
                    <p className="text-orange-400 font-medium text-sm">🕒 {seleccionada.horario}</p>
                  </div>
                </div>

                <div className="bg-[#121B2A] border border-slate-800/80 rounded-xl p-4">
                  <p className="text-[10px] text-slate-500 font-bold uppercase mb-1">Motivo / Proyecto</p>
                  <p className="text-slate-300 text-sm italic">"{seleccionada.motivo}"</p>
                </div>

                <div className="bg-[#121B2A] border-l-4 border-blue-500 rounded-r-xl p-4">
                  <p className="text-[10px] text-slate-500 font-bold uppercase mb-1">Equipos Requeridos</p>
                  <p className="text-blue-400 font-medium text-sm">⚡ {seleccionada.equipos || 'Osciloscopio, Multímetro, Kit Arduino'}</p>
                </div>
              </div>

              {/* Bloque de Respuesta (SIN LA PALABRA ALUMNO) */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-1.5 text-[#0BB885] text-[11px] font-bold mb-1">
                  <span>💬</span> Tu respuesta (Requerido)
                </div>
                <textarea
                  value={respuestaTexto}
                  onChange={(e) => setRespuestaTexto(e.target.value)}
                  placeholder="Redacta la respuesta que le llegará a la app del docente..."
                  className="w-full bg-[#121B2A] border border-slate-700/80 rounded-xl p-3 text-sm text-slate-200 min-h-[90px] outline-none focus:border-[#0BB885] resize-none transition-colors"
                />
                
                {/* Botones de Respuestas Rápidas */}
                <div className="flex flex-wrap items-center gap-2 mt-1">
                  <span className="text-slate-500 text-[10px] mr-1">Respuestas rápidas:</span>
                  <button onClick={() => aplicarRespuestaRapida('Aprobado. Recuerda dejar el laboratorio cerrado al salir.')} className="text-[10px] font-medium border border-[#0BB885]/30 text-[#0BB885] bg-transparent hover:bg-[#0BB885]/10 px-3 py-1.5 rounded-full transition-colors cursor-pointer">
                    Aprobar con recordatorio
                  </button>
                  <button onClick={() => aplicarRespuestaRapida('Rechazado. Existe un cruce de horario con una clase programada.')} className="text-[10px] font-medium border border-red-500/30 text-red-400 bg-transparent hover:bg-red-500/10 px-3 py-1.5 rounded-full transition-colors cursor-pointer">
                    Rechazar (Cruce de horario)
                  </button>
                  <button onClick={() => aplicarRespuestaRapida('Laboratorio en mantenimiento. Te sugiero solicitar el Lab. de Cómputo.')} className="text-[10px] font-medium border border-blue-500/30 text-blue-400 bg-transparent hover:bg-blue-500/10 px-3 py-1.5 rounded-full transition-colors cursor-pointer">
                    Sugerir otro Lab
                  </button>
                </div>
              </div>

            </div>

            {/* Pie del Modal (Botones Finales) */}
            <div className="px-6 py-4 border-t border-slate-800 bg-[#0B1320] flex gap-4">
              <button 
                onClick={() => procesar(false)} 
                className="flex-1 bg-transparent hover:bg-slate-800 text-slate-300 font-bold py-3.5 rounded-xl border border-slate-600 cursor-pointer transition-colors text-sm"
              >
                Denegar
              </button>
              <button 
                onClick={() => procesar(true)} 
                className="flex-1 bg-[#0BB885] hover:bg-[#0aa376] text-white font-bold py-3.5 rounded-xl border-0 cursor-pointer transition-colors shadow-lg text-sm flex items-center justify-center gap-2"
              >
                ✔️ Aprobar Solicitud
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
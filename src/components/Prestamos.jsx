import { useState, useEffect } from 'react';
import { ref, onValue, update } from 'firebase/database';
import { db } from '../firebase';
import { Link } from 'react-router-dom';

export default function Prestamos() {
  const [solicitudes, setSolicitudes] = useState([]);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [solicitudSeleccionada, setSolicitudSeleccionada] = useState(null);
  const [respuestaAdmin, setRespuestaAdmin] = useState('');

  // Función para cifrar el PIN en SHA-256
  const cifrarSHA256 = async (texto) => {
    const encoder = new TextEncoder();
    const data = encoder.encode(texto);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  };

  useEffect(() => {
    const solicitudesRef = ref(db, 'reservas');
    onValue(solicitudesRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const lista = Object.keys(data)
          .map(key => ({ id: key, ...data[key] }))
          .filter(sol => sol.estado === 'pendiente');
        setSolicitudes(lista);
      } else {
        setSolicitudes([]);
      }
    });
  }, []);

  const abrirModal = (solicitud) => {
    setSolicitudSeleccionada(solicitud);
    setRespuestaAdmin('');
    setModalAbierto(true);
  };

  const cerrarModal = () => {
    setModalAbierto(false);
    setSolicitudSeleccionada(null);
  };

  // Lógica para Aprobar o Denegar sin pedir PIN
  const handleEvaluacion = async (nuevoEstado) => {
    if (!respuestaAdmin.trim()) {
      alert("Por favor, redacta una respuesta para el alumno/docente.");
      return;
    }

    try {
      const solicitudRef = ref(db, `reservas/${solicitudSeleccionada.id}`);
      
      // Solo actualizamos el estado y el mensaje
      await update(solicitudRef, { 
        estado: nuevoEstado,
        mensajeAdmin: respuestaAdmin,
        fechaEvaluacion: new Date().toISOString()
      });

      alert(`Solicitud ${nuevoEstado.toUpperCase()} correctamente.`);
      cerrarModal(); // Cerramos el modal

    } catch (error) {
      console.error("Error al evaluar:", error);
      alert("Hubo un error al procesar la solicitud.");
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-300 font-sans relative">
      <nav className="flex justify-between items-center p-4 bg-slate-900 border-b border-slate-800">
        <div className="flex items-center gap-6">
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <span className="text-emerald-500">🛡️</span> LabAccess
          </h1>
          <div className="flex gap-4 ml-8 text-sm font-medium">
            <Link to="/dashboard" className="text-slate-400">Panel de Control</Link>
            <Link to="/prestamos" className="text-emerald-500 border-b-2 border-emerald-500 pb-1">Préstamos/Reservas ({solicitudes.length})</Link>
          </div>
        </div>
      </nav>

      <div className="p-8 max-w-5xl mx-auto">
        <h2 className="text-2xl font-bold text-white mb-8">Gestión de Préstamos Especiales</h2>
        <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="text-xs text-slate-400 uppercase bg-slate-950/30">
              <tr>
                <th className="px-6 py-4">Estudiante / Docente</th>
                <th className="px-6 py-4">Laboratorio</th>
                <th className="px-6 py-4 text-center">Acción</th>
              </tr>
            </thead>
            <tbody>
              {solicitudes.map((sol) => (
                <tr key={sol.id} className="border-b border-slate-800/50">
                  <td className="px-6 py-4 font-bold text-white">{sol.estudiante}</td>
                  <td className="px-6 py-4 text-emerald-400">🏢 {sol.laboratorio}</td>
                  <td className="px-6 py-4 text-center">
                    <button onClick={() => abrirModal(sol)} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-xs">👁️ Evaluar</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {modalAbierto && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-[#0f172a] border border-slate-700 w-full max-w-lg rounded-2xl p-6">
            <h3 className="text-white font-bold mb-4">Revisar Solicitud</h3>
            <textarea 
              value={respuestaAdmin} 
              onChange={(e) => setRespuestaAdmin(e.target.value)}
              className="w-full h-24 bg-slate-950 border border-slate-700 rounded-lg p-4 text-white mb-4"
              placeholder="Escribe la respuesta..."
            />
            <div className="flex gap-4">
              <button onClick={() => handleEvaluacion('rechazado')} className="flex-1 bg-slate-800 text-white py-2 rounded-lg">Denegar</button>
              <button onClick={() => handleEvaluacion('aprobado')} className="flex-1 bg-emerald-600 text-white py-2 rounded-lg font-bold">Aprobar Solicitud</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
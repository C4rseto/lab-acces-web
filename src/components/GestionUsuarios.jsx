import React, { useState, useEffect } from 'react';
import { db } from '../firebase'; 
import { ref, onValue, set, remove } from 'firebase/database';

export default function GestionUsuarios() {
  const [docentes, setDocentes] = useState([]);
  const [nombre, setNombre] = useState('');
  const [correo, setCorreo] = useState(''); // <-- Nuevo estado para correo
  const [uid, setUid] = useState('');
  const [pin, setPin] = useState('');
  const [laboratorio, setLab] = useState('💻 Lab. Cómputo');
  
  // Controles de Horarios y Reloj Popover
  const [dia, setDia] = useState('Lunes');
  const [inicioHora, setInicioHora] = useState('10');
  const [inicioMin, setInicioMin] = useState('00');
  const [inicioAmPm, setInicioAmPm] = useState('AM');
  const [finHora, setFinHora] = useState('11');
  const [finMin, setFinMin] = useState('20');
  const [finAmPm, setFinAmPm] = useState('AM');
  
  const [relojActivo, setRelojActivo] = useState(null);
  const [horariosEdicion, setHorariosEdicion] = useState([]);
  const [docenteEnEdicion, setDocenteEnEdicion] = useState(null);
  const [idParaEliminar, setIdParaEliminar] = useState(null);
  const [toast, setToast] = useState(null);

  const listaHoras = ['01','02','03','04','05','06','07','08','09','10','11','12'];
  const listaMinutos = Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, '0'));

  // ESCUCHAR EN TIEMPO REAL DESDE REALTIME DATABASE
  useEffect(() => {
    // Volvemos a leer de 'docentes' para tener todos los datos completos de la web
    const docentesRef = ref(db, 'docentes'); 
    
    const unsub = onValue(docentesRef, (snapshot) => {
      const data = snapshot.val();
      const list = data ? Object.entries(data).map(([key, value]) => ({
        ...value,
        id: key
      })) : [];
      
      setDocentes(list);
    });
    return () => unsub();
  }, []);

  const lanzarToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  const agregarHorario = () => {
    const inicioStr = `${inicioHora}:${inicioMin} ${inicioAmPm}`;
    const finStr = `${finHora}:${finMin} ${finAmPm}`;
    setHorariosEdicion([...horariosEdicion, { dia, inicio: inicioStr, fin: finStr }]);
  };

  const removerHorario = (index) => {
    setHorariosEdicion(horariosEdicion.filter((_, i) => i !== index));
  };

  const cargarParaEditar = (docente) => {
    // 1. Aseguramos que guarde el ID exacto del usuario en Firebase
    setDocenteEnEdicion(docente.id); 
    
    // 2. Cargamos los datos previniendo errores si algún campo está vacío
    setNombre(docente.nombre || '');
    setCorreo(docente.correo || ''); 
    setUid(docente.uid || '');
    setPin(docente.pin || '');
    setLab(docente.laboratorio || '💻 Lab. Cómputo');
    setHorariosEdicion(docente.horarios ? [...docente.horarios] : []);
  };

  const guardarDocente = async () => {
    if (!nombre || !uid) return lanzarToast('⚠️ Completa Nombre y UID');
    
    // OJO: En tu imagen veo que Carlos y Axel no tienen horarios. 
    // Si quieres que el sistema te deje guardarlos sin horarios, puedes comentar/borrar la siguiente línea:
    if (horariosEdicion.length === 0) return lanzarToast('⚠️ Añade al menos un horario');

    // Si estamos editando (existe docenteEnEdicion), usamos SU MISMO ID para sobreescribir. 
    // Si es un usuario nuevo, le creamos uno con crypto.randomUUID().
    const idUnico = docenteEnEdicion ? docenteEnEdicion : crypto.randomUUID();
    
    const docenteData = {
      id: idUnico,
      nombre,
      correo,
      uid: uid.toUpperCase(),
      pin: pin || '1234',
      laboratorio,
      horarios: horariosEdicion,
      estado: docenteEnEdicion ? docentes.find(d => d.id === idUnico)?.estado || 'Habilitado' : 'Habilitado'
    };

    try {
      // Guardamos en ambas rutas usando exactamente EL MISMO ID
      await set(ref(db, `docentes/${idUnico}`), docenteData);
      
      await set(ref(db, `laboratorio/usuarios/${idUnico}`), {
        nombre: docenteData.nombre,
        correo: docenteData.correo,
        laboratorio: docenteData.laboratorio,
        habilitado: docenteData.estado === 'Habilitado',
        uid: docenteData.uid
      });

      // Mensaje dinámico para saber qué hicimos
      lanzarToast(docenteEnEdicion ? '¡Editado correctamente! ✏️' : '¡Usuario creado! ⚡');
      limpiarFormulario();
    } catch (e) {
      lanzarToast('❌ Error al guardar');
      console.error(e);
    }
  };

  // ... (resto de tu código)

  const alternarEstado = async (docente) => {
    const nuevoEstado = docente.estado === 'Habilitado' ? 'Deshabilitado' : 'Habilitado';
    
    try {
      // 1. Actualiza el texto en la tabla web
      await set(ref(db, `docentes/${docente.id}/estado`), nuevoEstado);
      
      // 2. Actualiza el acceso real (true/false) para la App y el Laboratorio
      await set(ref(db, `laboratorio/usuarios/${docente.id}/habilitado`), nuevoEstado === 'Habilitado');
      
    } catch (error) {
      console.error("Error al cambiar estado:", error);
    }
  };

  const eliminarDocente = async () => {
    if (idParaEliminar) {
      try {
        // Borramos de las dos ramas para que desaparezca por completo
        await remove(ref(db, `docentes/${idParaEliminar}`));
        await remove(ref(db, `laboratorio/usuarios/${idParaEliminar}`));
        
        lanzarToast('🗑️ Credencial eliminada');
        setIdParaEliminar(null);
      } catch (error) {
        lanzarToast('❌ Error al eliminar');
        console.error(error);
      }
    }
  };

  const limpiarFormulario = () => {
    setDocenteEnEdicion(null);
    setNombre(''); setCorreo(''); setUid(''); setPin(''); // <-- Limpiar correo
    setHorariosEdicion([]);
    setRelojActivo(null);
  };

  return (
    <div className="space-y-6">
      {toast && (
        <div className="fixed top-5 right-5 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl border bg-slate-900 border-[#0BB885]/40 shadow-xl">
          <span className="w-2 h-2 rounded-full bg-[#0BB885] animate-ping"></span>
          <span className="text-xs font-semibold text-white">{toast}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* FORMULARIO */}
        <div className="bg-[#121B2A] p-6 rounded-2xl border border-slate-800 shadow-xl flex flex-col gap-4 h-fit">
          <div className="flex justify-between items-center border-b border-slate-800 pb-3">
            <h2 className="text-[#0BB885] font-bold text-base">{docenteEnEdicion ? '✏️ Editar Credencial' : '👤 Nueva Credencial'}</h2>
            {docenteEnEdicion && <button onClick={limpiarFormulario} className="text-xs font-bold text-red-400 bg-transparent border-0 cursor-pointer">Cancelar</button>}
          </div>
          
          <div className="flex flex-col gap-3">
            <div><label className="text-[10px] text-slate-400 uppercase font-bold">Nombre</label><input type="text" value={nombre} onChange={e => setNombre(e.target.value)} className="w-full mt-1 bg-[#192333] border border-slate-700 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-[#0BB885]" /></div>
            
            {/* <-- CAMPO DE CORREO AGREGADO AQUÍ --> */}
            <div><label className="text-[10px] text-slate-400 uppercase font-bold">Correo Electrónico</label><input type="email" value={correo} onChange={e => setCorreo(e.target.value)} placeholder="ejemplo@correo.com" className="w-full mt-1 bg-[#192333] border border-slate-700 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-[#0BB885]" /></div>

            <div><label className="text-[10px] text-slate-400 uppercase font-bold">UID Tarjeta</label><input type="text" value={uid} onChange={e => setUid(e.target.value)} className="w-full mt-1 bg-[#192333] border border-slate-700 rounded-lg px-3 py-2 text-sm text-white font-mono uppercase outline-none" /></div>
            <div><label className="text-[10px] text-slate-400 uppercase font-bold">Código PIN</label><input type="text" value={pin} onChange={e => setPin(e.target.value)} className="w-full mt-1 bg-[#192333] border border-slate-700 rounded-lg px-3 py-2 text-sm text-white outline-none" /></div>
            <div>
              <label className="text-[10px] text-slate-400 uppercase font-bold">Laboratorio</label>
              <select value={laboratorio} onChange={e => setLab(e.target.value)} className="w-full mt-1 bg-[#192333] border border-slate-700 rounded-lg px-3 py-2 text-sm text-white cursor-pointer outline-none">
                <option value="💻 Lab. Cómputo">💻 Lab. Cómputo</option><option value="⚡ Lab. Electrónica">⚡ Lab. Electrónica</option><option value="🧪 Lab. Química">🧪 Lab. Química</option>
              </select>
            </div>

            {/* SECCIÓN DEL RELOJ PERSONALIZADO POPOVER */}
            <div className="bg-[#0f172a] p-3 rounded-xl border border-slate-800 mt-1 relative">
              <label className="text-[10px] text-[#0BB885] uppercase font-bold block mb-2">Bloque de Horario</label>
              <div className="flex flex-col gap-2">
                <select value={dia} onChange={e => setDia(e.target.value)} className="w-full bg-[#192333] border border-slate-700 rounded-md p-1.5 text-xs text-white outline-none"><option>Lunes</option><option>Martes</option><option>Miércoles</option><option>Jueves</option><option>Viernes</option><option>Sábado</option></select>
                
                <div className="flex gap-2 relative">
                  <div onClick={() => setRelojActivo('inicio')} className={`w-1/2 border rounded-md bg-[#192333] p-2 flex items-center justify-center relative cursor-pointer ${relojActivo === 'inicio' ? 'border-[#0BB885]' : 'border-slate-700'}`}>
                    <span className="absolute -top-2.5 left-1 bg-[#0f172a] px-1 text-[8px] text-slate-500 uppercase font-bold">Inicio</span>
                    <span className="text-white text-xs font-bold">{inicioHora}:{inicioMin} <span className="text-[#0BB885]">{inicioAmPm}</span></span>
                  </div>
                  <div onClick={() => setRelojActivo('fin')} className={`w-1/2 border rounded-md bg-[#192333] p-2 flex items-center justify-center relative cursor-pointer ${relojActivo === 'fin' ? 'border-orange-400' : 'border-slate-700'}`}>
                    <span className="absolute -top-2.5 left-1 bg-[#0f172a] px-1 text-[8px] text-slate-500 uppercase font-bold">Fin</span>
                    <span className="text-white text-xs font-bold">{finHora}:{finMin} <span className="text-orange-400">{finAmPm}</span></span>
                  </div>

                  {relojActivo && (
                    <div className="absolute top-11 left-0 z-50 bg-[#0B1320] border border-slate-700 shadow-2xl rounded-xl p-3 w-[250px]">
                      <div className="flex justify-between text-[9px] text-slate-500 font-bold mb-1.5 text-center"><span className="w-1/3">HORA</span><span className="w-1/3">MINUTO</span><span className="w-1/3">FORMATO</span></div>
                      
                      <div className="flex gap-1 h-36">
                        <div className="w-1/3 overflow-y-auto flex flex-col gap-0.5 pr-1 [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:bg-slate-700 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-track]:bg-transparent">
                          {listaHoras.map(h => <button key={h} onClick={() => relojActivo === 'inicio' ? setInicioHora(h) : setFinHora(h)} className={`py-1 text-xs font-bold rounded border-0 ${((relojActivo === 'inicio' ? inicioHora : finHora) === h) ? 'bg-[#0BB885] text-white' : 'bg-transparent text-slate-400'}`}>{h}</button>)}
                        </div>
                        <div className="w-1/3 overflow-y-auto flex flex-col gap-0.5 border-l border-slate-800 pl-1 pr-1 [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:bg-slate-700 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-track]:bg-transparent">
                          {listaMinutos.map(m => <button key={m} onClick={() => relojActivo === 'inicio' ? setInicioMin(m) : setFinMin(m)} className={`py-1 text-xs font-bold rounded border-0 ${((relojActivo === 'inicio' ? inicioMin : finMin) === m) ? 'bg-[#0BB885] text-white' : 'bg-transparent text-slate-400'}`}>{m}</button>)}
                        </div>
                        <div className="w-1/3 flex flex-col gap-1 border-l border-slate-800 pl-1 justify-center">
                          {['AM','PM'].map(f => <button key={f} onClick={() => relojActivo === 'inicio' ? setInicioAmPm(f) : setFinAmPm(f)} className={`py-1.5 text-xs font-bold rounded-md border-0 ${(relojActivo === 'inicio' ? inicioAmPm : finAmPm) === f ? 'bg-[#0BB885] text-white' : 'bg-[#1e293b] text-slate-400'}`}>{f}</button>)}
                          <button onClick={() => setRelojActivo(null)} className="mt-2 bg-slate-800 text-white text-[10px] py-1 rounded font-bold border-0 cursor-pointer hover:bg-slate-700 transition-colors">Listo</button>
                        </div>
                      </div>

                    </div>
                  )}
                </div>
              </div>

              <button onClick={agregarHorario} className="w-full bg-[#1e293b] hover:bg-slate-700 text-slate-300 border border-slate-600 rounded-md py-1.5 mt-3 text-xs font-bold cursor-pointer transition-colors">+ Añadir bloque</button>

              {horariosEdicion.length > 0 && (
                <div className="mt-3 flex flex-col gap-1.5 border-t border-slate-700/50 pt-2">
                  {horariosEdicion.map((h, i) => (
                    <div key={i} className="flex justify-between items-center bg-[#121B2A] border border-slate-700 px-2.5 py-1.5 rounded-lg">
                      <span className="text-xs text-white">📅 {h.dia}: <span className="text-slate-400">{h.inicio} - {h.fin}</span></span>
                      <button onClick={() => removerHorario(i)} className="text-red-400 bg-red-500/10 border border-red-500/20 w-5 h-5 rounded flex items-center justify-center cursor-pointer">✕</button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <button onClick={guardarDocente} className="w-full bg-[#0BB885] text-white font-bold rounded-lg py-2.5 mt-2 border-0 cursor-pointer shadow-lg hover:bg-[#0aa376] transition-colors">Guardar y Sincronizar</button>
          </div>
        </div>

        {/* TABLA DE USUARIOS */}
        <div className="bg-[#121B2A] rounded-2xl border border-slate-800 shadow-xl overflow-hidden lg:col-span-2">
          <div className="p-4 bg-[#0f172a] border-b border-slate-800 flex justify-between items-center">
            <h2 className="font-bold text-white text-sm">👥 Usuarios Registrados</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead><tr className="bg-[#0f172a]/50 text-[10px] text-slate-500 uppercase border-b border-slate-800"><th className="p-3">Docente</th><th className="p-3">Credenciales</th><th className="p-3">Laboratorio</th><th className="p-3">Horarios</th><th className="p-3 text-center">Estado</th><th className="p-3 text-center">Acciones</th></tr></thead>
              <tbody className="divide-y divide-slate-800/40 text-xs text-slate-300">
                {docentes.map(doc => (
                  <tr key={doc.id} className="hover:bg-slate-800/10">
                    <td className="p-3 font-bold text-white text-sm">
                      {doc.nombre}
                      {/* Opcional: Mostrar el correo debajo del nombre en la tabla */}
                      {doc.correo && <div className="text-[10px] text-slate-400 font-normal mt-0.5">📧 {doc.correo}</div>}
                    </td>
                    <td className="p-3"><div className="font-mono">💳 {doc.uid}</div><div className="text-orange-400 mt-0.5">🔑 PIN: ****</div></td>
                    <td className="p-3"><span className="text-blue-400 font-semibold">{doc.laboratorio}</span></td>
                    <td className="p-3"><div className="flex flex-col gap-1">{doc.horarios?.map((h, idx) => <span key={idx} className="bg-[#1e293b] px-1.5 py-0.5 rounded border border-slate-700 w-max text-[10px]">📅 {h.dia}: {h.inicio} - {h.fin}</span>)}</div></td>
                    <td className="p-3 text-center"><button onClick={() => alternarEstado(doc)} className={`px-2 py-0.5 rounded-full border text-[10px] font-bold cursor-pointer ${doc.estado === 'Habilitado' ? 'bg-[#0BB885]/10 text-[#0BB885] border-[#0BB885]/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>{doc.estado}</button></td>
                    <td className="p-3 text-center whitespace-nowrap">
                      <button onClick={() => cargarParaEditar(doc)} className="text-slate-400 hover:text-blue-400 bg-transparent border-0 cursor-pointer mr-2 text-sm">✏️</button>
                      <button onClick={() => setIdParaEliminar(doc.id)} className="text-slate-400 hover:text-red-400 bg-transparent border-0 cursor-pointer text-sm">🗑️</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {idParaEliminar && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-[#0f172a] border border-red-500/30 rounded-xl p-5 max-w-sm w-full text-center">
            <h3 className="text-white font-bold">¿Eliminar Credencial?</h3>
            <div className="flex gap-3 mt-4">
              <button onClick={() => setIdParaEliminar(null)} className="flex-1 bg-slate-800 text-slate-300 py-2 rounded-lg border-0 cursor-pointer hover:bg-slate-700">Cancelar</button>
              <button onClick={eliminarDocente} className="flex-1 bg-red-600 text-white py-2 rounded-lg border-0 cursor-pointer hover:bg-red-500">Eliminar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
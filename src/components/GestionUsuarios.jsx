import React, { useState, useEffect } from 'react';
import { db } from '../firebase'; 
import { ref, onValue, set, remove } from 'firebase/database';

const generarUID = () => {
  const caracteres = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 3; i++) {
    result += caracteres.charAt(Math.floor(Math.random() * caracteres.length));
  }
  return result;
};

export default function GestionUsuarios() {
  const [docentes, setDocentes] = useState([]);
  const [mostrarFormulario, setMostrarFormulario] = useState(false); 
  
  const [nombre, setNombre] = useState('');
  const [correo, setCorreo] = useState(''); 
  const [uid, setUid] = useState(generarUID());
  const [laboratorio, setLab] = useState('💻 Lab. Cómputo');
  
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

  useEffect(() => {
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

  // --- LÓGICA DE VALIDACIÓN DE CHOQUE DE HORARIOS MULTI-LAB ---
  const agregarHorario = () => {
    const inicioStr = `${inicioHora}:${inicioMin} ${inicioAmPm}`;
    const finStr = `${finHora}:${finMin} ${finAmPm}`;

    const convertirAMinutos = (horaStr) => {
      if (!horaStr) return 0;
      const [hora, ampm] = horaStr.split(' ');
      let [h, m] = hora.split(':').map(Number);
      if (ampm === 'PM' && h !== 12) h += 12;
      if (ampm === 'AM' && h === 12) h = 0;
      return h * 60 + m;
    };

    const nuevoInicioMin = convertirAMinutos(inicioStr);
    const nuevoFinMin = convertirAMinutos(finStr);

    if (nuevoInicioMin >= nuevoFinMin) {
        return lanzarToast('⚠️ La hora de inicio debe ser antes que la de cierre');
    }

    // Mapeo técnico de terminal para el hardware
    let idTerminal = 'LAB_COMPUTO';
    if (laboratorio.includes('Electrónica')) idTerminal = 'LAB_ELECTRONICA';
    if (laboratorio.includes('Química')) idTerminal = 'LAB_QUIMICA';

    let choqueDetectado = false;
    let mensajeChoque = '';

    // 1. Revisión interna en el formulario actual (mismo día y mismo laboratorio)
    for (let horario of horariosEdicion) {
      if (horario.dia === dia && horario.id_terminal === idTerminal) {
        const inicioExistente = convertirAMinutos(horario.inicio);
        const finExistente = convertirAMinutos(horario.fin);
        if (nuevoInicioMin < finExistente && nuevoFinMin > inicioExistente) {
           choqueDetectado = true;
           mensajeChoque = `🛑 Choque interno para el ${dia} en este mismo laboratorio`;
           break;
        }
      }
    }

    // 2. Revisión contra otros docentes en la BD (Mismo laboratorio, día y cruce de horas)
    if (!choqueDetectado) {
        for (let doc of docentes) {
            if (doc.id === docenteEnEdicion) continue; 
            
            if (doc.horarios) {
                for (let h of doc.horarios) {
                    // Fallback adaptativo: si el horario viejo no tiene id_terminal, asume el global del docente
                    const internalTerm = h.id_terminal || (doc.laboratorio?.includes('Electrónica') ? 'LAB_ELECTRONICA' : doc.laboratorio?.includes('Química') ? 'LAB_QUIMICA' : 'LAB_COMPUTO');
                    
                    if (h.dia === dia && internalTerm === idTerminal) {
                        const inicioExistente = convertirAMinutos(h.inicio);
                        const finExistente = convertirAMinutos(h.fin);
                        
                        if (nuevoInicioMin < finExistente && nuevoFinMin > inicioExistente) {
                            choqueDetectado = true;
                            mensajeChoque = `🛑 Choque con ${doc.nombre} (${dia} en ${laboratorio.replace(/[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDC00-\uDFFF]/g, '')}: ${h.inicio}-${h.fin})`;
                            break;
                        }
                    }
                }
            }
            if (choqueDetectado) break;
        }
    }

    if (choqueDetectado) {
        return lanzarToast(mensajeChoque);
    }

    // Insertamos el bloque horario arrastrando las propiedades específicas de su destino
    setHorariosEdicion([...horariosEdicion, { 
      dia, 
      inicio: inicioStr, 
      fin: finStr, 
      id_terminal: idTerminal, 
      laboratorio_texto: laboratorio 
    }]);
  };

  const removerHorario = (index) => {
    setHorariosEdicion(horariosEdicion.filter((_, i) => i !== index));
  };

  const cargarParaEditar = (docente) => {
    setDocenteEnEdicion(docente.id); 
    setNombre(docente.nombre || '');
    setCorreo(docente.correo || ''); 
    setUid(docente.uid || generarUID()); 
    setLab(docente.laboratorio || '💻 Lab. Cómputo');
    setHorariosEdicion(docente.horarios ? [...docente.horarios] : []);
    setMostrarFormulario(true); 
  };

  const guardarDocente = async () => {
    if (!nombre || !uid || !correo) return lanzarToast('⚠️ Completa Nombre, Correo y UID');
    if (horariosEdicion.length === 0) return lanzarToast('⚠️ Añade al menos un horario');

    const uidDuplicado = docentes.some(doc => doc.uid === uid.toUpperCase() && doc.id !== docenteEnEdicion);
    if (uidDuplicado) return lanzarToast('🛑 Ese UID de tarjeta ya está en uso');

    const idUnico = docenteEnEdicion ? docenteEnEdicion : crypto.randomUUID();
    const pinExistente = docenteEnEdicion ? docentes.find(d => d.id === idUnico)?.pin || '' : '';
    
    const docenteData = {
      id: idUnico,
      nombre,
      correo,
      uid: uid.toUpperCase(),
      pin: pinExistente, 
      horarios: horariosEdicion, // Array con encapsulación individual de laboratorios
      estado: docenteEnEdicion ? docentes.find(d => d.id === idUnico)?.estado || 'Habilitado' : 'Habilitado'
    };

    try {
      // Sincronización en espejo para paneles web y terminales IoT
      await set(ref(db, `docentes/${idUnico}`), docenteData);
      await set(ref(db, `laboratorio/usuarios/${idUnico}`), {
        nombre: docenteData.nombre,
        correo: docenteData.correo,
        habilitado: docenteData.estado === 'Habilitado',
        uid: docenteData.uid,
        pin: docenteData.pin,
        horarios: docenteData.horarios // El ESP32 mapeará este array directamente
      });

      lanzarToast(docenteEnEdicion ? '¡Editado correctamente! ✏️' : '¡Usuario creado! ⚡');
      limpiarFormulario();
    } catch (e) {
      lanzarToast('❌ Error al guardar');
      console.error(e);
    }
  };

  const alternarEstado = async (docente) => {
    let nuevoEstado = 'Habilitado';
    if (docente.estado === 'Habilitado') {
      nuevoEstado = 'Deshabilitado';
    } else if (docente.estado === 'Deshabilitado') {
      nuevoEstado = 'Habilitado';
    } 
    
    try {
      await set(ref(db, `docentes/${docente.id}/estado`), nuevoEstado);
      await set(ref(db, `laboratorio/usuarios/${docente.id}/habilitado`), nuevoEstado === 'Habilitado');
      lanzarToast(`Estado actualizado a: ${nuevoEstado} 🔄`);
    } catch (error) {
      console.error("Error al cambiar estado:", error);
      lanzarToast('❌ Error al cambiar estado');
    }
  };

  const eliminarDocente = async () => {
    if (idParaEliminar) {
      try {
        await set(ref(db, `docentes/${idParaEliminar}/estado`), 'Inhabilitado');
        await set(ref(db, `laboratorio/usuarios/${idParaEliminar}/habilitado`), false);
        lanzarToast('🚫 Credencial inhabilitada (Registro conservado)');
        setIdParaEliminar(null);
      } catch (error) {
        lanzarToast('❌ Error al inhabilitar');
        console.error(error);
      }
    }
  };

  const limpiarFormulario = () => {
    setDocenteEnEdicion(null);
    setNombre(''); setCorreo(''); setUid(generarUID());
    setHorariosEdicion([]); setRelojActivo(null); setMostrarFormulario(false); 
  };

  const obtenerTextoLab = (lab) => {
    if (!lab) return '';
    return lab.replace(/[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDC00-\uDFFF]/g, '').trim();
  };

  return (
    <div className="space-y-6 animate-fade-in-up">
      {toast && (
        <div className="fixed top-6 right-6 z-50 flex items-center gap-3 px-5 py-3.5 rounded-xl border bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 shadow-2xl transition-all duration-300 animate-slide-in">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-600 dark:bg-emerald-500 animate-pulse"></div>
          <span className="text-sm font-bold text-slate-800 dark:text-white tracking-wide">{toast}</span>
        </div>
      )}

      {!mostrarFormulario && (
        <div className="flex justify-end">
          <button 
            onClick={() => { limpiarFormulario(); setMostrarFormulario(true); }} 
            className="bg-emerald-700 hover:bg-emerald-600 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white px-5 py-3 rounded-xl font-bold border-0 cursor-pointer shadow-md hover:shadow-lg text-sm transition-all flex items-center gap-2 tracking-wide"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Nuevo Usuario
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {mostrarFormulario && (
          <div className="bg-white dark:bg-[#1E293B] p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col gap-4 h-fit lg:col-span-1 transition-all duration-300">
            <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-700 pb-3.5">
              <h2 className="text-emerald-700 dark:text-emerald-400 font-bold text-base flex items-center gap-2">
                {docenteEnEdicion ? (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" /></svg>
                )}
                {docenteEnEdicion ? 'Editar Registro' : 'Nueva Credencial'}
              </h2>
              <button onClick={limpiarFormulario} className="text-xs font-bold text-slate-400 hover:text-red-500 bg-transparent border-0 cursor-pointer transition-colors">Cancelar</button>
            </div>
            
            <div className="flex flex-col gap-3.5">
              <div>
                <label className="text-xs font-bold tracking-wider text-slate-400 uppercase">Nombre del Titular</label>
                <input type="text" value={nombre} onChange={e => setNombre(e.target.value)} className="w-full mt-1.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg px-3.5 py-2.5 text-sm text-slate-800 dark:text-white outline-none focus:border-emerald-600 transition-colors" placeholder="Ej. Dr. Alejandro Porras" />
              </div>
              
              <div>
                <label className="text-xs font-bold tracking-wider text-slate-400 uppercase">Institucional E-mail</label>
                <input type="email" value={correo} onChange={e => setCorreo(e.target.value)} placeholder="nombre@universidad.edu.pe" className="w-full mt-1.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg px-3.5 py-2.5 text-sm text-slate-800 dark:text-white outline-none focus:border-emerald-600 transition-colors" />
              </div>

              <div>
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold tracking-wider text-slate-400 uppercase">Token UID (Físico RFID)</label>
                  {!docenteEnEdicion && (
                    <button onClick={() => setUid(generarUID())} className="text-xs text-emerald-600 dark:text-emerald-400 bg-transparent border-0 cursor-pointer font-bold flex items-center gap-1 hover:underline">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg> Autogenerar
                    </button>
                  )}
                </div>
                <input type="text" maxLength="8" value={uid} onChange={e => setUid(e.target.value.toUpperCase())} className="w-full mt-1.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg px-3.5 py-2.5 text-sm text-slate-800 dark:text-white font-mono uppercase tracking-widest outline-none focus:border-emerald-600 transition-colors" />
              </div>

              <div className="bg-slate-50 dark:bg-[#111827]/30 p-4 rounded-xl border border-slate-200 dark:border-slate-800 mt-1">
                <label className="text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase block mb-2.5 tracking-wide">Programar Franja de Acceso</label>
                
                <div className="relative">
                  <label className="text-xs font-bold tracking-wider text-slate-400 uppercase">Zona de Laboratorio</label>
                  <div className="relative mt-1.5">
                    <select 
                      value={laboratorio} 
                      onChange={e => setLab(e.target.value)} 
                      className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg pl-3.5 pr-10 py-2.5 text-sm text-slate-800 dark:text-white cursor-pointer outline-none focus:border-emerald-600 appearance-none font-medium"
                    >
                      <option value="💻 Lab. Cómputo">Lab. Cómputo</option>
                      <option value="⚡ Lab. Electrónica">Lab. Electrónica</option>
                      <option value="🧪 Lab. Química">Lab. Química</option>
                    </select>
                    <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-slate-400">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col gap-3">
                  <select value={dia} onChange={e => setDia(e.target.value)} className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md p-2 text-xs text-slate-800 dark:text-white outline-none cursor-pointer">
                    <option>Lunes</option><option>Martes</option><option>Miércoles</option><option>Jueves</option><option>Viernes</option><option>Sábado</option>
                  </select>
                  
                  <div className="flex gap-2">
                    <div className="relative w-1/2">
                      <div 
                        onClick={() => setRelojActivo(relojActivo === 'inicio' ? null : 'inicio')} 
                        className={`w-full border rounded-md bg-white dark:bg-slate-800 p-2.5 flex items-center justify-center relative cursor-pointer shadow-sm transition-all ${relojActivo === 'inicio' ? 'border-emerald-600 ring-1 ring-emerald-600/20' : 'border-slate-200 dark:border-slate-700'}`}
                      >
                        <span className="absolute -top-2 left-1.5 bg-slate-50 dark:bg-[#1A2332] px-1 text-[8px] text-slate-400 uppercase font-bold">Apertura</span>
                        <span className="text-slate-800 dark:text-white text-xs font-bold">{inicioHora}:{inicioMin} <span className="text-emerald-600 font-bold">{inicioAmPm}</span></span>
                      </div>

                      {relojActivo === 'inicio' && (
                        <div className="absolute top-full left-0 mt-1.5 z-50 bg-white dark:bg-[#0B1320] border border-slate-200 dark:border-slate-700 shadow-2xl rounded-xl p-2.5 w-[210px]">
                          <div className="flex gap-1 h-32">
                            <div className="w-1/3 overflow-y-auto flex flex-col gap-0.5 pr-0.5 [&::-webkit-scrollbar]:w-[3px] [&::-webkit-scrollbar-thumb]:bg-slate-300 dark:[&::-webkit-scrollbar-thumb]:bg-slate-700 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-track]:bg-transparent">
                              {listaHoras.map(h => <button key={h} type="button" onClick={() => setInicioHora(h)} className={`py-1 text-xs font-bold rounded border-0 cursor-pointer ${inicioHora === h ? 'bg-emerald-600 text-white' : 'bg-transparent text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>{h}</button>)}
                            </div>
                            <div className="w-1/3 overflow-y-auto flex flex-col gap-0.5 border-l border-slate-100 dark:border-slate-800 pl-1 pr-0.5 [&::-webkit-scrollbar]:w-[3px] [&::-webkit-scrollbar-thumb]:bg-slate-300 dark:[&::-webkit-scrollbar-thumb]:bg-slate-700 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-track]:bg-transparent">
                              {listaMinutos.map(m => <button key={m} type="button" onClick={() => setInicioMin(m)} className={`py-1 text-xs font-bold rounded border-0 cursor-pointer ${inicioMin === m ? 'bg-emerald-600 text-white' : 'bg-transparent text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>{m}</button>)}
                            </div>
                            <div className="w-1/3 flex flex-col gap-1 border-l border-slate-100 dark:border-slate-800 pl-1 justify-center">
                              {['AM','PM'].map(f => <button key={f} type="button" onClick={() => setInicioAmPm(f)} className={`py-1 text-[10px] font-bold rounded border-0 cursor-pointer ${inicioAmPm === f ? 'bg-emerald-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}>{f}</button>)}
                              <button type="button" onClick={() => setRelojActivo(null)} className="mt-1.5 bg-slate-700 text-white text-[9px] py-1 rounded font-bold border-0 cursor-pointer">Listo</button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="relative w-1/2">
                      <div 
                        onClick={() => setRelojActivo(relojActivo === 'fin' ? null : 'fin')} 
                        className={`w-full border rounded-md bg-white dark:bg-slate-800 p-2.5 flex items-center justify-center relative cursor-pointer shadow-sm transition-all ${relojActivo === 'fin' ? 'border-orange-400 ring-1 ring-orange-400/20' : 'border-slate-200 dark:border-slate-700'}`}
                      >
                        <span className="absolute -top-2 left-1.5 bg-slate-50 dark:bg-[#1A2332] px-1 text-[8px] text-slate-400 uppercase font-bold">Cierre</span>
                        <span className="text-slate-800 dark:text-white text-xs font-bold">{finHora}:{finMin} <span className="text-orange-500 font-bold">{finAmPm}</span></span>
                      </div>

                      {relojActivo === 'fin' && (
                        <div className="absolute top-full left-0 mt-1.5 z-50 bg-white dark:bg-[#0B1320] border border-slate-200 dark:border-slate-700 shadow-2xl rounded-xl p-2.5 w-[210px]">
                          <div className="flex gap-1 h-32">
                            <div className="w-1/3 overflow-y-auto flex flex-col gap-0.5 pr-0.5 [&::-webkit-scrollbar]:w-[3px] [&::-webkit-scrollbar-thumb]:bg-slate-300 dark:[&::-webkit-scrollbar-thumb]:bg-slate-700 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-track]:bg-transparent">
                              {listaHoras.map(h => <button key={h} type="button" onClick={() => setFinHora(h)} className={`py-1 text-xs font-bold rounded border-0 cursor-pointer ${finHora === h ? 'bg-orange-500 text-white' : 'bg-transparent text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>{h}</button>)}
                            </div>
                            <div className="w-1/3 overflow-y-auto flex flex-col gap-0.5 border-l border-slate-100 dark:border-slate-800 pl-1 pr-0.5 [&::-webkit-scrollbar]:w-[3px] [&::-webkit-scrollbar-thumb]:bg-slate-300 dark:[&::-webkit-scrollbar-thumb]:bg-slate-700 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-track]:bg-transparent">
                              {listaMinutos.map(m => <button key={m} type="button" onClick={() => setFinMin(m)} className={`py-1 text-xs font-bold rounded border-0 cursor-pointer ${finMin === m ? 'bg-orange-500 text-white' : 'bg-transparent text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>{m}</button>)}
                            </div>
                            <div className="w-1/3 flex flex-col gap-1 border-l border-slate-100 dark:border-slate-800 pl-1 justify-center">
                              {['AM','PM'].map(f => <button key={f} type="button" onClick={() => setFinAmPm(f)} className={`py-1 text-[10px] font-bold rounded border-0 cursor-pointer ${finAmPm === f ? 'bg-orange-500 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}>{f}</button>)}
                              <button type="button" onClick={() => setRelojActivo(null)} className="mt-1.5 bg-slate-700 text-white text-[9px] py-1 rounded font-bold border-0 cursor-pointer">Listo</button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                  </div>
                </div>

                <button onClick={agregarHorario} className="w-full bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-600 rounded-lg py-2 mt-4 text-xs font-bold cursor-pointer transition-all shadow-sm flex items-center justify-center gap-1.5">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg> Vincular Bloque Horario
                </button>

                {horariosEdicion.length > 0 && (
                  <div className="mt-3.5 flex flex-col gap-2 border-t border-slate-200 dark:border-slate-700 pt-3">
                    {horariosEdicion.map((h, i) => (
                      <div key={i} className="flex justify-between items-center bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-2 rounded-xl shadow-sm">
                        <span className="text-xs text-slate-700 dark:text-white font-bold flex items-center gap-1.5">
                          <svg className="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                          {h.laboratorio_texto} - {h.dia}: <span className="text-slate-500 dark:text-slate-400 font-normal">{h.inicio} - {h.fin}</span>
                        </span>
                        <button onClick={() => removerHorario(i)} className="text-red-500 hover:text-red-600 bg-transparent border-0 cursor-pointer font-bold text-xs p-1">✕</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <button onClick={guardarDocente} className="w-full bg-emerald-700 hover:bg-emerald-600 text-white font-bold rounded-xl py-3.5 mt-2 border-0 cursor-pointer shadow-md transition-all text-sm tracking-wide flex items-center justify-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                SINCRONIZAR DATOS
              </button>
            </div>
          </div>
        )}

        <div className={`bg-white dark:bg-[#1E293B] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden transition-all duration-300 ${mostrarFormulario ? 'lg:col-span-2' : 'lg:col-span-3'}`}>
          <div className="p-5 bg-slate-50 dark:bg-[#111827]/30 border-b border-slate-200 dark:border-slate-800 flex items-center gap-2">
            <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
            <h2 className="font-bold text-slate-800 dark:text-white text-base">Personal con Acceso Autorizado</h2>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-[#111827]/40 text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                  <th className="p-4 pl-6">Docente</th>
                  <th className="p-4">Credenciales</th>
                  <th className="p-4">Laboratorio</th>
                  <th className="p-4">Horarios Habilitados</th>
                  <th className="p-4 text-center">Estado de Red</th>
                  <th className="p-4 pr-6 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/40 text-sm text-slate-700 dark:text-slate-300">
                {docentes.map(doc => (
                  <tr key={doc.id} className={`hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors ${doc.estado === 'Inhabilitado' ? 'opacity-60 bg-slate-50 dark:bg-slate-900/40' : ''}`}>
                    
                    <td className="p-4 pl-6">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 shadow-sm">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                        </div>
                        <div>
                          <div className="font-bold text-slate-800 dark:text-white text-sm">
                            {doc.nombre} 
                            {doc.estado === 'Inhabilitado' && <span className="text-[10px] text-rose-500 ml-2 border border-rose-200 px-1.5 py-0.5 rounded uppercase tracking-widest bg-rose-50 dark:bg-rose-900/30 dark:border-rose-800">Inhabilitado</span>}
                          </div>
                          {doc.correo && <div className="text-xs text-slate-400 font-medium mt-0.5">{doc.correo}</div>}
                        </div>
                      </div>
                    </td>
                    
                    <td className="p-4">
                      <div className={`font-mono font-bold text-xs flex items-center gap-1.5 ${doc.estado === 'Inhabilitado' ? 'text-slate-400 line-through' : 'text-emerald-600 dark:text-emerald-400'}`}>
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 7a2 2 0 012 2m4 0a6 6 0 11-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" /></svg>
                        {doc.uid}
                      </div>
                      <div className="text-[11px] text-slate-400 mt-1 font-medium flex items-center gap-1">
                        <svg className="w-3 h-3 text-slate-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                        {doc.pin ? 'PIN: Sincronizado' : 'Sin PIN Móvil'}
                      </div>
                    </td>
                    
                    <td className="p-4">
                      <span className="text-slate-800 dark:text-slate-200 font-bold text-xs bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm">
                        {obtenerTextoLab(doc.laboratorio)}
                      </span>
                    </td>
                    
                    <td className="p-4">
                      <div className="flex flex-col gap-1.5 max-w-[210px]">
                        {doc.horarios?.map((h, idx) => (
                          <span key={idx} className="bg-slate-50 dark:bg-slate-800/40 px-2 py-1 rounded-md border border-slate-100 dark:border-slate-700/60 text-[11px] font-semibold text-slate-600 dark:text-slate-400 flex items-center gap-1.5 truncate">
                            <svg className="w-3 h-3 text-slate-400 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                            {h.dia}: {h.inicio} - {h.fin}
                          </span>
                        ))}
                      </div>
                    </td>
                    
                    <td className="p-4 text-center">
                      <button 
                        onClick={() => alternarEstado(doc)} 
                        className={`px-3 py-1.5 rounded-xl border text-[11px] font-extrabold cursor-pointer uppercase tracking-wider transition-all ${
                          doc.estado === 'Habilitado' 
                            ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/40 hover:bg-emerald-100' 
                            : doc.estado === 'Deshabilitado'
                              ? 'bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800/40 hover:bg-amber-100'
                              : 'bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-800/40 hover:bg-rose-100'
                        }`}
                        title={doc.estado === 'Inhabilitado' ? "Click para volver a habilitar" : "Alternar estado de red"}
                      >
                        {doc.estado}
                      </button>
                    </td>
                    
                    <td className="p-4 pr-6 text-center whitespace-nowrap">
                      <div className="flex justify-center items-center gap-2">
                        <button 
                          onClick={() => cargarParaEditar(doc)} 
                          className="p-2 rounded-lg bg-slate-50 hover:bg-blue-50 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-400 hover:text-blue-500 border border-slate-200 dark:border-slate-700 cursor-pointer shadow-sm transition-all"
                          title="Modificar registro"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                        </button>
                        <button 
                          onClick={() => setIdParaEliminar(doc.id)} 
                          disabled={doc.estado === 'Inhabilitado'}
                          className={`p-2 rounded-lg border cursor-pointer shadow-sm transition-all ${doc.estado === 'Inhabilitado' ? 'bg-slate-100 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-300 dark:text-slate-700 cursor-not-allowed' : 'bg-slate-50 hover:bg-red-50 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-400 hover:text-red-500 border-slate-200 dark:border-slate-700'}`}
                          title="Revocar credencial"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {idParaEliminar && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 dark:bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-700 rounded-2xl p-6 max-w-sm w-full text-center shadow-xl animate-fade-in-up">
            <div className="w-12 h-12 bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 rounded-full flex items-center justify-center mx-auto mb-3.5">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
            </div>
            <h3 className="text-slate-900 dark:text-white font-bold text-lg">¿Inhabilitar Docente?</h3>
            <p className="text-slate-500 dark:text-slate-400 text-sm mt-1.5 font-medium leading-relaxed">Esta acción bloqueará su tarjeta física y llave PIN de inmediato. El registro se conservará por motivos de auditoría en estado "Inhabilitado".</p>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setIdParaEliminar(null)} className="flex-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 py-2.5 rounded-xl border-0 cursor-pointer font-bold text-sm hover:bg-slate-200 transition-colors">Cancelar</button>
              <button onClick={eliminarDocente} className="flex-1 bg-rose-600 hover:bg-rose-500 text-white py-2.5 rounded-xl border-0 cursor-pointer font-bold text-sm shadow-md transition-colors">Confirmar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
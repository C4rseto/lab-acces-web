import React, { useState, useEffect } from 'react';
import { db, auth } from '../firebase'; 
import { ref, onValue, update } from 'firebase/database';
import { registrarAuditoriaWeb } from '../utils/auditLogger';
import { generarHashSHA256 } from '../utils/crypto';

export default function GestionAdministradores() {
  const [admins, setAdmins] = useState([]);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [toast, setToast] = useState(null);
  const [sedesBD, setSedesBD] = useState({});

  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [authUid, setAuthUid] = useState('');
  const [uidTarjeta, setUidTarjeta] = useState('');
  const [pinPlano, setPinPlano] = useState('');
  const [rol, setRol] = useState('ADMIN_SEDE');
  const [sede, setSede] = useState('TODAS'); // Default a TODAS

  useEffect(() => {
    // 1. Escuchar Administradores
    const unsubAdmins = onValue(ref(db, 'administradores'), (snapshot) => {
      const data = snapshot.val();
      setAdmins(data ? Object.entries(data).map(([key, value]) => ({ id: key, ...value })) : []);
    });

    // 2. Escuchar la Estructura de Sedes
    const unsubSedes = onValue(ref(db, 'sedes'), (snapshot) => {
      if (snapshot.exists()) setSedesBD(snapshot.val());
    });

    return () => { unsubAdmins(); unsubSedes(); };
  }, []);

  // LÓGICA DINÁMICA DE EXTRACCIÓN DE TERMINALES
  const generarHorarioInfinito = (sedeSeleccionada) => {
    const dias = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
    let terminales = [];

    if (sedeSeleccionada === "TODAS") {
      // El Super-Admin obtiene TODOS los laboratorios de TODAS las sedes
      Object.values(sedesBD).forEach(sedeObj => {
        if (sedeObj.laboratorios) {
          terminales = [...terminales, ...Object.keys(sedeObj.laboratorios)];
        }
      });
    } else if (sedesBD[sedeSeleccionada] && sedesBD[sedeSeleccionada].laboratorios) {
      // El Admin Local obtiene solo los laboratorios de su Sede específica
      terminales = Object.keys(sedesBD[sedeSeleccionada].laboratorios);
    }

    const horarios = [];
    dias.forEach(dia => {
      terminales.forEach(term => {
        horarios.push({ dia: dia, inicio: "00:00", fin: "23:59", id_terminal: term });
      });
    });
    return horarios;
  };

  const guardarAdministrador = async (e) => {
    e.preventDefault();
    if (!nombre || !email || !authUid || !uidTarjeta || pinPlano.length !== 4) {
      return lanzarToast('⚠️ Completa todos los campos correctamente y usa un PIN de 4 dígitos.');
    }

    try {
      // 1. Hashear el PIN con la utilidad local
      const pinHasheado = await generarHashSHA256(pinPlano);
      
      // 2. Generar el bypass de horarios
      const horarios247 = generarHorarioInfinito(sede);

      // 3. Preparar el objeto ATÓMICO (Escritura en dos nodos simultáneamente)
      const atomicUpdates = {};

      // -> A) Perfil Web
      atomicUpdates[`administradores/${authUid}`] = {
        nombre,
        email,
        rol,
        sede,
        uid_tarjeta: uidTarjeta.toUpperCase(),
        estado: 'ACTIVO'
      };

      // -> B) Credencial de Hardware para el ESP32
      atomicUpdates[`laboratorio/usuarios/${uidTarjeta.toUpperCase()}`] = {
        nombre: `ADMIN: ${nombre}`, // Etiqueta identificable en logs de hardware
        habilitado: true,
        uid: uidTarjeta.toUpperCase(),
        pin: pinHasheado,
        laboratorio: sede === 'TODAS' ? 'Acceso Global' : sede,
        horarios: horarios247 // El pase mágico 24/7
      };

      // 4. Ejecutar Dual-Write
      await update(ref(db), atomicUpdates);

      // 5. Registrar en la auditoría inmutable
      await registrarAuditoriaWeb(
        auth.currentUser, 
        "NUEVO_ADMIN", 
        `Registró al administrador ${nombre} (${rol}) con acceso a ${sede}`
      );

      lanzarToast('¡Admin registrado y sincronizado en hardware! ⚡');
      setMostrarFormulario(false);
      // Reset form
      setNombre(''); setEmail(''); setAuthUid(''); setUidTarjeta(''); setPinPlano('');
    } catch (error) {
      console.error(error);
      lanzarToast('❌ Error de seguridad al guardar.');
    }
  };

  const resetearPinAdministrador = async (uidTarjeta, nombreAdmin) => {
    const nuevoPin = prompt(`Ingrese el nuevo PIN de 4 dígitos para el administrador ${nombreAdmin}:`);
    
    // Validamos que haya escrito 4 números
    if (nuevoPin && /^\d{4}$/.test(nuevoPin)) {
      try {
        // Encriptamos el nuevo PIN
        const pinHasheado = await generarHashSHA256(nuevoPin);
        
        // Lo inyectamos directo a la credencial del ESP32
        await update(ref(db, `laboratorio/usuarios/${uidTarjeta}`), {
          pin: pinHasheado
        });

        // Dejamos registro inmutable
        await registrarAuditoriaWeb(
          auth.currentUser,
          "RESETEO_PIN_ADMIN",
          `Restableció el PIN físico de la tarjeta maestra ${uidTarjeta} (${nombreAdmin})`
        );

        lanzarToast('¡PIN actualizado y sincronizado con las puertas! 🔑');
      } catch (error) {
        console.error("Error al resetear PIN:", error);
        lanzarToast('❌ Hubo un error de conexión.');
      }
    } else if (nuevoPin) {
      alert("El PIN debe contener exactamente 4 números.");
    }
  };

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Sistema de Toast */}
      {toast && (
        <div className="fixed top-6 right-6 z-50 flex items-center gap-3 px-5 py-3.5 rounded-xl border bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 shadow-2xl animate-slide-in">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-600 dark:bg-emerald-500 animate-pulse"></div>
          <span className="text-sm font-bold text-slate-800 dark:text-white">{toast}</span>
        </div>
      )}

      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white flex items-center gap-3">
            Gestión de Administradores
            <span className="bg-rose-100 dark:bg-rose-500/10 text-rose-600 dark:text-rose-500 border border-rose-200 dark:border-rose-500/20 text-[10px] px-2 py-0.5 rounded-md uppercase tracking-widest font-extrabold">Acceso Restringido</span>
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-2 text-sm font-medium">Asignación de roles y credenciales universales de hardware.</p>
        </div>
        {!mostrarFormulario && (
          <button onClick={() => setMostrarFormulario(true)} className="bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-3 rounded-xl font-bold cursor-pointer shadow-md text-sm transition-all flex gap-2">
            + Nuevo Administrador
          </button>
        )}
      </div>

      {/* FORMULARIO DE ALTA */}
      {mostrarFormulario && (
        <div className="bg-white dark:bg-[#1E293B] p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-700 pb-4 mb-5">
            <h2 className="text-emerald-700 dark:text-emerald-400 font-bold">Alta de Superusuario / Admin de Sede</h2>
            <button onClick={() => setMostrarFormulario(false)} className="text-xs font-bold text-slate-400 hover:text-rose-500 cursor-pointer border-0 bg-transparent">Cancelar</button>
          </div>

          <form onSubmit={guardarAdministrador} className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* IDENTIDAD WEB */}
            <div className="space-y-4 border-r border-slate-100 dark:border-slate-700/50 pr-5">
              <h3 className="text-[10px] text-blue-600 dark:text-blue-400 font-extrabold uppercase tracking-widest">1. Identidad Web</h3>
              
              <div>
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Nombre Completo</label>
                <input required type="text" value={nombre} onChange={e => setNombre(e.target.value)} className="w-full mt-1.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-800 dark:text-white focus:border-emerald-500 outline-none" />
              </div>
              
              <div>
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Correo (Login App)</label>
                <input required type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full mt-1.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-800 dark:text-white focus:border-emerald-500 outline-none" />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase flex items-center gap-2">
                  UID de Auth (Consola Firebase)
                </label>
                <input required type="text" value={authUid} onChange={e => setAuthUid(e.target.value)} className="w-full mt-1.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm font-mono text-emerald-600 dark:text-emerald-400 focus:border-emerald-500 outline-none" placeholder="Ej. Yx8zHk..." />
              </div>

              <div>
                 <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Rol del Sistema</label>
                 <select value={rol} onChange={e => setRol(e.target.value)} className="w-full mt-1.5 bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-800 dark:text-white outline-none cursor-pointer">
                    <option value="ADMIN_SEDE">Administrador Local (Admin Sede)</option>
                    <option value="SUPER_ADMIN">Super Administrador (Global)</option>
                 </select>
              </div>
            </div>

            {/* CREDENCIAL DE HARDWARE */}
            <div className="space-y-4 pl-2">
              <h3 className="text-[10px] text-orange-500 dark:text-orange-400 font-extrabold uppercase tracking-widest">2. Credencial Física ESP32</h3>
              
              <div>
                 <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Apertura 24/7 Permitida en:</label>
                 <select value={sede} onChange={e => setSede(e.target.value)} className="w-full mt-1.5 bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-800 dark:text-white outline-none cursor-pointer font-bold">
                    <option value="TODAS">🔥 ACCESO A TODAS LAS PUERTAS (Super-Admin)</option>
                    
                    {/* Renderizado dinámico desde Firebase */}
                    {Object.entries(sedesBD).map(([keySede, datosSede]) => (
                      <option key={keySede} value={keySede}>
                        {datosSede.nombre} ({Object.keys(datosSede.laboratorios || {}).length} Labs)
                      </option>
                    ))}
                 </select>
              </div>

              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">UID Tarjeta RFID</label>
                  <input required type="text" maxLength="8" value={uidTarjeta} onChange={e => setUidTarjeta(e.target.value.toUpperCase())} className="w-full mt-1.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-800 dark:text-white font-mono uppercase focus:border-emerald-500 outline-none" placeholder="A1B2C3D4"/>
                </div>
                <div className="w-1/3">
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">PIN Inicial</label>
                  <input required type="password" maxLength="4" value={pinPlano} onChange={e => setPinPlano(e.target.value.replace(/[^0-9]/g, ''))} className="w-full mt-1.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-center text-slate-800 dark:text-white font-mono focus:border-emerald-500 outline-none tracking-widest" placeholder="1234"/>
                </div>
              </div>

              <div className="bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60 p-4 rounded-xl mt-4">
                <button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 mt-4 rounded-xl shadow-md transition-all text-sm flex justify-center gap-2 items-center cursor-pointer">
                  INCLUIR ADMINISTRADOR Y SINCRONIZAR
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* TABLA DE ADMINISTRADORES EXISTENTES */}
      <div className="bg-white dark:bg-[#1E293B] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-[#111827]/30">
          <h2 className="text-sm font-bold text-slate-800 dark:text-white">Equipo de Administración</h2>
        </div>
        <table className="w-full text-left">
          <thead>
            <tr className="bg-slate-50 dark:bg-[#111827]/40 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
              <th className="p-4 pl-6">Usuario</th>
              <th className="p-4">Credencial RFID</th>
              <th className="p-4">Rol & Sede Asignada</th>
              <th className="p-4 text-center">Estado</th>
              <th className="p-4">PIN</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/40 text-sm text-slate-700 dark:text-slate-300">
            {admins.map(adm => (
              <tr key={adm.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/20">
                <td className="p-4 pl-6">
                  <div className="font-bold text-slate-800 dark:text-white">{adm.nombre}</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 font-mono mt-0.5">{adm.email}</div>
                </td>
                <td className="p-4 font-mono text-emerald-600 dark:text-emerald-400 font-bold text-xs">{adm.uid_tarjeta}</td>
                <td className="p-4">
                  <div className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded w-max mb-1 border ${adm.rol === 'SUPER_ADMIN' ? 'bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-500/20' : 'bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-500/20'}`}>
                    {adm.rol}
                  </div>
                  <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">{adm.sede}</div>
                </td>
                <td className="p-4 text-center">
                  <span className="text-[10px] font-extrabold text-emerald-700 dark:text-emerald-400 uppercase tracking-widest bg-emerald-50 dark:bg-emerald-500/10 px-2 py-1 rounded border border-emerald-200 dark:border-emerald-500/20">
                    {adm.estado}
                  </span>
                </td>
                <td>
                    <button 
                      onClick={() => resetearPinAdministrador(adm.uid_tarjeta, adm.nombre)}
                      className="ml-2 text-[10px] bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-600 px-2 py-1 rounded hover:bg-emerald-100 hover:text-emerald-700 dark:hover:text-emerald-400 transition-colors cursor-pointer"
                      title="Asignar un nuevo PIN"
                    >
                      Reset PIN
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
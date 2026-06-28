import { useState, useEffect } from 'react';
import { ref, onValue, push, set, remove, update } from 'firebase/database';
import { db } from '../firebase';
import { Link } from 'react-router-dom';

// Función para cifrar el PIN en SHA-256 de forma nativa
const cifrarSHA256 = async (texto) => {
  const encoder = new TextEncoder();
  const data = encoder.encode(texto);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
};

export default function GestionUsuarios() {
  const [usuarios, setUsuarios] = useState([]);
  const [nombre, setNombre] = useState('');
  const [correo, setCorreo] = useState(''); // <-- Nuevo estado para el correo
  const [uid, setUid] = useState('');
  const [pin, setPin] = useState('');

  // Leer usuarios desde Firebase
  useEffect(() => {
    const usuariosRef = ref(db, 'laboratorio/usuarios');
    onValue(usuariosRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const lista = Object.keys(data).map(key => ({ id: key, ...data[key] }));
        setUsuarios(lista);
      } else {
        setUsuarios([]);
      }
    });
  }, []);

  // Guardar nuevo usuario con PIN cifrado y Correo
  const handleGuardar = async (e) => {
    e.preventDefault();
    if (!nombre || !correo || !uid || !pin) return alert("Llena todos los campos");

    try {
      // Ciframos el PIN antes de enviarlo a Firebase
      const pinCifrado = await cifrarSHA256(pin);

      const usuariosRef = ref(db, 'laboratorio/usuarios');
      const nuevoUsuarioRef = push(usuariosRef);
      
      await set(nuevoUsuarioRef, {
        nombre,
        correo, // <-- Guardamos el correo asociado
        uid: uid.toUpperCase().replace(/\s/g, ''),
        pin: pinCifrado, 
        habilitado: true
      });

      // Limpiar formulario
      setNombre('');
      setCorreo('');
      setUid('');
      setPin('');
      alert("Credencial y correo guardados con éxito.");
    } catch (error) {
      console.error("Error al guardar usuario:", error);
      alert("Hubo un error al procesar el registro.");
    }
  };

  // Cambiar estado (Habilitado/Revocado)
  const toggleAcceso = (id, estadoActual) => {
    const usuarioRef = ref(db, `laboratorio/usuarios/${id}`);
    update(usuarioRef, { habilitado: !estadoActual });
  };

  // Eliminar usuario
  const eliminarUsuario = (id) => {
    if(window.confirm("¿Estás seguro de eliminar esta credencial?")) {
      const usuarioRef = ref(db, `laboratorio/usuarios/${id}`);
      remove(usuarioRef);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans">
      {/* Barra de navegación superior */}
      <nav className="flex justify-between items-center p-4 bg-slate-900 border-b border-slate-800">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <span className="text-emerald-500 text-2xl">🛡️</span>
            <h1 className="text-xl font-bold">LabAccess</h1>
          </div>
          <div className="flex gap-4 ml-8 text-sm font-medium">
            <Link to="/dashboard" className="text-slate-400 hover:text-white transition-colors">Panel de Control</Link>
            <Link to="/usuarios" className="text-emerald-500 border-b-2 border-emerald-500 pb-1">Gestión de Usuarios</Link>
            <Link to="/prestamos" className="text-slate-400 hover:text-white transition-colors">Préstamos / Reservas</Link>
            <Link to="/cronograma" className="text-slate-400 hover:text-white transition-colors">Cronograma</Link>
          </div>
        </div>
      </nav>

      <div className="p-8 max-w-7xl mx-auto">
        <h2 className="text-3xl font-bold mb-8">Gestión de Accesos</h2>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Formulario Nueva Credencial */}
          <div className="bg-slate-900 p-6 rounded-xl border border-slate-800 shadow-lg h-fit">
            <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
              <span className="text-emerald-500">👤+</span> Nueva Credencial
            </h3>
            
            <form onSubmit={handleGuardar} className="space-y-4">
              <div>
                <label className="block text-sm text-slate-400 mb-1">Nombre del Docente</label>
                <input type="text" value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Ej. Prof. Juan Pérez" className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2 focus:outline-none focus:border-emerald-500 text-white" required />
              </div>
              
              {/* Nuevo campo de Correo */}
              <div>
                <label className="block text-sm text-slate-400 mb-1">Correo Institucional</label>
                <input type="email" value={correo} onChange={e => setCorreo(e.target.value)} placeholder="Ej. jperez@uni.edu" className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2 focus:outline-none focus:border-emerald-500 text-white" required />
              </div>

              <div>
                <label className="block text-sm text-slate-400 mb-1">UID de Tarjeta (RFID)</label>
                <input type="text" value={uid} onChange={e => setUid(e.target.value)} placeholder="Ej. A1B2C3D4" className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2 focus:outline-none focus:border-emerald-500 text-white" required />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">Código de Seguridad (PIN)</label>
                <input type="text" value={pin} onChange={e => setPin(e.target.value)} placeholder="Ej. 1234" maxLength="4" className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2 focus:outline-none focus:border-emerald-500 text-white" required />
              </div>
              <button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-3 px-4 rounded-lg mt-4 transition flex items-center justify-center gap-2">
                💾 Guardar y Sincronizar
              </button>
            </form>
          </div>

          {/* Lista de Usuarios Registrados */}
          <div className="lg:col-span-2 bg-slate-900 rounded-xl border border-slate-800 shadow-lg overflow-hidden">
            <div className="p-6 border-b border-slate-800">
              <h3 className="text-lg font-bold flex items-center gap-2">👥 Usuarios Registrados</h3>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-300">
                <thead className="text-xs text-slate-400 bg-slate-950/50 uppercase border-b border-slate-800">
                  <tr>
                    <th className="px-6 py-4">Docente</th>
                    <th className="px-6 py-4">Credenciales</th>
                    <th className="px-6 py-4 text-center">Acceso</th>
                    <th className="px-6 py-4 text-center">Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {usuarios.length === 0 ? (
                    <tr><td colSpan="4" className="px-6 py-8 text-center text-slate-500">No hay usuarios registrados.</td></tr>
                  ) : (
                    usuarios.map((user) => (
                      <tr key={user.id} className="border-b border-slate-800/50 hover:bg-slate-800/50 transition">
                        <td className="px-6 py-4">
                          <p className="font-medium text-white">{user.nombre}</p>
                          {/* Mostramos el correo debajo del nombre */}
                          <p className="text-xs text-slate-500 mt-1">📧 {user.correo || 'Sin correo'}</p>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-slate-300 font-mono text-xs mb-1">💳 {user.uid}</div>
                          <div className="text-emerald-500 text-xs font-mono flex items-center gap-1">
                            🔒 SHA-256: {user.pin ? `${user.pin.slice(0, 8)}...` : '---'}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <button onClick={() => toggleAcceso(user.id, user.habilitado)} className={`px-4 py-1 rounded-full text-xs font-bold transition ${user.habilitado ? 'bg-emerald-500 text-white' : 'bg-slate-700 text-slate-400'}`}>
                            {user.habilitado ? 'HABILITADO' : 'REVOCADO'}
                          </button>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <button onClick={() => eliminarUsuario(user.id)} className="text-slate-500 hover:text-red-500 transition text-lg">
                            🗑️
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
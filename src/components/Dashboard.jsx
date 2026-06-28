import { useState, useEffect } from 'react';
import { ref, onValue } from 'firebase/database';
import { db, auth } from '../firebase'; 
import { Link, useNavigate } from 'react-router-dom'; 
import { signOut } from 'firebase/auth'; 

export default function Dashboard() {
  const [estadoPestillo, setEstadoPestillo] = useState('CERRADO');
  const [logs, setLogs] = useState([]);
  const [ocupacion, setOcupacion] = useState({ cantidad: 0, personas: 'Nadie en el laboratorio' });
  const [alertasHoy, setAlertasHoy] = useState(0);
  const [pendientes, setPendientes] = useState(0);
  
  const navigate = useNavigate(); 

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate('/');
    } catch (error) {
      console.error("Error al cerrar sesión:", error);
    }
  };

  useEffect(() => {
    // 1. Escuchar pestillo
    const pestilloRef = ref(db, 'laboratorio/pestillo');
    onValue(pestilloRef, (snapshot) => {
      if (snapshot.exists()) setEstadoPestillo(snapshot.val().toUpperCase());
    });

    // 2. Escuchar logs
    const logsRef = ref(db, 'laboratorio/logs');
    onValue(logsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const logsArray = Object.keys(data).map(key => ({ id: key, ...data[key] }));
        setLogs(logsArray.reverse());
      }
    });

    // 3. Escuchar ocupación y alertas (estadoActual)
    const estadoRef = ref(db, 'laboratorio/estadoActual');
    onValue(estadoRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setOcupacion({ cantidad: data.ocupacionActual || 0, personas: data.personasDentro || 'Nadie' });
        setAlertasHoy(data.alertasHoy || 0);
      }
    });

    // 4. Escuchar solicitudes pendientes (¡Conectado a la app móvil!)
    const solicitudesRef = ref(db, 'reservas'); // <-- Apuntamos a la carpeta correcta
    onValue(solicitudesRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const lista = Object.values(data);
        const count = lista.filter(s => s.estado === 'pendiente').length;
        setPendientes(count);
      } else {
        setPendientes(0);
      }
    });
  }, []);

  // Exportar logs a Excel (CSV)
  const exportarExcel = () => {
    if (logs.length === 0) return alert("No hay datos para exportar");
    
    const cabeceras = ["Fecha y Hora", "ID / Credencial", "Metodo de Entrada", "Resultado", "Motivo"];
    const filas = logs.map(log => [
      log.fechaHora || '',
      log.credencial || '',
      log.metodo || '',
      log.resultado || '',
      log.motivo || ''
    ]);
    
    const csvContent = [
      cabeceras.join(","),
      ...filas.map(fila => fila.map(campo => `"${campo}"`).join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `auditoria_labaccess_${new Date().toLocaleDateString()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans">
      {/* Navegación */}
      <nav className="flex justify-between items-center p-4 bg-slate-900 border-b border-slate-800">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <span className="text-emerald-500 text-2xl">🛡️</span>
            <h1 className="text-xl font-bold">LabAccess</h1>
          </div>
          
          <div className="flex gap-4 ml-8 text-sm font-medium">
            <Link to="/dashboard" className="text-emerald-500 border-b-2 border-emerald-500 pb-1">Panel de Control</Link>
            <Link to="/usuarios" className="text-slate-400 hover:text-white transition-colors">Gestión de Usuarios</Link>
            <Link to="/prestamos" className="text-slate-400 hover:text-white transition-colors">Préstamos / Reservas</Link>
            <Link to="/cronograma" className="text-slate-400 hover:text-white transition-colors">Cronograma</Link>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <span className="text-slate-400 text-sm bg-slate-800 px-3 py-1 rounded-full">ID: ESP32-DevkitV1</span>
          <span className="text-emerald-500 text-sm bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-full flex items-center gap-2">
            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
            Admin Online
          </span>
          <button onClick={handleLogout} className="bg-red-600/10 hover:bg-red-600 text-red-500 hover:text-white border border-red-500/20 px-3 py-1 rounded-lg text-sm font-medium transition duration-200">
            🚪 Salir
          </button>
        </div>
      </nav>

      {/* Contenido */}
      <div className="p-8 max-w-7xl mx-auto">
        <div className="flex items-center gap-3 mb-1">
          <h2 className="text-3xl font-bold">Panel de Control Global</h2>
          <span className="bg-blue-600 text-white text-[10px] uppercase font-bold px-2 py-1 rounded-full tracking-wider mt-1">Modo Administrador</span>
        </div>
        <p className="text-slate-400 mb-8">Monitoreo de accesos, ocupación y alertas en tiempo real.</p>

        {/* Tarjetas Analíticas (4 columnas) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          
          {/* 1. Pestillo */}
          <div className="bg-slate-900 p-6 rounded-xl border border-slate-800 flex flex-col justify-between shadow-lg relative overflow-hidden">
            <div className="flex justify-between items-start mb-4">
              <p className="text-slate-400 text-xs font-bold tracking-wider uppercase">Estado del Pestillo</p>
              <div className={`p-2 rounded-lg border ${estadoPestillo === 'ABIERTO' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' : 'bg-red-500/10 border-red-500/20 text-red-500'}`}>
                {estadoPestillo === 'ABIERTO' ? '🔓' : '🔒'}
              </div>
            </div>
            <div>
              <h3 className={`text-3xl font-black tracking-tight ${estadoPestillo === 'ABIERTO' ? 'text-emerald-500' : 'text-red-500'}`}>
                {estadoPestillo}
              </h3>
              <p className="text-xs text-slate-500 mt-2 flex items-center gap-1">
                <span className={`w-1.5 h-1.5 rounded-full ${estadoPestillo === 'ABIERTO' ? 'bg-emerald-500' : 'bg-red-500'}`}></span>
                {estadoPestillo === 'ABIERTO' ? 'Acceso Permitido' : 'Bloqueo Activo'}
              </p>
            </div>
          </div>

          {/* 2. Ocupación */}
          <div className="bg-slate-900 p-6 rounded-xl border border-slate-800 flex flex-col justify-between shadow-lg">
            <div className="flex justify-between items-start mb-4">
              <p className="text-slate-400 text-xs font-bold tracking-wider uppercase">Ocupación Actual</p>
              <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-500">
                👥
              </div>
            </div>
            <div>
              <h3 className="text-3xl font-black tracking-tight text-white flex items-baseline gap-2">
                {ocupacion.cantidad} <span className="text-sm font-medium text-slate-400">personas</span>
              </h3>
              <p className="text-xs text-emerald-500 mt-2 truncate" title={ocupacion.personas}>
                {ocupacion.personas}
              </p>
            </div>
          </div>

          {/* 3. Alertas */}
          <div className="bg-slate-900 p-6 rounded-xl border border-slate-800 flex flex-col justify-between shadow-lg">
            <div className="flex justify-between items-start mb-4">
              <p className="text-slate-400 text-xs font-bold tracking-wider uppercase">Alertas de Seguridad</p>
              <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-500">
                ⚠️
              </div>
            </div>
            <div>
              <h3 className="text-3xl font-black tracking-tight text-white flex items-baseline gap-2">
                {alertasHoy} <span className="text-sm font-medium text-slate-400">alertas hoy</span>
              </h3>
              <p className="text-xs text-amber-500 mt-2">
                • Intentos fallidos / Fuera de horario
              </p>
            </div>
          </div>

          {/* 4. Reservas Pendientes */}
          <div className="bg-slate-900 p-6 rounded-xl border border-slate-800 flex flex-col justify-between shadow-lg">
            <div className="flex justify-between items-start mb-4">
              <p className="text-slate-400 text-xs font-bold tracking-wider uppercase">App Móvil: Reservas</p>
              <div className="p-2 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-500">
                📱
              </div>
            </div>
            <div>
              <h3 className="text-3xl font-black tracking-tight text-white flex items-baseline gap-2">
                {pendientes} <span className="text-sm font-medium text-slate-400">pendiente(s)</span>
              </h3>
              <Link to="/prestamos" className="text-xs text-blue-400 hover:text-blue-300 mt-2 inline-block transition">
                → Ir a pestaña Préstamos
              </Link>
            </div>
          </div>

        </div>

        {/* Tabla de Auditoría */}
        <div className="bg-slate-900 rounded-xl border border-slate-800 shadow-lg overflow-hidden">
          <div className="p-5 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
            <h3 className="text-lg font-bold flex items-center gap-2">🗄️ Auditoría en Tiempo Real</h3>
            <div className="flex items-center gap-4">
              <button onClick={exportarExcel} className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold px-4 py-2 rounded-lg transition flex items-center gap-2">
                📄 Exportar Excel
              </button>
              <span className="text-xs text-slate-400 flex items-center gap-1">
                <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span> Sincronizado con Firebase
              </span>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="text-xs text-slate-400 bg-slate-950/50 uppercase border-b border-slate-800">
                <tr>
                  <th className="px-6 py-4 font-medium tracking-wider">Fecha y Hora</th>
                  <th className="px-6 py-4 font-medium tracking-wider">ID / Credencial</th>
                  <th className="px-6 py-4 font-medium tracking-wider">Método de Entrada</th>
                  <th className="px-6 py-4 font-medium tracking-wider">Resultado</th>
                </tr>
              </thead>
              <tbody>
                {logs.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="px-6 py-8 text-center text-slate-500">No hay registros de acceso aún.</td>
                  </tr>
                ) : (
                  logs.map((log) => {
                    const isConcedido = log.resultado === 'Concedido';
                    return (
                      <tr key={log.id} className="border-b border-slate-800/50 hover:bg-slate-800/50 transition-colors">
                        <td className="px-6 py-4 text-slate-400">{log.fechaHora || '---'}</td>
                        <td className="px-6 py-4 font-mono font-medium text-white tracking-widest">{log.credencial || '---'}</td>
                        <td className="px-6 py-4 flex items-center gap-2">
                          <span className="text-emerald-500">💳</span> {log.metodo || '---'}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-3 py-1.5 rounded text-xs font-medium border flex items-center gap-1 w-fit ${
                            isConcedido 
                              ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' 
                              : 'bg-red-500/10 text-red-500 border-red-500/20'
                          }`}>
                            {isConcedido ? '✓ Concedido' : `✕ Denegado (${log.motivo || 'Error'})`}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}
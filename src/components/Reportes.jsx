import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { ref, onValue } from 'firebase/database';

export default function Reportes() {
  // Pestaña activa: 'reservas' o 'puerta'
  const [pestañaActiva, setPestañaActiva] = useState('reservas');

  // Estados de datos de Firebase
  const [historialReservas, setHistorialReservas] = useState([]);
  const [historialAccesos, setHistorialAccesos] = useState([]);
  const [usuariosHardware, setUsuariosHardware] = useState([]);

  // Estados de filtros globales
  const [filtroLab, setFiltroLab] = useState('Todos');
  const [filtroEstadoReserva, setFiltroEstadoReserva] = useState('Todos');
  const [filtroEventoAcceso, setFiltroEventoAcceso] = useState('Todos');

  // Estados para el filtro de fechas (YYYY-MM-DD)
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');

  const [laboratoriosDisponibles, setLaboratoriosDisponibles] = useState(['Todos']);
  const estadosReservas = ['Todos', 'aprobado', 'denegado'];
  const eventosAccesos = ['Todos', 'ACCESO_CONCEDIDO', 'ACCESO_DENEGADO', 'PUERTA_ABANDONADA'];

  useEffect(() => {
    const rolAdmin = localStorage.getItem('adminRol');
    const sedeAdmin = localStorage.getItem('adminSede');

    // Carga de Sedes (RBAC)
    onValue(ref(db, 'sedes'), (snapshot) => {
      const data = snapshot.val();
      if (data) {
        let labs = ['Todos'];
        if (rolAdmin === 'SUPER_ADMIN' || sedeAdmin === 'TODAS') {
          Object.values(data).forEach(sedeObj => {
            if(sedeObj.laboratorios) Object.values(sedeObj.laboratorios).forEach(v => labs.push(v));
          });
        } else if (data[sedeAdmin] && data[sedeAdmin].laboratorios) {
          Object.values(data[sedeAdmin].laboratorios).forEach(v => labs.push(v));
        }
        setLaboratoriosDisponibles([...new Set(labs)]); // Evita duplicados
      }
    });

    onValue(ref(db, 'reservas'), (snapshot) => {
      const data = snapshot.val();
      setHistorialReservas(data ? Object.keys(data).map(key => ({ id: key, ...data[key] })).filter(r => r.estado !== 'pendiente').reverse() : []);
    });

    onValue(ref(db, 'laboratorio/auditoria'), (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const logs = Object.keys(data).map(key => ({ id: key, ...data[key] })).sort((a, b) => b.hora.localeCompare(a.hora));
        setHistorialAccesos(logs);
      } else {
        setHistorialAccesos([]);
      }
    });

    onValue(ref(db, 'laboratorio/usuarios'), (snapshot) => {
      const data = snapshot.val();
      setUsuariosHardware(data ? Object.values(data) : []);
    });
  }, []);

  const obtenerPropietario = (uidCard) => {
    if (!uidCard) return 'Desconocido';
    if (uidCard === 'SISTEMA') return 'Monitor de Hardware';
    if (uidCard === 'BOTON_INTERIOR') return 'Pulsador de Salida (REX)';
    const encontrado = usuariosHardware.find(u => 
      u.uid && u.uid.replace(/\s+/g, '').toUpperCase() === uidCard.replace(/\s+/g, '').toUpperCase()
    );
    return encontrado ? encontrado.nombre : '⚠️ Credencial No Registrada';
  };

  //Normalizamos para ignorar tildes y mayúsculas
  const coincideLab = (labDB, filtro) => {
    if (filtro === 'Todos') return true;
    if (!labDB) return false;
    
    // Quitamos tildes y pasamos a mayúsculas
    const dbStr = labDB.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();
    const filStr = filtro.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();

    // 1er Nivel: Filtro por palabras clave raíz
    if (filStr.includes("COMPUTO") && dbStr.includes("COMPUTO")) return true;
    if (filStr.includes("ELECTRONIC") && dbStr.includes("ELECTRONIC")) return true;
    if (filStr.includes("QUIMIC") && dbStr.includes("QUIMIC")) return true;
    
    // 2do Nivel: Limpieza extrema (Convierte "LAB_COMPUTO" y "💻 Lab. Cómputo" en "LABCOMPUTO")
    const cleanDB = dbStr.replace(/[^A-Z0-9]/g, '');
    const cleanFil = filStr.replace(/[^A-Z0-9]/g, '');
    
    return cleanDB.includes(cleanFil) || cleanFil.includes(cleanDB);
  };
  //Soporte dual para fechas IoT (guiones) y App (barras)
  const cumpleFiltroFecha = (fechaStr) => {
    if (!fechaStr) return true;
    
    const soloFecha = fechaStr.split(' ')[0];
    let fechaRegistro;

    if (soloFecha.includes('-')) {
      // Formato IoT: YYYY-MM-DD
      const partes = soloFecha.split('-');
      fechaRegistro = new Date(partes[0], partes[1] - 1, partes[2]);
    } else if (soloFecha.includes('/')) {
      // Formato App: DD/MM/YYYY
      const partes = soloFecha.split('/');
      fechaRegistro = new Date(partes[2], partes[1] - 1, partes[0]);
    } else {
      return true;
    }

    if (fechaInicio) {
      const inicio = new Date(fechaInicio + 'T00:00:00');
      if (fechaRegistro < inicio) return false;
    }
    if (fechaFin) {
      const fin = new Date(fechaFin + 'T23:59:59');
      if (fechaRegistro > fin) return false;
    }
    return true;
  };

  // APLICACIÓN DE FILTROS COMBINADOS
  const reservasFiltradas = historialReservas.filter(res => {
    return coincideLab(res.laboratorio, filtroLab) &&
           (filtroEstadoReserva === 'Todos' || res.estado === filtroEstadoReserva) &&
           cumpleFiltroFecha(res.fecha);
  });

  //Aplicamos el filtro permitiendo leer el id_terminal del hardware
  const accesosFiltrados = historialAccesos.filter(acc => {
    const identificadorLab = acc.id_terminal || acc.laboratorio || '';
    return coincideLab(identificadorLab, filtroLab) &&
           (filtroEventoAcceso === 'Todos' || acc.evento === filtroEventoAcceso) &&
           cumpleFiltroFecha(acc.hora);
  });

  const totalItems = pestañaActiva === 'reservas' ? reservasFiltradas.length : accesosFiltrados.length;
  const contadorA = pestañaActiva === 'reservas' 
    ? reservasFiltradas.filter(r => r.estado === 'approved' || r.estado === 'aprobado').length 
    : accesosFiltrados.filter(a => a.evento === 'ACCESO_CONCEDIDO').length;
  const contadorB = pestañaActiva === 'reservas' 
    ? reservasFiltradas.filter(r => r.estado === 'denegado').length 
    : accesosFiltrados.filter(a => a.evento === 'ACCESO_DENEGADO' || a.evento === 'PUERTA_ABANDONADA').length;

  // EXPORTADOR NATIVO CSV
  const exportarAExcel = () => {
    let csvContent = "";
    let nombreArchivo = "";
    const rangoStr = (fechaInicio || fechaFin) ? `_del_${fechaInicio || 'inicio'}_al_${fechaFin || 'fin'}` : '_historico';

    if (pestañaActiva === 'reservas') {
      if (reservasFiltradas.length === 0) return alert("No hay datos de reservas en este rango de fechas.");
      
      csvContent = "Solicitante;Laboratorio;Fecha;Inicio;Fin;Estado;Motivo\n";
      
      reservasFiltradas.forEach(row => {
        const motivo = (row.motivo || 'Sin especificar').replace(/(\r\n|\n|\r|;)/gm, " ");
        csvContent += `${row.estudiante};${row.laboratorio};${row.fecha};${row.horaInicio};${row.horaFin};${row.estado};${motivo}\n`;
      });
      nombreArchivo = `Reporte_Reservas${rangoStr}.csv`;
      
    } else {
      if (accesosFiltrados.length === 0) return alert("No hay accesos fisicos en este rango de fechas.");
      
      csvContent = "Fecha y Hora;Titular;UID;Metodo;Resultado;Laboratorio\n";
      
      accesosFiltrados.forEach(row => {
        const propietario = obtenerPropietario(row.uid).replace(/;/g, "");
        const lab = (row.laboratorio || 'General').replace(/;/g, "");
        const modo = (row.modo || 'RFID').replace(/;/g, "");
        const uidSeguro = ` ${row.uid}`; 

        csvContent += `${row.hora};${propietario};${uidSeguro};${modo};${row.evento};${lab}\n`;
      });
      nombreArchivo = `Auditoria_Accesos_Puerta${rangoStr}.csv`;
    }

    const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", nombreArchivo);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const limpiarFechas = () => {
    setFechaInicio('');
    setFechaFin('');
  };

  return (
    <div className="space-y-6 animate-fade-in-up pb-10">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-200/50 dark:border-slate-800/80 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-3 tracking-tight">
            <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-[#1E293B] flex items-center justify-center border border-purple-100 dark:border-slate-700 shadow-sm">
              <svg className="w-5 h-5 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
            </div>
            Centro de Reportes y Auditoría
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-2 text-sm font-medium">Historial consolidado de solicitudes de la app y lecturas del hardware IoT.</p>
        </div>

        <button 
          onClick={exportarAExcel}
          className="bg-purple-600 hover:bg-purple-500 text-white px-5 py-2.5 rounded-lg font-semibold border border-purple-500 cursor-pointer shadow-lg shadow-purple-500/20 text-sm transition-all flex items-center justify-center gap-2 tracking-wide w-full md:w-auto"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
          Exportar CSV
        </button>
      </div>

      {/* SELECTOR DE PESTAÑAS */}
      <div className="flex bg-slate-100 dark:bg-[#0F172A] p-1 rounded-lg border border-slate-200 dark:border-slate-800 w-max shadow-inner">
        <button 
          onClick={() => setPestañaActiva('reservas')} 
          className={`flex items-center gap-2 px-6 py-2 text-xs font-bold rounded-md transition-all border-0 cursor-pointer ${pestañaActiva === 'reservas' ? 'bg-white dark:bg-[#1E293B] text-slate-800 dark:text-white shadow-sm border border-slate-200 dark:border-slate-700' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 bg-transparent'}`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
          Reservas Móviles
        </button>
        <button 
          onClick={() => setPestañaActiva('puerta')} 
          className={`flex items-center gap-2 px-6 py-2 text-xs font-bold rounded-md transition-all border-0 cursor-pointer ${pestañaActiva === 'puerta' ? 'bg-white dark:bg-[#1E293B] text-slate-800 dark:text-white shadow-sm border border-slate-200 dark:border-slate-700' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 bg-transparent'}`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
          Auditoría Física (IoT)
        </button>
      </div>

      {/* TARJETAS DE ESTADÍSTICAS - ESTILO ENTERPRISE */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        
        {/* Tarjeta 1: Total */}
        <div className="relative bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-xl p-5 overflow-hidden flex flex-col justify-between shadow-sm">
          <div className="absolute -top-6 -right-6 w-32 h-32 bg-blue-500/5 dark:bg-blue-500/10 rounded-full blur-2xl pointer-events-none"></div>
          <div className="flex justify-between items-start z-10">
            <div>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Registros Encontrados</p>
              <h3 className="text-3xl font-bold text-slate-800 dark:text-white">{totalItems}</h3>
            </div>
            <div className="p-2.5 bg-slate-50 dark:bg-[#1E293B] border border-slate-100 dark:border-slate-700 rounded-lg text-blue-500 dark:text-blue-400">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
            </div>
          </div>
          <div className="mt-4 z-10">
            <span className="text-xs text-slate-500 dark:text-slate-500 font-medium">Volumen total según filtros</span>
          </div>
        </div>

        {/* Tarjeta 2: Aprobadas */}
        <div className="relative bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-xl p-5 overflow-hidden flex flex-col justify-between shadow-sm">
          <div className="absolute -top-6 -right-6 w-32 h-32 bg-emerald-500/5 dark:bg-emerald-500/10 rounded-full blur-2xl pointer-events-none"></div>
          <div className="flex justify-between items-start z-10">
            <div>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                {pestañaActiva === 'reservas' ? 'Solicitudes Aprobadas' : 'Accesos Concedidos'}
              </p>
              <h3 className="text-3xl font-bold text-slate-800 dark:text-white">{contadorA}</h3>
            </div>
            <div className="p-2.5 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/20 rounded-lg text-emerald-600 dark:text-emerald-400">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
            </div>
          </div>
          <div className="mt-4 z-10">
            <span className="text-xs text-emerald-600/80 dark:text-emerald-500/70 font-medium">Operaciones exitosas</span>
          </div>
        </div>

        {/* Tarjeta 3: Denegadas */}
        <div className="relative bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-xl p-5 overflow-hidden flex flex-col justify-between shadow-sm">
          <div className="absolute -top-6 -right-6 w-32 h-32 bg-rose-500/5 dark:bg-rose-500/10 rounded-full blur-2xl pointer-events-none"></div>
          <div className="flex justify-between items-start z-10">
            <div>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                {pestañaActiva === 'reservas' ? 'Solicitudes Denegadas' : 'Accesos Bloqueados'}
              </p>
              <h3 className="text-3xl font-bold text-slate-800 dark:text-white">{contadorB}</h3>
            </div>
            <div className="p-2.5 bg-rose-50 dark:bg-rose-500/10 border border-rose-100 dark:border-rose-500/20 rounded-lg text-rose-600 dark:text-rose-400">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
            </div>
          </div>
          <div className="mt-4 z-10">
            <span className="text-xs text-rose-600/80 dark:text-rose-500/70 font-medium">Alertas y rechazos</span>
          </div>
        </div>

      </div>

      {/* CONTENEDOR DE TABLA CON FILTROS AVANZADOS */}
      <div className="bg-white dark:bg-[#111827] rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden transition-all duration-300">
        
        {/* FILTROS (ZONA SUPERIOR) */}
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-[#0F172A]/30 flex flex-col gap-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <h2 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2">
              <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" /></svg>
              Tabla de Registros
            </h2>
            
            <div className="flex flex-wrap gap-3">
              <select value={filtroLab} onChange={(e) => setFiltroLab(e.target.value)} className="bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-lg px-3 py-2 outline-none cursor-pointer">
                {laboratoriosDisponibles.map(lab => <option key={lab} value={lab}>{lab}</option>)}
              </select>

              {pestañaActiva === 'reservas' ? (
                <select value={filtroEstadoReserva} onChange={(e) => setFiltroEstadoReserva(e.target.value)} className="bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-lg px-3 py-2 outline-none cursor-pointer capitalize">
                  {estadosReservas.map(est => <option key={est} value={est}>{est}</option>)}
                </select>
              ) : (
                <select value={filtroEventoAcceso} onChange={(e) => setFiltroEventoAcceso(e.target.value)} className="bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-lg px-3 py-2 outline-none cursor-pointer">
                  {eventosAccesos.map(ev => <option key={ev} value={ev}>{ev.replace(/_/g, ' ')}</option>)}
                </select>
              )}
            </div>
          </div>

          {/* BARRA INTERACTIVA DE RANGO DE FECHAS */}
          <div className="flex flex-wrap items-center gap-3 bg-white dark:bg-[#1E293B] p-2 rounded-lg border border-slate-200 dark:border-slate-700 w-fit">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-2">Fecha:</span>
            <div className="flex items-center gap-1">
              <input type="date" value={fechaInicio} onChange={(e) => setFechaInicio(e.target.value)} className="bg-slate-50 dark:bg-[#0F172A] border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-md px-2 py-1.5 outline-none cursor-pointer focus:border-purple-500 transition-colors" />
              <span className="text-slate-400 text-xs font-bold px-1">-</span>
              <input type="date" value={fechaFin} onChange={(e) => setFechaFin(e.target.value)} className="bg-slate-50 dark:bg-[#0F172A] border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-md px-2 py-1.5 outline-none cursor-pointer focus:border-purple-500 transition-colors" />
            </div>
            {(fechaInicio || fechaFin) && (
              <button onClick={limpiarFechas} className="text-xs bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 border-0 font-semibold px-3 py-1.5 rounded-md cursor-pointer transition-colors ml-1">Limpiar</button>
            )}
          </div>
        </div>
        
        {/* TABLAS REJILLA */}
        <div className="overflow-x-auto max-h-[500px] [&::-webkit-scrollbar]:w-[4px] [&::-webkit-scrollbar-thumb]:bg-slate-300 dark:[&::-webkit-scrollbar-thumb]:bg-slate-700 [&::-webkit-scrollbar-track]:bg-transparent">
          {pestañaActiva === 'reservas' ? (
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 bg-slate-50 dark:bg-[#1E293B] z-10">
                <tr className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                  <th className="p-4 pl-6">Solicitante</th>
                  <th className="p-4">Laboratorio</th>
                  <th className="p-4">Fecha y Horario</th>
                  <th className="p-4">Motivo / Proyecto</th>
                  <th className="p-4 pr-6 text-right">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-sm text-slate-700 dark:text-slate-300">
                {reservasFiltradas.map(sol => (
                  <tr key={sol.id} className="hover:bg-slate-50/50 dark:hover:bg-[#1E293B]/50 transition-colors">
                    <td className="p-4 pl-6 font-semibold text-slate-800 dark:text-slate-200">{sol.estudiante}</td>
                    <td className="p-4">
                      <span className="text-slate-600 dark:text-slate-400 font-medium text-xs">{sol.laboratorio}</span>
                    </td>
                    <td className="p-4">
                      <div className="font-medium text-slate-800 dark:text-slate-200 flex items-center gap-1.5 text-xs">{sol.fecha}</div>
                      <div className="text-[11px] text-slate-500 mt-0.5">{sol.horaInicio} - {sol.horaFin}</div>
                    </td>
                    <td className="p-4 text-xs text-slate-500 max-w-[250px] truncate" title={sol.motivo}>{sol.motivo || 'Sin especificar'}</td>
                    <td className="p-4 pr-6 text-right">
                      <span className={`inline-flex items-center justify-center px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wide border ${sol.estado === 'aprobado' ? 'text-emerald-700 bg-emerald-50 border-emerald-200 dark:text-emerald-400 dark:bg-emerald-500/10 dark:border-emerald-500/20' : 'text-rose-700 bg-rose-50 border-rose-200 dark:text-rose-400 dark:bg-rose-500/10 dark:border-rose-500/20'}`}>
                        {sol.estado}
                      </span>
                    </td>
                  </tr>
                ))}
                {reservasFiltradas.length === 0 && <EstadoVacio />}
              </tbody>
            </table>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 bg-slate-50 dark:bg-[#1E293B] z-10">
                <tr className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                  <th className="p-4 pl-6">Fecha y Hora</th>
                  <th className="p-4">Credencial Identificada</th>
                  <th className="p-4">Laboratorio</th>
                  <th className="p-4">Método</th>
                  <th className="p-4 pr-6 text-right">Registro IoT</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-sm text-slate-700 dark:text-slate-300">
                {accesosFiltrados.map((log, idx) => {
                  const propietario = obtenerPropietario(log.uid);
                  const esConcedido = log.evento === 'ACCESO_CONCEDIDO';
                  const esAlarma = log.evento === 'PUERTA_ABANDONADA';
                  const esDenegado = log.evento === 'ACCESO_DENEGADO';

                  return (
                    <tr key={log.id || idx} className="hover:bg-slate-50/50 dark:hover:bg-[#1E293B]/50 transition-colors">
                      <td className="p-4 pl-6 text-slate-500 dark:text-slate-400 text-xs">{log.hora}</td>
                      <td className="p-4">
                        <div className={`font-semibold text-sm ${propietario.includes('⚠️') ? 'text-rose-600 dark:text-rose-400' : 'text-slate-800 dark:text-slate-200'}`}>{propietario}</div>
                        <div className="text-[10px] text-slate-400 font-mono mt-0.5">UID: {log.uid}</div>
                      </td>
                      <td className="p-4"><span className="text-slate-600 dark:text-slate-400 font-medium text-xs">{log.laboratorio || 'General'}</span></td>
                      <td className="p-4"><span className="text-slate-500 dark:text-slate-400 text-xs bg-slate-100 dark:bg-[#0F172A] border border-slate-200 dark:border-slate-700 px-2 py-1 rounded">{log.modo || 'RFID'}</span></td>
                      <td className="p-4 pr-6 text-right">
                        {esConcedido && <span className="px-2.5 py-1 rounded-md text-[10px] font-bold tracking-wide border text-emerald-700 bg-emerald-50 border-emerald-200 dark:text-emerald-400 dark:bg-emerald-500/10 dark:border-emerald-500/20">AUTORIZADO</span>}
                        {esDenegado && <span className="px-2.5 py-1 rounded-md text-[10px] font-bold tracking-wide border text-rose-700 bg-rose-50 border-rose-200 dark:text-rose-400 dark:bg-rose-500/10 dark:border-rose-500/20">RECHAZADO</span>}
                        {esAlarma && <span className="px-2.5 py-1 rounded-md text-[10px] font-bold tracking-wide border text-amber-700 bg-amber-50 border-amber-200 dark:text-amber-400 dark:bg-amber-500/10 dark:border-amber-500/20">ALERTA</span>}
                      </td>
                    </tr>
                  );
                })}
                {accesosFiltrados.length === 0 && <EstadoVacio />}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

// Subcomponente local para renderizar estados vacíos
function EstadoVacio() {
  return (
    <tr>
      <td colSpan="6" className="p-12 text-center">
        <div className="flex flex-col items-center justify-center text-slate-400 dark:text-slate-500">
          <svg className="w-10 h-10 mb-3 opacity-30" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
          <span className="font-medium text-sm">No hay registros en la base de datos para este filtro.</span>
        </div>
      </td>
    </tr>
  );
}
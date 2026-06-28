import { useState, useEffect } from 'react';
import { ref, onValue } from 'firebase/database';
import { db } from '../firebase';
import { Link } from 'react-router-dom';

export default function Cronograma() {
  const [reservasAprobadas, setReservasAprobadas] = useState([]);

  useEffect(() => {
    // Escuchamos la misma carpeta de reservas
    const reservasRef = ref(db, 'reservas');
    onValue(reservasRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        // Filtramos SOLO las que están en estado "aprobado"
        const aprobadas = Object.keys(data)
          .map(key => ({ id: key, ...data[key] }))
          .filter(sol => sol.estado === 'aprobado');
        
        setReservasAprobadas(aprobadas);
      } else {
        setReservasAprobadas([]);
      }
    });
  }, []);

  // Función mágica para descubrir el día de la semana a partir del texto de la fecha
  const obtenerDiaDeLaSemana = (fechaString) => {
    if (!fechaString) return -1;
    
    // Intentamos extraer la fecha si viene en formato DD/MM/YYYY o YYYY-MM-DD
    let dia, mes, anio;
    
    // Si tiene formato DD/MM/YYYY (Ej. 27/06/2026)
    if (fechaString.includes('/')) {
      const partes = fechaString.split(' ')[0].split('/'); // Tomamos solo la fecha si hay horas pegadas
      if (partes.length >= 3) {
        dia = parseInt(partes[0], 10);
        mes = parseInt(partes[1], 10) - 1; // Los meses en JS empiezan en 0
        anio = parseInt(partes[2], 10);
      }
    } 
    // Si tiene formato YYYY-MM-DD (Formato de input web nativo)
    else if (fechaString.includes('-')) {
      const partes = fechaString.split(' ')[0].split('-');
      if (partes.length >= 3) {
        anio = parseInt(partes[0], 10);
        mes = parseInt(partes[1], 10) - 1;
        dia = parseInt(partes[2], 10);
      }
    }

    if (dia && anio) {
      const fecha = new Date(anio, mes, dia);
      return fecha.getDay(); // Retorna 0 (Domingo) a 6 (Sábado)
    }
    
    return -1; // Si no logra leer la fecha
  };

  // Agrupamos las reservas en los días de Lunes a Sábado
  const diasSemana = [
    { num: 1, nombre: 'LUNES' },
    { num: 2, nombre: 'MARTES' },
    { num: 3, nombre: 'MIÉRCOLES' },
    { num: 4, nombre: 'JUEVES' },
    { num: 5, nombre: 'VIERNES' },
    { num: 6, nombre: 'SÁBADO' }
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans">
      {/* Navegación */}
      <nav className="flex justify-between items-center p-4 bg-slate-900 border-b border-slate-800 relative z-10">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <span className="text-emerald-500 text-2xl">🛡️</span>
            <h1 className="text-xl font-bold text-white">LabAccess</h1>
          </div>
          
          <div className="flex gap-4 ml-8 text-sm font-medium">
            <Link to="/dashboard" className="text-slate-400 hover:text-white transition-colors">Panel de Control</Link>
            <Link to="/usuarios" className="text-slate-400 hover:text-white transition-colors">Gestión de Usuarios</Link>
            <Link to="/prestamos" className="text-slate-400 hover:text-white transition-colors">Préstamos / Reservas</Link>
            <Link to="/cronograma" className="text-emerald-500 border-b-2 border-emerald-500 pb-1">Cronograma</Link>
          </div>
        </div>
      </nav>

      {/* Contenido Principal */}
      <div className="p-8 max-w-[1400px] mx-auto">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-white mb-1 flex items-center gap-2">
            📅 Cronograma de Ocupación
          </h2>
          <p className="text-slate-400 text-sm">Vista rápida de todos los horarios de clases y préstamos aprobados para organizar el laboratorio.</p>
        </div>

        {/* Grilla de Días */}
        <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-6 gap-4">
          {diasSemana.map((dia) => {
            // Filtramos las reservas que caen en este día específico
            const reservasDelDia = reservasAprobadas.filter(
              (res) => obtenerDiaDeLaSemana(res.fecha) === dia.num
            );

            return (
              <div key={dia.num} className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden min-h-[60vh] flex flex-col">
                <div className="p-4 border-b border-slate-800 bg-slate-950/50 text-center">
                  <h3 className="font-bold text-sm tracking-widest text-slate-300">{dia.nombre}</h3>
                </div>
                
                <div className="p-3 flex-1 flex flex-col gap-3">
                  {reservasDelDia.length === 0 ? (
                    <div className="flex-1 flex items-center justify-center">
                      <span className="text-slate-600 text-sm italic">Libre</span>
                    </div>
                  ) : (
                    reservasDelDia.map((reserva) => (
                      <div key={reserva.id} className="bg-emerald-950/30 border border-emerald-900/50 p-3 rounded-lg relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500"></div>
                        
                        <p className="text-[10px] font-bold text-emerald-500 mb-1 tracking-wider uppercase">
                          PRESTAMO APROBADO
                        </p>
                        
                        <p className="font-bold text-sm text-white leading-tight mb-1">
                          🏢 {reserva.laboratorio || 'Laboratorio'}
                        </p>
                        
                        <div className="flex items-center gap-1 mt-2 text-slate-400">
                          <span className="text-xs">🕒</span>
                          <span className="text-xs font-mono">{reserva.fecha}</span>
                        </div>
                        
                        <div className="flex items-center gap-1 mt-1 text-slate-400">
                          <span className="text-xs">👤</span>
                          <span className="text-xs truncate">{reserva.estudiante || 'Docente'}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { signInWithEmailAndPassword, signOut } from 'firebase/auth'; 
import { auth } from '../firebase'; 

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  // =========================================================
  // TU LÓGICA DE AUTENTICACIÓN Y SEGURIDAD INTACTA
  // =========================================================
  const handleLogin = async (e) => {
    e.preventDefault();
    setError(''); 
    
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      const adminEmail = "admin@universidad.edu.pe"; 

      if (user.email.toLowerCase() !== adminEmail.toLowerCase()) {
        await signOut(auth); 
        setError('Acceso Denegado: Este panel es exclusivo para administradores.');
        return;
      }

      console.log("¡Logueado con éxito!", user.email);
      navigate('/dashboard');
      
    } catch (error) {
      console.error("Error al iniciar sesión:", error.message);
      setError('Credenciales incorrectas. Intenta de nuevo.');
    }
  };
  // =========================================================

  return (
    // Fondo general Azul Pizarra oscuro que usamos en el resto del proyecto
    <div className="min-h-screen flex items-center justify-center bg-[#0F172A] text-slate-200 font-sans px-4">
      
      {/* Contenedor principal con efecto glassmorphism sutil y bordes finos */}
      <div className="bg-[#1E293B] p-10 rounded-3xl shadow-2xl w-full max-w-md border border-slate-700/50 animate-fade-in-up">
        
        <div className="flex justify-center mb-6">
          {/* LOGO CORPORATIVO (Mismo SVG que en la barra lateral, sin emojis) */}
          <div className="w-14 h-14 bg-emerald-600 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-900/20">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path>
            </svg>
          </div>
        </div>
        
        <h2 className="text-3xl font-extrabold text-center mb-1.5 text-white tracking-tight">LabAccess</h2>
        <p className="text-slate-400 text-center text-sm font-medium mb-8">Portal de Administración Segura</p>
        
        {/* Mensaje de Error Premium */}
        {error && (
          <div className="bg-rose-500/10 border border-rose-500/30 text-rose-400 p-3.5 rounded-xl text-xs font-bold text-center mb-6 flex items-center gap-2 justify-center">
            <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
            {error}
          </div>
        )}
        
        <form onSubmit={handleLogin} className="space-y-5">
          
          {/* Input Correo */}
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
              Correo Electrónico
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
              </div>
              <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-[#0F172A] border border-slate-700/80 rounded-xl pl-10 pr-4 py-3.5 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50 text-white text-sm transition-all"
                placeholder="admin@universidad.edu.pe"
                required
              />
            </div>
          </div>
          
          {/* Input Contraseña */}
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
              Contraseña de Acceso
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
              </div>
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-[#0F172A] border border-slate-700/80 rounded-xl pl-10 pr-4 py-3.5 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50 text-white text-sm transition-all tracking-widest font-mono"
                placeholder="••••••••"
                required
              />
            </div>
          </div>

          <button 
            type="submit" 
            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3.5 px-4 rounded-xl mt-6 transition-all duration-300 shadow-lg shadow-emerald-900/30 flex items-center justify-center gap-2 text-sm tracking-wide group"
          >
            Ingresar al Sistema
            <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
          </button>
        </form>
        
        {/* Detalle inferior */}
        <div className="mt-8 text-center border-t border-slate-700/50 pt-6">
          <p className="text-[10px] text-slate-500 font-medium uppercase tracking-widest">
            V 1.0.0 • Sistema Protegido
          </p>
        </div>

      </div>
    </div>
  );
}
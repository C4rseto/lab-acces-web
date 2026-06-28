import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { signInWithEmailAndPassword, signOut } from 'firebase/auth'; // Importamos signOut
import { auth } from '../firebase'; 

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError(''); // Limpiamos errores previos
    
    try {
      // Intentamos iniciar sesión en Firebase
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // --- NUEVO FILTRO DE SEGURIDAD ---
      // Asegúrate de que este sea tu correo real de administrador
      const adminEmail = "admin@universidad.edu.pe"; 

      if (user.email.toLowerCase() !== adminEmail.toLowerCase()) {
        await signOut(auth); // Cerramos la sesión inmediatamente
        setError('Acceso Denegado: Este panel es exclusivo para administradores.');
        return;
      }
      // ---------------------------------

      console.log("¡Logueado con éxito!", user.email);
      navigate('/dashboard');
      
    } catch (error) {
      console.error("Error al iniciar sesión:", error.message);
      setError('Credenciales incorrectas. Intenta de nuevo.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white font-sans px-4">
      <div className="bg-slate-900 p-8 rounded-xl shadow-2xl w-full max-w-md border border-slate-800">
        
        <div className="flex justify-center mb-6">
          <div className="w-12 h-12 bg-emerald-600 rounded-lg flex items-center justify-center text-2xl">
            <span className="text-white">🛡️</span>
          </div>
        </div>
        
        <h2 className="text-3xl font-bold text-center mb-2 text-white">LabAccess</h2>
        <p className="text-slate-400 text-center mb-8">Ingresa al panel de administración</p>
        
        {/* Si hay error, mostramos un mensaje rojito */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/50 text-red-500 p-3 rounded-lg text-sm text-center mb-4">
            {error}
          </div>
        )}
        
        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-2">Correo Electrónico</label>
            <input 
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-3 focus:outline-none focus:border-emerald-500 text-white"
              placeholder="admin@universidad.edu"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-2">Contraseña</label>
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-3 focus:outline-none focus:border-emerald-500 text-white"
              placeholder="••••••••"
              required
            />
          </div>

          <button 
            type="submit" 
            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-3 px-4 rounded-lg mt-4 transition duration-200"
          >
            Iniciar Sesión
          </button>
        </form>

      </div>
    </div>
  );
}
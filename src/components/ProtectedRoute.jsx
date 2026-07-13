import { Navigate } from 'react-router-dom';

// Este componente envuelve tus rutas y decide si deja pasar al usuario o lo patea
export const RutaProtegida = ({ children, rolRequerido }) => {
  const rolActual = localStorage.getItem('adminRol');
  if (!rolActual) {
    return <Navigate to="/" replace />;
  }

  // Si la ruta exige ser SUPER_ADMIN y el usuario no lo es, lo mandamos al dashboard
  if (rolRequerido === 'SUPER_ADMIN' && rolActual !== 'SUPER_ADMIN') {
    return <Navigate to="/dashboard" replace />;
  }

  // Si cumple los requisitos, renderiza el componente normalmente
  return children;
};
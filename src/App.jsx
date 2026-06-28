import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import GestionUsuarios from './components/GestionUsuarios'; 
import Prestamos from './components/Prestamos'; // <-- Nueva importación
import Cronograma from './components/Cronograma'; // <-- Nueva importación

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/usuarios" element={<GestionUsuarios />} /> 
        <Route path="/prestamos" element={<Prestamos />} /> {/* <-- Nueva ruta */}
        <Route path="/cronograma" element={<Cronograma />} /> {/* <-- Nueva ruta */}
      </Routes>
    </BrowserRouter>
  );
}

export default App;
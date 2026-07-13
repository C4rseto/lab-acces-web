import { db, auth } from '../firebase';
import { ref, push, serverTimestamp } from 'firebase/database';

export const registrarAuditoriaWeb = async (usuarioActual, accion, detalle) => {
  try {
    // 1. Intentamos obtener la sesión en vivo de Firebase Auth
    const user = auth.currentUser || usuarioActual;
    
    // 2. RESPALDO EXTREMO: Si Firebase Auth perdió la sesión temporalmente, leemos de la memoria local
    const email = user?.email || localStorage.getItem('adminEmail') || 'Admin_Desconectado';
    const uid = user?.uid || localStorage.getItem('adminUid') || 'UID_Desconocido';

    // 3. Estructuramos el log
    const logData = {
      accion: accion,
      detalle: detalle,
      autor: {
        nombre: email,
        uid: uid
      },
      timestamp: serverTimestamp() // Genera la hora exacta e inmutable en los servidores de Google
    };

    // 4. Usamos push() para crear un nuevo registro único sin sobreescribir el anterior
    await push(ref(db, 'auditoria_web'), logData);
    
  } catch (error) {
    console.error("Fallo crítico al intentar guardar en Auditoría Web:", error);
  }
};
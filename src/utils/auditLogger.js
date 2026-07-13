import { db, auth } from '../firebase';
import { ref, push, set, serverTimestamp } from 'firebase/database';

export const registrarAuditoriaWeb = async (usuarioActual, accion, detalle) => {
  try {
    // 1. Aseguramos la captura de identidad del administrador
    const user = auth.currentUser || usuarioActual;
    const email = user?.email || localStorage.getItem('adminEmail') || 'Sistema';
    const uid = user?.uid || localStorage.getItem('adminUid') || 'Desconocido';

    // 2. Armamos el paquete de datos inmutables
    const logData = {
      accion: accion || "ACCIÓN_DESCONOCIDA",
      detalle: detalle || "Sin detalles adicionales",
      autor: {
        nombre: email,
        uid: uid
      },
      timestamp: serverTimestamp()
    };

    // 3. Inyección atómica estructurada
    const nuevaReferencia = push(ref(db, 'auditoria_web'));
    await set(nuevaReferencia, logData);
    
    console.log("✅ Log guardado en auditoría:", accion);

  } catch (error) {
    console.error("❌ Fallo en Auditoría Web:", error);
    // ⚠️ ESTA ALERTA DESENMASCARARÁ EL PROBLEMA ⚠️
    alert(`Fallo de seguridad al guardar auditoría: ${error.message}\nRevisa la pestaña "Rules" en Firebase Realtime Database.`);
  }
};
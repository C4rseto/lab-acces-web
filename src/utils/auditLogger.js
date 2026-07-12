import { db } from '../firebase'; // Ajusta esta ruta si tu firebase.js está en otro lado
import { ref, push, set, serverTimestamp } from 'firebase/database';

/**
 * Función genérica para registrar acciones administrativas.
 * Cumple con la estructura de la Fase 2: timestamp, autor, accion y detalle.
 * 
 * @param {Object} currentUser - Perfil del admin logueado (debe contener uid, nombre o email)
 * @param {String} accion - Acción realizada (ej. "APROBO_RESERVA", "NUEVO_DOCENTE")
 * @param {String} detalle - Descripción legible del cambio
 */
export const registrarAuditoriaWeb = async (currentUser, accion, detalle) => {
  try {
    // 1. Validar que exista un administrador ejecutando la acción
    if (!currentUser || !currentUser.uid) {
      console.warn("[Auditoría] Acción bloqueada: No se detectó un usuario autenticado.");
      return;
    }

    // 2. Extraer la identidad (Fallback al email si no hay nombre configurado)
    const nombreAutor = currentUser.nombre || currentUser.email || "Admin";

    // 3. Apuntar al nodo paralelo que definimos en las Reglas de Seguridad
    const auditoriaRef = ref(db, 'auditoria_web');
    
    // 4. Generar un ID único para este nuevo evento (push)
    const nuevoLogRef = push(auditoriaRef);

    // 5. Construir el JSON exacto de la Fase 2
    const payloadLog = {
      timestamp: serverTimestamp(), // Hora inmutable del servidor de Google
      autor: {
        uid: currentUser.uid,
        nombre: nombreAutor
      },
      accion: accion,
      detalle: detalle
    };

    // 6. Inyectar en la base de datos (La regla WORM lo protegerá desde este momento)
    await set(nuevoLogRef, payloadLog);
    
  } catch (error) {
    console.error("[Auditoría] Fallo al guardar el registro web:", error);
  }
};
/**
 * Hashea un texto (PIN) en SHA-256.
 * Usado exclusivamente para generar las credenciales físicas de los nuevos Administradores.
 */
export const generarHashSHA256 = async (textoPlano) => {
  if (!textoPlano) return "";
  const msgBuffer = new TextEncoder().encode(textoPlano);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
};
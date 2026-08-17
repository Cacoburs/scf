// Punto único de entrada a todos los "enchufes" de integraciones externas.
// Cada uno tiene una interfaz (el contrato) y una implementación "Simulada"
// (el comportamiento actual de la demo). El día que haya un proveedor real,
// se agrega una nueva clase que implemente la misma interfaz y se cambia
// solo la constante exportada acá abajo — nada más del código necesita
// cambiar.
export * from "./tipos.js";
export * from "./pagos.js";
export * from "./firmaDigital.js";
export * from "./kyc.js";
export * from "./facturacionElectronica.js";
export * from "./notificaciones.js";

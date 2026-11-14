// Si se ejecuta con 'iniciar.bat' o 'node server.js', conecta automáticamente al backend local.
window.NHEU_FLIGHT_BACKEND_API =
  window.NHEU_FLIGHT_BACKEND_API ||
  (typeof window !== "undefined" && window.location.protocol === "file:"
    ? "http://localhost:8080"
    : "");

// Corre esto primero (node listar-puertos.js) para saber cómo se llama
// el puerto de tu Arduino en esta laptop — lo vas a necesitar en servidor.js.
const { SerialPort } = require("serialport");

SerialPort.list().then((puertos) => {
  if (puertos.length === 0) {
    console.log("No se encontró ningún dispositivo. ¿El Arduino está conectado por USB?");
    return;
  }
  console.log("Puertos disponibles:");
  puertos.forEach((p) => {
    console.log(` - ${p.path}  ${p.manufacturer ? "(" + p.manufacturer + ")" : ""}`);
  });
  console.log("\nEl del Arduino suele decir 'Arduino' o 'CH340' o 'wchusbserial' en el fabricante.");
});

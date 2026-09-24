// Zona horaria fija con cambio de horario (DST) para que los tests de fechas sean reproducibles.
module.exports = () => {
  process.env.TZ = 'America/Santiago';
};

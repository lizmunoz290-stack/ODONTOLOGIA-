export class ErrorPermiso extends Error {
  constructor() {
    super("No tiene permiso para realizar esta acción.");
  }
}

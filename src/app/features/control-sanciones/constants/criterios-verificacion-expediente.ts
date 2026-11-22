export interface CriterioVerificacion {
  id: number;
  nombre: string;
  checked?: boolean;
}

export const CRITERIOS_VERIFICACION_EXPEDIENTE: CriterioVerificacion[] = [
  { id: 1, nombre: 'Debe contener numero de decisión o TRD' },
  { id: 2, nombre: 'Debe coincidir la dirección del comparendo con la dirección en la decisión.' },
  { id: 3, nombre: 'La fecha de decisión debe ser la misma de la constancia de ejecutoria.' },
  { id: 4, nombre: 'El infractor debe estar plenamente identificado en la decisión.' },
  { id: 5, nombre: 'La decision debe ser realizada en un día habil' },
  { id: 6, nombre: 'La sanción debe conicidir el valor de multa en letras o números.' },
  { id: 7, nombre: 'La constancia ejecutoria debe contener la fecha de firmeza claramente.' },
  { id: 8, nombre: 'El TRD o Decisión debe coincidir en la ejecutoria y decisión.' },
  { id: 9, nombre: 'El número de comparendo debe coincidir en la decisión.' },
  { id: 10, nombre: 'Falta firma del inspector.' },
  { id: 11, nombre: 'Nombre y/o cédula no coincide con lo registrado en el RNMC.' },
];
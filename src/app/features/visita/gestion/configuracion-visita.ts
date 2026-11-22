import { ConfiguracionFormulario } from '../../../core/services/visita-limpia.service';

/**
 * Presentación de la pantalla de gestión de visita.
 * El ancho de cada campo lo decide `Gestion.claseColumna` por tipo.
 */
export const configuracionVisita: ConfiguracionFormulario = {
  // TEMPORAL: quitar cuando SAUL envíe descripcion "Ítem,Aprobado en planos,Verificado en obra"
  encabezadosPorCategoria: { 56: ['Ítem', 'Aprobado en planos', 'Verificado en obra'] },
};

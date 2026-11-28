# FormViewer (`app-form-viewer`)

Componente standalone de solo lectura para mostrar datos estructurados según un arreglo JSON de campos. No incluye lógica de negocio ni controles editables.

## Ubicación

`src/app/shared/components/form-viewer/`

## Interfaz `FormViewerField`

```typescript
import { FormViewerField } from './form-viewer-field';

const fields: FormViewerField[] = [
  {
    label: 'Número de expediente',
    value: '2026-00125',
    type: 'text',
    colMd: 4,
  },
  {
    label: 'Fecha de registro',
    value: '2026-11-27',
    type: 'date',
    colMd: 4,
  },
  {
    label: 'Hora de registro',
    value: '14:30',
    type: 'time',
    colMd: 4,
  },
  {
    label: 'Valor',
    value: 150000,
    type: 'currency',
    format: 'COP',
    colMd: 4,
  },
  {
    label: 'Activo',
    value: false,
    type: 'boolean',
    colMd: 4,
  },
  {
    label: 'Observaciones',
    value: '<p>Expediente registrado correctamente.</p>',
    type: 'html',
    colMd: 12,
  },
];
```

| Propiedad   | Descripción |
| ----------- | ----------- |
| `label`     | Etiqueta visible. |
| `value`     | Dato a mostrar (`0` y `false` son válidos). |
| `type`      | `text`, `date`, `time`, `datetime`, `number`, `currency`, `boolean`, `html`. |
| `colMd`     | Columnas Bootstrap `col-md-*` (1–12). Por defecto `12`. |
| `format`    | Locale (`es-CO`), código ISO de moneda (`COP`) u opciones JSON para `Intl.NumberFormat`. |
| `emptyText` | Texto si el valor es nulo o vacío. Por defecto `-`. |

## Uso en un componente padre

```typescript
import { Component } from '@angular/core';
import { FormViewer } from '../../../shared/components/form-viewer/form-viewer';
import { FormViewerField } from '../../../shared/components/form-viewer/form-viewer-field';

@Component({
  selector: 'app-ejemplo-form-viewer',
  imports: [FormViewer],
  template: `
    <app-form-viewer
      [fields]="fields"
      ariaLabel="Datos generales de la solicitud"
    />
  `,
})
export class EjemploFormViewer {
  fields: FormViewerField[] = [/* ... */];
}
```

## Paso de configuración JSON

Desde una API o archivo:

```typescript
import { parseFormViewerFields } from './form-viewer-format';

// En el componente
fieldsJson = '[{"label":"Consecutivo","value":"V-2026-001","type":"text","colMd":4}]';
fields = parseFormViewerFields(this.fieldsJson);
```

En plantilla, sin parsear en TypeScript:

```html
<app-form-viewer [fieldsJson]="jsonDesdeApi" />
```

`fieldsJson` acepta `FormViewerField[]` o `string` JSON. Si también se usa `[fields]`, asignar `fieldsJson` después actualiza el arreglo interno.

## Ejemplo alineado con visita (encabezado)

Sustitución conceptual del bloque `gestion-encabezado__datos`:

```typescript
readonly encabezadoFields = computed((): FormViewerField[] => {
  const v = this.encabezado();
  if (!v) {
    return [];
  }
  const base: FormViewerField[] = [
    { label: 'Consecutivo', value: v.consecutivo, type: 'text', colMd: 3 },
    { label: 'Estado', value: v.estado, type: 'text', colMd: 3, emptyText: 'Sin estado' },
    { label: 'Visitador', value: v.visitador, type: 'text', colMd: 3, emptyText: 'Sin asignar' },
    { label: 'Revisor', value: v.revisor, type: 'text', colMd: 3, emptyText: 'Sin asignar' },
    { label: 'Tipo de Visita', value: v.tipoVisita, type: 'text', colMd: 4, emptyText: 'Sin tipo' },
  ];
  if (v.radicadoSolicitud) {
    base.push({ label: 'Radicado Solicitud', value: v.radicadoSolicitud, type: 'text', colMd: 4 });
  }
  if (v.radicadoRespuesta) {
    base.push({ label: 'Radicado Respuesta', value: v.radicadoRespuesta, type: 'text', colMd: 4 });
  }
  if (v.radicadoInspeccion) {
    base.push({
      label: 'Radicado Remisión a Inspección',
      value: v.radicadoInspeccion,
      type: 'text',
      colMd: 4,
    });
  }
  return base;
});
```

```html
<app-form-viewer [fields]="encabezadoFields()" ariaLabel="Datos generales de la solicitud" />
```

## Seguridad HTML

Los campos `type: 'html'` pasan por `DomSanitizer` antes de renderizarse con `[innerHTML]`.

## Pruebas

```bash
npm test -- --include=src/app/shared/components/form-viewer/**
```
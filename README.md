# impulsagen-app
Aplicación web instalable de ImpulsaFit EMS

## Registro del ciclo de un cliente

**Usar en Registro EMS** envía una copia de la rutina actual a Registro EMS y abre esa aplicación. Recoge los cambios de los campos de edición, los ejercicios seleccionados, los bloques repetidos y sus parámetros y vueltas resueltos. En Registro EMS abre la ficha del cliente y **Plan de cuatro semanas** para vincular la copia al ciclo. Las modificaciones posteriores del generador no alteran ese plan.

El envío directo utiliza el almacenamiento del navegador: ambas aplicaciones deben abrirse en el mismo navegador y origen. **Archivo para Registro EMS** descarga la misma copia en JSON para importarla desde otro dispositivo o navegador.

Verificación del formato y de los bloques/ejercicios exportados: `node --test registro-export.test.mjs`.

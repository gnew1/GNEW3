# Guía de Contribución

## Patrones de refactor
- **Ternarios → helpers**: extrae condicionales complejos a funciones descriptivas.
- **Optional chaining**: usa `?.` para navegar objetos anidados evitando errores por `undefined`.
- **Validación runtime**: valida entradas con esquemas o asserts antes de usar los datos.

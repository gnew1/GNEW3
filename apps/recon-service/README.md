# Recon Service

Servicio de conciliación multi-proveedor.

## Configuración de entorno

Copiar `.env.example` a `.env` y completar las variables:

- `DATABASE_URL`: URL de conexión a Postgres.
- `PGUSER`, `PGPASSWORD`: credenciales para la base de datos.
- `PORT`: puerto de escucha.
- Variables JWT y tolerancias para reconciliación.

Las variables se validan mediante [Zod](https://github.com/colinhacks/zod). La aplicación no arrancará si falta alguna obligatoria.

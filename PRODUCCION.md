# Puesta en produccion

Esta guia deja la plataforma disponible desde cualquier dispositivo usando Supabase para datos compartidos y Netlify para alojamiento gratis.

## 1. Crear proyecto en Supabase

1. Entra a `https://supabase.com`.
2. Crea una cuenta o inicia sesion.
3. Selecciona `New project`.
4. Elige una organizacion.
5. Escribe un nombre, por ejemplo `plataforma-administrativa`.
6. Crea una contrasena fuerte para la base de datos.
7. Elige una region cercana.
8. Espera a que Supabase termine de crear el proyecto.

## 2. Crear la tabla de datos

1. En Supabase, abre el proyecto.
2. Ve a `SQL Editor`.
3. Abre el archivo `supabase-schema.sql` de este proyecto.
4. Copia todo su contenido.
5. Pegalo en el SQL Editor.
6. Presiona `Run`.

Esto crea la tabla `app_state` y las politicas para usuarios autenticados.

## 3. Crear usuarios en Supabase Auth

1. Ve a `Authentication`.
2. Entra a `Users`.
3. Selecciona `Add user` o `Invite user`.
4. Crea los usuarios con los mismos correos que tienes en la app.
5. Asigna una contrasena.

Usuarios iniciales de la app:

- `admin@familia.com`
- `operador@familia.com`

Puedes cambiar esos correos desde Parametria despues.

## 4. Copiar las credenciales publicas

1. Ve a `Project Settings`.
2. Entra a `API`.
3. Copia `Project URL`.
4. Copia `anon public key`.
5. Abre `supabase-config.js`.
6. Pega los valores:

```js
window.SUPABASE_CONFIG = {
  url: "https://TU-PROYECTO.supabase.co",
  anonKey: "TU_ANON_PUBLIC_KEY",
  stateId: "familia-principal",
};
```

No uses la `service_role key` en esta app.

## 5. Probar localmente

1. Abre `index.html`.
2. Inicia sesion con un usuario creado en Supabase Auth.
3. Si el usuario tambien existe en `Parametria > Usuarios`, entrara con su rol.
4. Verifica que en la barra lateral diga `Supabase conectado` o `Supabase guardado`.

## 6. Publicar gratis en Netlify

Opcion rapida:

1. Entra a `https://app.netlify.com/drop`.
2. Arrastra la carpeta completa `Plataforma Administrativa`.
3. Espera a que Netlify publique el sitio.
4. Netlify te dara una URL gratis.
5. Abre esa URL desde otro dispositivo.

Opcion con GitHub:

1. Sube este proyecto a un repositorio de GitHub.
2. En Netlify, elige `Add new site`.
3. Selecciona `Import an existing project`.
4. Conecta GitHub.
5. Selecciona el repositorio.
6. Como build command deja vacio.
7. Como publish directory usa `.`.
8. Publica.

## 7. Configurar la URL en Supabase

1. En Supabase, ve a `Authentication`.
2. Entra a `URL Configuration`.
3. En `Site URL`, coloca la URL de Netlify.
4. Si usas invitaciones o recuperacion de contrasena, agrega tambien la URL en `Redirect URLs`.

## 8. Primer uso en produccion

1. Entra con el usuario administrador.
2. Ve a `Parametria > Usuarios`.
3. Verifica que cada usuario tenga rol correcto.
4. Ve a `Parametria > Alertas`.
5. Define roles destinatarios.
6. Abre Uber y revisa carros, vencimientos y distribucion.

## 9. Como desplegar cambios futuros

Cada vez que se hagan cambios en la app, debes volver a publicar los archivos actualizados para que se vean desde cualquier dispositivo.

### Opcion A: Netlify Drop

Esta es la forma mas facil si publicaste arrastrando la carpeta.

1. Guarda los cambios en la carpeta local.
2. Verifica que `supabase-config.js` tenga tus credenciales de Supabase.
3. Entra a `https://app.netlify.com/drop`.
4. Arrastra nuevamente la carpeta completa `Plataforma Administrativa`.
5. Netlify generara una nueva publicacion.
6. Abre la URL publica y refresca la pagina.

Importante: si Netlify te crea una URL nueva, reemplaza la anterior en Supabase `Authentication > URL Configuration`. Si quieres conservar siempre la misma URL, usa la opcion con GitHub.

### Opcion B: Netlify con GitHub

Esta es la forma recomendada para trabajar a largo plazo.

1. Sube el proyecto a GitHub.
2. Conecta ese repositorio a Netlify.
3. Cada vez que se hagan cambios, subelos a GitHub.
4. Netlify detectara los cambios y desplegara automaticamente.
5. La URL publica se mantiene igual.

Flujo normal:

```text
Editar archivos -> probar local -> subir a GitHub -> Netlify despliega solo
```

### Opcion C: Reemplazar archivos en Netlify

Si entras al panel de Netlify:

1. Abre tu sitio.
2. Ve a `Deploys`.
3. Usa `Deploy manually`.
4. Arrastra la carpeta actualizada.

## 10. Que archivos se deben subir

Para produccion deben ir estos archivos:

- `index.html`
- `styles.css`
- `app.js`
- `supabase-config.js`
- `netlify.toml`

Tambien puedes subir:

- `README.md`
- `PRODUCCION.md`
- `supabase-schema.sql`

No subas archivos temporales, respaldos personales ni documentos privados que no formen parte de la app.

## 11. Como confirmar que el despliegue salio bien

Despues de publicar:

1. Abre la URL publica.
2. Presiona `Ctrl + F5` para forzar recarga.
3. Inicia sesion con un usuario de Supabase Auth.
4. Revisa la barra lateral:
   - `Supabase conectado`
   - `Supabase sincronizado`
   - `Supabase guardado`
5. Crea un registro de prueba pequeno.
6. Abre la app en otro dispositivo.
7. Confirma que el registro aparece.

Si no aparece, revisa:

- Que `supabase-config.js` tenga URL y anon key correctas.
- Que el usuario exista en Supabase Auth.
- Que el usuario exista en `Parametria > Usuarios`.
- Que Netlify haya publicado la version nueva.
- Que el navegador no este mostrando una version vieja en cache.

## Recomendacion de seguridad

Esta primera produccion usa Supabase Auth y guarda el estado completo como JSON. Sirve muy bien para empezar y compartir datos. La siguiente mejora tecnica debe ser separar la informacion en tablas individuales con politicas por rol: usuarios, roles, negocios, carros, ingresos, gastos, mantenimientos, alquileres, alertas y auditoria.

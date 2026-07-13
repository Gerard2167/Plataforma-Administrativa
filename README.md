# Plataforma Administrativa

Aplicación web estática para administrar negocios familiares: Uber con carros, metas diarias, gastos, mantenimientos y distribución de ingresos; además de alquiler de casa con pagos y gastos.

## Abrir localmente

Abre `index.html` en el navegador.

Usuarios de prueba:

- `admin@familia.com` / `admin123` con rol Propietario
- `operador@familia.com` / `operador123` con rol Operador

## Parametría

El rol Propietario puede entrar a Parametría para:

- Crear y editar usuarios.
- Crear roles predeterminados.
- Asignar permisos por funcionalidad, como ingresos, gastos, mantenimientos, contabilidad, autorización de transferencias, parametría y distribución de Uber.
- Registrar y autorizar solicitudes de transferencia.
- Configurar alertas por rol.

## Alertas

La app calcula alertas para:

- Mantenimiento cercano por kilometraje.
- Pago de alquiler vencido si no se ha registrado el pago del mes.
- Seguro del auto próximo a vencer o vencido.
- Licencia del conductor próxima a vencer o vencida.
- Pago de placa próximo a vencer o vencido.

Cada alerta se muestra solo a los roles configurados. Desde la bandeja de alertas se puede preparar un correo con `mailto:` para los usuarios activos de esos roles.

Para envío automático real de correos, la app necesita conectarse a un servicio externo porque actualmente es una app estática. Opciones recomendadas:

- Supabase Edge Functions + Resend
- Firebase Functions + SendGrid
- EmailJS para una solución sencilla desde frontend

## Prestamos

El modulo `Prestamos` permite registrar dinero prestado a familiares o terceros desde una fuente, como un rubro acumulado de un auto, la cuenta del alquiler o una cuenta familiar.

Cada prestamo guarda:

- Persona que recibe el dinero.
- Fuente del dinero.
- Monto prestado.
- Si cobra interes o no.
- Interes anual.
- Plazo en meses.
- Dia estimado de pago.
- Pagos realizados.
- Saldo pendiente.

Si el prestamo sale de un rubro de un auto, el sistema descuenta el monto del saldo acumulado del rubro. Cuando se registra un pago, el dinero vuelve al mismo rubro.

## Gastos familiares

En `Inicio` se puede registrar gastos familiares y verlos separados de los gastos del negocio. El dashboard muestra ingresos de negocios, gastos de negocio, gastos familiares, prestamos por cobrar y balance familiar.

## Distribución de Uber

La distribución de ingresos de cada carro se maneja por montos fijos y prioridad, no por porcentajes. Cada carro puede tener rubros como préstamo, mantenimiento, ganancia del negocio y ganancia personal.

Cada rubro tiene:

- Prioridad
- Monto por ingreso
- Saldo acumulado

Cuando se registra un ingreso, el sistema reparte el dinero siguiendo la prioridad. Si el ingreso no alcanza para todos los rubros, se asigna al primer rubro hasta donde alcance y los demás quedan sin movimiento. Por ejemplo, si Préstamo tiene prioridad 1 por `80.00` y Mantenimiento prioridad 2 por `20.00`, un ingreso de `70.00` suma los `70.00` completos al saldo acumulado de Préstamo.

## Datos

Esta versión puede sincronizar la información con Supabase. Si `supabase-config.js` no tiene credenciales, la app funciona en modo local con `localStorage`.

## Configurar Supabase

1. Crea un proyecto gratis en Supabase.
2. En Supabase, abre `SQL Editor` y ejecuta el contenido de `supabase-schema.sql`.
3. En `Authentication > Users`, crea usuarios con los mismos correos y contraseñas que usarás en la app.
4. En `Project Settings > API`, copia:
   - Project URL
   - anon public key
5. Pega esos valores en `supabase-config.js`.
6. Abre la app e inicia sesión. Al primer ingreso, la app sube el estado actual a Supabase; luego sincroniza cambios.

No pegues nunca la `service_role key` en archivos del frontend. Para el navegador solo se usa la `anon public key`.

La implementación actual guarda el estado completo de la plataforma en una tabla `app_state` como JSON. Es una migración simple y práctica para empezar a compartir datos entre dispositivos. Más adelante conviene separar esto en tablas normalizadas por negocio, carro, ingreso, gasto, mantenimiento, alquiler, alerta y auditoría.

## Publicación gratis

Opciones sin dominio pagado:

- GitHub Pages
- Netlify
- Vercel

Con cualquiera de esas opciones tendrás una URL gratuita del proveedor. Para producción conviene cambiar el login local por autenticación real antes de guardar datos sensibles.

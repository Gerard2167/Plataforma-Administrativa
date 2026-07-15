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
- Asignar permisos por funcionalidad, como ingresos, gastos, mantenimientos, contabilidad, solicitud de transacciones, autorización de transacciones, parametría y distribución de Uber.
- Registrar solicitudes de transacción y autorizar movimientos entre cuentas.
- Configurar alertas por rol.

## Perfil y contraseña temporal

Cada usuario tiene una sección `Perfil` donde puede ver su nombre, correo, rol y cambiar su contraseña. Al crear o editar usuarios desde Parametría se puede marcar `Debe cambiarla al ingresar`; cuando ese usuario inicia sesión, la app lo lleva a Perfil y le pide actualizar la contraseña antes de continuar.

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
- Frecuencia de cobro mensual o quincenal.
- Tipo de plazo: con plazo o indefinido.
- Plazo en meses, cuando aplique.
- Dia estimado de pago.
- Pagos realizados, separados entre interes cubierto y capital abonado.
- Saldo pendiente separado entre capital e interes.

El interes se calcula por periodo sobre el saldo de capital pendiente. Si la frecuencia es mensual, usa 12 periodos al ano; si es quincenal, usa 24 periodos al ano.

Cuando se registra un pago, el sistema cubre primero el interes pendiente y luego aplica la diferencia al capital. La pantalla no sugiere cuota estimada para que se registre el monto realmente pagado.

Si el prestamo sale de un rubro de un auto, el sistema descuenta el monto del saldo acumulado del rubro. Cuando se registra un pago, el dinero vuelve al mismo rubro o cuenta origen.

## Transacciones

En `Parametria > Transacciones` se pueden registrar solicitudes para mover fondos entre cuentas: rubros acumulados de autos, cuenta de alquiler o cuenta familiar. La solicitud queda pendiente hasta que un usuario con permiso de autorizacion la apruebe o rechace. Al aprobarla, el sistema descuenta el monto de la cuenta origen y lo suma a la cuenta destino.

## Gastos familiares

En `Inicio` se puede registrar gastos familiares y verlos separados de los gastos del negocio. El dashboard muestra ingresos de negocios, gastos de negocio, gastos familiares, prestamos por cobrar y balance familiar.

## Distribución de Uber

La distribución de ingresos de cada carro se maneja por montos fijos y prioridad, no por porcentajes. Cada carro puede tener rubros como préstamo, mantenimiento, ganancia del negocio y ganancia personal.

Cada rubro tiene:

- Prioridad
- Monto por ingreso
- Saldo acumulado

Cuando se registra un ingreso, el sistema reparte el dinero siguiendo la prioridad. Si el ingreso no alcanza para todos los rubros, se asigna al primer rubro hasta donde alcance y los demás quedan sin movimiento. Por ejemplo, si Préstamo tiene prioridad 1 por `80.00` y Mantenimiento prioridad 2 por `20.00`, un ingreso de `70.00` suma los `70.00` completos al saldo acumulado de Préstamo.

Esto tambien aplica cuando el ingreso del dia queda por debajo de la meta esperada: si se registran `20.00`, esos `20.00` entran al rubro de prioridad 1.

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

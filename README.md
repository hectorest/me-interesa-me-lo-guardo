# Me interesa, me lo guardo

Lista compartida (para dos personas) de productos y ofertas que nos interesan: pegas un enlace, la app lee el nombre, la foto y el precio, propone una categoría y lo guarda. Revisa los precios cada día y avisa de las bajadas.

## Cómo está hecha

- **Web** (esta carpeta): HTML + CSS + JavaScript sin compilación, servida con GitHub Pages.
- **Supabase** (proyecto `me-interesa-me-lo-guardo`):
  - Base de datos: `categorias` (jerárquicas), `productos`, `producto_categorias`, `ofertas` (una por tienda) y `precios` (historial).
  - Acceso: solo las **dos primeras cuentas** que se registran tienen acceso a los datos (reglas RLS).
  - Función `extraer`: lee una página de producto (datos estructurados schema.org, Open Graph, microdatos y reglas para Amazon).
  - Función `revisar-precios` + tarea programada (`pg_cron`) cada hora: revisa las ofertas pendientes que lleven más de 20 h sin revisar.
- **Marcador «Guardar en Me interesa»** (`marcador.js`): lee los datos desde la propia página de la tienda en tu navegador. Sirve para las tiendas que bloquean la lectura desde servidores (PcComponentes, MediaMarkt, Decathlon…).

El código de las funciones está en `supabase/functions/`.

## Puesta en marcha

1. **GitHub Pages**: Settings → Pages → Deploy from a branch → `main` / `(root)`.
   La app quedará en `https://hectorest.github.io/me-interesa-me-lo-guardo/`.
2. **Supabase → Authentication → URL Configuration**:
   - *Site URL*: `https://hectorest.github.io/me-interesa-me-lo-guardo/`
   - *Redirect URLs*: añade la misma dirección.
   (Así el enlace del correo de confirmación lleva a la app.)
3. Entrad a la app y **cread vuestras dos cuentas** (Crear cuenta → confirmar correo → Entrar).
4. Opcional, pero recomendado: Supabase → Authentication → Sign In / Providers → desactiva *Allow new users to sign up*. Así nadie más puede crear cuentas (aunque tampoco tendría acceso a los datos).

## Uso

- **Plano (pantalla de inicio)**: el plano de la casa (`plano.js`). Cada estancia se asigna a un espacio con «✎ Asignar estancias»; al tocarla se ven sus productos.

- **+ Añadir**: pega el enlace. Revisa los datos y la categoría sugerida y guarda.
- **Mismo producto en otra tienda**: si coincide el código EAN o el nombre es muy parecido, la app pregunta si es el mismo producto. Si lo es, añade la oferta a la misma ficha y muestra cuál es la más barata.
- **Categorías**: se crean al vuelo al añadir productos, admiten subcategorías y un producto puede estar en varias. En «Editar» se pueden renombrar, mover o eliminar.
- **Precios**: revisión automática diaria, insignia «↓ X €» cuando baja e historial en la ficha. Si una tienda bloquea la lectura, el precio se actualiza con el marcador o a mano.
- **Móvil**: añade la web a la pantalla de inicio. Después podrás compartir enlaces a la app desde el botón «Compartir» del navegador (Android).

# Un plato para cada vida · Ecuador

Sitio web educativo estático para explorar rutinas de movimiento, recetas con ingredientes comunes en Ecuador y videos de fuentes educativas. El proyecto usa HTML, CSS y JavaScript sin dependencias ni backend.

## Ejecutar localmente

1. Abre `index.html` en un navegador moderno. Los formularios, filtros, mapa educativo e impresión funcionan sin servidor.
2. Si prefieres servirlo por HTTP, abre una terminal en esta carpeta y ejecuta `python -m http.server 5173`; luego visita `http://localhost:5173`.

No hay instalación de paquetes ni claves API. `src/data.js` mantiene separados los catálogos; `src/main.js` contiene la lógica de interacción y `assets/styles.css` los estilos.

## Privacidad y servicios externos

- El perfil vive solo en la memoria de la pestaña. No se guarda en `localStorage`, no se envía a un servidor y desaparece al borrar los campos o cerrar la pestaña.
- Las fotografías externas no se cargan hasta pulsar **Permitir fotografías**. El navegador entonces solicita imágenes a Unsplash; el perfil no forma parte de esas solicitudes.
- Un reproductor de YouTube se carga únicamente después de pulsar **Continuar y reproducir**. YouTube puede recibir datos técnicos de conexión; los datos del perfil no se incluyen en la URL ni se transmiten.
- La web no usa IA, cuentas, historial, carga de fotos personales ni analítica.

## Alcance de salud

El IMC se calcula con peso y altura. La clasificación educativa solo se muestra desde los 20 años y fuera del embarazo; no es un diagnóstico. Para menores no se genera un plan basado en peso. Embarazo, síntomas de alarma, alergias declaradas, medicación y condiciones clínicas activan mensajes de precaución. Las recetas son ideas generales, no dietas terapéuticas. El mapa comunica temas educativos asociados a la información declarada, nunca el estado real de un órgano.

El costo por porción no se muestra sin una cotización comparable y verificable. SIPA/MAG publica precios por mercado, fecha y presentación mayorista, que no equivalen automáticamente a un precio al consumidor ni al costo de una porción. Consulta el mercado y fecha del dato antes de actualizar los importes.

## Referencias y videos

- [Guías alimentarias de Ecuador · Ministerio de Salud Pública](https://www.salud.gob.ec/guias-alimentarias-gabas/)
- [Actividad física · Organización Mundial de la Salud](https://www.who.int/initiatives/behealthy/physical-activity)
- [IMC por edad, 5–19 años · Organización Mundial de la Salud](https://www.who.int/tools/growth-Reference-Data-for-5to19-years/indicators/bmi-for-Age)
- [Precios referenciales · SIPA/MAG](https://sipa.agricultura.gob.ec/index.php/precios-referenciales)
- [Línea de emergencias 9-1-1 · ECU 911](https://www.ecu911.gob.ec/gestion-de-la-atencion-de-emergencias/)
- Videos de [FAO Ecuador y las Guías Alimentarias](https://www.youtube.com/watch?v=sTOM53WJ8cQ), [receta de condimento natural](https://www.youtube.com/watch?v=Ji_LqbgCUIU), [introducción a las guías](https://www.youtube.com/watch?v=555JDoU2ul4), [resumen musical](https://www.youtube.com/watch?v=n1MHUZHnn_w) y [aeróbicos para principiantes del NHS](https://www.youtube.com/watch?v=a44ayeoSfKM).

Actualiza las referencias, el contenido clínico y los costos de alimentos antes de publicar una versión dirigida a público general. Se recomienda revisión por profesionales de salud.

## Publicar con GitHub Pages

El repositorio incluye un flujo de GitHub Actions en `.github/workflows/deploy.yml`. Para publicarlo:

1. Crea un repositorio para este proyecto y sube el contenido de esta carpeta a la rama `main`.
2. En GitHub, abre **Settings → Pages** y selecciona **GitHub Actions** como fuente de publicación.
3. El flujo publica el sitio al hacer push a `main`; también se puede ejecutar manualmente desde la pestaña **Actions**.

GitHub Pages sirve el sitio públicamente. Antes de publicar, confirma que el repositorio no contenga información privada; esta carpeta solo contiene el código estático de la web.


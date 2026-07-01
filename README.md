# 🚀 ORBIT — Task Manager

Gestor de tareas estilo Starlink con grupos, Kanban, Calendario, drag & drop, subtareas, etiquetas, campos personalizados, notas Markdown, comentarios, historial, relaciones entre tareas y modo claro/oscuro.

## 📁 Estructura del proyecto

```
orbitapp/
├── index.html      # Estructura HTML + modales + paneles
├── style.css       # Todo el CSS (tema Starlink, dark/light mode)
├── app.js          # Toda la lógica JS (estado, render, drag&drop, etc.)
├── sw.js           # Service Worker (PWA offline + push notifications)
├── manifest.json   # Manifiesto PWA (instalar como app)
├── auth.js         # Módulo de autenticación con Google via Supabase
├── supabase.js     # Cliente Supabase (reemplaza localStorage)
├── schema.sql      # Esquema completo de base de datos para Supabase
└── README.md
```

## ✨ Funcionalidades

- **Vistas**: Lista · Kanban · Calendario
- **Grupos** colapsables con color personalizado y rename inline
- **Drag & Drop** entre grupos y dentro de grupos
- **Tareas** con prioridad · fecha límite · notas Markdown · etiquetas · subtareas · comentarios · historial · relaciones · campos personalizados
- **Búsqueda global** con highlight + paleta de comandos (`Ctrl+K`)
- **Filtros** por estado · prioridad · etiqueta + ordenamiento
- **Exportar/Importar** JSON · Duplicar tareas
- **6 Templates** preconfigurados (Kanban, OKRs, Bug Tracker, Editorial, etc.)
- **Modo claro/oscuro** con persistencia
- **PWA**: instalable en Android, iOS, Windows y Mac
- **Atajos de teclado**: `?` para ver todos

## 🚀 Cómo usar (versión local)

1. Clona el repositorio:
   ```bash
   git clone https://github.com/ChecheNiky-cpu/orbitapp.git
   cd orbitapp
   ```
2. Abre `index.html` en tu navegador (o usa un servidor local):
   ```bash
   npx serve .
   # o
   python3 -m http.server 3000
   ```
3. ¡Listo! Los datos se guardan en `localStorage`.

## 🔐 Configurar Google Auth + Supabase

Para activar login real y sincronización en la nube:

### 1. Crear proyecto en Supabase
- Ve a [supabase.com](https://supabase.com) → nuevo proyecto
- Copia `Project URL` y `anon public key` de Settings → API

### 2. Activar Google OAuth
- Supabase dashboard → Authentication → Providers → Google
- Crea credenciales OAuth en [console.cloud.google.com](https://console.cloud.google.com)
- Pega `Client ID` y `Client Secret` en Supabase

### 3. Ejecutar el esquema SQL
- Supabase dashboard → SQL Editor → New query
- Pega el contenido de `schema.sql` y ejecuta

### 4. Configurar credenciales en el código
Edita `supabase.js`:
```js
const SUPABASE_URL      = 'https://TU_PROYECTO.supabase.co';
const SUPABASE_ANON_KEY = 'TU_ANON_KEY';
```

### 5. Descomentar Supabase CDN en index.html
```html
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
```

## 📱 Instalar como PWA

Con el servidor corriendo, en Chrome/Edge:
- **Android**: menú → "Agregar a pantalla de inicio"
- **iOS**: Safari → compartir → "Agregar a pantalla de inicio"
- **Windows/Mac**: ícono de instalación en la barra de direcciones

## ⌨️ Atajos de teclado

| Atajo | Acción |
|---|---|
| `Ctrl+K` | Paleta de comandos |
| `?` | Ver todos los atajos |
| `1` / `2` / `3` | Cambiar vista |
| `/` | Enfocar búsqueda |
| `N` | Nuevo grupo |
| `T` | Cambiar tema |
| `Ctrl+E` | Exportar datos |
| `Esc` | Cerrar modal |
| `Ctrl+↵` | Guardar tarea (desde modal) |

## 🗺️ Roadmap

- [ ] Login con Google (Supabase Auth)
- [ ] Migración de localStorage → Supabase DB
- [ ] Workspaces compartidos con roles
- [ ] Tiempo real (Supabase Realtime)
- [ ] Notificaciones push de fechas límite
- [ ] @Menciones en comentarios
- [ ] Archivos adjuntos (Supabase Storage)
- [ ] App nativa con Capacitor (App Store / Play Store)

## 🛠️ Stack técnico

| Capa | Tecnología |
|---|---|
| Frontend | HTML · CSS · JavaScript (vanilla) |
| PWA | Service Worker · Web Manifest |
| Auth | Supabase Auth + Google OAuth 2.0 |
| Base de datos | PostgreSQL (Supabase) |
| Tiempo real | Supabase Realtime (WebSockets) |
| Storage | Supabase Storage |

---

Hecho con ❤️ por [@ChecheNiky-cpu](https://github.com/ChecheNiky-cpu)

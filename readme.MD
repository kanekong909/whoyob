# 📋 WorkNotes

WorkNotes es una aplicación **full-stack tipo SaaS personal** que permite a cada usuario crear múltiples espacios de trabajo para organizar información laboral de forma estructurada mediante tarjetas, categorías e imágenes.

Está diseñada como una herramienta tipo “segunda memoria laboral”, adaptable a cualquier tipo de trabajo.

---

## 🚀 Demo

🔗 Backend en producción (Railway):  
https://whoyob-production.up.railway.app

---

## 🧠 Concepto

WorkNotes resuelve un problema real:

> Centralizar información de trabajo en espacios organizados, rápidos y accesibles.

Cada usuario puede crear entornos independientes como:

- 🍸 Bartender → cócteles, recetas, inventario
- 🍽 Mesero → menú, platos, recomendaciones
- 💊 Farmacia → medicamentos y usos
- 🛒 Tienda → productos
- 🧑‍💻 Oficina → procesos internos

---

## ✨ Funcionalidades principales

### 🔐 Autenticación completa
- Registro de usuarios
- Login con JWT
- Middleware de autenticación
- Protección de rutas backend
- Expiración de sesión (30 días)

---

### 🗂️ Workspaces (núcleo del sistema)
- Crear espacios de trabajo
- Editar nombre, descripción e ícono
- Eliminar espacios
- Conteo de tarjetas por workspace
- Persistencia por usuario (multi-tenant)

---

### 🏷️ Categorías dinámicas
- CRUD completo
- Colores personalizados
- Filtro por categoría
- Menú contextual (⋯)
- Conteo de tarjetas por categoría

---

### 📝 Sistema de tarjetas (Cards)

Cada tarjeta puede contener:

- Título
- Descripción
- Lista (ingredientes o pasos)
- Tags
- Imagen (Cloudinary)
- Categoría

---

### 🔍 Búsqueda avanzada

- MySQL FULLTEXT INDEX
- Búsqueda en:
  - título
  - descripción
  - ingredientes
  - tags
- Optimizada con `BOOLEAN MODE`

---

### 📷 Sistema de imágenes (Cloudinary)

Implementación profesional:

- Multer + Cloudinary Storage
- Optimización automática de imágenes
- Eliminación automática al actualizar o borrar
- Transformación de tamaño y calidad
- Soporte JPG, PNG, WEBP, GIF

---

### 🔒 Seguridad del sistema

- Middleware JWT centralizado
- Validación de ownership por usuario
- Protección de workspaces cruzados
- Validación en cada endpoint crítico

---

## 🛠️ Tecnologías utilizadas

### Frontend
- HTML5
- CSS3
- JavaScript Vanilla (arquitectura modular)

### Backend
- Node.js
- Express.js
- JWT
- bcryptjs
- multer
- cloudinary
- mysql2
- dotenv
- cors

### Base de datos
- MySQL (Railway)
- UUID como primary key
- FULLTEXT search

### Storage
- Cloudinary (imágenes en la nube)

---

## 🧩 Arquitectura del sistema

### Frontend (modular vanilla JS)

- `auth.js` → autenticación
- `app.js` → UI core + modales + estado
- `workspaces.js` → gestión de espacios y categorías
- `cards.js` → sistema de tarjetas
- `api.js` → comunicación con backend

---

### Backend (Express API REST)

- `server.js` → entrypoint
- `routes/auth.js` → login/register/me
- `routes/workspaces.js` → workspaces + categorías
- `routes/cards.js` → tarjetas + uploads
- `middleware.js` → JWT auth guard
- `db.js` → pool MySQL

---

## 🗄️ Base de datos

### Tablas:

- `users`
- `workspaces`
- `categories`
- `cards`

---

### Relaciones:

- Usuario → Workspaces (1:N)
- Workspace → Categories (1:N)
- Workspace → Cards (1:N)
- Category → Cards (1:N opcional)

---

## ⚙️ Instalación local

### 1. Clonar repositorio

```bash
git clone https://github.com/kanekong909/whoyob.git
cd whoyob
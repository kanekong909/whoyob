# WorkNotes — Guía de deploy completa

## 1. Crear el repo en GitHub

1. Ve a https://github.com/new
2. Nombre: `worknotes`
3. Público o privado (cualquiera funciona)
4. Clona el repo en tu computadora:
   ```
   git clone https://github.com/TU_USUARIO/worknotes.git
   cd worknotes
   ```
5. Copia los archivos de este proyecto dentro de la carpeta clonada.

---

## 2. Configurar Railway (backend + base de datos)

### Crear cuenta en Railway
1. Ve a https://railway.app y regístrate con GitHub.

### Crear el proyecto
1. Click en **New Project → Deploy from GitHub repo**
2. Selecciona tu repo `worknotes`
3. Cuando pregunte qué carpeta desplegar, pon `backend`

### Agregar MySQL
1. En el proyecto de Railway, click **+ Add Service → Database → MySQL**
2. Railway crea la base de datos automáticamente.
3. Click en el servicio MySQL → pestaña **Variables**
4. Copia los valores de:
   - `MYSQLHOST`
   - `MYSQLPORT`
   - `MYSQLUSER`
   - `MYSQLPASSWORD`
   - `MYSQLDATABASE`

### Variables de entorno del backend
En el servicio de Node.js (tu backend), ve a **Variables** y agrega:

```
DB_HOST      = (pega MYSQLHOST de Railway)
DB_PORT      = (pega MYSQLPORT)
DB_USER      = (pega MYSQLUSER)
DB_PASSWORD  = (pega MYSQLPASSWORD)
DB_NAME      = (pega MYSQLDATABASE)
JWT_SECRET   = cualquier_string_largo_y_secreto_aqui
FRONTEND_URL = https://TU_USUARIO.github.io
PORT         = 3000
```

### Crear las tablas
1. En Railway, click en el servicio MySQL → **Data** → **Query**
2. Copia y pega el contenido de `backend/schema.sql`
3. Click en **Run**

### Obtener la URL del backend
Una vez deployado, Railway te da una URL pública tipo:
`https://worknotes-backend-production.up.railway.app`

Guarda esa URL, la necesitas en el frontend.

---

## 3. Configurar GitHub Pages (frontend)

1. En el repo de GitHub, ve a **Settings → Pages**
2. Source: `Deploy from a branch`
3. Branch: `main` / carpeta: `/frontend`
4. GitHub Pages quedará en: `https://TU_USUARIO.github.io/worknotes/`

Antes de hacer push al frontend, edita el archivo `frontend/js/api.js`
y cambia `API_URL` por la URL que te dio Railway.

---

## 4. Estructura de archivos para el repo

```
worknotes/
├── backend/
│   ├── server.js
│   ├── db.js
│   ├── package.json
│   ├── schema.sql
│   ├── .env.example
│   └── routes/
│       ├── auth.js
│       ├── workspaces.js
│       ├── cards.js
│       └── middleware.js
└── frontend/
    ├── index.html
    ├── css/
    │   └── style.css
    └── js/
        ├── api.js
        ├── auth.js
        ├── workspaces.js
        ├── cards.js
        └── app.js
```

---

## 5. Probar localmente antes del deploy

```bash
cd backend
npm install
cp .env.example .env
# Edita .env con los datos de Railway MySQL
npm run dev
```

El backend corre en http://localhost:3000  
Abre `frontend/index.html` con Live Server (VS Code) en http://localhost:5500

# 🚀 StockVision

StockVision es un **Sistema Inteligente de Gestión de Inventarios y Predicción Automática**, construido con una arquitectura moderna separada en Backend (Django) y Frontend (React).

Este sistema está diseñado para ofrecer una plataforma multi-empresa con múltiples roles, facilitando la administración de productos, rotación del inventario y ofreciendo un panel operativo claro y elegante para la toma de decisiones.

---

## 🛠️ Tecnologías Utilizadas

*   **Backend:**
    *   Python 3 & Django
    *   Django REST Framework (DRF)
    *   `djangorestframework-simplejwt` (Autenticación mediante JSON Web Tokens - JWT)
    *   `django-cors-headers` (Soporte Multi-Origen CORS)
    *   Base de datos: SQLite (por defecto)
*   **Frontend:**
    *   React 18 & Vite
    *   Tailwind CSS v4 (Estilos)
    *   `react-router-dom` (Enrutamiento)
    *   `lucide-react` (Iconografía)
    *   Axios (Peticiones HTTP)

---

## 🧑‍💻 Inicialización del Proyecto

Sigue estos pasos para arrancar ambos servicios y usar StockVision en tu entorno de desarrollo local.

### 1. Levantar el Backend (Django)
Abre una terminal, dirígete a la ruta base de tu proyecto y ejecuta los siguientes comandos:

```bash
# 1. Crear el entorno virtual (si no lo tienes creado)
python -m venv venv

# 2. Activar el entorno virtual
# En Windows:
.\venv\Scripts\activate
# En Linux/Mac:
source venv/bin/activate

# 3. Instalar dependencias (DRF, JWT, CORS, etc.)
pip install -r requirements.txt

# 4. Aplicar las migraciones a la base de datos
python manage.py migrate

# 5. Levantar el servidor de desarrollo
python manage.py runserver
```
El backend quedará levantado en `http://127.0.0.1:8000`.

### 2. Levantar el Frontend (React + Vite)
Abre una segunda terminal nueva o una pestaña adicional, dirígete a la carpeta `frontend` dentro de tu proyecto.

```bash
# 1. Entrar al directorio
cd frontend

# 2. Instalar todas las dependencias de Node.js
npm install

# 3. Correr el servidor de desarrollo de Vite
npm run dev
```
El frontend será accesible desde `http://localhost:5173`.

---

## 🏗️ Documentación del Sistema

### Seguridad Basada en Roles (RBAC)
StockVision cuenta con un motor interno para gestionar los permisos según el cargo del usuario (`ADMIN`, `JEFE_INVENTARIO`, `EMPLEADO`). 
Con esto se garantizan vistas dedicadas y seguras desde el Frontend:
- **`ADMIN`:** Tiene un Control Maestro; gestiona empresas, todos los usuarios y obtiene las métricas financieras más amplias.
- **`JEFE_INVENTARIO`:** Acceso directo a control de inventario, stock bajo y alertas predictivas dentro de su empresa correspondiente.
- **`EMPLEADO`:** Funciones limitadas al panel operativo diario y movimientos de mercancía a los que fue asignado.

### Separación Inteligente de Vistas
Para evitar pantallas sobrecargadas, creamos dos niveles de navegación principal:
1. **Página de Inicio (`/inicio`):** Funciona como un punto de aterrizaje amigable. Da la bienvenida, muestra la marca StockVision (logo personalizado), informa la sesión vigente (nombre completo del empleado y cargo asignado), y sirve como portal principal antes de sumergirse en métricas.
2. **Dashboard de Métricas (`/dashboard`):** Exclusivo para gerentes y administradores. Brinda acceso al instante a indicadores vitales:
    - Productos totales
    - Alertas críticas vigentes con línea de tiempo y urgencia explícita.
    - Tasas de rotación (tiempo promedio en bodega).
    - Gráfico dinámico automatizado de movimientos de mercancía por mes.

### Cierre Automático de Sesión (Inactividad)
Como refuerzo de las políticas de seguridad en sistemas críticos de inventarios, todo usuario de StockVision es supervisado en segundo plano. Mediante un `Custom Hook` llamado `AutoLogout`, si el sistema no registra movimiento del ratón, scrolls de pantalla o tecleos por un periodo de **15 minutos consecutivos**, los JWT (Tokens de Validación Local) serán destruidos irrevocablemente y forzará la pantalla de inicio de sesión de nuevo, previniendo accesos indeseados en escritorios desatendidos.

### Multi-Empresa Silencioso (Multitenant DB)
El código en Backend está configurado mediante filtros silenciosos. El administrador maestro puede operar visualizando los bienes de cualquier sucursal o empresa instalada en StockVisión. Sin embargo, en el momento que personal de almacén accede, los QuerySets en el API limitan cualquier petición para proveer únicamente la data que coincida estrictamente a la compañía por la cual fueron contratados.

---

> _**Desarrollado para resolver los nuevos retos logísticos implementando tecnologías avanzadas.**_

# 🚀 StockVision

StockVision es un __Sistema Inteligente de Gestión de Inventarios y Predicción Automática__, construido sobre una arquitectura moderna y robusta, separada en niveles de Backend (Django) y Frontend (React).

Este sistema ha sido rigurosamente diseñado para proporcionar una plataforma corporativa multi-empresa y multi-rol. Facilita la administración centralizada de productos, la optimización de la rotación de inventarios y ofrece un panel operativo intuitivo y analítico para respaldar la toma de decisiones estratégicas.

---

## 🛠️ Stack Tecnológico

- __Backend:__
    - Python 3 y Django
    - Django REST Framework (DRF)
    - `djangorestframework-simplejwt` (Autenticación segura mediante JSON Web Tokens)
    - `django-cors-headers` (Soporte Multi-Origen CORS)
    - Motor de Base de Datos: SQLite (Configuración inicial)
- __Frontend:__
    - React 18 y Vite
    - Tailwind CSS v4 (Sistema de diseño utilitario)
    - `react-router-dom` (Gestión de rutas)
    - `lucide-react` (Sistema de iconografía)
    - Axios (Cliente HTTP)

---

## 🧑‍💻 Guía de Despliegue Local

Siga cuidadosamente estos pasos para inicializar los servicios y ejecutar StockVision en su entorno de desarrollo local.

### 1. Inicialización del Backend (Django)
Abra su terminal, navegue hasta el directorio raíz del proyecto y ejecute los siguientes comandos:

```bash
# 1. Creación del entorno virtual (si no existe)
python -m venv venv

# 2. Activación del entorno virtual
# Para sistemas Windows:
.\venv\Scripts\activate
# Para sistemas Linux/Mac:
source venv/bin/activate

# 3. Instalación de dependencias (DRF, JWT, CORS, entre otras)
pip install -r requirements.txt

# 4. Ejecución de migraciones de la base de datos
python manage.py migrate

# 5. Inicialización del servidor de desarrollo
python manage.py runserver
```
El servicio de backend estará disponible en: `http://127.0.0.1:8000`.

### 2. Inicialización del Frontend (React + Vite)
Abra una nueva instancia de terminal, navegue hacia el directorio `frontend` dentro de su proyecto.

```bash
# 1. Acceso al directorio
cd frontend

# 2. Instalación de paquetes y dependencias de Node.js
npm install

# 3. Ejecución del servidor de desarrollo de Vite
npm run dev
```
La interfaz de usuario estará accesible a través de: `http://localhost:5173`.

---

## 🏗️ Arquitectura y Seguridad del Sistema

### Control de Acceso Basado en Roles (RBAC)
StockVision implementa un motor de autorización interno para administrar los permisos de acuerdo al cargo del usuario (`ADMIN`, `JEFE_INVENTARIO`, `EMPLEADO`). 
Esto garantiza niveles de acceso dedicados y operaciones seguras:
- __ADMIN:__ Posee control total; gestiona empresas, administra usuarios y accede a métricas financieras globales.
- __JEFE_INVENTARIO:__ Dispone de acceso directo al control de inventario, detección de stock crítico y pronósticos predictivos para su compañía asignada.
- __EMPLEADO:__ Cuenta con funciones delimitadas al módulo operativo diario y ejecución de movimientos de mercancía autorizados.

### Diseño de Interfaz Optimizado
Con el fin de prevenir la sobrecarga de información, el sistema implementa una jerarquía de navegación estructurada en dos niveles principales:
1. __Portal de Inicio (`/inicio`):__ Funciona como punto de acceso principal. Presenta la identidad corporativa, detalla la información de la sesión activa (nombre de empleado y cargo), y actúa como interfaz de bienvenida.
2. __Dashboard Analítico (`/dashboard`):__ Panel exclusivo para perfiles gerenciales y administrativos. Facilita acceso inmediato a indicadores de rendimiento clave (KPIs):
    - Volumen total de productos.
    - Alertas críticas activas con clasificación de urgencia.
    - Tasas de rotación y tiempos promedios en almacén.
    - Gráficas automatizadas de flujos de mercancía mensuales.

### Protocolo de Inactividad y Cierre Automático
Como medida de seguridad fundamental en el manejo de inventarios, las sesiones de usuario son monitoreadas continuamente de forma pasiva. A través del módulo `AutoLogout`, ante la ausencia de interacción (movimiento de cursor, desplazamiento o uso de teclado) por un lapso de __15 minutos__, los tokens de sesión (JWT) son invalidados permanentemente, redireccionando al usuario a la pantalla de autenticación.

### Aislamiento de Datos Multi-Empresa (Multitenant DB)
El backend procesa la información mediante filtros de aislamiento de datos. Mientras que el administrador del sistema puede visualizar los activos de cualquier sucursal o empresa registrada, las consultas (QuerySets) del personal operativo están estrictamente restringidas para exponer únicamente la información correspondiente a su respectiva organización.

---

## 👥 Herramientas de Pruebas y Desarrollo
Para propósitos de validación exhaustiva de la plataforma (Roles, Permisos, Vistas y Sucursales), es posible poblar la base de datos con perfiles de prueba automáticos (`ADMIN`, `JEFE_INVENTARIO`, `EMPLEADO`, `VENDEDOR`) en diversas sedes, mediante el siguiente comando:

```bash
python create_test_users.py
```
> __Nota de Credenciales__: La contraseña asignada por defecto a todos los usuarios generados es `12345` (Ej. `admin_test_1`, `vend_test_1`). Estas cuentas incluyen datos preconfigurados para facilitar la evaluación de los módulos.

---

## ⚠️ Oportunidades de Mejora y Mantenimiento Futuro
Se identifican los siguientes puntos técnicos y funcionales para ser incorporados en próximas versiones (Roadmap):
1. __Paginación en el Módulo POS__: Para catálogos extensos, la renderización simultánea en el Punto de Venta puede comprometer el rendimiento. Se proyecta la implementación de paginación o carga diferida (_infinite scroll_).
2. __Resolución de Concurrencia Transaccional__: Para evitar inconsistencias de inventario ante ventas simultáneas del mismo producto final, se requiere establecer bloqueos a nivel de base de datos (`select_for_update`).
3. __Módulo de Arqueos e Historial de Caja__: Expansión funcional del Punto de Venta para soportar operaciones estructuradas de "Apertura y Cierre de Caja".
4. __Optimización Multimedia__: Implementación de procesamiento y compresión de imágenes de productos en el servidor para reducir el consumo de ancho de banda y capacidad de almacenamiento.
5. __Reportes Avanzados__: Integración de utilidades nativas para la exportación masiva de historiales financieros (Excel/PDF) y auditorías de mermas de inventario.
6. __Recuperación de Credenciales__: Configuración de variables de entorno con un servidor SMTP establecido en `settings.py` para habilitar el restablecimiento de contraseñas en entornos de producción.

---
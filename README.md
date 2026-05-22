# 🚀 StockVision
StockVision es un **Sistema Inteligente de Gestión de Inventarios y Predicción Automática** diseñado para entornos corporativos modernos. Se basa en una arquitectura desacoplada con un backend robusto en **Django REST Framework** y un frontend dinámico en **React con Vite y Tailwind CSS**.
Esta plataforma está lista para producción y está completamente optimizada para ofrecer aislamiento multi-empresa, gestión inteligente de stock con IA y un control operativo fluido de alta seguridad.

---
## 🛠️ Stack Tecnológico de Producción
### Backend (Servicios y Datos)
* **Framework:** Python 3 + Django & Django REST Framework (DRF)
* **Base de Datos:** **PostgreSQL** (Motor de base de datos relacional para producción y pruebas)
* **Seguridad y JWT:** `djangorestframework-simplejwt` (Tokens de acceso y refresco seguros)
* **Políticas CORS:** `django-cors-headers` (Integración multi-origen)
* **Inteligencia Artificial:** Prophet & XGBoost (Modelos predictivos de demanda y sugerencias de compra automáticas)
### Frontend (Interfaz de Usuario)
* **Framework:** React 18 + Vite (Aplicación Single Page - SPA)
* **Estilizado (CSS):** Tailwind CSS v4 (Diseño responsivo y moderno)
* **Iconografía:** `lucide-react`
* **Cliente HTTP:** Axios (Comunicación asíncrona con la API)
---
## 🔑 Características Clave y Arquitectura
> [!NOTE]
> **Aislamiento Multitenant:**
> El sistema implementa un riguroso aislamiento a nivel de base de datos. Cada empresa (`Company`) y sucursal (`Branch`) visualiza únicamente sus propios recursos. Los empleados regulares no pueden consultar datos de inventario o personal de empresas competidoras.

### 👥 Control de Acceso Basado en Roles (RBAC)
StockVision cuenta con un motor de autorización interno de 3 niveles:
1. **ADMIN (Administrador Corporativo):** Acceso total para gestionar la empresa, dar de alta sedes, crear empleados y ver KPIs financieros globales.
2. **JEFE_INVENTARIO:** Permisos para control físico de productos, movimientos de bodega, visualización de alertas y acceso a predicciones de IA.
3. **EMPLEADO (Bodega/Ventas):** Funciones delimitadas a las operaciones cotidianas de facturación y movimientos de mercancía autorizados.

### 🤖 Motor Predictivo de IA Integrado
Nuestros modelos de Machine Learning (Prophet y XGBoost) analizan los históricos de ventas y el stock actual para:
* Pronosticar tendencias mensuales de demanda de productos.
* Generar sugerencias automáticas de abastecimiento preventivo (`auto_order`).
* Disparar alertas inteligentes cuando el inventario cruza el umbral crítico (`min_stock`).

### 🛡️ Protocolo de Seguridad Activa (Auto-Logout)
Para proteger la integridad del inventario ante descuidos físicos en bodega o terminales de venta, el módulo `AutoLogout` monitorea continuamente la actividad del usuario. Ante **15 minutos de inactividad**, la sesión es invalidada de inmediato destruyendo los tokens JWT y redirigiendo al portal de autenticación.
## 🏗️ Guía de Despliegue y Configuración Local
Sigue estos pasos para inicializar el proyecto en tu entorno local con PostgreSQL.
### 1. Requisitos Previos
* Python 3.10+ instalado.
* Node.js 18+ instalado.
* Servidor PostgreSQL activo.

### 2. Configuración del Backend (Django)
1. Abre tu terminal y ve a la raíz del proyecto.
2. Crea y activa tu entorno virtual:
   ```bash
   python -m venv venv
   # En Windows:
   .\venv\Scripts\activate
   # En Linux/macOS:
   source venv/bin/activate
   ```
3. Instala todas las dependencias requeridas:
   ```bash
   pip install -r requirements.txt
   ```
4. Configura las variables de conexión a PostgreSQL en [settings.py](file:///c:/Users/valen/OneDrive/Desktop/stockvision/backend/settings.py) (o mediante variables de entorno):
   * `DB_NAME`: `mibasededatos`
   * `DB_USER`: `django_user`
   * `DB_PASSWORD`: `Admin123`
   * `DB_HOST`: `localhost`
   * `DB_PORT`: `5432`
5. Ejecuta las migraciones y carga los datos de producción/semilla:
   ```bash
   # Aplicar migraciones
   python manage.py migrate
   
   # Cargar el dump de base de datos migrado (UTF-8)
   python manage.py loaddata datadump_utf8.json
   ```
6. Inicia el servidor de desarrollo:
   ```bash
   python manage.py runserver
   ```
   El backend estará disponible en `http://127.0.0.1:8000`.

   ### 3. Configuración del Frontend (React)
1. Abre una nueva terminal en el directorio `frontend/`.
2. Instala las dependencias de Node:
   ```bash
   npm install
   ```
3. Inicia el servidor de desarrollo Vite:
   ```bash
   npm run dev
   ```
   La aplicación web estará disponible en `http://localhost:5173`.
   ## 🧪 Pruebas de Software e Integridad
> [!IMPORTANT]
> **Suite de Pruebas Integral:**
> StockVision cuenta con **73 pruebas automatizadas** que validan la lógica de negocio, seguridad, integridad y el comportamiento del motor de IA en PostgreSQL.
>
> Para conocer el mapa completo de casos de prueba y estados, consulta el **[README de Pruebas](file:///c:/Users/valen/OneDrive/Desktop/stockvision/README_PRUEBAS.md)** y el reporte general en **[PRUEBAS.md](file:///c:/Users/valen/OneDrive/Desktop/stockvision/PRUEBAS.md)**.
Para correr la suite de pruebas automatizadas localmente, ejecuta:
python manage.py test

## 🚀 Plan de Despliegue a Producción
Puntos de verificación previos a la puesta en marcha:
1. **Configuración de Variables de Entorno:**
   * Cambiar `DEBUG` a `False` en settings.
   * Modificar la variable `SECRET_KEY` de producción.
   * Configurar `ALLOWED_HOSTS` y `CORS_ALLOWED_ORIGINS` con los dominios oficiales de producción.
2. **Servidor de Correos (SMTP):**
   * Configurar las credenciales de correo SMTP para habilitar el flujo funcional de restablecimiento de contraseña en producción.
3. **Seguridad Transaccional:**
   * Bloqueo a nivel de filas (`select_for_update`) en el módulo de ventas de alta concurrencia para evitar inconsistencias de inventario simultáneas.
   

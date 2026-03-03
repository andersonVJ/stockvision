# StockVision Backend Documentation

Este documento resume la estructura y las funcionalidades implementadas hasta la fecha en el backend del proyecto **StockVision**. El backend ha sido construido utilizando **Django 6.0.2** y **Django REST Framework (DRF)**.

## 1. Módulos y Aplicaciones (Apps)
El proyecto está dividido modularmente en 4 aplicaciones principales:

### `backend` (Configuración Principal)
Contiene las configuraciones globales (`settings.py`), la conexión a la base de datos (SQLite por defecto) y el enrutador principal (`urls.py`). 

### `users` (Gestión de Usuarios y Autenticación)
Maneja los permisos y roles del sistema.
* **Modelo Personalizado (`User`):** Extiende el modelo por defecto de Django añadiendo:
  * `role`: Define si el usuario es `ADMIN`, `JEFE_INVENTARIO` o `EMPLEADO`.
  * `company`: Llave foránea que relaciona obligatoriamente al usuario con una empresa específica (Modelo `Company`).
* **Autenticación (JWT):** Implementada mediante `djangorestframework-simplejwt`. 

### `companies` (Gestión de Organizaciones)
Permite que el sistema sea Multi-Empresa o gestione múltiples sucursales.
* **Modelo `Company`:** Define el nombre, dirección, teléfono y correo electrónico de una empresa. Todos los demás modelos (usuarios y productos) pivotan alrededor de esta entidad para filtrar la exhibición de datos.

### `inventory` (Gestión de Inventario y Lógica de Negocio)
El núcleo operativo del sistema. Contiene 4 modelos interconectados:
* **`Category`:** Clasificaciones generales para agrupar los artículos.
* **`Product`:** El catálogo de artículos. Contiene SKU (Stock Keeping Unit), nombre, descripción, relación con categoría y precio.
* **`Inventory`:** La tabla que registra la **cantidad actual (stock)** de cada producto individual. Tiene una relación "Uno a Uno" (OneToOne) con Product.
* **`StockMovement`:** Un historial de auditoría inmutable. Registra cada vez que ingresa (`ENTRY`) o sale (`EXIT`) mercancía. 
  * *Lógica Automática:* Cuando se registra un nuevo `StockMovement` a través de la API, el sistema actualiza automáticamente la cantidad total en el modelo `Inventory` sumando o restando según corresponda.

---

## 2. API Endpoints (Rutas)

Todas las rutas base están prefijadas por `/api/`. Todas (excepto Login y Registro) requieren autenticación Bearer Token (JWT).

### 🔐 Autenticación y Usuarios (`/api/users/`)
* `POST /api/users/register/`: Permite a un nuevo usuario registrarse (aplica hash automático a la contraseña).
* `POST /api/users/login/`: Autentica al usuario. Devuelve el token `access` y `refresh`.
* `POST /api/users/token/refresh/`: Renueva un token de acceso expirado usando el refresh token.
* `GET /api/users/welcome/`: Endpoint de prueba (protegido) para verificar que el token es válido y obtener los datos de sesión del usuario.

### 🏢 Empresas (`/api/companies/`)
CRUD completo y automático gestionado por `ModelViewSet`.
* `GET /api/companies/`: Listar empresas.
* `POST /api/companies/`: Crear empresa.
* `GET, PUT, PATCH, DELETE /api/companies/<id>/`: Operaciones sobre una empresa específica.

### 📦 Inventario y Movimientos (`/api/inventory/`)
CRUD completo y automático gestionado por `ModelViewSet`. Contiene las siguientes sub-rutas:
* `/api/inventory/categories/` (CRUD de Categorías)
* `/api/inventory/products/` (CRUD de Productos)
* `/api/inventory/inventories/` (CRUD de Cantidades de Stock)
* `/api/inventory/movements/` (Historial y Registro de Movimientos de Entrada/Salida).

---

## 3. Seguridad Multitenant (Por Empresa)
El sistema ha sido diseñado pensando en la privacidad. 
Los `ViewSets` de las rutas protegidas sobreescriben el método `get_queryset`. Como resultado:
1. Si un usuario con el rol `ADMIN` (o superusuario) consulta la API, podrá ver los productos, inventarios y movimientos de **todas las empresas**.
2. Si un usuario `EMPLEADO` (o cualquier otro) que pertenece a la "Empresa A" consulta la misma API, los filtros de backend actuarán de forma silenciosa e interceptarán la consulta para **devolver únicamente los datos de la Empresa A**.

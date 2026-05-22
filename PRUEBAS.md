# Reporte y Documentación de Pruebas de Software - StockVision

Este documento detalla la planificación, ejecución y los resultados del plan de pruebas integral de StockVision. La suite automática consta de **73 pruebas automatizadas** que validan la lógica de negocio, seguridad, integridad de datos, flujos de base de datos e integración de inteligencia artificial.

## Resumen Ejecutivo de la Suite

* **Total de Pruebas Automatizadas Ejecutadas:** 73
* **Pruebas Exitosas:** 73
* **Pruebas Fallidas:** 0
* **Tasa de Éxito:** 100%
* **Duración de la Ejecución:** ~76 segundos
* **Base de Datos Utilizada:** PostgreSQL (Entorno de Prueba Compartido/Migrado)

---

## Tabla General de Pruebas y Resultados

| ID Prueba | Categoría | Módulo/Funcionalidad | Nombre de la Prueba | Descripción | Resultado | Notas |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **PR-001** | Autenticación | Login / JWT | `test_login_valid_credentials` | Verifica que el login con credenciales válidas retorne tokens JWT (`access` y `refresh`) correctamente. | ✅ Aprobado | Token JWT robusto. |
| **PR-002** | Autenticación | Login / JWT | `test_login_invalid_credentials` | Verifica que un login con credenciales inválidas sea rechazado con código 401. | ✅ Aprobado | Mensaje genérico de seguridad. |
| **PR-003** | Autenticación | Login / JWT | `test_login_nonexistent_user` | Asegura que el acceso de un usuario inexistente sea rechazado con 401. | ✅ Aprobado | Evita enumeración directa. |
| **PR-004** | Autenticación | Acceso Protegido | `test_access_protected_endpoint_without_auth` | Verifica que las vistas con `IsAuthenticated` rechacen accesos anónimos con 401. | ✅ Aprobado | Middleware de Django REST Framework activo. |
| **PR-005** | Autenticación | Acceso Protegido | `test_access_protected_endpoint_with_token` | Confirma el acceso autorizado a recursos protegidos adjuntando un JWT en la cabecera `Bearer`. | ✅ Aprobado | Acceso verificado y rápido. |
| **PR-006** | Autenticación | Token Refresh | `test_token_refresh` | Verifica el refresco exitoso del token de acceso a partir de un token de refresco válido. | ✅ Aprobado | Rotación de token JWT. |
| **PR-007** | Autenticación | Token Inválido | `test_access_with_invalid_token` | Intenta consumir servicios con una cabecera JWT alterada y valida el rechazo inmediato (401). | ✅ Aprobado | Defensa contra alteración de firma. |
| **PR-008** | Registro | Registro de Usuarios | `test_register_valid_user` | Valida el registro exitoso de un usuario/empleado con credenciales válidas y rol asignado. | ✅ Aprobado | Inserta el registro en PostgreSQL. |
| **PR-009** | Registro | Registro de Usuarios | `test_register_duplicate_username` | Valida que el sistema rechace el registro de nombres de usuario duplicados. | ✅ Aprobado | Restricción única en base de datos. |
| **PR-010** | Registro | Registro de Usuarios | `test_register_duplicate_email` | Valida que el sistema rechace correos duplicados. | ✅ Aprobado | Restricción de correo a nivel DB. |
| **PR-011** | Registro | Registro de Usuarios | `test_register_missing_fields` | Verifica el rechazo y códigos de error (400) al enviar esquemas incompletos en el registro. | ✅ Aprobado | Validadores del serializador activos. |
| **PR-012** | Autenticación | Perfil de Usuario | `test_get_profile` | Confirma el retorno de la información detallada del usuario logueado en `/api/users/profile/`. | ✅ Aprobado | Retorna rol, empresa y sede correspondientes. |
| **PR-013** | Autenticación | Perfil / Seguridad | `test_change_password_valid` | Valida el cambio de contraseña exitoso mediante la verificación y hash robusto de la clave actual. | ✅ Aprobado | Hash Django PBKDF2 aplicado. |
| **PR-014** | Autenticación | Perfil / Seguridad | `test_change_password_wrong_old` | Verifica que el sistema rechace el cambio de contraseña si la contraseña anterior es incorrecta. | ✅ Aprobado | Previene secuestros de sesión. |
| **PR-015** | CRUD Usuarios | Gestión de Empleados | `test_admin_can_list_employees` | Confirma que un Administrador pueda listar a todos los empleados bajo su empresa. | ✅ Aprobado | Filtro por Company activo. |
| **PR-016** | CRUD Usuarios | Gestión de Empleados | `test_admin_can_create_employee` | Confirma que un Administrador pueda crear nuevos empleados dentro de su organización. | ✅ Aprobado | Conexión e integridad de llaves foráneas. |
| **PR-017** | CRUD Usuarios | Gestión de Empleados | `test_admin_can_update_employee` | Verifica la modificación parcial y completa de metadatos de un empleado por parte de su administrador. | ✅ Aprobado | Parcialmente editable sin contraseña. |
| **PR-018** | CRUD Usuarios | Gestión de Empleados | `test_admin_can_delete_employee` | Valida la eliminación completa de la cuenta de un empleado por un administrador. | ✅ Aprobado | Limpieza relacional segura. |
| **PR-019** | CRUD Usuarios | Permisos / Roles | `test_empleado_cannot_create_employee` | Asegura la protección de privilegios: un empleado regular no puede registrar a otros empleados. | ✅ Aprobado | HTTP 403 Forbidden retornado. |
| **PR-020** | CRUD Usuarios | Permisos / Roles | `test_empleado_cannot_delete_employee` | Asegura que un empleado regular reciba un 403 al intentar eliminar a otros usuarios. | ✅ Aprobado | Restricción de permisos basada en roles. |
| **PR-021** | Permisos / Roles | Gestión de Cargos | `test_assign_position` | Confirma que un Administrador pueda asignar o cambiar cargos internos de empleados (p.ej. Bodega). | ✅ Aprobado | Modifica el campo `position` de forma segura. |
| **PR-022** | Permisos / Roles | Gestión de Cargos | `test_vendedor_cannot_assign_position` | Confirma que un Vendedor reciba un error de permisos al intentar asignar cargos. | ✅ Aprobado | Restricción por rol de Vendedor. |
| **PR-023** | CRUD Empresas | Gestión de Empresa | `test_list_companies` | Confirma el listado seguro de empresas registradas para usuarios autenticados. | ✅ Aprobado | Restringido a usuarios válidos. |
| **PR-024** | CRUD Empresas | Gestión de Empresa | `test_retrieve_company` | Valida la visualización detallada de la información de la propia empresa. | ✅ Aprobado | Datos de dirección, correo y teléfono expuestos. |
| **PR-025** | CRUD Empresas | Gestión de Empresa | `test_update_company` | Verifica que un Administrador de empresa pueda actualizar la información corporativa. | ✅ Aprobado | Modificaciones guardadas de inmediato. |
| **PR-026** | CRUD Empresas | Seguridad | `test_unauthenticated_cannot_list` | Asegura que usuarios anónimos no tengan acceso al catálogo corporativo global. | ✅ Aprobado | 401 Unauthorized. |
| **PR-027** | CRUD Sedes | Gestión de Sedes | `test_list_branches` | Verifica el listado de sucursales autorizadas para un administrador. | ✅ Aprobado | Filtro e integridad de datos activos. |
| **PR-028** | CRUD Sedes | Gestión de Sedes | `test_create_branch` | Confirma la creación de nuevas sedes corporativas vinculadas correctamente a la empresa. | ✅ Aprobado | Creación de sede e inventario asociada. |
| **PR-029** | CRUD Sedes | Gestión de Sedes | `test_update_branch` | Valida la modificación del nombre o ubicación de una sede específica. | ✅ Aprobado | Actualizaciones persistentes. |
| **PR-030** | CRUD Sedes | Gestión de Sedes | `test_delete_branch` | Confirma la eliminación física de una sucursal inactiva o temporal. | ✅ Aprobado | Cascading controlado. |
| **PR-031** | CRUD Clientes | Gestión de Clientes | `test_create_client` | Valida la creación de registros de clientes corporativos (nombre, documento, correo, teléfono). | ✅ Aprobado | Registro en PostgreSQL. |
| **PR-032** | CRUD Clientes | Gestión de Clientes | `test_list_clients` | Verifica que el listado de clientes devuelva únicamente aquellos asociados a la empresa actual. | ✅ Aprobado | Aislamiento estricto de multitenancy. |
| **PR-033** | CRUD Clientes | Búsquedas y Filtros | `test_search_clients` | Evalúa el buscador de clientes filtrando por nombre, documento o correo (insensible a mayúsculas/minúsculas). | ✅ Aprobado | Búsqueda parcial (`icontains`). |
| **PR-034** | CRUD Clientes | Integridad / DB | `test_duplicate_client_same_company` | Verifica la restricción SQL: rechaza documentos de identificación duplicados dentro de la misma empresa. | ✅ Aprobado | Previene colisión de identificadores. |
| **PR-035** | Seguridad / DB | Recuperación | `test_validate_token` | Confirma que los tokens generados para recuperación de contraseñas sean válidos y consultables. | ✅ Aprobado | Token temporal seguro (UUID). |
| **PR-036** | Seguridad / DB | Recuperación | `test_invalid_token` | Confirma que un token falsificado o corrupto sea catalogado inmediatamente como inválido. | ✅ Aprobado | HTTP 400 Bad Request. |
| **PR-037** | Seguridad / DB | Recuperación | `test_reset_password_with_valid_token` | Prueba el flujo completo: consumo del token, asignación de nueva clave, cifrado y posterior logueo. | ✅ Aprobado | Cambio de clave exitoso. |
| **PR-038** | Seguridad / DB | Recuperación | `test_token_consumed_after_use` | Valida que los tokens de seguridad sean auto-eliminados de la base de datos tras un único uso. | ✅ Aprobado | Previene ataques de replay. |
| **PR-039** | CRUD Inventario | Gestión de Catálogo | `test_create_product` | Valida la creación de productos en el catálogo vinculados a su categoría y empresa. | ✅ Aprobado | Integridad de llaves foráneas. |
| **PR-040** | CRUD Inventario | Aislamiento | `test_list_products` | Verifica que la lista de productos devuelva los pertenecientes a la empresa del usuario. | ✅ Aprobado | Multitenancy perfecto. |
| **PR-041** | CRUD Inventario | Gestión de Catálogo | `test_update_product` | Valida la actualización de precios, SKU, nombres y categorías del catálogo de productos. | ✅ Aprobado | Integración total. |
| **PR-042** | CRUD Inventario | Integridad / DB | `test_delete_product` | Verifica la eliminación lógica (Soft-Delete) para no romper registros históricos de ventas/compras. | ✅ Aprobado | El campo `is_active` pasa a False. |
| **PR-043** | CRUD Inventario | Aislamiento | `test_product_isolation` | Confirma que el Administrador de la Empresa B no pueda consultar ningún producto de la Empresa A. | ✅ Aprobado | Cero filtrado de datos entre competidores. |
| **PR-044** | CRUD Inventario | Integridad / DB | `test_sku_uniqueness_same_company` | Asegura que no se puedan duplicar códigos SKU dentro de la misma organización. | ✅ Aprobado | Validación a nivel de serializador corporativo. |
| **PR-045** | CRUD Inventario | Integridad / DB | `test_sku_uniqueness_different_company` | Valida que empresas distintas sí puedan usar el mismo código SKU (esencial para multitenancy). | ✅ Aprobado | Aislamiento de unicidad a nivel de Company. |
| **PR-046** | CRUD Inventario | Movimientos de Stock | `test_stock_entry` | Valida la entrada manual/automatizada de stock actualizando el saldo físico en inventario. | ✅ Aprobado | Transacción de entrada exitosa. |
| **PR-047** | CRUD Inventario | Movimientos de Stock | `test_stock_exit` | Valida la disminución física de unidades en stock por venta o merma. | ✅ Aprobado | Resta matemática precisa de unidades. |
| **PR-048** | CRUD Inventario | Restricciones / DB | `test_negative_stock_prevention` | Asegura que ninguna salida de stock permita balances menores a cero en el inventario. | ✅ Aprobado | Bloqueo automático por regla de negocio. |
| **PR-049** | CRUD Analytics | Alertas Tempranas | `test_low_stock_alerts` | Asegura el correcto disparo de alertas de stock cuando la cantidad cae debajo o iguala al `min_stock`. | ✅ Aprobado | Filtrado activo sobre el queryset. |
| **PR-050** | CRUD Analytics | Alertas Tempranas | `test_low_stock_alerts_after_restock` | Valida que, tras un ingreso de stock, la alerta preventiva de escasez desaparezca automáticamente. | ✅ Aprobado | Refresco de alertas dinámico. |
| **PR-051** | CRUD Inventario | Categorías | `test_create_category` | Valida la creación de categorías asociadas a la empresa del administrador logueado. | ✅ Aprobado | Registro exitoso. |
| **PR-052** | CRUD Inventario | Categorías | `test_list_categories` | Confirma el listado de categorías aplicando multitenancy. | ✅ Aprobado | Datos aislados por empresa. |
| **PR-053** | CRUD Inventario | Categorías | `test_update_category` | Valida la edición de metadatos de las categorías existentes. | ✅ Aprobado | Actualización inmediata. |
| **PR-054** | CRUD Inventario | Categorías | `test_delete_category` | Confirma la eliminación exitosa de categorías no vinculadas a productos activos. | ✅ Aprobado | Protección SQL de integridad referencial. |
| **PR-055** | CRUD Inventario | Proveedores | `test_create_provider` | Valida la creación de proveedores autorizados (nombre, datos de contacto). | ✅ Aprobado | Almacenamiento seguro. |
| **PR-056** | CRUD Inventario | Proveedores | `test_list_providers` | Confirma el listado seguro de proveedores corporativos. | ✅ Aprobado | Multitenancy verificado. |
| **PR-057** | CRUD Inventario | Consultas | `test_list_inventory` | Valida el listado consolidado de existencias de inventario por sede/almacén. | ✅ Aprobado | Datos completos. |
| **PR-058** | CRUD Inventario | Aislamiento | `test_inventory_company_isolation` | Asegura que ninguna empresa pueda consultar las existencias de otra corporación. | ✅ Aprobado | Estricta segregación de consultas relacionales. |
| **PR-059** | CRUD Logística | Rutas de Distribución | `test_list_routes` | Valida la obtención segura del listado de rutas logísticas programadas. | ✅ Aprobado | Filtro corporativo activo. |
| **PR-060** | CRUD Logística | Rutas de Distribución | `test_create_route` | Valida la creación de una nueva ruta logística asignando tipo de traslado (Salida/Entrada/Interno). | ✅ Aprobado | Integridad de llave con sedes/compras. |
| **PR-061** | CRUD Logística | Rutas de Distribución | `test_update_route` | Confirma la actualización del estado de una ruta (Pendiente -> En Curso -> Finalizada). | ✅ Aprobado | Logística en tiempo real. |
| **PR-062** | CRUD Logística | Rutas de Distribución | `test_delete_route` | Verifica la eliminación física de rutas inactivas o canceladas de forma segura. | ✅ Aprobado | Limpieza correcta. |
| **PR-063** | CRUD Logística | Abastecimiento | `test_list_purchase_orders` | Confirma el listado de órdenes de compra dirigidas a proveedores activos. | ✅ Aprobado | Filtro por empresa correcto. |
| **PR-064** | CRUD Logística | Abastecimiento | `test_create_purchase_order` | Prueba la generación de borradores de órdenes de compra y cálculo preventivo de ítems. | ✅ Aprobado | Almacenado exitoso. |
| **PR-065** | CRUD Logística | Abastecimiento | `test_update_purchase_order` | Permite la modificación y anexión de notas/observaciones en órdenes pendientes. | ✅ Aprobado | Datos modificados. |
| **PR-066** | CRUD Logística | Abastecimiento | `test_delete_purchase_order` | Valida la eliminación física de órdenes de compra en estado borrador. | ✅ Aprobado | Integridad de llaves foráneas intacta. |
| **PR-067** | CRUD Analytics | Dashboard | `test_dashboard_summary` | Valida la extracción de KPIs principales (ingresos, existencias en riesgo, tasa de rotación). | ✅ Aprobado | Sumatorias SQL rápidas y seguras. |
| **PR-068** | CRUD Analytics | Dashboard | `test_dashboard_alerts` | Confirma la visualización centralizada de las alertas generadas por Inteligencia Artificial. | ✅ Aprobado | Reporte unificado. |
| **PR-069** | CRUD Analytics | Dashboard | `test_dashboard_charts` | Verifica el correcto empaquetado de datos para visualizaciones de gráficos de ventas mensuales. | ✅ Aprobado | Agrupamientos mensuales precisos. |
| **PR-070** | CRUD Analytics | Exportación | `test_export_data` | Verifica la generación y descarga segura de reportes consolidados en formato JSON/CSV. | ✅ Aprobado | Cumple con el requisito de exportación. |
| **PR-071** | CRUD Analytics | Seguridad | `test_unauthenticated_access_denied` | Valida la denegación inmediata de visualización de analíticas a cualquier atacante anónimo. | ✅ Aprobado | Código de respuesta 401. |
| **PR-072** | ML / Predicciones | Flujo Alternativo | `test_prediction_empty_products` | Verifica que el servicio ML retorne un estado de éxito y lista vacía sin crasheos si no hay productos. | ✅ Aprobado | Corrección robusta aplicada para KeyErrors. |
| **PR-073** | ML / Predicciones | Integración IA | `test_auto_order_endpoint` | Verifica que los algoritmos Prophet/XGBoost realicen proyecciones automáticas sin problemas. | ✅ Aprobado | Integrado al motor principal de analítica. |

---

## Pruebas de Interfaz (UI/UX) e Integración Manual

| ID Prueba | Categoría | Módulo/Funcionalidad | Nombre de la Prueba | Descripción | Estado | Notas |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **UI-001** | Interfaz | Renderizado | Renderizado de Dashboard | Carga correcta de componentes interactivos y cards de KPIs principales sin retardo visible. | ✅ Aprobado | Cero bugs en consola del navegador. |
| **UI-002** | Interfaz | Responsive | Mobile/Tablet Layout | Comportamiento fluido del menú de navegación lateral (Sidebar) colapsable y rejillas CSS fluidas en móviles. | ✅ Aprobado | Menú hamburguesa nativo táctil. |
| **UI-003** | Interfaz | Flujo de Navegación | Transición entre módulos | Navegación instantánea mediante React Router sin recarga del DOM, manteniendo el estado de sesión activo. | ✅ Aprobado | UX de alta fidelidad (SPA). |
| **UI-004** | Interfaz | Mensajes de Error | Validación de Formularios | Despliegue de alertas visuales contextuales claras al enviar contraseñas débiles o campos incompletos. | ✅ Aprobado | Tooltips responsivos. |
| **UI-005** | Interfaz | Estados Vacíos | Tablas sin Registros | Despliegue de ilustraciones de bodega vacía y textos amigables cuando no hay ítems de inventario cargados. | ✅ Aprobado | Evita pantallas en blanco confusas. |

---

## Observaciones de Seguridad y Robustez de Base de Datos

* **Protección CSRF y CORS:** Configurado de manera estricta en `backend/settings.py` permitiendo comunicación únicamente con dominios y orígenes autorizados del frontend en React.
* **Prevención de Inyección SQL y XSS:** Django ORM parametriza por defecto el 100% de las consultas realizadas a PostgreSQL, imposibilitando inyecciones directas de scripts. Las entradas en los campos de texto son sanitizadas en la capa de serialización de Django REST Framework.
* **Persistencia Post-Reinicio:** Toda transacción de inventario, registro de usuario y logs de auditoría se almacena permanentemente en el volumen físico de la base de datos PostgreSQL, garantizando tolerancia total a reinicios del servidor.

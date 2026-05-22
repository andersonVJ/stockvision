# README de Pruebas - StockVision

Este archivo contiene la tabla explicativa del plan de pruebas, diseñada para entender con precisión los casos ejecutados, qué aspectos se validaron, los resultados esperados y el estado actual de cada uno.

## Estados Utilizados
* ⬜ **Pendiente**
* 🔄 **En prueba**
* ✅ **Aprobado**
* ❌ **Fallido**
* ⚠️ **Requiere corrección**
* 🚫 **Bloqueado**

---

## Tabla de Respuestas de las Pruebas

| ID | Tipo de prueba | Caso de prueba | Qué validar | Resultado esperado | Estado |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **T-01** | Seguridad / API | Login con credenciales válidas | Envío de `username` y `password` correctos por POST a `/api/token/`. | Retorno exitoso de tokens JWT (`access` y `refresh`) y código HTTP 200 OK. | ✅ Aprobado |
| **T-02** | Seguridad / API | Login con credenciales inválidas | Envío de contraseña errónea para un usuario registrado. | Rechazo inmediato de acceso con código HTTP 401 Unauthorized. | ✅ Aprobado |
| **T-03** | Seguridad / API | Login de usuario inexistente | Envío de datos de acceso de un usuario que no existe en el sistema. | Rechazo inmediato de acceso con código HTTP 401 Unauthorized. | ✅ Aprobado |
| **T-04** | Seguridad / API | Acceso sin autenticación | Petición GET a vista protegida `/api/users/welcome/` sin cabeceras JWT. | Denegación automática de acceso con código HTTP 401 Unauthorized. | ✅ Aprobado |
| **T-05** | Seguridad / API | Acceso con JWT válido | Petición GET a `/api/users/welcome/` con token `Bearer <token>` válido. | Autorización del recurso devolviendo el mensaje de bienvenida y HTTP 200 OK. | ✅ Aprobado |
| **T-06** | Seguridad / API | Refrescar Token JWT | Envío de token de refresco válido al endpoint `/api/token/refresh/`. | Retorno de un nuevo token de acceso válido y código HTTP 200 OK. | ✅ Aprobado |
| **T-07** | Seguridad / API | Acceso con token corrupto/inválido | Envío de un JWT alterado a un endpoint protegido. | Rechazo inmediato de acceso con código HTTP 401 Unauthorized. | ✅ Aprobado |
| **T-08** | Funcional / API | Registro de usuarios válidos | Envío de payload completo y válido de registro a `/api/users/register/`. | Creación de cuenta, persistencia en base de datos y código HTTP 201 Created. | ✅ Aprobado |
| **T-09** | Base de Datos | Nombre de usuario duplicado | Intento de registrar un usuario con un `username` ya existente. | Rechazo de la solicitud indicando duplicidad y código HTTP 400 Bad Request. | ✅ Aprobado |
| **T-10** | Base de Datos | Correo electrónico duplicado | Intento de registrar un usuario con un `email` ya registrado. | Rechazo de la solicitud indicando duplicidad y código HTTP 400 Bad Request. | ✅ Aprobado |
| **T-11** | Funcional / API | Registro con campos faltantes | Envío de payload de registro incompleto (sin contraseña, sin correo, etc.). | Rechazo de la solicitud con mensajes de error de serialización y HTTP 400. | ✅ Aprobado |
| **T-12** | Funcional / API | Consulta de perfil actual | Petición GET a `/api/users/profile/` con usuario logueado. | Retorno correcto de los datos de perfil (rol, empresa, sede) y HTTP 200 OK. | ✅ Aprobado |
| **T-13** | Seguridad | Actualización exitosa de contraseña | Envío de contraseña actual correcta y nueva contraseña válida en `/api/users/profile/`. | Cifrado y actualización exitosa en base de datos y código HTTP 200 OK. | ✅ Aprobado |
| **T-14** | Seguridad | Cambio de contraseña con clave actual errónea | Envío de contraseña anterior inválida en el cambio de clave. | Rechazo de la transacción con error explícito y código HTTP 400 Bad Request. | ✅ Aprobado |
| **T-15** | Funcional / API | Listado de empleados por Administrador | Petición GET a `/api/users/employees/` por un Administrador de Empresa. | Retorno de empleados pertenecientes únicamente a su misma empresa. | ✅ Aprobado |
| **T-16** | Funcional / API | Creación de empleado por Administrador | POST a `/api/users/employees/` enviando datos de empleado nuevos. | Creación exitosa del usuario empleado, guardando su rol y HTTP 201 Created. | ✅ Aprobado |
| **T-17** | Funcional / API | Modificación de datos de empleado | PATCH a `/api/users/employees/<id>/` por parte de su administrador. | Modificación persistente de nombres/apellidos y código HTTP 200 OK. | ✅ Aprobado |
| **T-18** | Funcional / API | Eliminación de empleado | DELETE a `/api/users/employees/<id>/` por parte de su administrador. | Eliminación física del registro de empleado y código HTTP 204 No Content. | ✅ Aprobado |
| **T-19** | Seguridad | Empleado regular no puede crear otros usuarios | POST a `/api/users/employees/` autenticado con rol de empleado regular. | Denegación por falta de permisos con código HTTP 403 Forbidden. | ✅ Aprobado |
| **T-20** | Seguridad | Empleado regular no puede borrar usuarios | DELETE a `/api/users/employees/<id>/` autenticado como empleado regular. | Denegación por falta de permisos con código HTTP 403 Forbidden. | ✅ Aprobado |
| **T-21** | Funcional / API | Asignación de cargos por Administrador | PATCH a `/api/users/employees/<id>/assign-position/` asignando `BODEGA`. | Cambio exitoso de cargo reflejado en el perfil y código HTTP 200 OK. | ✅ Aprobado |
| **T-22** | Seguridad | Vendedor no puede asignar cargos | PATCH a `/api/users/employees/<id>/assign-position/` autenticado como Vendedor. | Denegación por falta de permisos con código HTTP 403 Forbidden. | ✅ Aprobado |
| **T-23** | Funcional / API | Listado de empresas registradas | GET a `/api/companies/` con usuario administrador. | Retorno seguro de los datos de empresas registradas y HTTP 200 OK. | ✅ Aprobado |
| **T-24** | Funcional / API | Detalle de empresa específica | GET a `/api/companies/<id>/` con usuario administrador de la empresa. | Retorno de metadatos (nombre, dirección, correo) y HTTP 200 OK. | ✅ Aprobado |
| **T-25** | Funcional / API | Actualización de datos de empresa | PATCH a `/api/companies/<id>/` con usuario administrador de la empresa. | Persistencia del nuevo nombre de la empresa y código HTTP 200 OK. | ✅ Aprobado |
| **T-26** | Seguridad | Usuario anónimo no puede ver empresas | GET a `/api/companies/` sin token de autorización. | Rechazo inmediato de acceso con código HTTP 401 Unauthorized. | ✅ Aprobado |
| **T-27** | Funcional / API | Listar sucursales corporativas | GET a `/api/companies/branches/` con usuario administrador. | Visualización de sedes correspondientes a su organización y HTTP 200 OK. | ✅ Aprobado |
| **T-28** | Funcional / API | Crear sucursal corporativa | POST a `/api/companies/branches/` enviando datos de sede nuevos. | Creación exitosa de sede, inicialización automática de inventario y HTTP 201. | ✅ Aprobado |
| **T-29** | Funcional / API | Modificar nombre de sucursal | PATCH a `/api/companies/branches/<id>/` con administrador. | Modificación persistente del nombre de la sede y código HTTP 200 OK. | ✅ Aprobado |
| **T-30** | Funcional / API | Eliminar sucursal | DELETE a `/api/companies/branches/<id>/` con administrador. | Eliminación física de la sucursal del sistema y código HTTP 204 No Content. | ✅ Aprobado |
| **T-31** | Funcional / API | Creación de cliente nuevo | POST a `/api/companies/clients/` enviando datos de cliente válidos. | Creación de cliente vinculándolo a la empresa del usuario y HTTP 201 Created. | ✅ Aprobado |
| **T-32** | Funcional / API | Listar clientes de la empresa | GET a `/api/companies/clients/` con usuario autenticado. | Visualización única de los clientes asociados a la empresa del usuario. | ✅ Aprobado |
| **T-33** | Funcional / API | Búsqueda y filtrado de clientes | GET a `/api/companies/clients/?search=Juan` para filtrar listado. | Retorno de clientes cuyo nombre, correo o documento coincida con "Juan". | ✅ Aprobado |
| **T-34** | Base de Datos | Clientes duplicados en misma empresa | POST de cliente con documento (`id_document`) idéntico a uno existente. | Rechazo de inserción por error de integridad y código HTTP 400 Bad Request. | ✅ Aprobado |
| **T-35** | Seguridad | Validar token de recuperación de clave | GET a `/api/companies/password-reset-confirm/?token=<token>` válido. | Retorno de confirmación del token indicando validez y HTTP 200 OK. | ✅ Aprobado |
| **T-36** | Seguridad | Validar token de recuperación inexistente | GET a `/api/companies/password-reset-confirm/?token=<token>` alterado. | Rechazo del token por invalidez o expiración y código HTTP 400. | ✅ Aprobado |
| **T-37** | Seguridad | Restablecimiento exitoso de contraseña | POST a `/api/companies/password-reset-confirm/` con token y clave nueva. | Actualización de contraseña cifrada en base de datos y código HTTP 200 OK. | ✅ Aprobado |
| **T-38** | Seguridad | Consumir token tras uso único | Reintento de validar o usar el mismo token de recuperación ya procesado. | Rechazo inmediato indicando que el token ya no existe y código HTTP 400. | ✅ Aprobado |
| **T-39** | Funcional / API | Creación de producto en catálogo | POST a `/api/inventory/products/` enviando SKU, precio y categoría. | Creación del producto en la base de datos PostgreSQL y código HTTP 201. | ✅ Aprobado |
| **T-40** | Funcional / API | Listar productos del catálogo | GET a `/api/inventory/products/` con usuario autenticado. | Obtención segura de la lista de productos pertenecientes a la empresa. | ✅ Aprobado |
| **T-41** | Funcional / API | Modificación de producto | PATCH a `/api/inventory/products/<id>/` modificando nombre y SKU. | Persistencia de datos modificados en base de datos y código HTTP 200 OK. | ✅ Aprobado |
| **T-42** | Base de Datos | Eliminación lógica (Soft-Delete) | DELETE a `/api/inventory/products/<id>/` para simular borrado. | Producto pasa a `is_active=False` (no se borra físicamente) y HTTP 204. | ✅ Aprobado |
| **T-43** | Funcional | Aislamiento de catálogos corporativos | GET a productos de Empresa A autenticado como Administrador de Empresa B. | Aislamiento exitoso: el listado de Empresa B no contiene productos de A. | ✅ Aprobado |
| **T-44** | Base de Datos | Unicidad de SKU en misma empresa | POST de producto con un SKU idéntico al de otro producto de la misma empresa. | Rechazo por conflicto de SKU y código HTTP 400 Bad Request. | ✅ Aprobado |
| **T-45** | Base de Datos | SKU idéntico en empresas diferentes | POST de producto con SKU idéntico en una empresa diferente (Empresa B). | Inserción permitida con éxito y código HTTP 201 Created (Multitenancy). | ✅ Aprobado |
| **T-46** | Funcional | Movimiento de stock: Entrada | POST de movimiento tipo `ENTRY` para añadir stock a un almacén. | Sumatoria exitosa: la cantidad en inventario aumenta en base al movimiento. | ✅ Aprobado |
| **T-47** | Funcional | Movimiento de stock: Salida | POST de movimiento tipo `EXIT` para restar unidades de stock. | Resta exitosa: la cantidad física en bodega disminuye proporcionalmente. | ✅ Aprobado |
| **T-48** | Base de Datos | Prevención de stock negativo | POST de salida (`EXIT`) con cantidad superior a las existencias físicas. | Rechazo de la transacción con error explícito y código HTTP 400. | ✅ Aprobado |
| **T-49** | Funcional / API | Alertas de stock bajo | GET a `/api/inventory/low-stock-alerts/` con existencias bajo el mínimo. | Retorno detallado de productos con saldo inferior o igual a `min_stock`. | ✅ Aprobado |
| **T-50** | Funcional / API | Limpieza de alertas tras reabastecimiento | Ingreso de stock (`ENTRY`) para llevar un producto arriba de su mínimo. | GET de alertas ya no incluye al producto reabastecido. | ✅ Aprobado |
| **T-51** | Funcional / API | Creación de categoría de producto | POST a `/api/inventory/categories/` enviando nombre. | Almacenamiento seguro de la categoría asociada a la empresa y HTTP 201. | ✅ Aprobado |
| **T-52** | Funcional / API | Listar categorías de productos | GET a `/api/inventory/categories/` con usuario autenticado. | Visualización única de las categorías correspondientes a la empresa. | ✅ Aprobado |
| **T-53** | Funcional / API | Actualización de categoría | PATCH a `/api/inventory/categories/<id>/` modificando nombre. | Modificación persistente en base de datos y código HTTP 200 OK. | ✅ Aprobado |
| **T-54** | Base de Datos | Eliminar categoría sin productos | DELETE a `/api/inventory/categories/<id>/` en categoría vacía. | Eliminación física exitosa y código HTTP 204 No Content. | ✅ Aprobado |
| **T-55** | Funcional / API | Creación de proveedor corporativo | POST a `/api/inventory/providers/` enviando nombre y contacto. | Registro correcto del proveedor asociado a la empresa y HTTP 201 Created. | ✅ Aprobado |
| **T-56** | Funcional / API | Listar proveedores corporativos | GET a `/api/inventory/providers/` con usuario autenticado. | Visualización exclusiva de proveedores pertenecientes a la empresa. | ✅ Aprobado |
| **T-57** | Funcional / API | Listar existencias físicas generales | GET a `/api/inventory/` con usuario autenticado. | Retorno consolidado de las fichas de stock de los almacenes y HTTP 200 OK. | ✅ Aprobado |
| **T-58** | Funcional | Aislamiento de existencias de inventario | GET a `/api/inventory/` autenticado con usuario de Empresa B. | Cero existencias retornadas pertenecientes a la Empresa A. | ✅ Aprobado |
| **T-59** | Funcional / API | Listar rutas logísticas programadas | GET a `/api/logistics/routes/` con administrador. | Retorno de rutas de entrega de mercancía activas y HTTP 200 OK. | ✅ Aprobado |
| **T-60** | Funcional / API | Creación de nueva ruta logística | POST a `/api/logistics/routes/` con tipo de traslado y fecha. | Creación de ruta en base de datos asociada a la sucursal y HTTP 201. | ✅ Aprobado |
| **T-61** | Funcional / API | Actualización del estado de entrega | PATCH a `/api/logistics/routes/<id>/` modificando estado a `EN_CURSO`. | Modificación persistente y código HTTP 200 OK. | ✅ Aprobado |
| **T-62** | Funcional / API | Eliminar ruta logística | DELETE a `/api/logistics/routes/<id>/` con administrador. | Eliminación física de la ruta seleccionada y código HTTP 204 No Content. | ✅ Aprobado |
| **T-63** | Funcional / API | Listar órdenes de compra vigentes | GET a `/api/logistics/purchase-orders/` con administrador. | Retorno de solicitudes de compra corporativas y HTTP 200 OK. | ✅ Aprobado |
| **T-64** | Funcional / API | Crear orden de compra preventiva | POST a `/api/logistics/purchase-orders/` con datos del proveedor. | Almacenamiento en estado borrador e integridad de la orden y HTTP 201. | ✅ Aprobado |
| **T-65** | Funcional / API | Modificar notas en orden de compra | PATCH a `/api/logistics/purchase-orders/<id>/` modificando comentarios. | Modificación persistente en la orden seleccionada y código HTTP 200 OK. | ✅ Aprobado |
| **T-66** | Funcional / API | Eliminar orden de compra borrador | DELETE a `/api/logistics/purchase-orders/<id>/` con administrador. | Eliminación física exitosa y código HTTP 204 No Content. | ✅ Aprobado |
| **T-67** | Funcional / API | Obtener KPIs del Dashboard | GET a `/api/analytics/summary/` con administrador. | Cálculo SQL inmediato de ingresos totales, rotación y HTTP 200 OK. | ✅ Aprobado |
| **T-68** | Funcional / API | Alertas agregadas por IA | GET a `/api/analytics/alerts/` con administrador. | Agregado de alertas críticas y stock bajo generadas por ML y HTTP 200. | ✅ Aprobado |
| **T-69** | Funcional / API | Datos agrupados para gráficos de ventas | GET a `/api/analytics/charts/` con administrador. | Agrupamiento mensual por ventas, ranking de productos y HTTP 200 OK. | ✅ Aprobado |
| **T-70** | Funcional / API | Exportación de analíticas en JSON/CSV | GET a `/api/analytics/export-data/` con administrador. | Generación de reporte consolidado para descarga y HTTP 200 OK. | ✅ Aprobado |
| **T-71** | Seguridad | Bloqueo de analíticas a anónimos | GET a `/api/analytics/summary/` sin autenticación. | Rechazo inmediato de acceso con código HTTP 401 Unauthorized. | ✅ Aprobado |
| **T-72** | ML / Predicciones | Predicción IA sin productos | Consumo de `/api/predictions/` con base de datos vacía o sin existencias. | Retorno exitoso sin KeyError con datos vacíos (`status: success, data: []`). | ✅ Aprobado |
| **T-73** | ML / Predicciones | Pedido sugerido automático | GET a `/api/predictions/auto_order/` con usuario administrador. | Cálculo inmediato de orden de compra sugerida en base a Prophet y HTTP 200. | ✅ Aprobado |
| **T-74** | Interfaz (UI) | Renderizado de Dashboard | Carga y renderizado inicial de cards de KPIs. | Interfaz responde dinámicamente sin bloqueos o congelamientos de UI. | ✅ Aprobado |
| **T-75** | Interfaz (UI) | Diseño Responsive | Cambio de tamaño de pantalla de desktop a smartphone (360px). | Layout fluido, sidebar colapsa y cards se adaptan verticalmente. | ✅ Aprobado |
| **T-76** | Interfaz (UI) | Flujo de navegación entre módulos | Clics en la barra de navegación del Sidebar. | Transición de páginas fluida e inmediata sin refrescar ventana (React Router). | ✅ Aprobado |
| **T-77** | Interfaz (UI) | Validación en formularios | Intento de envío de claves vacías o SKU repetidos. | Alertas contextuales visuales claras indicando la corrección necesaria. | ✅ Aprobado |
| **T-78** | Interfaz (UI) | Estados vacíos | Carga de módulos de inventario sin ítems en base de datos. | Mensaje amigable con ilustración indicando la bodega limpia de registros. | ✅ Aprobado |

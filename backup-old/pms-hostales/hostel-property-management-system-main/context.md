# Contexto del Proyecto y Plan de Desarrollo

Este documento describe el estado actual del Hostel Property Management System y establece un plan para su desarrollo continuo.

## 1. Resumen del Estado Actual

La aplicación se encuentra en una fase avanzada y ya cuenta con las siguientes funcionalidades básicas:

*   **Gestión de Autenticación:** Creación de usuarios, inicio y cierre de sesión.
*   **Gestión de Huéspedes:** Creación, búsqueda y visualización de perfiles de huéspedes.
*   **Gestión de Reservas:** Creación de nuevas reservas, procesos de check-in y check-out, y búsqueda por código de confirmación.
*   **Gestión de Habitaciones:** Listado de habitaciones y actualización del estado de las camas (ej. disponible, ocupada, limpieza).
*   **Folios y Facturación:** Adición de cargos y pagos a la cuenta de un huésped.
*   **Punto de Venta (POS):** Venta de productos y servicios adicionales.
*   **Dashboard:** Una vista general simple.

## 2. Historias de Usuario (Próximos Pasos)

Para llevar el sistema al siguiente nivel, se proponen las siguientes historias de usuario, agrupadas por rol.

### Rol: Recepcionista (Front Desk)

*   **HU-01:** Como recepcionista, quiero ver un **calendario de reservas** que muestre la ocupación de las habitaciones y camas por día, para poder gestionar la disponibilidad de forma visual y rápida.
*   **HU-02:** Como recepcionista, quiero poder **modificar una reserva existente** (cambiar fechas, reasignar habitación/cama), para atender cambios solicitados por los huéspedes.
*   **HU-03:** Como recepcionista, quiero gestionar **reservas de grupo**, para poder hacer check-in a varias personas bajo una única reserva y folio.
*   **HU-04:** Como recepcionista, quiero ver el **historial de un huésped** (estancias anteriores, notas, preferencias) al seleccionarlo, para ofrecer un servicio más personalizado.
*   **HU-05:** Como recepcionista, quiero poder añadir **notas internas** a las reservas y a los perfiles de los huéspedes, para comunicar información importante al resto del equipo.

### Rol: Gerente (Manager)

*   **HU-06:** Como gerente, quiero acceder a un **módulo de reportes financieros** (ingresos diarios/mensuales, métodos de pago, ventas por producto), para analizar el rendimiento del negocio.
*   **HU-07:** Como gerente, quiero poder **gestionar las tarifas y tipos de habitación/cama** (crear/editar habitaciones, definir precios por temporada), para administrar la configuración del hostal.
*   **HU-08:** Como gerente, quiero un sistema de **gestión de inventario** para los productos del punto de venta, para saber cuándo es necesario reponer stock.
*   **HU-09:** Como gerente, quiero poder **gestionar los usuarios y sus permisos** (crear cuentas para nuevos empleados, asignar roles de recepcionista o gerente), para controlar el acceso a las diferentes áreas del sistema.

## 3. Plan de Desarrollo Sugerido

Se propone un desarrollo por fases para implementar las nuevas funcionalidades de manera ordenada.

### Fase 1: Consolidar la Gestión de Reservas

El objetivo es hacer que la operativa diaria sea más visual y flexible.

1.  **Implementar Calendario de Reservas (HU-01):**
    *   **Backend:** Crear un nuevo endpoint en el servicio `reservations` que devuelva las reservas y el estado de las camas en un rango de fechas.
    *   **Frontend:** Crear una nueva página o un componente principal en el dashboard que renderice los datos en una vista de calendario/timeline.
2.  **Implementar Modificación de Reservas (HU-02):**
    *   **Backend:** Añadir endpoints para actualizar los detalles de una reserva.
    *   **Frontend:** Integrar la funcionalidad de edición en la vista de detalles de la reserva o en el nuevo calendario.
3.  **Mejorar Vista de Huésped (HU-04):**
    *   **Backend:** Extender el servicio `guests` para que devuelva el historial de reservas asociadas.
    *   **Frontend:** En la página de huéspedes, mostrar una lista de sus estancias anteriores y notas.

### Fase 2: Módulos de Gestión y Reportes

El objetivo es dotar al sistema de herramientas para la toma de decisiones y la administración.

1.  **Módulo de Reportes (HU-06):**
    *   **Backend:** Crear un nuevo servicio `reports` con endpoints para generar datos financieros.
    *   **Frontend:** Crear una nueva sección de "Reportes" con gráficos y tablas.
2.  **Gestión de Habitaciones y Tarifas (HU-07):**
    *   **Backend:** Extender el servicio `rooms` para permitir la creación/edición de habitaciones y la configuración de tarifas.
    *   **Frontend:** Crear una sección de "Configuración" para que los gerentes administren la estructura del hostal.

### Fase 3: Funcionalidades Avanzadas y Administración

1.  **Gestión de Usuarios y Roles (HU-09):**
    *   **Backend:** Implementar un sistema de permisos basado en roles en el middleware de autenticación.
    *   **Frontend:** Crear una interfaz de administración de usuarios.
2.  **Gestión de Inventario (HU-08):**
    *   **Backend:** Extender el servicio `products` para incluir campos de cantidad y stock.
    *   **Frontend:** Añadir indicadores de stock en la interfaz del POS y una sección para gestionar el inventario.

## 4. Hoja de Ruta Técnica (Technical Roadmap)

Paralelamente al desarrollo de funcionalidades, es crucial abordar la deuda técnica y mejorar la calidad del código.

*   **Aumentar Cobertura de Pruebas:** Escribir pruebas unitarias y de integración para los servicios del backend y los componentes del frontend, empezando por las funcionalidades críticas (auth, reservations).
*   **Configurar CI/CD:** Crear un pipeline de Integración Continua (CI) en GitHub Actions (o similar) que ejecute las pruebas automáticamente en cada push.
*   **Documentación de API:** Generar documentación para la API del backend para facilitar el desarrollo del frontend y el mantenimiento futuro.
*   **Refinamiento de UI/UX:** Revisar las páginas existentes para mejorar la experiencia de usuario, la consistencia visual y el manejo de errores.

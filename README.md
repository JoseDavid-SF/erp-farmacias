# ERP Proveedor Autónomo de Farmacias

**Versión:** 6.0  
**Autor:** José David Sánchez Fernández  
**Empresa:** Mega Nevada S.L.  
**Fecha:** 2025-06-06

## Descripción

Sistema ERP completo desarrollado específicamente para proveedores autónomos del sector farmacéutico. La aplicación digitaliza y centraliza todos los procesos del negocio, incluyendo gestión de clientes, productos, pedidos, facturación e inventario.

## Características Principales

- ✅ **Gestión de Clientes:** Base de datos completa con historial de pedidos
- ✅ **Catálogo de Productos:** Control de stock, precios y fechas de caducidad
- ✅ **Sistema de Pedidos:** Generación automática con códigos familiares al usuario
- ✅ **Facturación Automática:** Envío por email y generación de PDFs
- ✅ **Control de Inventario:** Actualización en tiempo real
- ✅ **Albaranes de Entrega:** Documentación completa de entregas
- ✅ **Multiplataforma:** Acceso desde móvil, tablet y PC

## Tecnologías Utilizadas

### Backend
- **Python 3.11+**
- **Flask 3.0** - Framework web
- **PostgreSQL** - Base de datos
- **SQLAlchemy** - ORM
- **ReportLab** - Generación de PDFs

### Frontend
- **HTML5 + CSS3**
- **JavaScript ES6+**
- **Bootstrap 5.3** - Framework CSS
- **Font Awesome 6** - Iconografía

## Instalación

### Requisitos Previos
- Python 3.11 o superior
- PostgreSQL 12 o superior
- Git

### Pasos de Instalación

1. **Clonar el repositorio:**
   ```bash
   git clone https://github.com/tu-usuario/erp-farmacias.git
   cd erp-farmacias
   ```

2. **Crear entorno virtual:**
   ```bash
   python -m venv venv
   # Windows:
   venv\Scripts\activate
   # Linux/Mac:
   source venv/bin/activate
   ```

3. **Instalar dependencias:**
   ```bash
   cd backend
   pip install -r requirements.txt
   ```

4. **Configurar base de datos:**
   - Crear base de datos PostgreSQL llamada `erp_farmacias`
   - Copiar `.env.example` a `.env`
   - Actualizar credenciales de base de datos en `.env`

5. **Ejecutar aplicación:**
   ```bash
   python app.py
   ```

6. **Acceder al sistema:**
   - Dashboard: http://localhost:5000
   - API Test: http://localhost:5000/api/test

## Estructura del Proyecto

```
erp-farmacias/
├── backend/                 # Código del servidor
│   ├── app.py              # Aplicación principal
│   ├── config/             # Configuraciones
│   ├── models/             # Modelos de base de datos
│   ├── routes/             # Rutas de la API
│   └── services/           # Servicios de negocio
├── frontend/               # Código del cliente
│   ├── templates/          # Plantillas HTML
│   └── static/            # CSS, JS e imágenes
├── database/              # Scripts de base de datos
└── docs/                  # Documentación
```

## Configuración

### Variables de Entorno (.env)

```bash
# Base de datos
DB_USER=postgres
DB_PASSWORD=tu_password
DB_HOST=localhost
DB_PORT=5432
DB_NAME=erp_farmacias

# Flask
SECRET_KEY=tu_clave_secreta
FLASK_ENV=development

# Email (opcional)
MAIL_SERVER=smtp.gmail.com
MAIL_PORT=587
MAIL_USERNAME=tu_email
MAIL_PASSWORD=tu_password
```

## Uso del Sistema

### Dashboard Principal
- Estadísticas en tiempo real
- Acciones rápidas
- Actividad reciente
- Alertas de stock bajo

### Gestión de Clientes
- Registro completo de farmacias
- Códigos únicos para identificación rápida
- Historial de pedidos y facturación

### Gestión de Productos
- Catálogo completo con imágenes
- Control de stock y alertas
- Gestión de lotes y caducidades

### Sistema de Pedidos
- Creación rápida por códigos
- Cálculo automático de totales
- Generación de albaranes

### Facturación
- Generación automática desde pedidos
- Envío por email
- Control de pagos

## API Endpoints

### Estado del Sistema
- `GET /api/test` - Verificar conexión
- `GET /api/status` - Estado general

### Clientes (Próximamente)
- `GET /api/clientes` - Lista de clientes
- `POST /api/clientes` - Crear cliente
- `PUT /api/clientes/{id}` - Actualizar cliente

### Productos (Próximamente)
- `GET /api/productos` - Catálogo de productos
- `POST /api/productos` - Crear producto
- `PUT /api/productos/{id}` - Actualizar producto

## Desarrollo

### Generar Documentación
```bash
# Instalar Doxygen
# Windows: Descargar de doxygen.nl
# Linux: sudo apt-get install doxygen
# Mac: brew install doxygen

# Generar documentación
doxygen Doxyfile
```

### Ejecutar Tests
```bash
cd backend
python -m pytest tests/
```

## Licencia

Copyright (c) 2025 Mega Nevada S.L. Todos los derechos reservados.

## Soporte

Para soporte técnico o consultas:
- **Email:** soporte@meganevada.com
- **Teléfono:** +34 XXX XXX XXX

## Changelog

### v6.0 (2025-06-06)
- Sistema completo funcional
- Dashboard implementado
- Conexión PostgreSQL establecida
- Documentación Doxygen completa

### v5.0 (2025-05-30)
- Modelos de base de datos implementados
- Sistema de configuración completado

### v4.0 (2025-05-25)
- Estructura inicial del proyecto
- Configuración del entorno de desarrollo
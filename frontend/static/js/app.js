/**
 * @file app.js
 * @brief JavaScript principal del ERP de Mega Nevada
 * @details Funciones principales para el manejo del frontend, notificaciones, validaciones y comunicación con la API del backend.
 * @author José David Sánchez Fernández
 * @version 4.1
 * @date 2025-06-09
 * @copyright Copyright (c) 2025 Mega Nevada S.L. Todos los derechos reservados.
 */

document.addEventListener('DOMContentLoaded', function() {
    console.log('ERP Farmacias cargado correctamente');
    
    // Inicializar componentes
    initializeApp();
    
    // Cargar datos del home
    if (window.location.pathname === '/' || window.location.pathname === '') {
        cargarEstadisticasHome();
        actualizarReloj();
        setInterval(actualizarReloj, 1000);
    }
});

/**
 * @brief Inicializa todos los componentes de la aplicación
 * @details Función principal que configura todos los elementos necesarios para el funcionamiento del frontend.
 * @version 4.0
 */
function initializeApp() {
    // Verificar conexión con la API
    checkAPIConnection();
    
    // Configurar tooltips de Bootstrap
    initializeTooltips();
    
    // Configurar notificaciones
    setupNotifications();
}

/**
 * @brief Verifica la conexión con la API del backend
 * @details Realiza una petición al endpoint de prueba para verificar que la comunicación con el servidor funciona correctamente.
 * @version 3.1
 */
async function checkAPIConnection() {
    try {
        const response = await fetch('/api/test');
        const data = await response.json();
        
        if (data.status === 'success') {
            console.log('Conexión con API exitosa');
            
            // Solo mostrar notificacion en la home
            if (window.location.pathname === '/' || window.location.pathname === '') {
                const yaNotificado = sessionStorage.getItem('sistema_conectado_notificado');
                
                if (!yaNotificado) {
                    showNotification('Sistema conectado correctamente', 'success', false);
                    sessionStorage.setItem('sistema_conectado_notificado', 'true');
                }
            }
        }
    } catch (error) {
        console.error('Error de conexión:', error);
        showNotification('Error de conexión con el servidor', 'danger', true);
    }
}

/**
 * @brief Carga las estadísticas del home
 * @details Obtiene y muestra todas las estadísticas del home principal
 * @version 1.0
 */
async function cargarEstadisticasHome() {
    try {
        console.log('Cargando estadísticas del home...');
        
        // Cargar estadísticas principales
        const response = await fetch('/api/home/estadisticas');
        const data = await response.json();
        
        if (data.success) {
            const stats = data.estadisticas;
            
            // Actualizar contadores con animación
            actualizarContador('total-clientes', stats.total_clientes);
            actualizarContador('total-productos', stats.total_productos);
            actualizarContador('pedidos-pendientes', stats.pedidos_pendientes);
            actualizarContador('facturas-mes', stats.facturas_mes);
            
            console.log('Estadísticas cargadas correctamente');
        } else {
            console.warn('Error en estadísticas:', data.error);
            // Mostrar valores por defecto
            actualizarContador('total-clientes', 0);
            actualizarContador('total-productos', 0);
            actualizarContador('pedidos-pendientes', 0);
            actualizarContador('facturas-mes', 0);
        }
        
        // Cargar actividad reciente
        await cargarActividadReciente();
        
        // Cargar alertas de stock
        await cargarAlertasStock();
        
    } catch (error) {
        console.error('Error al cargar estadísticas:', error);
        
        // Mostrar valores por defecto en caso de error
        actualizarContador('total-clientes', 0);
        actualizarContador('total-productos', 0);
        actualizarContador('pedidos-pendientes', 0);
        actualizarContador('facturas-mes', 0);
        
        showNotification('Error al cargar estadísticas del home', 'warning');
    }
}

/**
 * @brief Actualiza un contador con animación
 * @param elementId ID del elemento a actualizar
 * @param valor Valor final del contador
 * @version 1.0
 */
function actualizarContador(elementId, valor) {
    const elemento = document.getElementById(elementId);
    if (!elemento) return;
    
    // Animación de contador
    const valorActual = 0;
    const incremento = valor / 20;
    let contador = 0;
    
    const interval = setInterval(() => {
        contador += incremento;
        if (contador >= valor) {
            elemento.textContent = valor;
            clearInterval(interval);
        } else {
            elemento.textContent = Math.floor(contador);
        }
    }, 50);
}

/**
 * @brief Carga la actividad reciente del sistema con enlaces clicables
 * @version 2.0
 */
async function cargarActividadReciente() {
    try {
        const response = await fetch('/api/home/actividad');
        const data = await response.json();
        
        const container = document.getElementById('actividad-reciente');
        if (!container) return;
        
        if (data.success && data.actividades.length > 0) {
            let html = '';
            data.actividades.forEach(actividad => {
                const fecha = new Date(actividad.fecha).toLocaleString('es-ES', {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                });
                
                // Determinar si el elemento es clicable
                const esClicable = actividad.enlace && actividad.elemento_id && actividad.elemento_tipo;
                const cursorClass = esClicable ? 'cursor-pointer' : '';
                const onClickHandler = esClicable ? 
                    `onclick="manejarClickActividad('${actividad.elemento_tipo}', ${actividad.elemento_id}, '${actividad.enlace}')"` : 
                    '';
                
                html += `
                    <div class="activity-item d-flex align-items-center ${cursorClass}" ${onClickHandler}>
                        <div class="me-3">
                            <i class="fas ${actividad.icono} text-${actividad.color}"></i>
                        </div>
                        <div class="flex-grow-1">
                            <div class="fw-bold ${esClicable ? 'text-primary' : ''}">${actividad.mensaje}</div>
                            <small class="text-muted">${fecha}</small>
                        </div>
                        ${esClicable ? '<div class="text-primary"><i class="fas fa-chevron-right"></i></div>' : ''}
                    </div>
                `;
            });
            container.innerHTML = html;
        } else {
            container.innerHTML = `
                <div class="text-center py-3">
                    <i class="fas fa-info-circle fa-2x text-muted mb-2"></i>
                    <p class="text-muted mb-0">No hay actividad reciente</p>
                </div>
            `;
        }
    } catch (error) {
        console.error('Error al cargar actividad:', error);
        const container = document.getElementById('actividad-reciente');
        if (container) {
            container.innerHTML = `
                <div class="text-center py-3">
                    <i class="fas fa-exclamation-triangle fa-2x text-warning mb-2"></i>
                    <p class="text-muted mb-0">Error al cargar actividad</p>
                </div>
            `;
        }
    }
}

/**
 * @brief Maneja el clic en elementos de actividad reciente
 * @param tipo Tipo de elemento (cliente, producto)
 * @param elementoId ID del elemento
 * @param enlaceBase Enlace base donde navegar
 * @version 1.0
 */
function manejarClickActividad(tipo, elementoId, enlaceBase) {
    console.log(`Click en ${tipo} ID: ${elementoId}`);
    
    if (tipo === 'cliente') {
        // Para clientes: ir a la lista y abrir modal de detalles
        window.location.href = `${enlaceBase}?ver=${elementoId}`;
    } else if (tipo === 'producto') {
        // Para productos: ir a la lista y abrir modal de detalles
        window.location.href = `${enlaceBase}?ver=${elementoId}`;
    } else {
        // Para otros tipos, solo navegar al enlace base
        window.location.href = enlaceBase;
    }
}

/**
 * @brief Carga las alertas de stock bajo con enlaces
 * @version 1.1
 */
async function cargarAlertasStock() {
    try {
        const response = await fetch('/api/home/stock-bajo');
        const data = await response.json();
        
        const container = document.getElementById('alertas-stock');
        if (!container) return;
        
        if (data.success && data.productos.length > 0) {
            let html = '<div class="table-responsive"><table class="table table-sm"><thead><tr><th>Producto</th><th>Código</th><th>Stock Actual</th><th>Stock Mínimo</th><th>Acciones</th></tr></thead><tbody>';
            
            data.productos.forEach(producto => {
                html += `
                    <tr>
                        <td><strong>${producto.nombre}</strong></td>
                        <td><small class="text-muted">${producto.codigo}</small></td>
                        <td><span class="badge bg-danger">${producto.stock_actual}</span></td>
                        <td>${producto.stock_minimo}</td>
                        <td>
                            <button class="btn btn-sm btn-outline-primary" 
                                    onclick="manejarClickActividad('producto', ${producto.id}, '/productos')"
                                    title="Ver detalles del producto">
                                <i class="fas fa-eye"></i>
                            </button>
                        </td>
                    </tr>
                `;
            });
            
            html += '</tbody></table></div>';
            container.innerHTML = html;
        } else {
            container.innerHTML = `
                <div class="text-center py-3">
                    <i class="fas fa-check-circle fa-2x text-success mb-2"></i>
                    <p class="text-muted mb-0">Todos los productos tienen stock suficiente</p>
                </div>
            `;
        }
    } catch (error) {
        console.error('Error al cargar alertas de stock:', error);
        const container = document.getElementById('alertas-stock');
        if (container) {
            container.innerHTML = `
                <div class="text-center py-3">
                    <i class="fas fa-exclamation-triangle fa-2x text-warning mb-2"></i>
                    <p class="text-muted mb-0">Error al verificar stock</p>
                </div>
            `;
        }
    }
}

/**
 * @brief Actualiza el reloj en tiempo real
 * @version 1.0
 */
function actualizarReloj() {
    const elemento = document.getElementById('current-time');
    if (elemento) {
        const ahora = new Date();
        const tiempo = ahora.toLocaleTimeString('es-ES', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
        elemento.textContent = tiempo;
    }
}

/**
 * @brief Inicializa los tooltips de Bootstrap
 * @details Configura todos los elementos con tooltips para mostrar información adicional al hacer hover.
 * @version 2.0
 */
function initializeTooltips() {
    const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    tooltipTriggerList.map(function (tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl);
    });
}

/**
 * @brief Configura el sistema de notificaciones
 * @details Crea el contenedor principal para las notificaciones del sistema si no existe.
 * @version 1.0
 */
function setupNotifications() {
    if (!document.getElementById('notifications-container')) {
        const container = document.createElement('div');
        container.id = 'notifications-container';
        container.className = 'position-fixed top-0 end-0 p-3';
        container.style.zIndex = '9999';
        document.body.appendChild(container);
    }
}

/**
 * @brief Muestra una notificación en pantalla
 * @details Crea y muestra una notificación tipo toast con el mensaje y tipo especificados.
 * @param message Mensaje a mostrar en la notificación
 * @param type Tipo de notificación (success, danger, warning, info)
 * @param persistent Si true, la notificación no se cierra automáticamente
 * @version 5.0
 */
function showNotification(message, type = 'info', persistent = false) {
    const container = document.getElementById('notifications-container');
    
    const alertId = 'alert-' + Date.now();
    const alertClass = `alert-${type}`;
    
    const alertHTML = `
        <div id="${alertId}" class="alert ${alertClass} alert-dismissible fade show" role="alert">
            <i class="fas ${getIconForType(type)} me-2"></i>
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        </div>
    `;
    
    container.insertAdjacentHTML('beforeend', alertHTML);
    
    if (!persistent) {
        setTimeout(() => {
            const alert = document.getElementById(alertId);
            if (alert) {
                const bsAlert = new bootstrap.Alert(alert);
                bsAlert.close();
            }
        }, 5000);
    }
}

/**
 * @brief Obtiene el icono correspondiente al tipo de notificación
 * @param type Tipo de notificación
 * @return String con la clase CSS del icono
 * @version 1.0
 */
function getIconForType(type) {
    const icons = {
        'success': 'fa-check-circle',
        'danger': 'fa-exclamation-circle',
        'warning': 'fa-exclamation-triangle',
        'info': 'fa-info-circle',
        'primary': 'fa-info-circle'
    };
    return icons[type] || 'fa-info-circle';
}

/**
 * @brief Formatea un número como moneda europea
 * @param amount Cantidad a formatear
 * @return String con el formato de moneda
 * @version 2.0
 */
function formatCurrency(amount) {
    return new Intl.NumberFormat('es-ES', {
        style: 'currency',
        currency: 'EUR'
    }).format(amount);
}

/**
 * @brief Formatea una fecha para mostrar en español
 * @param dateString Cadena de fecha en formato ISO
 * @return String con la fecha formateada
 * @version 1.0
 */
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

/**
 * @brief Formatea fecha y hora para mostrar en español
 * @param dateString Cadena de fecha en formato ISO
 * @return String con fecha y hora formateadas
 * @version 2.0
 */
function formatDateTime(dateString) {
    const date = new Date(dateString);
    return date.toLocaleString('es-ES', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

/**
 * @brief Valida si un email tiene formato correcto
 * @param email Email a validar
 * @return Boolean true si es válido, false en caso contrario
 * @version 1.0
 */
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

/**
 * @brief Valida si un número de teléfono tiene formato correcto
 * @param phone Teléfono a validar
 * @return Boolean true si es válido, false en caso contrario
 * @version 1.0
 */
function isValidPhone(phone) {
    const phoneRegex = /^[+]?[0-9\s\-\(\)]{9,}$/;
    return phoneRegex.test(phone);
}

/**
 * @brief Muestra un diálogo de confirmación y ejecuta callback si se acepta
 * @param message Mensaje de confirmación
 * @param callback Función a ejecutar si se confirma
 * @version 1.0
 */
function confirmAction(message, callback) {
    if (confirm(message)) {
        callback();
    }
}

/**
 * @brief Maneja el envío de formularios con indicador de carga
 * @param formId ID del formulario a manejar
 * @param submitHandler Función que maneja el envío
 * @version 3.0
 */
function handleFormSubmit(formId, submitHandler) {
    const form = document.getElementById(formId);
    if (form) {
        form.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const submitBtn = form.querySelector('button[type="submit"]');
            const originalText = submitBtn.innerHTML;
            
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Guardando...';
            
            try {
                await submitHandler(form);
            } catch (error) {
                showNotification('Error al procesar el formulario', 'danger');
                console.error('Error:', error);
            } finally {
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalText;
            }
        });
    }
}

/**
 * @brief Configura búsqueda en tiempo real
 * @param inputId ID del campo de búsqueda
 * @param searchHandler Función que maneja la búsqueda
 * @param delay Retraso en milisegundos antes de ejecutar la búsqueda
 * @version 2.0
 */
function setupSearch(inputId, searchHandler, delay = 300) {
    const input = document.getElementById(inputId);
    if (input) {
        let timeout;
        input.addEventListener('input', function() {
            clearTimeout(timeout);
            timeout = setTimeout(() => {
                searchHandler(this.value);
            }, delay);
        });
    }
}

/**
 * @brief Abre un modal de Bootstrap
 * @param modalId ID del modal a abrir
 * @version 1.0
 */
function openModal(modalId) {
    const modal = new bootstrap.Modal(document.getElementById(modalId));
    modal.show();
}

/**
 * @brief Cierra un modal de Bootstrap
 * @param modalId ID del modal a cerrar
 * @version 1.0
 */
function closeModal(modalId) {
    const modal = bootstrap.Modal.getInstance(document.getElementById(modalId));
    if (modal) {
        modal.hide();
    }
}

// Exportar funciones globalmente
window.ERPFarmacias = {
    showNotification,
    formatCurrency,
    formatDate,
    formatDateTime,
    isValidEmail,
    isValidPhone,
    confirmAction,
    handleFormSubmit,
    setupSearch,
    openModal,
    closeModal,
    cargarEstadisticasHome,
    actualizarContador,
    manejarClickActividad
};

// Hacer disponibles las funciones principales globalmente
window.cargarEstadisticasHome = cargarEstadisticasHome;
window.actualizarContador = actualizarContador;
window.manejarClickActividad = manejarClickActividad;
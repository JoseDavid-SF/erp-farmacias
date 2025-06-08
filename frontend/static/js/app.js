/**
 * @file app.js
 * @brief JavaScript principal del ERP de proveedor autónomo de farmacias
 * @details Funciones principales para el manejo del frontend, notificaciones,
 *          validaciones y comunicación con la API del backend.
 * @author José David Sánchez Fernández
 * @version 4.0
 * @date 2025-06-06
 * @copyright Copyright (c) 2025 Mega Nevada S.L. Todos los derechos reservados.
 */

// Aplicación principal ERP Farmacias

document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 ERP Farmacias cargado correctamente');
    
    // Inicializar componentes
    initializeApp();
});

/**
 * @brief Inicializa todos los componentes de la aplicación
 * @details Función principal que configura todos los elementos necesarios
 *          para el funcionamiento del frontend.
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
 * @details Realiza una petición al endpoint de prueba para verificar
 *          que la comunicación con el servidor funciona correctamente.
 * @version 3.1
 */
async function checkAPIConnection() {
    try {
        const response = await fetch('/api/test');
        const data = await response.json();
        
        if (data.status === 'success') {
            console.log('✅ Conexión con API exitosa');
            
            // Solo mostrar notificación en el dashboard principal
            if (window.location.pathname === '/' || window.location.pathname === '') {
                // Verificar si ya se mostró en esta sesión
                const yaNotificado = sessionStorage.getItem('sistema_conectado_notificado');
                
                if (!yaNotificado) {
                    showNotification('Sistema conectado correctamente', 'success', false);
                    // Marcar como notificado en esta sesión
                    sessionStorage.setItem('sistema_conectado_notificado', 'true');
                }
            }
        }
    } catch (error) {
        console.error('❌ Error de conexión:', error);
        // Solo mostrar errores, estos sí son importantes
        showNotification('Error de conexión con el servidor', 'danger', true);
    }
}

/**
 * @brief Inicializa los tooltips de Bootstrap
 * @details Configura todos los elementos con tooltips para mostrar
 *          información adicional al hacer hover.
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
 * @details Crea el contenedor principal para las notificaciones
 *          del sistema si no existe.
 * @version 1.0
 */
function setupNotifications() {
    // Crear contenedor de notificaciones si no existe
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
 * @details Crea y muestra una notificación tipo toast con el mensaje
 *          y tipo especificados.
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
    
    // Auto-remover si no es persistente
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
            
            // Mostrar loading
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Guardando...';
            
            try {
                await submitHandler(form);
            } catch (error) {
                showNotification('Error al procesar el formulario', 'danger');
                console.error('Error:', error);
            } finally {
                // Restaurar botón
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
    cargarEstadisticasDashboard,
    actualizarContador
};

// También hacer disponibles las funciones principales globalmente
window.cargarEstadisticasDashboard = cargarEstadisticasDashboard;
window.actualizarContador = actualizarContador;
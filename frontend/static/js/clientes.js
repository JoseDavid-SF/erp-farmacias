/**
 * @file clientes.js
 * @brief JavaScript para la gestión de clientes
 * @details Funciones para manejar las operaciones CRUD de clientes,
 *          búsquedas, validaciones y modales.
 * @author José David Sánchez Fernández
 * @version 1.0
 * @date 2025-06-06
 * @copyright Copyright (c) 2025 Mega Nevada S.L. Todos los derechos reservados.
 */

document.addEventListener('DOMContentLoaded', function() {
    console.log('📋 Módulo de clientes cargado correctamente');
    
    // Inicializar funcionalidades
    inicializarClientes();
});

/**
 * @brief Inicializa todas las funcionalidades del módulo de clientes
 * @version 1.0
 */
function inicializarClientes() {
    // Configurar búsqueda en tiempo real
    configurarBusqueda();
    
    // Inicializar tooltips
    inicializarTooltips();
    
    // Configurar validaciones de formulario
    if (document.getElementById('formCliente')) {
        configurarFormularioCliente();
    }
}

/**
 * @brief Configura la búsqueda en tiempo real de clientes
 * @version 1.0
 */
function configurarBusqueda() {
    const inputBusqueda = document.getElementById('search');
    if (inputBusqueda) {
        let timeout;
        inputBusqueda.addEventListener('input', function() {
            clearTimeout(timeout);
            timeout = setTimeout(() => {
                // Auto-enviar formulario después de 500ms de inactividad
                if (this.value.length >= 2 || this.value.length === 0) {
                    this.form.submit();
                }
            }, 500);
        });
    }
}

/**
 * @brief Muestra los detalles de un cliente en un modal
 * @param clienteId ID del cliente a mostrar
 * @version 1.0
 */
async function verDetalleCliente(clienteId) {
    const modal = new bootstrap.Modal(document.getElementById('modalDetalleCliente'));
    const contenido = document.getElementById('detalleClienteContent');
    
    // Mostrar modal con loading
    modal.show();
    contenido.innerHTML = `
        <div class="text-center py-4">
            <i class="fas fa-spinner fa-spin fa-2x text-primary"></i>
            <p class="mt-2">Cargando información del cliente...</p>
        </div>
    `;
    
    try {
        const response = await fetch(`/clientes/api/detalle/${clienteId}`);
        const data = await response.json();
        
        if (response.ok) {
            mostrarDetalleCliente(data);
        } else {
            throw new Error(data.error || 'Error al cargar cliente');
        }
    } catch (error) {
        console.error('Error:', error);
        contenido.innerHTML = `
            <div class="text-center py-4">
                <i class="fas fa-exclamation-circle fa-2x text-danger"></i>
                <p class="mt-2 text-danger">Error al cargar la información del cliente</p>
                <button class="btn btn-secondary" data-bs-dismiss="modal">Cerrar</button>
            </div>
        `;
    }
}

/**
 * @brief Muestra los detalles del cliente en el modal
 * @param data Datos del cliente obtenidos de la API
 * @version 1.0
 */
function mostrarDetalleCliente(data) {
    const cliente = data.cliente;
    const estadisticas = data.estadisticas;
    
    const contenido = document.getElementById('detalleClienteContent');
    contenido.innerHTML = `
        <div class="row">
            <div class="col-md-6">
                <h6 class="text-primary mb-3">
                    <i class="fas fa-info-circle me-2"></i>
                    Información General
                </h6>
                <table class="table table-sm">
                    <tr>
                        <td class="fw-semibold">Código:</td>
                        <td><span class="badge bg-primary">${cliente.codigo}</span></td>
                    </tr>
                    <tr>
                        <td class="fw-semibold">Nombre:</td>
                        <td>${cliente.nombre}</td>
                    </tr>
                    <tr>
                        <td class="fw-semibold">Dirección:</td>
                        <td>${cliente.direccion || '<em class="text-muted">No especificada</em>'}</td>
                    </tr>
                    <tr>
                        <td class="fw-semibold">Teléfono:</td>
                        <td>
                            ${cliente.telefono ? 
                              `<a href="tel:${cliente.telefono}" class="text-decoration-none">
                                 <i class="fas fa-phone me-1"></i>${cliente.telefono}
                               </a>` : 
                              '<em class="text-muted">No especificado</em>'
                            }
                        </td>
                    </tr>
                    <tr>
                        <td class="fw-semibold">Email:</td>
                        <td>
                            ${cliente.email ? 
                              `<a href="mailto:${cliente.email}" class="text-decoration-none">
                                 <i class="fas fa-envelope me-1"></i>${cliente.email}
                               </a>` : 
                              '<em class="text-muted">No especificado</em>'
                            }
                        </td>
                    </tr>
                    <tr>
                        <td class="fw-semibold">Estado:</td>
                        <td>
                            <span class="badge ${cliente.activo ? 'bg-success' : 'bg-danger'}">
                                <i class="fas ${cliente.activo ? 'fa-check' : 'fa-times'} me-1"></i>
                                ${cliente.activo ? 'Activo' : 'Inactivo'}
                            </span>
                        </td>
                    </tr>
                </table>
            </div>
            <div class="col-md-6">
                <h6 class="text-primary mb-3">
                    <i class="fas fa-chart-bar me-2"></i>
                    Estadísticas
                </h6>
                <div class="row g-2">
                    <div class="col-6">
                        <div class="card bg-light">
                            <div class="card-body text-center p-3">
                                <h4 class="text-primary mb-1">${estadisticas.total_pedidos}</h4>
                                <small class="text-muted">Total Pedidos</small>
                            </div>
                        </div>
                    </div>
                    <div class="col-6">
                        <div class="card bg-light">
                            <div class="card-body text-center p-3">
                                <h6 class="text-success mb-1">
                                    ${estadisticas.fecha_ultimo_pedido ? 
                                      new Date(estadisticas.fecha_ultimo_pedido).toLocaleDateString('es-ES') : 
                                      'Nunca'
                                    }
                                </h6>
                                <small class="text-muted">Último Pedido</small>
                            </div>
                        </div>
                    </div>
                </div>
                
                ${cliente.notas ? `
                <div class="mt-3">
                    <h6 class="text-primary mb-2">
                        <i class="fas fa-sticky-note me-2"></i>
                        Notas
                    </h6>
                    <div class="alert alert-light">
                        ${cliente.notas}
                    </div>
                </div>
                ` : ''}
            </div>
        </div>
        
        <div class="mt-4 d-flex justify-content-end gap-2">
            <button class="btn btn-secondary" data-bs-dismiss="modal">
                <i class="fas fa-times me-1"></i>Cerrar
            </button>
            <a href="/clientes/editar/${cliente.id}" class="btn btn-warning">
                <i class="fas fa-edit me-1"></i>Editar Cliente
            </a>
            <button class="btn btn-primary" onclick="crearPedidoCliente(${cliente.id})">
                <i class="fas fa-plus me-1"></i>Nuevo Pedido
            </button>
        </div>
    `;
}

/**
 * @brief Elimina (desactiva) un cliente
 * @param clienteId ID del cliente a eliminar
 * @param nombreCliente Nombre del cliente para confirmación
 * @version 1.0
 */
async function eliminarCliente(clienteId, nombreCliente) {
    const confirmacion = confirm(
        `¿Estás seguro de que deseas desactivar el cliente "${nombreCliente}"?\n\n` +
        `El cliente no será eliminado permanentemente, solo se desactivará.`
    );
    
    if (!confirmacion) return;
    
    try {
        const response = await fetch(`/clientes/api/eliminar/${clienteId}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        const data = await response.json();
        
        if (data.success) {
            showNotification(data.message, 'success');
            // Recargar página después de 1 segundo
            setTimeout(() => {
                window.location.reload();
            }, 1000);
        } else {
            showNotification(data.message, 'danger');
        }
        
    } catch (error) {
        console.error('Error:', error);
        showNotification('Error al eliminar cliente', 'danger');
    }
}

/**
 * @brief Configura las validaciones del formulario de cliente
 * @version 1.1
 */
function configurarFormularioCliente() {
    const form = document.getElementById('formCliente');
    
    if (!form) {
        console.log('❌ No se encontró el formulario formCliente');
        return;
    }
    
    console.log('✅ Configurando formulario de cliente');
    
    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        console.log('📝 Formulario enviado');
        
        if (validarFormularioCliente()) {
            await guardarCliente();
        } else {
            console.log('❌ Validación del formulario falló');
        }
    });
    
    // Validación en tiempo real
    const campos = ['codigo', 'nombre', 'email', 'telefono'];
    campos.forEach(campo => {
        const input = document.getElementById(campo);
        if (input) {
            input.addEventListener('blur', () => validarCampo(campo));
            input.addEventListener('input', () => limpiarError(campo));
        }
    });
}

/**
 * @brief Valida todo el formulario de cliente
 * @return bool True si es válido, false en caso contrario
 * @version 1.0
 */
function validarFormularioCliente() {
    let esValido = true;
    
    // Validar campos requeridos
    if (!validarCampo('codigo')) esValido = false;
    if (!validarCampo('nombre')) esValido = false;
    
    // Validar campos opcionales con formato
    const email = document.getElementById('email').value;
    if (email && !validarCampo('email')) esValido = false;
    
    const telefono = document.getElementById('telefono').value;
    if (telefono && !validarCampo('telefono')) esValido = false;
    
    return esValido;
}

/**
 * @brief Valida un campo específico del formulario
 * @param campo Nombre del campo a validar
 * @return bool True si es válido, false en caso contrario
 * @version 1.0
 */
function validarCampo(campo) {
    const input = document.getElementById(campo);
    const valor = input.value.trim();
    
    switch(campo) {
        case 'codigo':
            if (!valor) {
                mostrarErrorCampo(campo, 'El código es obligatorio');
                return false;
            }
            if (valor.length < 2) {
                mostrarErrorCampo(campo, 'El código debe tener al menos 2 caracteres');
                return false;
            }
            break;
            
        case 'nombre':
            if (!valor) {
                mostrarErrorCampo(campo, 'El nombre es obligatorio');
                return false;
            }
            if (valor.length < 3) {
                mostrarErrorCampo(campo, 'El nombre debe tener al menos 3 caracteres');
                return false;
            }
            break;
            
        case 'email':
            if (valor && !isValidEmail(valor)) {
                mostrarErrorCampo(campo, 'El formato del email no es válido');
                return false;
            }
            break;
            
        case 'telefono':
            if (valor && !isValidPhone(valor)) {
                mostrarErrorCampo(campo, 'El formato del teléfono no es válido');
                return false;
            }
            break;
    }
    
    limpiarError(campo);
    return true;
}

/**
 * @brief Muestra un error en un campo específico
 * @param campo Nombre del campo
 * @param mensaje Mensaje de error a mostrar
 * @version 1.0
 */
function mostrarErrorCampo(campo, mensaje) {
    const input = document.getElementById(campo);
    const errorDiv = document.getElementById(`error-${campo}`);
    
    input.classList.add('is-invalid');
    if (errorDiv) {
        errorDiv.textContent = mensaje;
        errorDiv.style.display = 'block';
    }
}

/**
 * @brief Limpia el error de un campo específico
 * @param campo Nombre del campo
 * @version 1.0
 */
function limpiarError(campo) {
    const input = document.getElementById(campo);
    const errorDiv = document.getElementById(`error-${campo}`);
    
    input.classList.remove('is-invalid');
    if (errorDiv) {
        errorDiv.style.display = 'none';
    }
}

/**
 * @brief Guarda los datos del cliente (crear o actualizar)
 * @version 1.1
 */
async function guardarCliente() {
    const form = document.getElementById('formCliente');
    const submitBtn = form.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    
    // Mostrar loading
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Guardando...';
    
    try {
        // Obtener datos del formulario
        const formData = new FormData(form);
        const data = {};
        
        // Convertir FormData a objeto
        for (let [key, value] of formData.entries()) {
            data[key] = value;
        }
        
        // Manejar checkbox de activo
        data.activo = form.querySelector('#activo') ? form.querySelector('#activo').checked : true;
        
        console.log('📤 Datos a enviar:', data);  // Debug log
        
        // Determinar si es creación o actualización
        const clienteId = document.getElementById('cliente_id');
        const esEdicion = clienteId && clienteId.value;
        
        const url = esEdicion ? 
            `/clientes/api/actualizar/${clienteId.value}` : 
            '/clientes/api/crear';
        
        const method = esEdicion ? 'PUT' : 'POST';
        
        console.log(`📤 Enviando ${method} a ${url}`);  // Debug log
        
        const response = await fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });
        
        console.log('📥 Response status:', response.status);  // Debug log
        
        const result = await response.json();
        console.log('📥 Response data:', result);  // Debug log
        
        if (result.success) {
            showNotification(result.message, 'success');
            // Redirigir a la lista después de 1.5 segundos
            setTimeout(() => {
                window.location.href = '/clientes';
            }, 1500);
        } else {
            showNotification(result.message, 'danger');
        }
        
    } catch (error) {
        console.error('❌ Error en guardarCliente:', error);
        showNotification('Error al guardar cliente', 'danger');
    } finally {
        // Restaurar botón
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;
    }
}

/**
 * @brief Exporta la lista de clientes a CSV
 * @version 1.0
 */
function exportarClientes() {
    showNotification('Funcionalidad de exportación en desarrollo', 'info');
}

/**
 * @brief Inicia el proceso de crear un pedido para un cliente
 * @param clienteId ID del cliente
 * @version 1.0
 */
function crearPedidoCliente(clienteId) {
    window.location.href = `/pedidos/nuevo?cliente=${clienteId}`;
}

/**
 * @brief Inicializa los tooltips de Bootstrap
 * @version 1.0
 */
function inicializarTooltips() {
    const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    tooltipTriggerList.map(function (tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl);
    });
}

/**
 * @brief Muestra una notificación (fallback si no está disponible globalmente)
 * @param message Mensaje a mostrar
 * @param type Tipo de notificación
 * @version 1.0
 */
function showNotification(message, type = 'info') {
    // Intentar usar la función global primero
    if (window.ERPFarmacias && window.ERPFarmacias.showNotification) {
        window.ERPFarmacias.showNotification(message, type);
        return;
    }
    
    // Fallback: mostrar con alert
    console.log(`${type.toUpperCase()}: ${message}`);
    
    // Crear notificación simple
    const alertClass = type === 'success' ? 'alert-success' : 
                     type === 'danger' ? 'alert-danger' : 'alert-info';
    
    const notification = document.createElement('div');
    notification.className = `alert ${alertClass} alert-dismissible fade show position-fixed`;
    notification.style.top = '20px';
    notification.style.right = '20px';
    notification.style.zIndex = '9999';
    notification.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
        }
    }, 5000);
}
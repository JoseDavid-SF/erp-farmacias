/**
 * @file clientes.js
 * @brief JavaScript para la gestión de clientes
 * @details Funciones para manejar las operaciones CRUD de clientes, búsquedas, validaciones y modales.
 * @author José David Sánchez Fernández
 * @version 1.6
 * @date 2025-06-14
 * @copyright Copyright (c) 2025 Mega Nevada S.L. Todos los derechos reservados.
 */

document.addEventListener('DOMContentLoaded', function() {
    console.log('Módulo de clientes cargado correctamente');
    
    // Inicializar funcionalidades
    inicializarClientes();
    
    // Verificar si hay que mostrar detalles automáticamente
    verificarParametroVer();
});

/**
 * @brief Verifica si hay parámetro 'ver' en URL para mostrar detalles automáticamente
 * @version 1.0
 */
function verificarParametroVer() {
    const urlParams = new URLSearchParams(window.location.search);
    const clienteId = urlParams.get('ver');
    
    if (clienteId) {
        console.log(`Mostrando detalles automáticos del cliente ID: ${clienteId}`);
        setTimeout(() => {
            verDetalleCliente(clienteId);
        }, 500);
    }
}

/**
 * @brief Inicializa todas las funcionalidades del módulo de clientes
 * @version 1.2
 */
function inicializarClientes() {
    // Configurar búsqueda en tiempo real
    configurarBusqueda();
    
    // Inicializar tooltips
    inicializarTooltips();
    
    // Configurar event listeners para botones
    configurarEventListeners();
    
    // Configurar validaciones de formulario
    if (document.getElementById('formCliente')) {
        configurarFormularioCliente();
    }
    
    // Cargar estadísticas del cliente si estamos en la página de edición
    cargarEstadisticasCliente();
}

/**
 * @brief Configura todos los event listeners de la página
 * @version 1.0
 */
function configurarEventListeners() {
    // Event listeners para botones de ver detalle
    document.querySelectorAll('.btn-ver-detalle').forEach(function(btn) {
        btn.addEventListener('click', function() {
            const clienteId = this.dataset.clienteId;
            verDetalleCliente(clienteId);
        });
    });
    
    // Event listeners para botones de eliminar
    document.querySelectorAll('.btn-eliminar-cliente').forEach(function(btn) {
        btn.addEventListener('click', function() {
            const clienteId = this.dataset.clienteId;
            const clienteNombre = this.dataset.clienteNombre;
            eliminarCliente(clienteId, clienteNombre);
        });
    });
    
    // Event listener para botón de exportar
    const btnExportar = document.querySelector('[onclick="exportarClientes()"]');
    if (btnExportar) {
        btnExportar.removeAttribute('onclick');
        btnExportar.addEventListener('click', exportarClientes);
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
                if (this.value.length >= 2 || this.value.length === 0) {
                    this.form.submit();
                }
            }, 500);
        });
    }
}

/**
 * @brief Muestra los detalles de un cliente en un modal (con manejo de errores mejorado)
 * @param clienteId ID del cliente a mostrar
 * @version 1.3
 */
async function verDetalleCliente(clienteId) {
    // Verificar si existe el modal, si no, crear uno temporal o usar alert
    let modal;
    let contenido;
    
    const modalElement = document.getElementById('modalDetalleCliente');
    if (modalElement) {
        modal = new bootstrap.Modal(modalElement);
        contenido = document.getElementById('detalleClienteContent');
        
        // Mostrar modal con loading
        modal.show();
        contenido.innerHTML = `
            <div class="text-center py-4">
                <i class="fas fa-spinner fa-spin fa-2x text-primary"></i>
                <p class="mt-2">Cargando información del cliente...</p>
            </div>
        `;
    } else {
        console.log('Modal no encontrado, redirigiendo a editar cliente');
        window.location.href = `/clientes/editar/${clienteId}`;
        return;
    }
    
    try {
        const response = await fetch(`/clientes/api/detalle/${clienteId}`);
        const data = await response.json();
        
        if (response.ok && data.cliente) {
            mostrarDetalleCliente(data);
        } else {
            throw new Error(data.error || 'Error al cargar cliente');
        }
    } catch (error) {
        console.error('Error:', error);
        if (contenido) {
            contenido.innerHTML = `
                <div class="text-center py-4">
                    <i class="fas fa-exclamation-circle fa-2x text-danger"></i>
                    <p class="mt-2 text-danger">Error al cargar la información del cliente</p>
                    <p class="small text-muted">${error.message}</p>
                    <div class="mt-3">
                        <button class="btn btn-secondary me-2" data-bs-dismiss="modal">Cerrar</button>
                        <a href="/clientes/editar/${clienteId}" class="btn btn-warning">
                            <i class="fas fa-edit me-1"></i>Editar Cliente
                        </a>
                    </div>
                </div>
            `;
        } else {
            showNotification('Error al cargar cliente. Redirigiendo...', 'danger');
            setTimeout(() => {
                window.location.href = `/clientes/editar/${clienteId}`;
            }, 2000);
        }
    }
}

/**
 * @brief Muestra los detalles del cliente en el modal
 * @param data Datos del cliente obtenidos de la API
 * @version 1.4
 */
function mostrarDetalleCliente(data) {
    const cliente = data.cliente;
    const estadisticas = data.estadisticas || {};
    
    const contenido = document.getElementById('detalleClienteContent');
    if (!contenido) {
        console.error('No se encontró el contenedor del modal');
        return;
    }
    
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
                        <td><span class="badge bg-primary">${cliente.codigo || 'N/A'}</span></td>
                    </tr>
                    <tr>
                        <td class="fw-semibold">Nombre:</td>
                        <td>${cliente.nombre || 'N/A'}</td>
                    </tr>
                    ${cliente.nombre_fiscal && cliente.nombre_fiscal !== cliente.nombre ? `
                    <tr>
                        <td class="fw-semibold">Nombre Fiscal:</td>
                        <td>${cliente.nombre_fiscal}</td>
                    </tr>
                    ` : ''}
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
                    <i class="fas fa-file-invoice me-2"></i>
                    Información Fiscal
                </h6>
                <table class="table table-sm">
                    <tr>
                        <td class="fw-semibold">CIF/NIF:</td>
                        <td>${cliente.cif || '<em class="text-muted">No especificado</em>'}</td>
                    </tr>
                    <tr>
                        <td class="fw-semibold">Farmacéutico:</td>
                        <td>${cliente.contacto || '<em class="text-muted">No especificado</em>'}</td>
                    </tr>
                    <tr>
                        <td class="fw-semibold">Cuenta Bancaria:</td>
                        <td>${cliente.cuenta_bancaria ? 
                            `<code class="small">${cliente.cuenta_bancaria}</code>` : 
                            '<em class="text-muted">No especificada</em>'
                        }</td>
                    </tr>
                </table>
                
                <h6 class="text-primary mb-3 mt-4">
                    <i class="fas fa-chart-bar me-2"></i>
                    Estadísticas
                </h6>
                <div class="row g-2">
                    <div class="col-6">
                        <div class="card bg-light">
                            <div class="card-body text-center p-3">
                                <h4 class="text-primary mb-1">${estadisticas.total_pedidos || 0}</h4>
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
            </div>
        </div>
        
        ${cliente.notas ? `
        <div class="row mt-4">
            <div class="col-12">
                <h6 class="text-primary mb-2">
                    <i class="fas fa-sticky-note me-2"></i>
                    Notas del Cliente
                </h6>
                <div class="alert alert-light border">
                    <div class="text-muted">${cliente.notas}</div>
                </div>
            </div>
        </div>
        ` : ''}
        
        <div class="row mt-4">
            <div class="col-12 d-flex justify-content-end gap-2">
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
 * @version 1.3
 */
function configurarFormularioCliente() {
    const form = document.getElementById('formCliente');
    
    if (!form) {
        console.log('No se encontró el formulario formCliente');
        return;
    }
    
    console.log('Configurando formulario de cliente');
    
    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        console.log('Formulario enviado');
        
        if (validarFormularioCliente()) {
            await guardarCliente();
        } else {
            console.log('Validación del formulario falló');
        }
    });
    
    // Validación en tiempo real para campos básicos
    const campos = ['codigo', 'nombre', 'email', 'telefono'];
    campos.forEach(campo => {
        const input = document.getElementById(campo);
        if (input) {
            input.addEventListener('blur', () => validarCampo(campo));
            input.addEventListener('input', () => limpiarError(campo));
        }
    });
    
    // Validación en tiempo real para campos fiscales
    const camposFiscales = ['cif', 'nombre_fiscal', 'contacto', 'cuenta_bancaria'];
    camposFiscales.forEach(campo => {
        const input = document.getElementById(campo);
        if (input) {
            input.addEventListener('blur', () => validarCampoFiscal(campo));
            input.addEventListener('input', () => limpiarError(campo));
        }
    });
}

/**
 * @brief Valida todo el formulario de cliente
 * @return bool True si es válido, false en caso contrario
 * @version 1.3
 */
function validarFormularioCliente() {
    let esValido = true;
    
    console.log('Iniciando validación del formulario de cliente...');
    
    // Validar campos requeridos
    if (!validarCampo('codigo')) {
        console.log('Error en código');
        esValido = false;
    }
    if (!validarCampo('nombre')) {
        console.log('Error en nombre');
        esValido = false;
    }
    
    // Validar campos opcionales con formato
    const email = document.getElementById('email').value;
    if (email && !validarCampo('email')) {
        console.log('Error en email');
        esValido = false;
    }
    
    const telefono = document.getElementById('telefono').value;
    if (telefono && !validarCampo('telefono')) {
        console.log('Error en teléfono');
        esValido = false;
    }
    
    // Validar campos fiscales opcionales
    const cif = document.getElementById('cif').value;
    if (cif && !validarCampoFiscal('cif')) {
        console.log('Error en CIF');
        esValido = false;
    }
    
    const cuentaBancaria = document.getElementById('cuenta_bancaria').value;
    if (cuentaBancaria && !validarCampoFiscal('cuenta_bancaria')) {
        console.log('Error en cuenta bancaria');
        esValido = false;
    }
    
    console.log('Validación completada. Resultado:', esValido);
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
    if (!input) return true;
    
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
 * @brief Valida los campos fiscales del formulario
 * @param campo Nombre del campo a validar
 * @return bool True si es válido, false en caso contrario
 * @version 1.1
 */
function validarCampoFiscal(campo) {
    const input = document.getElementById(campo);
    if (!input) return true;
    
    const valor = input.value.trim();
    
    // Si el campo está vacío, es válido (campos opcionales)
    if (!valor) {
        limpiarError(campo);
        return true;
    }
    
    switch(campo) {
        case 'cif':
            if (!isValidCIF(valor)) {
                mostrarErrorCampo(campo, 'El formato del CIF/NIF no es válido (ej: A12345678, 12345678A)');
                return false;
            }
            break;
            
        case 'cuenta_bancaria':
            if (!isValidIBAN(valor)) {
                mostrarErrorCampo(campo, 'El formato del IBAN no es válido (ej: ES00 1234 1234 1234 1234 1234)');
                return false;
            }
            break;
            
        case 'nombre_fiscal':
            if (valor.length < 3) {
                mostrarErrorCampo(campo, 'El nombre fiscal debe tener al menos 3 caracteres');
                return false;
            }
            break;
            
        case 'contacto':
            if (valor.length < 2) {
                mostrarErrorCampo(campo, 'El nombre del contacto debe tener al menos 2 caracteres');
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
    
    if (input) input.classList.add('is-invalid');
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
    
    if (input) input.classList.remove('is-invalid');
    if (errorDiv) {
        errorDiv.style.display = 'none';
    }
}

/**
 * @brief Guarda los datos del cliente (crear o actualizar)
 * @version 1.4
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
        const camposValidos = [
            'codigo', 'nombre', 'direccion', 'telefono', 'email', 'notas',
            'nombre_fiscal', 'cif', 'contacto', 'cuenta_bancaria'
        ];
        
        for (let [key, value] of formData.entries()) {
            if (camposValidos.includes(key)) {
                data[key] = value;
            }
        }
        
        // Manejar checkbox de activo
        data.activo = form.querySelector('#activo') ? form.querySelector('#activo').checked : true;
        
        console.log('Datos a enviar (filtrados):', data);
        
        // Determinar si es creación o actualización
        const clienteId = document.getElementById('cliente_id');
        const esEdicion = clienteId && clienteId.value;
        
        const url = esEdicion ? 
            `/clientes/api/actualizar/${clienteId.value}` : 
            '/clientes/api/crear';
        
        const method = esEdicion ? 'PUT' : 'POST';
        
        console.log(`Enviando ${method} a ${url}`);
        
        const response = await fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });
        
        console.log('Response status:', response.status);
        
        const result = await response.json();
        console.log('Response data:', result);
        
        if (result.success) {
            showNotification(result.message, 'success');
            setTimeout(() => {
                window.location.href = '/clientes';
            }, 1500);
        } else {
            showNotification(result.message, 'danger');
        }
        
    } catch (error) {
        console.error('Error en guardarCliente:', error);
        showNotification('Error al guardar cliente: ' + error.message, 'danger');
    } finally {
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
 * @brief Valida si un CIF/NIF tiene formato correcto
 * @param cif CIF/NIF a validar
 * @return Boolean true si es válido, false en caso contrario
 * @version 1.2
 */
function isValidCIF(cif) {
    if (!cif || cif.trim().length === 0) return true;
    
    const cleanCif = cif.trim().toUpperCase().replace(/[\s-]/g, '');
    console.log('Validando CIF limpio:', cleanCif);
    
    // Formatos validos:
    // NIF: 12345678A (8 dígitos + 1 letra)
    // CIF: A12345678 (1 letra + 8 dígitos)
    // NIE: X1234567A (1 letra + 7 dígitos + 1 letra)
    const nifRegex = /^[0-9]{8}[A-Z]$/;
    const cifRegex = /^[A-Z][0-9]{8}$/;
    const nieRegex = /^[XYZ][0-9]{7}[A-Z]$/;
    
    const isNif = nifRegex.test(cleanCif);
    const isCif = cifRegex.test(cleanCif);
    const isNie = nieRegex.test(cleanCif);
    
    console.log('Resultado validación CIF:', { isNif, isCif, isNie });
    
    return isNif || isCif || isNie;
}

/**
 * @brief Valida si un IBAN tiene formato correcto
 * @param iban IBAN a validar
 * @return Boolean true si es válido, false en caso contrario
 * @version 1.1
 */
function isValidIBAN(iban) {
    if (!iban || iban.trim().length === 0) return true; // Campo opcional
    
    // Limpiar espacios y convertir a mayúsculas
    const cleanIban = iban.replace(/\s/g, '').toUpperCase();
    
    // Validación básica de IBAN español (24 caracteres)
    // ES + 2 dígitos de control + 20 dígitos
    const ibanRegex = /^ES[0-9]{22}$/;
    
    return ibanRegex.test(cleanIban);
}

/**
 * @brief Carga las estadísticas del cliente en la página de edición
 * @version 1.0
 */
function cargarEstadisticasCliente() {
    const cardCliente = document.querySelector('[data-cliente-id]');
    if (!cardCliente) return;
    
    const clienteId = cardCliente.getAttribute('data-cliente-id');
    if (!clienteId) return;
    
    // Cargar estadísticas de forma asíncrona
    fetch(`/clientes/api/detalle/${clienteId}`)
        .then(response => response.json())
        .then(data => {
            if (data.estadisticas) {
                const totalPedidosEl = document.getElementById('total-pedidos-cliente');
                if (totalPedidosEl) {
                    totalPedidosEl.textContent = data.estadisticas.total_pedidos || 0;
                }
                
                // También actualizar la fecha si está disponible
                const fechaUltimaVisitaEl = document.getElementById('fecha-ultima-visita');
                if (fechaUltimaVisitaEl && data.estadisticas.fecha_ultimo_pedido) {
                    const fecha = new Date(data.estadisticas.fecha_ultimo_pedido);
                    fechaUltimaVisitaEl.textContent = fecha.toLocaleDateString('es-ES');
                }
            }
        })
        .catch(error => {
            console.log('Info: No se pudieron cargar las estadísticas del cliente');
        });
}

/**
 * @brief Muestra una notificación
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
    
    // Fallback: crear notificación simple
    console.log(`${type.toUpperCase()}: ${message}`);
    
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
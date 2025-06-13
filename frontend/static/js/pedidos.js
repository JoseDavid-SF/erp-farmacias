/**
 * @file pedidos.js
 * @brief JavaScript para la gestión de pedidos
 * @details Funciones para manejar las operaciones CRUD de pedidos,
 *          búsquedas, validaciones y control de items.
 * @author José David Sánchez Fernández
 * @version 1.0
 * @date 2025-06-10
 * @copyright Copyright (c) 2025 Mega Nevada S.L. Todos los derechos reservados.
 */

// Variables globales
let clienteSeleccionado = null;
let productoSeleccionado = null;
let itemsPedido = [];
let contadorItems = 0;

document.addEventListener('DOMContentLoaded', function() {
    console.log('🛒 Módulo de pedidos cargado correctamente');
    
    // Inicializar funcionalidades
    inicializarPedidos();
    
    // Verificar si hay que mostrar detalles automáticamente
    verificarParametroVerPedido();
    
    // Cargar items existentes si estamos editando un pedido
    cargarItemsExistentesFormulario();
});

/**
 * @brief Verifica si hay parámetro 'ver' en URL para mostrar detalles automáticamente
 * @version 1.0
 */
function verificarParametroVerPedido() {
    const urlParams = new URLSearchParams(window.location.search);
    const pedidoId = urlParams.get('ver');
    
    if (pedidoId) {
        console.log(`🛒 Mostrando detalles automáticos del pedido ID: ${pedidoId}`);
        setTimeout(() => {
            verDetallePedido(pedidoId);
        }, 500);
    }
}

/**
 * @brief Inicializa todas las funcionalidades del módulo de pedidos
 * @version 1.0
 */
function inicializarPedidos() {
    // Detectar si estamos en la página de lista o formulario
    const esFormulario = document.getElementById('formPedido');
    const esLista = document.querySelector('.card-header h5')?.textContent?.includes('Pedidos');
    
    if (esLista && !esFormulario) {
        // Solo configurar búsqueda automática en la página de LISTA
        configurarBusquedaPedidos();
    }
    
    // Inicializar tooltips
    inicializarTooltips();
    
    // Configurar event listeners para botones
    configurarEventListenersPedidos();
    
    // Configurar validaciones de formulario si estamos en el formulario
    if (esFormulario) {
        configurarFormularioPedido();
    }
}

/**
 * @brief Configura todos los event listeners de la página de pedidos
 * @version 1.0
 */
function configurarEventListenersPedidos() {
    // Event listeners para botones de ver detalle
    document.querySelectorAll('.btn-ver-detalle-pedido').forEach(function(btn) {
        btn.addEventListener('click', function() {
            const pedidoId = this.dataset.pedidoId;
            verDetallePedido(pedidoId);
        });
    });
    
    // Event listeners para botones de cambiar estado
    document.querySelectorAll('.btn-cambiar-estado').forEach(function(btn) {
        btn.addEventListener('click', function() {
            const pedidoId = this.dataset.pedidoId;
            const nuevoEstado = this.dataset.estado;
            cambiarEstadoPedido(pedidoId, nuevoEstado);
        });
    });
    
    // Event listeners para botones de eliminar
    document.querySelectorAll('.btn-eliminar-pedido').forEach(function(btn) {
        btn.addEventListener('click', function() {
            const pedidoId = this.dataset.pedidoId;
            const pedidoNumero = this.dataset.pedidoNumero;
            eliminarPedido(pedidoId, pedidoNumero);
        });
    });
    
    // Event listeners para botones de imprimir
    document.querySelectorAll('.btn-imprimir-pedido').forEach(function(btn) {
        btn.addEventListener('click', function() {
            const pedidoId = this.dataset.pedidoId;
            imprimirPedido(pedidoId);
        });
    });
    
    // Event listener para botón de exportar
    const btnExportar = document.querySelector('[onclick="exportarPedidos()"]');
    if (btnExportar) {
        btnExportar.removeAttribute('onclick');
        btnExportar.addEventListener('click', exportarPedidos);
    }
}

/**
 * @brief Configura la búsqueda en tiempo real de pedidos (SOLO EN LISTA)
 * @version 1.0
 */
function configurarBusquedaPedidos() {
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
    
    // Auto-submit cuando cambia el estado
    const selectEstado = document.getElementById('estado');
    const esFormulario = document.getElementById('formPedido');
    
    if (selectEstado && !esFormulario) {
        selectEstado.addEventListener('change', function() {
            this.form.submit();
        });
    }
}

/**
 * @brief Configura las funcionalidades del formulario de pedidos
 * @version 1.0
 */
function configurarFormularioPedido() {
    const form = document.getElementById('formPedido');
    
    if (!form) {
        console.log('❌ No se encontró el formulario formPedido');
        return;
    }
    
    console.log('✅ Configurando formulario de pedidos');
    
    // Configurar búsqueda de clientes
    configurarBusquedaClientes();
    
    // Configurar búsqueda de productos
    configurarBusquedaProductos();
    
    // Event listener para el formulario
    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        console.log('📝 Formulario de pedido enviado');
        
        if (validarFormularioPedido()) {
            await guardarPedido();
        } else {
            console.log('❌ Validación del formulario falló');
        }
    });
    
    // Event listener para botón borrador
    const btnBorrador = document.getElementById('btn_borrador');
    if (btnBorrador) {
        btnBorrador.addEventListener('click', async function() {
            await guardarPedido(true); // true = borrador
        });
    }
}

/**
 * @brief Configura la búsqueda de clientes en el formulario
 * @version 1.0
 */
function configurarBusquedaClientes() {
    const input = document.getElementById('cliente_search');
    const resultados = document.getElementById('cliente_resultados');
    let timeout;
    
    if (!input || !resultados) return;
    
    input.addEventListener('input', function() {
        clearTimeout(timeout);
        const termino = this.value.trim();
        
        if (termino.length < 2) {
            resultados.style.display = 'none';
            return;
        }
        
        timeout = setTimeout(async () => {
            await buscarClientes(termino);
        }, 300);
    });
    
    // Ocultar resultados al hacer click fuera
    document.addEventListener('click', function(e) {
        if (!e.target.closest('#cliente_search') && !e.target.closest('#cliente_resultados')) {
            resultados.style.display = 'none';
        }
    });
}

/**
 * @brief Busca clientes y muestra los resultados
 * @param termino Término de búsqueda
 * @version 1.0
 */
async function buscarClientes(termino) {
    const resultados = document.getElementById('cliente_resultados');
    
    try {
        const response = await fetch(`/pedidos/api/buscar-clientes?q=${encodeURIComponent(termino)}`);
        const data = await response.json();
        
        if (data.clientes && data.clientes.length > 0) {
            let html = '<div class="list-group list-group-flush">';
            
            data.clientes.forEach(cliente => {
                html += `
                    <button type="button" 
                            class="list-group-item list-group-item-action" 
                            onclick="seleccionarCliente(${cliente.id}, '${cliente.codigo}', '${cliente.nombre}', ${cliente.recargo_equivalencia || 0})">
                        <div class="d-flex justify-content-between">
                            <div>
                                <strong>${cliente.codigo}</strong> - ${cliente.nombre}
                            </div>
                            <small class="text-muted">
                                ${cliente.recargo_equivalencia ? `RE: ${cliente.recargo_equivalencia}%` : ''}
                            </small>
                        </div>
                        ${cliente.direccion ? `<small class="text-muted">${cliente.direccion}</small>` : ''}
                    </button>
                `;
            });
            
            html += '</div>';
            resultados.innerHTML = html;
            resultados.style.display = 'block';
        } else {
            resultados.innerHTML = '<div class="p-3 text-muted">No se encontraron clientes</div>';
            resultados.style.display = 'block';
        }
        
    } catch (error) {
        console.error('Error al buscar clientes:', error);
        resultados.style.display = 'none';
    }
}

/**
 * @brief Selecciona un cliente para el pedido
 * @param id ID del cliente
 * @param codigo Código del cliente
 * @param nombre Nombre del cliente
 * @param recargoEquivalencia Porcentaje de recargo de equivalencia
 * @version 1.0
 */
function seleccionarCliente(id, codigo, nombre, recargoEquivalencia) {
    clienteSeleccionado = {
        id: id,
        codigo: codigo,
        nombre: nombre,
        recargo_equivalencia: recargoEquivalencia || 0
    };
    
    document.getElementById('cliente_search').value = `${codigo} - ${nombre}`;
    document.getElementById('cliente_id').value = id;
    document.getElementById('cliente_resultados').style.display = 'none';
    
    // Recalcular totales si hay items
    calcularTotalesPedido();
    
    console.log('Cliente seleccionado:', clienteSeleccionado);
}

/**
 * @brief Configura la búsqueda de productos en el formulario
 * @version 1.0
 */
function configurarBusquedaProductos() {
    const input = document.getElementById('producto_search');
    const resultados = document.getElementById('producto_resultados');
    const btnAgregar = document.getElementById('btn_agregar_producto');
    let timeout;
    
    if (!input || !resultados) return;
    
    input.addEventListener('input', function() {
        clearTimeout(timeout);
        const termino = this.value.trim();
        
        if (termino.length < 2) {
            resultados.style.display = 'none';
            btnAgregar.disabled = true;
            return;
        }
        
        timeout = setTimeout(async () => {
            await buscarProductos(termino);
        }, 300);
    });
    
    // Event listener para botón agregar
    btnAgregar.addEventListener('click', function() {
        if (productoSeleccionado) {
            mostrarModalCantidad();
        }
    });
    
    // Ocultar resultados al hacer click fuera
    document.addEventListener('click', function(e) {
        if (!e.target.closest('#producto_search') && !e.target.closest('#producto_resultados')) {
            resultados.style.display = 'none';
        }
    });
}

/**
 * @brief Busca productos y muestra los resultados
 * @param termino Término de búsqueda
 * @version 1.0
 */
async function buscarProductos(termino) {
    const resultados = document.getElementById('producto_resultados');
    
    try {
        const response = await fetch(`/pedidos/api/buscar-productos?q=${encodeURIComponent(termino)}`);
        const data = await response.json();
        
        if (data.productos && data.productos.length > 0) {
            let html = '<div class="list-group list-group-flush">';
            
            data.productos.forEach(producto => {
                const stockClass = producto.stock <= 0 ? 'text-danger' : 
                                 producto.stock <= producto.stock_minimo ? 'text-warning' : 'text-success';
                
                html += `
                    <button type="button" 
                            class="list-group-item list-group-item-action" 
                            onclick="seleccionarProducto(${JSON.stringify(producto).replace(/"/g, '&quot;')})">
                        <div class="d-flex justify-content-between">
                            <div>
                                <strong>${producto.codigo}</strong> - ${producto.nombre}
                                ${producto.es_deposito ? '<span class="badge bg-info ms-1">Depósito</span>' : ''}
                            </div>
                            <div class="text-end">
                                <div class="fw-bold text-success">${producto.pvf_sin_iva.toFixed(2)}€ + IVA</div>
                                <small class="${stockClass}">Stock: ${producto.stock}</small>
                            </div>
                        </div>
                        ${producto.descripcion ? `<small class="text-muted">${producto.descripcion.substring(0, 100)}...</small>` : ''}
                    </button>
                `;
            });
            
            html += '</div>';
            resultados.innerHTML = html;
            resultados.style.display = 'block';
        } else {
            resultados.innerHTML = '<div class="p-3 text-muted">No se encontraron productos</div>';
            resultados.style.display = 'block';
        }
        
    } catch (error) {
        console.error('Error al buscar productos:', error);
        resultados.style.display = 'none';
    }
}

/**
 * @brief Selecciona un producto para agregar al pedido
 * @param producto Objeto con datos del producto
 * @version 1.0
 */
function seleccionarProducto(producto) {
    productoSeleccionado = producto;
    
    document.getElementById('producto_search').value = `${producto.codigo} - ${producto.nombre}`;
    document.getElementById('producto_resultados').style.display = 'none';
    document.getElementById('btn_agregar_producto').disabled = false;
    
    console.log('Producto seleccionado:', productoSeleccionado);
}

/**
 * @brief Muestra el modal para seleccionar cantidad
 * @version 1.0
 */
function mostrarModalCantidad() {
    if (!productoSeleccionado) return;
    
    const modal = new bootstrap.Modal(document.getElementById('modalCantidad'));
    const stockInfo = document.getElementById('stock_info');
    const inputCantidad = document.getElementById('cantidad_producto');
    
    // Mostrar información del stock
    if (productoSeleccionado.es_deposito) {
        stockInfo.innerHTML = '<i class="fas fa-info-circle text-info"></i> Producto en depósito - Sin límite de stock';
        inputCantidad.removeAttribute('max');
    } else {
        stockInfo.innerHTML = `<i class="fas fa-warehouse"></i> Stock disponible: ${productoSeleccionado.stock} unidades`;
        inputCantidad.setAttribute('max', productoSeleccionado.stock);
        
        if (productoSeleccionado.stock <= 0) {
            stockInfo.innerHTML = '<i class="fas fa-exclamation-triangle text-danger"></i> Producto agotado';
            inputCantidad.disabled = true;
        }
    }
    
    inputCantidad.value = 1;
    inputCantidad.focus();
    modal.show();
    
    // Configurar botón de confirmación
    const btnConfirmar = document.getElementById('confirmar_cantidad');
    btnConfirmar.onclick = function() {
        const cantidad = parseInt(inputCantidad.value);
        if (cantidad > 0) {
            agregarProductoAPedido(productoSeleccionado, cantidad);
            modal.hide();
            limpiarSeleccionProducto();
        }
    };
}

/**
 * @brief Agrega un producto al pedido
 * @param producto Producto a agregar
 * @param cantidad Cantidad del producto
 * @version 1.0
 */
function agregarProductoAPedido(producto, cantidad) {
    // Verificar si el producto ya está en el pedido
    const itemExistente = itemsPedido.find(item => item.producto_id === producto.id);
    
    if (itemExistente) {
        // Actualizar cantidad del item existente
        itemExistente.cantidad += cantidad;
        itemExistente.subtotal_sin_iva = itemExistente.cantidad * itemExistente.precio_unitario_sin_iva;
        itemExistente.total_iva = itemExistente.subtotal_sin_iva * (itemExistente.iva_porcentaje / 100);
        itemExistente.subtotal_con_iva = itemExistente.subtotal_sin_iva + itemExistente.total_iva;
    } else {
        // Crear nuevo item
        const item = {
            id: ++contadorItems,
            producto_id: producto.id,
            producto_codigo: producto.codigo,
            producto_nombre: producto.nombre,
            cantidad: cantidad,
            precio_unitario_sin_iva: producto.pvf_sin_iva,
            iva_porcentaje: producto.iva_porcentaje,
            subtotal_sin_iva: cantidad * producto.pvf_sin_iva,
            total_iva: (cantidad * producto.pvf_sin_iva) * (producto.iva_porcentaje / 100),
            subtotal_con_iva: 0,
            es_deposito: producto.es_deposito || false
        };
        
        item.subtotal_con_iva = item.subtotal_sin_iva + item.total_iva;
        itemsPedido.push(item);
    }
    
    actualizarTablaItems();
    calcularTotalesPedido();
    
    showNotification(`Producto ${producto.nombre} agregado al pedido`, 'success');
}

/**
 * @brief Actualiza la tabla de items del pedido
 * @version 1.0
 */
function actualizarTablaItems() {
    const tbody = document.getElementById('items_pedido');
    tbody.innerHTML = '';
    
    itemsPedido.forEach(item => {
        const fila = document.createElement('tr');
        fila.innerHTML = `
            <td>
                <span class="badge bg-primary">${item.producto_codigo}</span>
                ${item.es_deposito ? '<br><small class="badge bg-info">Depósito</small>' : ''}
            </td>
            <td>
                <strong>${item.producto_nombre}</strong>
                <br><small class="text-muted">
                    IVA: ${item.iva_porcentaje}%
                </small>
            </td>
            <td>
                <input type="number" 
                       class="form-control form-control-sm text-center" 
                       value="${item.cantidad}" 
                       min="1"
                       onchange="actualizarCantidadItem(${item.id}, this.value)"
                       style="width: 80px;">
            </td>
            <td class="text-end">
                ${item.precio_unitario_sin_iva.toFixed(2)}€
                <br><small class="text-muted">+ IVA</small>
            </td>
            <td class="text-end">
                <strong>${item.subtotal_con_iva.toFixed(2)}€</strong>
                <br><small class="text-muted">${item.subtotal_sin_iva.toFixed(2)}€ + ${item.total_iva.toFixed(2)}€</small>
            </td>
            <td class="text-center">
                <button type="button" 
                        class="btn btn-danger btn-sm" 
                        onclick="eliminarItemPedido(${item.id}, '${item.producto_nombre}')"
                        title="Eliminar producto">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        `;
        tbody.appendChild(fila);
    });
}

/**
 * @brief Actualiza la cantidad de un item del pedido
 * @param itemId ID del item
 * @param nuevaCantidad Nueva cantidad
 * @version 1.0
 */
function actualizarCantidadItem(itemId, nuevaCantidad) {
    const cantidad = parseInt(nuevaCantidad);
    if (cantidad <= 0) return;
    
    const item = itemsPedido.find(i => i.id === itemId);
    if (item) {
        item.cantidad = cantidad;
        item.subtotal_sin_iva = item.cantidad * item.precio_unitario_sin_iva;
        item.total_iva = item.subtotal_sin_iva * (item.iva_porcentaje / 100);
        item.subtotal_con_iva = item.subtotal_sin_iva + item.total_iva;
        
        actualizarTablaItems();
        calcularTotalesPedido();
    }
}

/**
 * @brief Elimina un item del pedido
 * @param itemId ID del item
 * @param productoNombre Nombre del producto
 * @version 1.0
 */
function eliminarItemPedido(itemId, productoNombre) {
    const modal = new bootstrap.Modal(document.getElementById('modalEliminarItem'));
    document.getElementById('producto_eliminar_nombre').textContent = productoNombre;
    
    document.getElementById('confirmar_eliminar_item').onclick = function() {
        itemsPedido = itemsPedido.filter(item => item.id !== itemId);
        actualizarTablaItems();
        calcularTotalesPedido();
        modal.hide();
        showNotification('Producto eliminado del pedido', 'success');
    };
    
    modal.show();
}

/**
 * @brief Calcula los totales del pedido
 * @version 1.0
 */
function calcularTotalesPedido() {
    const subtotal = itemsPedido.reduce((sum, item) => sum + item.subtotal_sin_iva, 0);
    const totalIva = itemsPedido.reduce((sum, item) => sum + item.total_iva, 0);
    
    // Calcular recargo de equivalencia del cliente
    let totalRecargo = 0;
    if (clienteSeleccionado && clienteSeleccionado.recargo_equivalencia) {
        totalRecargo = subtotal * (clienteSeleccionado.recargo_equivalencia / 100);
    }
    
    const total = subtotal + totalIva + totalRecargo;
    
    // Actualizar elementos del DOM
    document.getElementById('subtotal_pedido').textContent = `${subtotal.toFixed(2)}€`;
    document.getElementById('iva_pedido').textContent = `${totalIva.toFixed(2)}€`;
    document.getElementById('recargo_pedido').textContent = `${totalRecargo.toFixed(2)}€`;
    document.getElementById('total_pedido').textContent = `${total.toFixed(2)}€`;
}

/**
 * @brief Limpia la selección de producto
 * @version 1.0
 */
function limpiarSeleccionProducto() {
    productoSeleccionado = null;
    document.getElementById('producto_search').value = '';
    document.getElementById('btn_agregar_producto').disabled = true;
}

/**
 * @brief Valida el formulario de pedido
 * @return bool True si es válido, false en caso contrario
 * @version 1.0
 */
function validarFormularioPedido() {
    let esValido = true;
    
    // Validar cliente
    if (!clienteSeleccionado || !document.getElementById('cliente_id').value) {
        mostrarErrorCampo('cliente', 'Debe seleccionar un cliente');
        esValido = false;
    } else {
        limpiarError('cliente');
    }
    
    // Validar que tenga al menos un item
    if (itemsPedido.length === 0) {
        showNotification('El pedido debe tener al menos un producto', 'danger');
        esValido = false;
    }
    
    return esValido;
}

/**
 * @brief Guarda el pedido (crear o actualizar)
 * @param esBorrador Si es true, guarda como borrador
 * @version 1.0
 */
async function guardarPedido(esBorrador = false) {
    const form = document.getElementById('formPedido');
    const submitBtn = form.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    
    // Mostrar loading
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Guardando...';
    
    try {
        // Preparar datos del pedido
        const data = {
            cliente_id: document.getElementById('cliente_id').value,
            estado: esBorrador ? 'pendiente' : document.getElementById('estado').value,
            observaciones: document.getElementById('observaciones').value,
            productos_pendientes: document.getElementById('productos_pendientes').value,
            items: itemsPedido.map(item => ({
                producto_id: item.producto_id,
                cantidad: item.cantidad
            }))
        };
        
        console.log('📤 Datos del pedido a enviar:', data);
        
        // Determinar si es creación o actualización
        const pedidoId = document.getElementById('pedido_id');
        const esEdicion = pedidoId && pedidoId.value;
        
        const url = esEdicion ? 
            `/pedidos/api/actualizar/${pedidoId.value}` : 
            '/pedidos/api/crear';
        
        const method = esEdicion ? 'PUT' : 'POST';
        
        console.log(`📤 Enviando ${method} a ${url}`);
        
        const response = await fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });
        
        console.log('📥 Response status:', response.status);
        
        const result = await response.json();
        console.log('📥 Response data:', result);
        
        if (result.success) {
            showNotification(result.message, 'success');
            // Redirigir a la lista después de 1.5 segundos
            setTimeout(() => {
                window.location.href = '/pedidos';
            }, 1500);
        } else {
            showNotification(result.message, 'danger');
        }
        
    } catch (error) {
        console.error('❌ Error en guardarPedido:', error);
        showNotification('Error al guardar pedido', 'danger');
    } finally {
        // Restaurar botón
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;
    }
}

/**
 * @brief Detecta y carga items existentes del formulario de edición
 * @version 1.0
 */
function cargarItemsExistentesFormulario() {
    const formulario = document.getElementById('formPedido');
    const pedidoId = document.getElementById('pedido_id');
    
    // Solo cargar si estamos en el formulario y es edición
    if (!formulario || !pedidoId || !pedidoId.value) {
        return;
    }
    
    console.log('🔄 Detectando edición de pedido, cargando items...');
    
    // Buscar si hay datos de items en elementos hidden o data attributes
    // Este es el enfoque más limpio sin JavaScript embebido
    setTimeout(() => {
        cargarItemsDesdeAPI(pedidoId.value);
    }, 500);
}

/**
 * @brief Carga items del pedido desde la API
 * @param pedidoId ID del pedido
 * @version 1.0
 */
async function cargarItemsDesdeAPI(pedidoId) {
    try {
        const response = await fetch(`/pedidos/api/detalle/${pedidoId}`);
        const data = await response.json();
        
        if (data.success && data.pedido && data.pedido.items) {
            console.log('✅ Items cargados desde API:', data.pedido.items);
            cargarItemsExistentes(data.pedido.items);
        }
    } catch (error) {
        console.error('❌ Error al cargar items desde API:', error);
    }
}

/**
 * @brief Carga items existentes en el formulario de edición
 * @param items Array de items del pedido
 * @version 1.0
 */
function cargarItemsExistentes(items) {
    itemsPedido = [];
    contadorItems = 0;
    
    items.forEach(item => {
        const itemPedido = {
            id: ++contadorItems,
            producto_id: item.producto_id,
            producto_codigo: item.producto_codigo,
            producto_nombre: item.producto_nombre,
            cantidad: item.cantidad,
            precio_unitario_sin_iva: item.precio_unitario_sin_iva,
            iva_porcentaje: item.iva_porcentaje,
            subtotal_sin_iva: item.subtotal_sin_iva,
            total_iva: item.total_iva,
            subtotal_con_iva: item.subtotal_con_iva,
            es_deposito: item.es_deposito || false
        };
        
        itemsPedido.push(itemPedido);
    });
    
    actualizarTablaItems();
    calcularTotalesPedido();
    
    console.log('✅ Items existentes cargados:', itemsPedido);
}

/**
 * @brief Muestra los detalles de un pedido en un modal
 * @param pedidoId ID del pedido a mostrar
 * @version 1.0
 */
async function verDetallePedido(pedidoId) {
    const modal = new bootstrap.Modal(document.getElementById('modalDetallePedido'));
    const contenido = document.getElementById('detallePedidoContent');
    
    // Mostrar modal con loading
    modal.show();
    contenido.innerHTML = `
        <div class="text-center py-4">
            <i class="fas fa-spinner fa-spin fa-2x text-primary"></i>
            <p class="mt-2">Cargando información del pedido...</p>
        </div>
    `;
    
    try {
        const response = await fetch(`/pedidos/api/detalle/${pedidoId}`);
        const data = await response.json();
        
        if (response.ok && data.pedido) {
            mostrarDetallePedido(data.pedido);
        } else {
            throw new Error(data.error || 'Error al cargar pedido');
        }
    } catch (error) {
        console.error('Error:', error);
        contenido.innerHTML = `
            <div class="text-center py-4">
                <i class="fas fa-exclamation-circle fa-2x text-danger"></i>
                <p class="mt-2 text-danger">Error al cargar la información del pedido</p>
                <button class="btn btn-secondary" data-bs-dismiss="modal">Cerrar</button>
            </div>
        `;
    }
}

/**
 * @brief Muestra los detalles del pedido en el modal
 * @param pedido Datos del pedido obtenidos de la API
 * @version 1.0
 */
function mostrarDetallePedido(pedido) {
    const contenido = document.getElementById('detallePedidoContent');
    
    // Determinar clase y icono del estado
    let estadoBadge = '';
    switch(pedido.estado) {
        case 'pendiente':
            estadoBadge = '<span class="badge bg-warning"><i class="fas fa-clock me-1"></i>Pendiente</span>';
            break;
        case 'confirmado':
            estadoBadge = '<span class="badge bg-info"><i class="fas fa-check me-1"></i>Confirmado</span>';
            break;
        case 'entregado':
            estadoBadge = '<span class="badge bg-primary"><i class="fas fa-truck me-1"></i>Entregado</span>';
            break;
        case 'facturado':
            estadoBadge = '<span class="badge bg-success"><i class="fas fa-file-invoice me-1"></i>Facturado</span>';
            break;
    }
    
    contenido.innerHTML = `
        <div class="row">
            <div class="col-md-6">
                <h6 class="text-primary mb-3">
                    <i class="fas fa-info-circle me-2"></i>
                    Información del Pedido
                </h6>
                <table class="table table-sm">
                    <tr>
                        <td class="fw-semibold">Número:</td>
                        <td><span class="badge bg-primary">${pedido.numero_pedido}</span></td>
                    </tr>
                    <tr>
                        <td class="fw-semibold">Cliente:</td>
                        <td>
                            <strong>${pedido.cliente_nombre}</strong>
                            <br><small class="text-muted">${pedido.cliente_codigo}</small>
                        </td>
                    </tr>
                    <tr>
                        <td class="fw-semibold">Fecha:</td>
                        <td>${new Date(pedido.fecha_pedido).toLocaleString('es-ES')}</td>
                    </tr>
                    <tr>
                        <td class="fw-semibold">Estado:</td>
                        <td>${estadoBadge}</td>
                    </tr>
                    <tr>
                        <td class="fw-semibold">Items:</td>
                        <td><span class="badge bg-info">${pedido.items_count} productos</span></td>
                    </tr>
                </table>
            </div>
            <div class="col-md-6">
                <h6 class="text-primary mb-3">
                    <i class="fas fa-calculator me-2"></i>
                    Totales
                </h6>
                <div class="card bg-light">
                    <div class="card-body">
                        <div class="d-flex justify-content-between mb-2">
                            <span>Subtotal (sin IVA):</span>
                            <strong>${pedido.subtotal.toFixed(2)}€</strong>
                        </div>
                        <div class="d-flex justify-content-between mb-2">
                            <span>IVA:</span>
                            <strong>${pedido.total_iva.toFixed(2)}€</strong>
                        </div>
                        <div class="d-flex justify-content-between mb-2">
                            <span>Recargo Equivalencia:</span>
                            <strong>${pedido.total_recargo.toFixed(2)}€</strong>
                        </div>
                        <hr class="my-2">
                        <div class="d-flex justify-content-between">
                            <span class="fw-bold">TOTAL:</span>
                            <strong class="text-success fs-5">${pedido.total.toFixed(2)}€</strong>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        
        ${pedido.items && pedido.items.length > 0 ? `
        <div class="row mt-4">
            <div class="col-12">
                <h6 class="text-primary mb-3">
                    <i class="fas fa-list me-2"></i>
                    Productos del Pedido
                </h6>
                <div class="table-responsive">
                    <table class="table table-sm table-striped">
                        <thead>
                            <tr>
                                <th>Código</th>
                                <th>Producto</th>
                                <th class="text-center">Cantidad</th>
                                <th class="text-end">Precio Unit.</th>
                                <th class="text-end">Subtotal</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${pedido.items.map(item => `
                                <tr>
                                    <td><span class="badge bg-primary">${item.producto_codigo}</span></td>
                                    <td>
                                        <strong>${item.producto_nombre}</strong>
                                        <br><small class="text-muted">IVA: ${item.iva_porcentaje}%</small>
                                    </td>
                                    <td class="text-center">${item.cantidad}</td>
                                    <td class="text-end">${item.precio_unitario_sin_iva.toFixed(2)}€</td>
                                    <td class="text-end">
                                        <strong>${item.subtotal_con_iva.toFixed(2)}€</strong>
                                        <br><small class="text-muted">${item.subtotal_sin_iva.toFixed(2)}€ + ${item.total_iva.toFixed(2)}€</small>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
        ` : ''}
        
        ${(pedido.observaciones || pedido.productos_pendientes) ? `
        <div class="row mt-4">
            <div class="col-12">
                ${pedido.observaciones ? `
                <div class="mb-3">
                    <h6 class="text-primary mb-2">
                        <i class="fas fa-sticky-note me-2"></i>
                        Observaciones
                    </h6>
                    <div class="alert alert-light border">
                        <div class="text-muted">${pedido.observaciones}</div>
                    </div>
                </div>
                ` : ''}
                
                ${pedido.productos_pendientes ? `
                <div class="mb-3">
                    <h6 class="text-warning mb-2">
                        <i class="fas fa-exclamation-triangle me-2"></i>
                        Productos Pendientes
                    </h6>
                    <div class="alert alert-warning border">
                        <div>${pedido.productos_pendientes}</div>
                    </div>
                </div>
                ` : ''}
            </div>
        </div>
        ` : ''}
        
        <div class="row mt-4">
            <div class="col-12 d-flex justify-content-end gap-2">
                <button class="btn btn-secondary" data-bs-dismiss="modal">
                    <i class="fas fa-times me-1"></i>Cerrar
                </button>
                ${pedido.estado === 'pendiente' || pedido.estado === 'confirmado' ? `
                <a href="/pedidos/editar/${pedido.id}" class="btn btn-warning">
                    <i class="fas fa-edit me-1"></i>Editar Pedido
                </a>
                ` : ''}
                <button class="btn btn-outline-primary" onclick="imprimirPedido(${pedido.id})">
                    <i class="fas fa-print me-1"></i>Imprimir
                </button>
                <button class="btn btn-primary" onclick="generarFactura(${pedido.id})">
                    <i class="fas fa-file-invoice me-1"></i>Generar Factura
                </button>
            </div>
        </div>
    `;
}

/**
 * @brief Cambia el estado de un pedido
 * @param pedidoId ID del pedido
 * @param nuevoEstado Nuevo estado del pedido
 * @version 1.0
 */
async function cambiarEstadoPedido(pedidoId, nuevoEstado) {
    try {
        const response = await fetch(`/pedidos/api/cambiar-estado/${pedidoId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ estado: nuevoEstado })
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
        showNotification('Error al cambiar estado del pedido', 'danger');
    }
}

/**
 * @brief Elimina un pedido
 * @param pedidoId ID del pedido a eliminar
 * @param pedidoNumero Número del pedido para confirmación
 * @version 1.0
 */
async function eliminarPedido(pedidoId, pedidoNumero) {
    const confirmacion = confirm(
        `¿Estás seguro de que deseas eliminar el pedido "${pedidoNumero}"?\n\n` +
        `Esta acción no se puede deshacer.`
    );
    
    if (!confirmacion) return;
    
    try {
        const response = await fetch(`/pedidos/api/eliminar/${pedidoId}`, {
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
        showNotification('Error al eliminar pedido', 'danger');
    }
}

/**
 * @brief Función para filtrar pedidos pendientes
 * @version 1.0
 */
function filtrarPendientes() {
    const url = new URL(window.location);
    url.searchParams.set('estado', 'pendiente');
    window.location.href = url.toString();
}

/**
 * @brief Imprime un pedido
 * @param pedidoId ID del pedido
 * @version 1.0
 */
function imprimirPedido(pedidoId) {
    showNotification('Funcionalidad de impresión en desarrollo', 'info');
}

/**
 * @brief Genera factura desde un pedido
 * @param pedidoId ID del pedido
 * @version 1.0
 */
function generarFactura(pedidoId) {
    showNotification('Funcionalidad de facturación en desarrollo', 'info');
}

/**
 * @brief Exporta la lista de pedidos
 * @version 1.0
 */
function exportarPedidos() {
    showNotification('Funcionalidad de exportación en desarrollo', 'info');
}

/**
 * @brief Muestra un error en un campo específico
 * @param campo Nombre del campo
 * @param mensaje Mensaje de error a mostrar
 * @version 1.0
 */
function mostrarErrorCampo(campo, mensaje) {
    const input = document.getElementById(`${campo}_search`) || document.getElementById(campo);
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
    const input = document.getElementById(`${campo}_search`) || document.getElementById(campo);
    const errorDiv = document.getElementById(`error-${campo}`);
    
    if (input) input.classList.remove('is-invalid');
    if (errorDiv) {
        errorDiv.style.display = 'none';
    }
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
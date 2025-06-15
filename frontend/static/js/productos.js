/**
 * @file productos.js
 * @brief JavaScript para la gestión de productos
 * @details Funciones para manejar las operaciones CRUD de productos,
 *          búsquedas, validaciones y control de stock.
 * @author José David Sánchez Fernández
 * @version 1.6
 * @date 2025-06-14
 * @copyright Copyright (c) 2025 Mega Nevada S.L. Todos los derechos reservados.
 */

document.addEventListener('DOMContentLoaded', function() {
    console.log('📦 Módulo de productos cargado correctamente');
    
    // Inicializar funcionalidades
    inicializarProductos();
});

/**
 * @brief Inicializa todas las funcionalidades del módulo de productos
 * @version 1.5
 */
function inicializarProductos() {
    // Detectar si estamos en la página de lista o formulario
    const esFormulario = document.getElementById('formProducto');
    const esLista = document.querySelector('.card-header h5')?.textContent?.includes('Productos');
    
    if (esLista && !esFormulario) {
        // Solo configurar búsqueda automática en la página de LISTA
        configurarBusquedaProductos();
    }
    
    // Inicializar tooltips
    inicializarTooltips();
    
    // Configurar event listeners para botones
    configurarEventListenersProductos();
    
    // Configurar validaciones de formulario si estamos en el formulario
    if (esFormulario) {
        configurarFormularioProducto();
        configurarCalculoRecargoEquivalencia();
    }
    
    // Verificar si hay que mostrar detalles automáticamente
    verificarParametroVerProducto();
}

/**
 * @brief Configura el cálculo automático del recargo de equivalencia
 * @version 1.0
 */
function configurarCalculoRecargoEquivalencia() {
    const ivaSelect = document.getElementById('iva_porcentaje');
    const recargoInput = document.getElementById('recargo_equivalencia');
    
    if (!ivaSelect || !recargoInput) {
        console.log('⚠️ No se encontraron campos de IVA o recargo de equivalencia');
        return;
    }
    
    console.log('✅ Configurando cálculo automático de recargo de equivalencia');
    
    /**
     * @brief Calcula el recargo de equivalencia basado en el IVA seleccionado
     */
    function calcularRecargo() {
        const iva = parseFloat(ivaSelect.value);
        let recargo = 0;
        
        // Tabla de correspondencia IVA - Recargo de Equivalencia
        switch(iva) {
            case 4:
                recargo = 0.5;
                break;
            case 10:
                recargo = 1.4;
                break;
            case 21:
                recargo = 5.2;
                break;
            default:
                recargo = 0;
        }
        
        recargoInput.value = recargo;
        
        console.log(`📊 IVA ${iva}% → Recargo ${recargo}%`);
    }
    
    // Calcular recargo al cambiar el IVA
    ivaSelect.addEventListener('change', calcularRecargo);
    
    // Calcular recargo inicial si hay un valor preseleccionado
    if (ivaSelect.value) {
        calcularRecargo();
    }
}

/**
 * @brief Verifica si hay parámetro 'ver' en URL para mostrar detalles automáticamente
 * @version 1.0
 */
function verificarParametroVerProducto() {
    const urlParams = new URLSearchParams(window.location.search);
    const productoId = urlParams.get('ver');
    
    if (productoId) {
        console.log(`📦 Mostrando detalles automáticos del producto ID: ${productoId}`);
        setTimeout(() => {
            verDetalleProducto(productoId);
        }, 500); // Pequeña espera para que se cargue la página
    }
}

/**
 * @brief Configura todos los event listeners de la página de productos
 * @version 1.0
 */
function configurarEventListenersProductos() {
    // Event listeners para botones de ver detalle
    document.querySelectorAll('.btn-ver-detalle-producto').forEach(function(btn) {
        btn.addEventListener('click', function() {
            const productoId = this.dataset.productoId;
            verDetalleProducto(productoId);
        });
    });
    
    // Event listeners para botones de eliminar
    document.querySelectorAll('.btn-eliminar-producto').forEach(function(btn) {
        btn.addEventListener('click', function() {
            const productoId = this.dataset.productoId;
            const productoNombre = this.dataset.productoNombre;
            eliminarProducto(productoId, productoNombre);
        });
    });
    
    // Event listener para botón de exportar
    const btnExportar = document.querySelector('[onclick="exportarProductos()"]');
    if (btnExportar) {
        btnExportar.removeAttribute('onclick');
        btnExportar.addEventListener('click', exportarProductos);
    }
}

/**
 * @brief Configura la búsqueda en tiempo real de productos (SOLO EN LISTA)
 * @version 1.1
 */
function configurarBusquedaProductos() {
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
    
    // Auto-submit cuando cambia la categoría SOLO EN FILTROS DE LISTA
    const selectCategoria = document.getElementById('categoria');
    const esFormulario = document.getElementById('formProducto');
    
    if (selectCategoria && !esFormulario) {
        // Solo en la página de lista, no en el formulario
        selectCategoria.addEventListener('change', function() {
            this.form.submit();
        });
    }
    
    const checkboxStockBajo = document.getElementById('stock_bajo');
    if (checkboxStockBajo) {
        checkboxStockBajo.addEventListener('change', function() {
            this.form.submit();
        });
    }
}

/**
 * @brief Muestra los detalles de un producto en un modal
 * @param productoId ID del producto a mostrar
 * @version 1.2
 */
async function verDetalleProducto(productoId) {
    const modal = new bootstrap.Modal(document.getElementById('modalDetalleProducto'));
    const contenido = document.getElementById('detalleProductoContent');
    
    // Mostrar modal con loading
    modal.show();
    contenido.innerHTML = `
        <div class="text-center py-4">
            <i class="fas fa-spinner fa-spin fa-2x text-primary"></i>
            <p class="mt-2">Cargando información del producto...</p>
        </div>
    `;
    
    try {
        // Intentar primero con el endpoint de detalle específico
        let response = await fetch(`/productos/api/detalle/${productoId}`);
        let data = await response.json();
        
        if (response.ok && data.producto) {
            const producto = data.producto;
            mostrarDetalleProducto(producto);
        } else {
            // Fallback: buscar en la lista de productos del DOM
            const productoElement = document.querySelector(`[data-producto-id="${productoId}"]`);
            if (productoElement) {
                const card = productoElement.closest('.producto-card');
                const productoData = extraerDatosProductoDelDOM(card, productoId);
                if (productoData) {
                    mostrarDetalleProducto(productoData);
                } else {
                    throw new Error('No se pudieron extraer los datos del producto');
                }
            } else {
                throw new Error('Producto no encontrado');
            }
        }
    } catch (error) {
        console.error('Error:', error);
        contenido.innerHTML = `
            <div class="text-center py-4">
                <i class="fas fa-exclamation-circle fa-2x text-danger"></i>
                <p class="mt-2 text-danger">Error al cargar la información del producto</p>
                <button class="btn btn-secondary" data-bs-dismiss="modal">Cerrar</button>
            </div>
        `;
    }
}

/**
 * @brief Extrae datos del producto desde el DOM de la tarjeta incluyendo nuevos campos
 * @param card Elemento de la tarjeta del producto
 * @param productoId ID del producto
 * @return Object con datos del producto
 * @version 1.1
 */
function extraerDatosProductoDelDOM(card, productoId) {
    if (!card) return null;
    
    // Extraer información de proveedor y marca desde los elementos small
    let marca = '';
    let nombreProveedor = '';
    let codigoNacional = '';
    let numReferencia = '';
    
    const smallElements = card.querySelectorAll('small.text-muted');
    for (let small of smallElements) {
        const texto = small.textContent;
        if (texto.includes('🏷️') || texto.includes('fa-tag')) {
            if (texto.includes('CN:')) {
                codigoNacional = texto.replace(/.*CN:\s*/, '').trim();
            } else if (texto.includes('Ref:')) {
                numReferencia = texto.replace(/.*Ref:\s*/, '').trim();
            } else {
                marca = texto.replace(/.*🏷️\s*/, '').trim();
            }
        } else if (texto.includes('🚛') || texto.includes('fa-truck')) {
            nombreProveedor = texto.replace(/.*🚛\s*/, '').trim();
        }
    }
    
    return {
        id: productoId,
        codigo: card.querySelector('.badge.bg-primary')?.textContent || '',
        nombre: card.querySelector('.card-title')?.textContent || '',
        descripcion: card.querySelector('.card-text.text-muted')?.textContent || '',
        precio: parseFloat(card.querySelector('.text-success')?.textContent?.replace('€', '')) || 0,
        categoria: card.querySelector('.badge.bg-secondary')?.textContent || '',
        stock: parseInt(card.querySelector('.fw-bold')?.textContent) || 0,
        stock_minimo: parseInt(card.querySelectorAll('.fw-bold')[1]?.textContent) || 0,
        lote: extraerLoteDelDOM(card),
        fecha_caducidad: extraerFechaCaducidadDelDOM(card),
        imagen_url: card.querySelector('img')?.src || null,
        iva_porcentaje: extraerIVADelDOM(card),
        // Nuevos campos
        codigo_nacional: codigoNacional,
        num_referencia: numReferencia,
        nombre_proveedor: nombreProveedor,
        marca: marca
    };
}

/**
 * @brief Extrae el IVA desde el DOM de la tarjeta
 * @param card Elemento de la tarjeta del producto
 * @return Number con el porcentaje de IVA o 21 por defecto
 * @version 1.0
 */
function extraerIVADelDOM(card) {
    if (!card) return 21;
    
    const ivaBadge = card.querySelector('.badge.bg-info');
    if (ivaBadge && ivaBadge.textContent.includes('IVA')) {
        const ivaText = ivaBadge.textContent.replace('IVA', '').replace('%', '').trim();
        return parseFloat(ivaText) || 21;
    }
    return 21;
}

/**
 * @brief Extrae el lote desde el DOM de la tarjeta
 * @param card Elemento de la tarjeta del producto
 * @return String con el lote o cadena vacía
 * @version 1.0
 */
function extraerLoteDelDOM(card) {
    if (!card) return '';
    
    const smallElements = card.querySelectorAll('small.text-muted');
    for (let small of smallElements) {
        const texto = small.textContent;
        if (texto.includes('Lote:')) {
            return texto.replace('Lote:', '').trim();
        }
    }
    return '';
}

/**
 * @brief Extrae la fecha de caducidad desde el DOM de la tarjeta
 * @param card Elemento de la tarjeta del producto
 * @return String con la fecha de caducidad formateada o null
 * @version 1.0
 */
function extraerFechaCaducidadDelDOM(card) {
    if (!card) return null;
    
    // Buscar elementos small que contengan "Caduca:"
    const smallElements = card.querySelectorAll('small.text-muted');
    for (let small of smallElements) {
        const texto = small.textContent;
        if (texto.includes('Caduca:')) {
            return texto.replace('Caduca:', '').trim();
        }
    }
    return null;
}

/**
 * @brief Muestra los detalles del producto en el modal incluyendo nuevos campos
 * @param producto Datos del producto obtenidos de la API o DOM
 * @version 1.2
 */
function mostrarDetalleProducto(producto) {
    const contenido = document.getElementById('detalleProductoContent');
    
    // Calcular valor del stock
    const precio = parseFloat(producto.precio) || 0;
    const stock = parseInt(producto.stock) || 0;
    const stockMinimo = parseInt(producto.stock_minimo) || 0;
    const valorStock = (precio * stock).toFixed(2);
    const ivaPorc = parseFloat(producto.iva_porcentaje) || 21;
    
    // Calcular recargo de equivalencia
    let recargoEquiv = 0;
    if (ivaPorc === 4) recargoEquiv = 0.5;
    else if (ivaPorc === 10) recargoEquiv = 1.4;
    else if (ivaPorc === 21) recargoEquiv = 5.2;
    
    // Determinar estado del stock
    let estadoStock = 'text-success';
    let textoStock = 'Stock suficiente';
    let badgeClass = 'bg-success';
    
    if (stock === 0) {
        estadoStock = 'text-danger';
        textoStock = 'Agotado';
        badgeClass = 'bg-danger';
    } else if (stock <= stockMinimo) {
        estadoStock = 'text-danger';
        textoStock = 'Stock bajo';
        badgeClass = 'bg-danger';
    }
    
    contenido.innerHTML = `
        <div class="row">
            <div class="col-md-4">
                <div class="text-center mb-3">
                    ${producto.imagen_url ? 
                      `<img src="${producto.imagen_url}" 
                           alt="${producto.nombre}" 
                           class="img-fluid rounded shadow-sm"
                           style="max-height: 200px; object-fit: cover;">` :
                      `<div class="bg-light rounded d-flex align-items-center justify-content-center shadow-sm" 
                           style="height: 200px;">
                         <i class="fas fa-pills fa-3x text-muted"></i>
                       </div>`
                    }
                </div>
                <div class="text-center">
                    <span class="badge bg-primary fs-6">${producto.codigo}</span>
                    ${producto.categoria ? 
                      `<br><span class="badge bg-secondary mt-1">${producto.categoria}</span>` : 
                      ''
                    }
                    <br><span class="badge bg-info mt-1">IVA ${ivaPorc}%</span>
                </div>
            </div>
            <div class="col-md-8">
                <h4 class="text-primary mb-3">${producto.nombre}</h4>
                
                ${(producto.marca || producto.nombre_proveedor) ? 
                  `<div class="mb-3">
                     <h6 class="text-secondary">Información del Proveedor</h6>
                     ${producto.marca ? 
                       `<p class="mb-1"><i class="fas fa-tag me-2 text-muted"></i><strong>Marca:</strong> ${producto.marca}</p>` : 
                       ''
                     }
                     ${producto.nombre_proveedor ? 
                       `<p class="mb-1"><i class="fas fa-truck me-2 text-muted"></i><strong>Proveedor:</strong> ${producto.nombre_proveedor}</p>` : 
                       ''
                     }
                     ${producto.codigo_nacional ? 
                       `<p class="mb-1"><i class="fas fa-barcode me-2 text-muted"></i><strong>Código Nacional:</strong> ${producto.codigo_nacional}</p>` : 
                       ''
                     }
                     ${producto.num_referencia ? 
                       `<p class="mb-1"><i class="fas fa-hashtag me-2 text-muted"></i><strong>Referencia:</strong> ${producto.num_referencia}</p>` : 
                       ''
                     }
                   </div>` : 
                  ''
                }
                
                ${producto.descripcion ? 
                  `<div class="mb-3">
                     <h6 class="text-secondary">Descripción</h6>
                     <p class="text-muted">${producto.descripcion}</p>
                   </div>` : 
                  ''
                }
                
                <div class="row mb-3">
                    <div class="col-6">
                        <h6 class="text-secondary">Precio (sin IVA)</h6>
                        <h4 class="text-success">${precio.toFixed(2)}€</h4>
                        <small class="text-muted">IVA ${ivaPorc}% | Rec. Equiv. ${recargoEquiv}%</small>
                    </div>
                    <div class="col-6">
                        <h6 class="text-secondary">Estado</h6>
                        <span class="badge ${badgeClass} fs-6">
                            ${textoStock}
                        </span>
                    </div>
                </div>
                
                <div class="row mb-3">
                    <div class="col-md-3 col-6">
                        <div class="card bg-light">
                            <div class="card-body text-center p-2">
                                <h5 class="${estadoStock} mb-1">${stock}</h5>
                                <small class="text-muted">Stock Actual</small>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-3 col-6">
                        <div class="card bg-light">
                            <div class="card-body text-center p-2">
                                <h5 class="text-info mb-1">${stockMinimo}</h5>
                                <small class="text-muted">Stock Mínimo</small>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-6">
                        <div class="card bg-light">
                            <div class="card-body text-center p-2">
                                <h5 class="text-primary mb-1">${valorStock}€</h5>
                                <small class="text-muted">Valor en Stock</small>
                            </div>
                        </div>
                    </div>
                </div>
                
                ${(producto.lote || producto.fecha_caducidad) ? 
                  `<div class="mb-3">
                     <h6 class="text-secondary">Información del Lote</h6>
                     ${producto.lote ? 
                       `<p class="mb-1"><i class="fas fa-tag me-2 text-muted"></i><strong>Lote:</strong> ${producto.lote}</p>` : 
                       ''
                     }
                     ${producto.fecha_caducidad ? 
                       `<p class="mb-1"><i class="fas fa-calendar me-2 text-muted"></i><strong>Fecha de Caducidad:</strong> ${new Date(producto.fecha_caducidad).toLocaleDateString('es-ES')}</p>` : 
                       ''
                     }
                   </div>` : 
                  ''
                }
            </div>
        </div>
        
        <div class="row mt-4">
            <div class="col-12 d-flex justify-content-end gap-2">
                <button class="btn btn-secondary" data-bs-dismiss="modal">
                    <i class="fas fa-times me-1"></i>Cerrar
                </button>
                <a href="/productos/editar/${producto.id}" class="btn btn-warning">
                    <i class="fas fa-edit me-1"></i>Editar Producto
                </a>
                <button class="btn btn-primary" onclick="agregarAPedido(${producto.id})">
                    <i class="fas fa-plus me-1"></i>Agregar a Pedido
                </button>
            </div>
        </div>
    `;
}

/**
 * @brief Elimina (desactiva) un producto
 * @param productoId ID del producto a eliminar
 * @param nombreProducto Nombre del producto para confirmación
 * @version 1.0
 */
async function eliminarProducto(productoId, nombreProducto) {
    const confirmacion = confirm(
        `¿Estás seguro de que deseas desactivar el producto "${nombreProducto}"?\n\n` +
        `El producto no será eliminado permanentemente, solo se desactivará.`
    );
    
    if (!confirmacion) return;
    
    try {
        const response = await fetch(`/productos/api/eliminar/${productoId}`, {
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
        showNotification('Error al eliminar producto', 'danger');
    }
}

/**
 * @brief Agrega un producto a un pedido (funcionalidad futura)
 * @param productoId ID del producto
 * @version 1.0
 */
function agregarAPedido(productoId) {
    showNotification('Funcionalidad de pedidos en desarrollo', 'info');
    // Cerrar modal
    const modal = bootstrap.Modal.getInstance(document.getElementById('modalDetalleProducto'));
    if (modal) modal.hide();
}

/**
 * @brief Configura las validaciones del formulario de producto
 * @version 1.3
 */
function configurarFormularioProducto() {
    const form = document.getElementById('formProducto');
    
    if (!form) {
        console.log('❌ No se encontró el formulario formProducto');
        return;
    }
    
    // Verificar si ya está configurado para evitar dobles event listeners
    if (form.dataset.configured === 'true') {
        console.log('⚠️ Formulario ya configurado, saltando...');
        return;
    }
    
    console.log('✅ Configurando formulario de producto');
    
    // Marcar como configurado
    form.dataset.configured = 'true';
    
    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        e.stopPropagation();
        console.log('📝 Formulario de producto enviado');
        
        // Verificar si ya se está procesando
        const submitBtn = form.querySelector('button[type="submit"]');
        if (submitBtn.disabled) {
            console.log('⚠️ Formulario ya en proceso, ignorando...');
            return;
        }
        
        if (validarFormularioProducto()) {
            await guardarProducto();
        } else {
            console.log('❌ Validación del formulario falló');
        }
    });
    
    // Validación en tiempo real para campos básicos
    const campos = ['codigo', 'nombre', 'precio', 'stock', 'stock_minimo', 'iva_porcentaje'];
    campos.forEach(campo => {
        const input = document.getElementById(campo);
        if (input) {
            input.addEventListener('blur', () => validarCampoProducto(campo));
            input.addEventListener('input', () => limpiarErrorProducto(campo));
        }
    });
    
    // Validación en tiempo real para nuevos campos
    const camposNuevos = ['codigo_nacional', 'num_referencia', 'nombre_proveedor', 'marca'];
    camposNuevos.forEach(campo => {
        const input = document.getElementById(campo);
        if (input) {
            input.addEventListener('blur', () => validarCampoNuevoProducto(campo));
            input.addEventListener('input', () => limpiarErrorProducto(campo));
        }
    });
}

/**
 * @brief Valida todo el formulario de producto
 * @return bool True si es válido, false en caso contrario
 * @version 1.2
 */
function validarFormularioProducto() {
    let esValido = true;
    
    // Validar campos requeridos
    if (!validarCampoProducto('codigo')) esValido = false;
    if (!validarCampoProducto('nombre')) esValido = false;
    if (!validarCampoProducto('precio')) esValido = false;
    if (!validarCampoProducto('iva_porcentaje')) esValido = false;
    
    // Validar campos numéricos
    if (!validarCampoProducto('stock')) esValido = false;
    if (!validarCampoProducto('stock_minimo')) esValido = false;
    
    // Validar nuevos campos opcionales
    const codigoNacional = document.getElementById('codigo_nacional')?.value;
    if (codigoNacional && !validarCampoNuevoProducto('codigo_nacional')) esValido = false;
    
    const numReferencia = document.getElementById('num_referencia')?.value;
    if (numReferencia && !validarCampoNuevoProducto('num_referencia')) esValido = false;
    
    const nombreProveedor = document.getElementById('nombre_proveedor')?.value;
    if (nombreProveedor && !validarCampoNuevoProducto('nombre_proveedor')) esValido = false;
    
    const marca = document.getElementById('marca')?.value;
    if (marca && !validarCampoNuevoProducto('marca')) esValido = false;
    
    return esValido;
}

/**
 * @brief Valida un campo específico del formulario
 * @param campo Nombre del campo a validar
 * @return bool True si es válido, false en caso contrario
 * @version 1.1
 */
function validarCampoProducto(campo) {
    const input = document.getElementById(campo);
    if (!input) return true;
    
    const valor = input.value.trim();
    
    switch(campo) {
        case 'codigo':
            if (!valor) {
                mostrarErrorCampoProducto(campo, 'El código es obligatorio');
                return false;
            }
            if (valor.length < 2) {
                mostrarErrorCampoProducto(campo, 'El código debe tener al menos 2 caracteres');
                return false;
            }
            break;
            
        case 'nombre':
            if (!valor) {
                mostrarErrorCampoProducto(campo, 'El nombre es obligatorio');
                return false;
            }
            if (valor.length < 3) {
                mostrarErrorCampoProducto(campo, 'El nombre debe tener al menos 3 caracteres');
                return false;
            }
            break;
            
        case 'precio':
            if (!valor) {
                mostrarErrorCampoProducto(campo, 'El precio es obligatorio');
                return false;
            }
            const precio = parseFloat(valor);
            if (isNaN(precio) || precio < 0) {
                mostrarErrorCampoProducto(campo, 'El precio debe ser un número mayor o igual a 0');
                return false;
            }
            break;
            
        case 'iva_porcentaje':
            if (!valor) {
                mostrarErrorCampoProducto(campo, 'El IVA es obligatorio');
                return false;
            }
            const iva = parseFloat(valor);
            if (![4, 10, 21].includes(iva)) {
                mostrarErrorCampoProducto(campo, 'El IVA debe ser 4%, 10% o 21%');
                return false;
            }
            break;
            
        case 'stock':
        case 'stock_minimo':
            if (valor !== '' && valor !== null) {
                const numero = parseInt(valor);
                if (isNaN(numero) || numero < 0) {
                    mostrarErrorCampoProducto(campo, 'Debe ser un número entero mayor o igual a 0');
                    return false;
                }
            }
            break;
    }
    
    limpiarErrorProducto(campo);
    return true;
}

/**
 * @brief Valida los nuevos campos del formulario de producto
 * @param campo Nombre del campo a validar
 * @return bool True si es válido, false en caso contrario
 * @version 1.0
 */
function validarCampoNuevoProducto(campo) {
    const input = document.getElementById(campo);
    if (!input) return true;
    
    const valor = input.value.trim();
    
    switch(campo) {
        case 'codigo_nacional':
            if (valor && (valor.length < 3 || valor.length > 20)) {
                mostrarErrorCampoProducto(campo, 'El código nacional debe tener entre 3 y 20 caracteres');
                return false;
            }
            break;
            
        case 'num_referencia':
            if (valor && valor.length < 2) {
                mostrarErrorCampoProducto(campo, 'La referencia debe tener al menos 2 caracteres');
                return false;
            }
            break;
            
        case 'nombre_proveedor':
            if (valor && valor.length < 2) {
                mostrarErrorCampoProducto(campo, 'El nombre del proveedor debe tener al menos 2 caracteres');
                return false;
            }
            break;
            
        case 'marca':
            if (valor && valor.length < 2) {
                mostrarErrorCampoProducto(campo, 'La marca debe tener al menos 2 caracteres');
                return false;
            }
            break;
    }
    
    limpiarErrorProducto(campo);
    return true;
}

/**
 * @brief Muestra un error en un campo específico
 * @param campo Nombre del campo
 * @param mensaje Mensaje de error a mostrar
 * @version 1.0
 */
function mostrarErrorCampoProducto(campo, mensaje) {
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
function limpiarErrorProducto(campo) {
    const input = document.getElementById(campo);
    const errorDiv = document.getElementById(`error-${campo}`);
    
    if (input) input.classList.remove('is-invalid');
    if (errorDiv) {
        errorDiv.style.display = 'none';
    }
}

/**
 * @brief Guarda los datos del producto (crear o actualizar)
 * @version 1.2
 */
async function guardarProducto() {
    const form = document.getElementById('formProducto');
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
        
        // Validar y convertir IVA
        const ivaSelect = form.querySelector('#iva_porcentaje');
        if (ivaSelect && ivaSelect.value) {
            data.iva_porcentaje = parseFloat(ivaSelect.value);
        }
        
        // Validar y convertir recargo de equivalencia
        const recargoInput = form.querySelector('#recargo_equivalencia');
        if (recargoInput && recargoInput.value) {
            data.recargo_equivalencia = parseFloat(recargoInput.value);
        }
        
        console.log('📤 Datos de producto a enviar:', data);
        
        // Determinar si es creación o actualización
        const productoId = document.getElementById('producto_id');
        const esEdicion = productoId && productoId.value;
        
        const url = esEdicion ? 
            `/productos/api/actualizar/${productoId.value}` : 
            '/productos/api/crear';
        
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
                window.location.href = '/productos';
            }, 1500);
        } else {
            showNotification(result.message, 'danger');
        }
        
    } catch (error) {
        console.error('❌ Error en guardarProducto:', error);
        showNotification('Error al guardar producto', 'danger');
    } finally {
        // Restaurar botón
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;
    }
}

/**
 * @brief Muestra productos con stock bajo
 * @version 1.0
 */
function verStockBajo() {
    const url = new URL(window.location);
    url.searchParams.set('stock_bajo', 'true');
    window.location.href = url.toString();
}

/**
 * @brief Exporta la lista de productos
 * @version 1.0
 */
function exportarProductos() {
    showNotification('Funcionalidad de exportación en desarrollo', 'info');
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
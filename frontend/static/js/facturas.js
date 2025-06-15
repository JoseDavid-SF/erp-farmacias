/**
 * @file facturas.js
 * @brief JavaScript específico para la gestión de facturas
 * @details Funciones para ver, imprimir y gestionar facturas del ERP
 * @author José David Sánchez Fernández
 * @version 1.1
 * @date 2025-06-15
 * @copyright Copyright (c) 2025 Mega Nevada S.L. Todos los derechos reservados.
 */

document.addEventListener('DOMContentLoaded', function() {
    console.log('📄 Módulo de facturas cargado');
    configurarBusquedaFacturas();
    configurarTooltipsFacturas();
    configurarEventosFacturas();
    configurarAutoImpresion();
});

/**
 * @brief Configurar auto-impresión si viene con parámetro print=true
 * @version 1.0
 */
function configurarAutoImpresion() {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('print') === 'true') {
        setTimeout(() => {
            window.print();
        }, 500);
    }
}

/**
 * @brief Configurar eventos de los botones de facturas
 * @version 1.0
 */
function configurarEventosFacturas() {
    // Configurar eventos para botones con data-action
    document.addEventListener('click', function(e) {
        const target = e.target.closest('[data-action]');
        if (!target) return;
        
        const facturaId = target.getAttribute('data-factura-id');
        const action = target.getAttribute('data-action');
        
        if (!facturaId) return;
        
        switch (action) {
            case 'ver':
                verFactura(facturaId);
                break;
            case 'imprimir':
                imprimirFactura(facturaId);
                break;
            case 'marcar-enviada':
                marcarComoEnviada(facturaId);
                break;
        }
    });
}

/**
 * @brief Ver detalles de una factura
 * @param facturaId ID de la factura a ver
 * @version 1.0
 */
function verFactura(facturaId) {
    console.log(`🔍 Viendo factura ID: ${facturaId}`);
    window.location.href = `/facturas/ver/${facturaId}`;
}

/**
 * @brief Imprimir una factura (vista actual)
 * @param facturaId ID de la factura a imprimir
 * @version 1.0
 */
function imprimirFactura(facturaId) {
    console.log(`🖨️ Imprimiendo factura ID: ${facturaId}`);
    
    // Si estamos en la vista de detalle, imprimir directamente
    if (window.location.href.includes(`/facturas/ver/${facturaId}`)) {
        window.print();
    } else {
        // Si no, ir a la vista de detalle y luego imprimir
        window.location.href = `/facturas/ver/${facturaId}?print=true`;
    }
}

/**
 * @brief Generar factura desde un pedido
 * @param pedidoId ID del pedido
 * @version 1.0
 */
async function generarFacturaDesdePedido(pedidoId) {
    try {
        console.log(`📝 Generando factura desde pedido ID: ${pedidoId}`);
        
        const response = await fetch(`/facturas/api/generar-desde-pedido/${pedidoId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        const data = await response.json();
        
        if (data.success) {
            showNotification(`Factura ${data.factura.numero_factura} generada correctamente`, 'success');
            
            // Preguntar si quiere ver la factura generada
            if (confirm('¿Desea ver la factura generada?')) {
                window.location.href = `/facturas/ver/${data.factura.id}`;
            } else {
                // Recargar la página actual
                location.reload();
            }
        } else {
            showNotification(data.message, 'danger');
        }
        
    } catch (error) {
        console.error('Error al generar factura:', error);
        showNotification('Error al generar la factura', 'danger');
    }
}

/**
 * @brief Marcar una factura como enviada por email
 * @param facturaId ID de la factura
 * @version 1.0
 */
async function marcarComoEnviada(facturaId) {
    try {
        if (!confirm('¿Está seguro de marcar esta factura como enviada por email?')) {
            return;
        }
        
        console.log(`📧 Marcando factura ${facturaId} como enviada`);
        
        const response = await fetch(`/facturas/api/marcar-enviada/${facturaId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        const data = await response.json();
        
        if (data.success) {
            showNotification('Factura marcada como enviada', 'success');
            location.reload(); // Recargar para actualizar el estado
        } else {
            showNotification(data.message, 'danger');
        }
        
    } catch (error) {
        console.error('Error al marcar factura como enviada:', error);
        showNotification('Error al actualizar el estado de la factura', 'danger');
    }
}

/**
 * @brief Buscar facturas en tiempo real
 * @param termino Término de búsqueda
 * @version 1.0
 */
function buscarFacturas(termino) {
    console.log(`🔍 Buscando facturas: ${termino}`);
    
    // Si hay un timeout previo, cancelarlo
    if (window.busquedaFacturasTimeout) {
        clearTimeout(window.busquedaFacturasTimeout);
    }
    
    // Configurar nuevo timeout
    window.busquedaFacturasTimeout = setTimeout(() => {
        const url = new URL(window.location);
        
        if (termino.trim()) {
            url.searchParams.set('search', termino);
        } else {
            url.searchParams.delete('search');
        }
        
        url.searchParams.delete('page'); // Resetear paginación
        window.location.href = url.toString();
    }, 500);
}

/**
 * @brief Configurar búsqueda en tiempo real si existe el campo
 * @version 1.0
 */
function configurarBusquedaFacturas() {
    const campoSearch = document.querySelector('input[name="search"]');
    if (campoSearch) {
        campoSearch.addEventListener('input', function() {
            buscarFacturas(this.value);
        });
    }
}

/**
 * @brief Obtener estadísticas de facturas para el home
 * @return Promise con las estadísticas
 * @version 1.0
 */
async function obtenerEstadisticasFacturas() {
    try {
        const response = await fetch('/facturas/api/estadisticas');
        const data = await response.json();
        
        if (data.error) {
            console.warn('Error en estadísticas de facturas:', data.error);
            return {
                facturas_mes: 0,
                total_facturas: 0,
                facturas_enviadas: 0,
                total_facturado_mes: 0
            };
        }
        
        return data;
        
    } catch (error) {
        console.error('Error al obtener estadísticas de facturas:', error);
        return {
            facturas_mes: 0,
            total_facturas: 0,
            facturas_enviadas: 0,
            total_facturado_mes: 0
        };
    }
}

/**
 * @brief Exportar facturas a CSV (funcionalidad futura)
 * @version 1.0
 */
function exportarFacturasCSV() {
    showNotification('Funcionalidad de exportación próximamente disponible', 'info');
}

/**
 * @brief Configurar tooltips específicos de facturas
 * @version 1.0
 */
function configurarTooltipsFacturas() {
    // Configurar tooltips para botones de acción
    const tooltips = [
        { selector: '[title="Ver detalles"]', content: 'Ver detalles completos de la factura' },
        { selector: '[title="Imprimir"]', content: 'Imprimir factura en formato optimizado' },
        { selector: '[title="Marcar como enviada"]', content: 'Marcar como enviada por email' }
    ];
    
    tooltips.forEach(tooltip => {
        const elementos = document.querySelectorAll(tooltip.selector);
        elementos.forEach(elemento => {
            new bootstrap.Tooltip(elemento);
        });
    });
}

// Hacer funciones disponibles globalmente
window.verFactura = verFactura;
window.imprimirFactura = imprimirFactura;
window.generarFacturaDesdePedido = generarFacturaDesdePedido;
window.marcarComoEnviada = marcarComoEnviada;
window.buscarFacturas = buscarFacturas;
window.obtenerEstadisticasFacturas = obtenerEstadisticasFacturas;
window.exportarFacturasCSV = exportarFacturasCSV;
#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
@file facturas.py
@brief Rutas para la gestión de facturas del ERP
@details Este módulo contiene todas las rutas relacionadas con la gestión
         de facturas: crear, listar, visualizar e imprimir.
@author José David Sánchez Fernández
@version 1.2
@date 2025-06-15
@copyright Copyright (c) 2025 Mega Nevada S.L. Todos los derechos reservados.
"""

from flask import Blueprint, render_template, request, jsonify, redirect, url_for, flash, make_response
from models.models import db, Factura, Pedido, Cliente, Producto, ItemPedido
from datetime import datetime, timedelta
from decimal import Decimal
import re

# Crear blueprint para facturas
facturas_bp = Blueprint('facturas', __name__, url_prefix='/facturas')

@facturas_bp.route('/')
def lista_facturas():
    """
    @brief Lista todas las facturas del sistema
    @details Muestra una tabla paginada con todas las facturas generadas,
             con opción de búsqueda y filtros.
    @return Template HTML con la lista de facturas
    @version 1.0
    """
    try:
        page = request.args.get('page', 1, type=int)
        search = request.args.get('search', '', type=str)
        
        query = Factura.query.join(Pedido).join(Cliente)
        
        # Aplicar filtro de búsqueda si existe
        if search:
            search_filter = f"%{search}%"
            query = query.filter(
                (Factura.numero_factura.ilike(search_filter)) |
                (Cliente.nombre.ilike(search_filter)) |
                (Cliente.codigo.ilike(search_filter)) |
                (Pedido.numero_pedido.ilike(search_filter))
            )
        
        # Paginación - ordenar por fecha descendente
        facturas = query.order_by(Factura.fecha_factura.desc()).paginate(
            page=page, per_page=15, error_out=False
        )
        
        return render_template('facturas/lista.html', 
                             facturas=facturas, 
                             search=search)
                             
    except Exception as e:
        flash(f'Error al cargar facturas: {str(e)}', 'danger')
        return redirect(url_for('index'))

@facturas_bp.route('/ver/<int:id>')
def ver_factura(id):
    """
    @brief Vista detallada de una factura para visualización/impresión
    @param id ID de la factura
    @return Template HTML con los detalles de la factura
    @version 1.1
    """
    try:
        print(f"🔍 Intentando cargar factura con ID: {id}")
        
        # Verificar que la factura existe
        factura = Factura.query.get(id)
        if not factura:
            print(f"❌ Factura con ID {id} no encontrada")
            flash(f'Factura con ID {id} no encontrada', 'danger')
            return redirect(url_for('facturas.lista_facturas'))
        
        print(f"✅ Factura encontrada: {factura.numero_factura}")
        
        # Verificar que tiene pedido asociado
        if not factura.pedido:
            print(f"❌ Factura {factura.numero_factura} no tiene pedido asociado")
            flash(f'Factura {factura.numero_factura} no tiene pedido asociado', 'danger')
            return redirect(url_for('facturas.lista_facturas'))
        
        print(f"✅ Pedido asociado: {factura.pedido.numero_pedido}")
        
        # Verificar que el pedido tiene cliente
        if not factura.pedido.cliente:
            print(f"❌ El pedido {factura.pedido.numero_pedido} no tiene cliente asociado")
            flash(f'El pedido {factura.pedido.numero_pedido} no tiene cliente asociado', 'danger')
            return redirect(url_for('facturas.lista_facturas'))
        
        print(f"✅ Cliente asociado: {factura.pedido.cliente.nombre}")
        
        # Verificar que el pedido tiene items
        if not factura.pedido.items or len(factura.pedido.items) == 0:
            print(f"❌ El pedido {factura.pedido.numero_pedido} no tiene items")
            flash(f'El pedido {factura.pedido.numero_pedido} no tiene productos', 'danger')
            return redirect(url_for('facturas.lista_facturas'))
        
        print(f"✅ Items del pedido: {len(factura.pedido.items)}")
        
        # Verificar que los items tienen productos
        for i, item in enumerate(factura.pedido.items):
            if not item.producto:
                print(f"❌ Item {i+1} del pedido no tiene producto asociado")
                flash(f'Hay productos faltantes en el pedido {factura.pedido.numero_pedido}', 'danger')
                return redirect(url_for('facturas.lista_facturas'))
        
        print(f"✅ Todos los datos verificados, renderizando template")
        
        return render_template('facturas/detalle.html', factura=factura)
        
    except Exception as e:
        print(f"❌ Error en ver_factura: {str(e)}")
        import traceback
        traceback.print_exc()
        flash(f'Error al cargar factura: {str(e)}', 'danger')
        return redirect(url_for('facturas.lista_facturas'))

@facturas_bp.route('/pdf/<int:id>')
def generar_pdf_factura(id):
    """
    @brief Redirige a la vista HTML de la factura para impresión
    @param id ID de la factura
    @return Redirección a vista HTML con parámetro de impresión
    @version 2.0 - CORREGIDO: Usar el mismo template HTML que se ve bien
    """
    try:
        print(f"🧾 Redirigiendo a vista HTML para factura ID: {id}")
        
        # Verificar que la factura existe
        factura = Factura.query.get(id)
        if not factura:
            print(f"❌ Factura con ID {id} no encontrada")
            return "Factura no encontrada", 404
        
        # Redirigir a la vista HTML que se ve perfecta
        return redirect(url_for('facturas.ver_factura', id=id) + '?print=1')
        
    except Exception as e:
        print(f"❌ Error al acceder a factura: {str(e)}")
        return f"Error al acceder a factura: {str(e)}", 500

@facturas_bp.route('/api/generar-desde-pedido/<int:pedido_id>', methods=['POST'])
def api_generar_factura_desde_pedido(pedido_id):
    """
    @brief API para generar una factura automáticamente desde un pedido
    @param pedido_id ID del pedido desde el cual generar la factura
    @return JSON con resultado de la operación
    @version 1.0
    """
    try:
        pedido = Pedido.query.get_or_404(pedido_id)
        
        # Verificar que el pedido no tenga ya una factura
        if pedido.factura:
            return jsonify({
                'success': False,
                'message': 'Este pedido ya tiene una factura generada'
            }), 400
        
        # Verificar que el pedido tenga items
        if not pedido.items or len(pedido.items) == 0:
            return jsonify({
                'success': False,
                'message': 'El pedido no tiene productos para facturar'
            }), 400
        
        # Generar número de factura único
        numero_factura = generar_numero_factura()
        
        # Crear nueva factura
        factura = Factura(
            numero_factura=numero_factura,
            pedido_id=pedido.id,
            fecha_factura=datetime.utcnow(),
            total=pedido.total,
            enviada_por_email=False
        )
        
        db.session.add(factura)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Factura generada correctamente',
            'factura': {
                'id': factura.id,
                'numero_factura': factura.numero_factura,
                'total': float(factura.total),
                'fecha_factura': factura.fecha_factura.isoformat()
            }
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'message': f'Error al generar factura: {str(e)}'
        }), 500

@facturas_bp.route('/api/marcar-enviada/<int:id>', methods=['PUT'])
def api_marcar_enviada(id):
    """
    @brief API para marcar una factura como enviada por email
    @param id ID de la factura
    @return JSON con resultado de la operación
    @version 1.0
    """
    try:
        factura = Factura.query.get_or_404(id)
        factura.enviada_por_email = True
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Factura marcada como enviada'
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'message': f'Error al actualizar factura: {str(e)}'
        }), 500

@facturas_bp.route('/api/estadisticas')
def api_estadisticas_facturas():
    """
    @brief API para obtener estadísticas de facturas
    @details Proporciona contadores y métricas para el home
    @return JSON con estadísticas de facturas
    @version 1.0
    """
    try:
        # Obtener fecha actual y del mes
        hoy = datetime.utcnow()
        inicio_mes = hoy.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        
        # Contar facturas del mes actual
        facturas_mes = Factura.query.filter(
            Factura.fecha_factura >= inicio_mes
        ).count()
        
        # Contar facturas totales
        total_facturas = Factura.query.count()
        
        # Contar facturas enviadas por email
        facturas_enviadas = Factura.query.filter_by(enviada_por_email=True).count()
        
        # Calcular total facturado del mes
        facturas_mes_data = Factura.query.filter(
            Factura.fecha_factura >= inicio_mes
        ).all()
        
        total_facturado_mes = sum(factura.total for factura in facturas_mes_data) if facturas_mes_data else Decimal('0')
        
        return jsonify({
            'facturas_mes': facturas_mes,
            'total_facturas': total_facturas,
            'facturas_enviadas': facturas_enviadas,
            'total_facturado_mes': float(total_facturado_mes)
        })
        
    except Exception as e:
        return jsonify({
            'error': f'Error al obtener estadísticas: {str(e)}'
        }), 500

def generar_numero_factura():
    """
    @brief Genera un número de factura único siguiendo el formato VF/XXX/YY
    @details Utiliza el formato: VF/[número secuencial]/[año de 2 dígitos]
    @return String con el número de factura generado
    @version 1.0
    """
    try:
        # Obtener el año actual en formato de 2 dígitos
        anio_actual = datetime.utcnow().strftime('%y')
        
        # Buscar la última factura del año actual
        patron_anio = f'%/{anio_actual}'
        ultima_factura = Factura.query.filter(
            Factura.numero_factura.like(patron_anio)
        ).order_by(Factura.numero_factura.desc()).first()
        
        if ultima_factura:
            # Extraer el número secuencial de la última factura
            partes = ultima_factura.numero_factura.split('/')
            if len(partes) == 3:
                try:
                    ultimo_numero = int(partes[1])
                    siguiente_numero = ultimo_numero + 1
                except ValueError:
                    siguiente_numero = 1
            else:
                siguiente_numero = 1
        else:
            siguiente_numero = 1
        
        # Generar el nuevo número con formato VF/XXX/YY
        numero_factura = f"VF/{siguiente_numero:03d}/{anio_actual}"
        
        # Verificar que no exista (por seguridad)
        while Factura.query.filter_by(numero_factura=numero_factura).first():
            siguiente_numero += 1
            numero_factura = f"VF/{siguiente_numero:03d}/{anio_actual}"
        
        return numero_factura
        
    except Exception as e:
        # En caso de error, usar timestamp como fallback
        timestamp = datetime.utcnow().strftime('%y%m%d%H%M')
        return f"VF/{timestamp}/ER"
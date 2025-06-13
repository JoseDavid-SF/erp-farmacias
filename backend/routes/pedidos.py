#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
@file pedidos.py
@brief Rutas para la gestión de pedidos del ERP
@details Este módulo contiene todas las rutas relacionadas con la gestión
         de pedidos: crear, listar, editar, eliminar y control de estado.
@author José David Sánchez Fernández
@version 1.1
@date 2025-06-10
@copyright Copyright (c) 2025 Mega Nevada S.L. Todos los derechos reservados.
"""

from flask import Blueprint, render_template, request, jsonify, redirect, url_for, flash
from models.models import db, Pedido, ItemPedido, Cliente, Producto
from datetime import datetime
import json
from decimal import Decimal

# Crear blueprint para pedidos
pedidos_bp = Blueprint('pedidos', __name__, url_prefix='/pedidos')

@pedidos_bp.route('/')
def lista_pedidos():
    """
    @brief Lista todos los pedidos del sistema
    @details Muestra una tabla paginada con todos los pedidos registrados,
             con opción de búsqueda y filtros por estado.
    @return Template HTML con la lista de pedidos
    @version 1.2
    """
    try:
        page = request.args.get('page', 1, type=int)
        search = request.args.get('search', '', type=str)
        estado = request.args.get('estado', '', type=str)
        cliente_id = request.args.get('cliente', '', type=int)
        
        # Verificar si las tablas existen
        try:
            # Probar si podemos hacer una consulta básica
            query = Pedido.query
        except Exception as e:
            print(f"⚠️ Tabla de pedidos no existe aún: {str(e)}")
            # Crear las tablas si no existen
            db.create_all()
            query = Pedido.query
        
        # Intentar hacer join con Cliente si es posible
        try:
            query = query.join(Cliente)
        except Exception as e:
            print(f"⚠️ No se puede hacer join con Cliente: {str(e)}")
            # Continuar sin join
            pass
        
        # Aplicar filtro de búsqueda si existe
        if search:
            search_filter = f"%{search}%"
            try:
                query = query.filter(
                    (Pedido.numero_pedido.ilike(search_filter))
                )
                # Intentar agregar filtros de cliente si la tabla existe
                if Cliente.query.first() is not None:
                    query = query.join(Cliente).filter(
                        (Pedido.numero_pedido.ilike(search_filter)) |
                        (Cliente.nombre.ilike(search_filter)) |
                        (Cliente.codigo.ilike(search_filter))
                    )
            except Exception as e:
                print(f"⚠️ Error en filtro de búsqueda: {str(e)}")
                query = Pedido.query.filter(Pedido.numero_pedido.ilike(search_filter))
        
        # Filtrar por estado
        if estado:
            query = query.filter(Pedido.estado == estado)
            
        # Filtrar por cliente específico
        if cliente_id:
            query = query.filter(Pedido.cliente_id == cliente_id)
        
        # Paginación - ordenar por fecha más reciente primero
        pedidos = query.order_by(Pedido.fecha_pedido.desc()).paginate(
            page=page, per_page=15, error_out=False
        )
        
        # Obtener estados para el filtro
        estados = ['pendiente', 'confirmado', 'entregado', 'facturado']
        
        return render_template('pedidos/lista.html', 
                             pedidos=pedidos, 
                             search=search,
                             estado=estado,
                             estados=estados,
                             cliente_id=cliente_id)
                             
    except Exception as e:
        print(f"❌ Error al cargar pedidos: {str(e)}")
        # En lugar de redirigir, mostrar la página con un mensaje
        flash(f'Error al cargar pedidos: {str(e)}', 'danger')
        
        # Crear objeto pedidos vacío para evitar errores en template
        class EmptyPagination:
            def __init__(self):
                self.items = []
                self.pages = 0
                self.page = 1
                self.per_page = 15
                self.total = 0
                self.has_prev = False
                self.has_next = False
                
        pedidos_vacios = EmptyPagination()
        estados = ['pendiente', 'confirmado', 'entregado', 'facturado']
        
        return render_template('pedidos/lista.html', 
                             pedidos=pedidos_vacios, 
                             search='',
                             estado='',
                             estados=estados,
                             cliente_id=None)

@pedidos_bp.route('/nuevo')
def nuevo_pedido():
    """
    @brief Formulario para crear un nuevo pedido
    @details Muestra el formulario de registro de pedido nuevo
    @return Template HTML del formulario
    @version 1.0
    """
    cliente_id = request.args.get('cliente', type=int)
    cliente = None
    if cliente_id:
        cliente = Cliente.query.get_or_404(cliente_id)
    
    return render_template('pedidos/formulario.html', cliente=cliente)

@pedidos_bp.route('/editar/<int:id>')
def editar_pedido(id):
    """
    @brief Formulario para editar un pedido existente
    @param id ID del pedido a editar
    @return Template HTML del formulario de edición
    @version 1.0
    """
    pedido = Pedido.query.get_or_404(id)
    return render_template('pedidos/formulario.html', pedido=pedido)

@pedidos_bp.route('/api/crear', methods=['POST'])
def api_crear_pedido():
    """
    @brief API para crear un nuevo pedido
    @details Procesa los datos del formulario y crea un pedido en la base de datos
    @return JSON con resultado de la operación
    @version 1.1
    """
    try:
        data = request.get_json()
        print(f"📥 Datos de pedido recibidos: {data}")
        
        # Validar datos requeridos
        if not data.get('cliente_id'):
            return jsonify({
                'success': False,
                'message': 'Cliente es obligatorio'
            }), 400
            
        if not data.get('items') or len(data['items']) == 0:
            return jsonify({
                'success': False,
                'message': 'El pedido debe tener al menos un producto'
            }), 400
        
        # Verificar que el cliente existe
        cliente = Cliente.query.get(data['cliente_id'])
        if not cliente:
            return jsonify({
                'success': False,
                'message': 'Cliente no encontrado'
            }), 400
        
        # Generar número de pedido único
        numero_pedido = generar_numero_pedido()
        
        # Crear nuevo pedido
        pedido = Pedido(
            numero_pedido=numero_pedido,
            cliente_id=data['cliente_id'],
            estado=data.get('estado', 'pendiente'),
            observaciones=data.get('observaciones', '').strip(),
            productos_pendientes=data.get('productos_pendientes', '')
        )
        
        db.session.add(pedido)
        db.session.flush()  # Para obtener el ID del pedido
        
        # Procesar items del pedido
        for item_data in data['items']:
            if not item_data.get('producto_id') or not item_data.get('cantidad'):
                continue
                
            producto = Producto.query.get(item_data['producto_id'])
            if not producto:
                continue
                
            cantidad = int(item_data['cantidad'])
            if cantidad <= 0:
                continue
            
            # Crear item con precios actuales del producto
            item = ItemPedido(
                pedido_id=pedido.id,
                producto_id=producto.id,
                cantidad=cantidad,
                precio_unitario_sin_iva=producto.pvf_sin_iva,
                iva_porcentaje=producto.iva_porcentaje
            )
            
            # Calcular totales del item
            item.calcular_totales()
            
            # Actualizar stock si no es depósito
            if not producto.es_deposito:
                if producto.stock < cantidad:
                    return jsonify({
                        'success': False,
                        'message': f'Stock insuficiente para {producto.nombre}. Disponible: {producto.stock}'
                    }), 400
                producto.stock -= cantidad
            
            db.session.add(item)
        
        # Calcular totales del pedido
        pedido.calcular_totales()
        
        # Actualizar fecha de última visita del cliente
        cliente.fecha_ultima_visita = datetime.utcnow()
        
        db.session.commit()
        
        print(f"✅ Pedido {numero_pedido} creado correctamente")
        
        return jsonify({
            'success': True,
            'message': 'Pedido creado correctamente',
            'pedido': pedido.to_dict()
        })
        
    except Exception as e:
        print(f"❌ Error en api_crear_pedido: {str(e)}")
        db.session.rollback()
        return jsonify({
            'success': False,
            'message': f'Error al crear pedido: {str(e)}'
        }), 500

@pedidos_bp.route('/api/actualizar/<int:id>', methods=['PUT'])
def api_actualizar_pedido(id):
    """
    @brief API para actualizar un pedido existente
    @param id ID del pedido a actualizar
    @return JSON con resultado de la operación
    @version 1.0
    """
    try:
        pedido = Pedido.query.get_or_404(id)
        data = request.get_json()
        
        # Solo permitir actualizar ciertos campos
        pedido.estado = data.get('estado', pedido.estado)
        pedido.observaciones = data.get('observaciones', pedido.observaciones)
        pedido.productos_pendientes = data.get('productos_pendientes', pedido.productos_pendientes)
        
        # Recalcular totales
        pedido.calcular_totales()
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Pedido actualizado correctamente',
            'pedido': pedido.to_dict()
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'message': f'Error al actualizar pedido: {str(e)}'
        }), 500

@pedidos_bp.route('/api/eliminar/<int:id>', methods=['DELETE'])
def api_eliminar_pedido(id):
    """
    @brief API para eliminar un pedido
    @param id ID del pedido a eliminar
    @return JSON con resultado de la operación
    @version 1.0
    """
    try:
        pedido = Pedido.query.get_or_404(id)
        
        # Solo permitir eliminar pedidos pendientes
        if pedido.estado != 'pendiente':
            return jsonify({
                'success': False,
                'message': 'Solo se pueden eliminar pedidos pendientes'
            }), 400
        
        # Restaurar stock de productos no depósito
        for item in pedido.items:
            if not item.producto.es_deposito:
                item.producto.stock += item.cantidad
        
        # Eliminar pedido (los items se eliminan automáticamente por cascade)
        db.session.delete(pedido)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Pedido eliminado correctamente'
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'message': f'Error al eliminar pedido: {str(e)}'
        }), 500

@pedidos_bp.route('/api/detalle/<int:id>')
def api_detalle_pedido(id):
    """
    @brief API para obtener detalles completos de un pedido
    @param id ID del pedido
    @return JSON con datos completos del pedido incluyendo items
    @version 1.0
    """
    try:
        pedido = Pedido.query.get_or_404(id)
        
        # Convertir pedido a diccionario con items
        pedido_data = pedido.to_dict()
        pedido_data['items'] = [item.to_dict() for item in pedido.items]
        
        return jsonify({
            'success': True,
            'pedido': pedido_data
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'Error al obtener pedido: {str(e)}'
        }), 500

@pedidos_bp.route('/api/buscar-clientes')
def api_buscar_clientes():
    """
    @brief API para buscar clientes para pedidos
    @details Busca clientes activos por código o nombre
    @return JSON con lista de clientes encontrados
    @version 1.0
    """
    try:
        termino = request.args.get('q', '').strip()
        limite = request.args.get('limit', 10, type=int)
        
        if not termino:
            return jsonify({'clientes': []})
        
        search_filter = f"%{termino}%"
        clientes = Cliente.query.filter(
            Cliente.activo == True,
            (Cliente.nombre.ilike(search_filter)) |
            (Cliente.codigo.ilike(search_filter))
        ).limit(limite).all()
        
        return jsonify({
            'clientes': [cliente.to_dict() for cliente in clientes]
        })
        
    except Exception as e:
        return jsonify({
            'error': f'Error en búsqueda: {str(e)}'
        }), 500

@pedidos_bp.route('/api/buscar-productos')
def api_buscar_productos():
    """
    @brief API para buscar productos para pedidos
    @details Busca productos activos por código o nombre
    @return JSON con lista de productos encontrados
    @version 1.2
    """
    try:
        termino = request.args.get('q', '').strip()
        limite = request.args.get('limit', 20, type=int)
        
        if not termino:
            return jsonify({'productos': []})
        
        search_filter = f"%{termino}%"
        productos = Producto.query.filter(
            Producto.activo == True,
            (Producto.nombre.ilike(search_filter)) |
            (Producto.codigo.ilike(search_filter))
        ).limit(limite).all()
        
        # Convertir productos a diccionario para JSON
        productos_data = []
        for producto in productos:
            producto_dict = producto.to_dict()
            productos_data.append(producto_dict)
        
        return jsonify({
            'productos': productos_data
        })
        
    except Exception as e:
        print(f"❌ Error en búsqueda de productos: {str(e)}")
        return jsonify({
            'error': f'Error en búsqueda: {str(e)}'
        }), 500

@pedidos_bp.route('/api/cambiar-estado/<int:id>', methods=['PUT'])
def api_cambiar_estado_pedido(id):
    """
    @brief API para cambiar el estado de un pedido
    @param id ID del pedido
    @return JSON con resultado de la operación
    @version 1.0
    """
    try:
        pedido = Pedido.query.get_or_404(id)
        data = request.get_json()
        
        nuevo_estado = data.get('estado')
        if not nuevo_estado:
            return jsonify({
                'success': False,
                'message': 'Estado es obligatorio'
            }), 400
        
        estados_validos = ['pendiente', 'confirmado', 'entregado', 'facturado']
        if nuevo_estado not in estados_validos:
            return jsonify({
                'success': False,
                'message': 'Estado no válido'
            }), 400
        
        pedido.estado = nuevo_estado
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': f'Estado cambiado a {nuevo_estado}',
            'pedido': pedido.to_dict()
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'message': f'Error al cambiar estado: {str(e)}'
        }), 500

@pedidos_bp.route('/api/estadisticas')
def api_estadisticas_pedidos():
    """
    @brief API para obtener estadísticas de pedidos
    @details Proporciona contadores y métricas para el home
    @return JSON con estadísticas de pedidos
    @version 1.0
    """
    try:
        from datetime import datetime, timedelta
        from sqlalchemy import func
        
        # Pedidos totales
        total_pedidos = Pedido.query.count()
        
        # Pedidos por estado
        pedidos_pendientes = Pedido.query.filter_by(estado='pendiente').count()
        pedidos_confirmados = Pedido.query.filter_by(estado='confirmado').count()
        pedidos_entregados = Pedido.query.filter_by(estado='entregado').count()
        
        # Pedidos del mes actual
        inicio_mes = datetime.now().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        pedidos_mes = Pedido.query.filter(Pedido.fecha_pedido >= inicio_mes).count()
        
        # Valor total de pedidos pendientes
        try:
            total_pendiente = db.session.query(func.sum(Pedido.total)).filter_by(estado='pendiente').scalar() or 0
        except:
            total_pendiente = 0
        
        return jsonify({
            'total_pedidos': total_pedidos,
            'pedidos_pendientes': pedidos_pendientes,
            'pedidos_confirmados': pedidos_confirmados,
            'pedidos_entregados': pedidos_entregados,
            'pedidos_mes': pedidos_mes,
            'valor_pendiente': float(total_pendiente)
        })
        
    except Exception as e:
        return jsonify({
            'error': f'Error al obtener estadísticas: {str(e)}'
        }), 500

def generar_numero_pedido():
    """
    @brief Genera un número único para el pedido
    @details Crea un número de pedido con formato P-YYYYMMDD-XXX
    @return str Número de pedido único
    @version 1.0
    """
    from datetime import datetime
    
    fecha_actual = datetime.now()
    prefijo = f"P-{fecha_actual.strftime('%Y%m%d')}"
    
    # Buscar el último pedido del día
    ultimo_pedido = Pedido.query.filter(
        Pedido.numero_pedido.like(f"{prefijo}%")
    ).order_by(Pedido.numero_pedido.desc()).first()
    
    if ultimo_pedido:
        # Extraer el número secuencial del último pedido
        try:
            ultimo_numero = int(ultimo_pedido.numero_pedido.split('-')[-1])
            nuevo_numero = ultimo_numero + 1
        except:
            nuevo_numero = 1
    else:
        nuevo_numero = 1
    
    return f"{prefijo}-{nuevo_numero:03d}"
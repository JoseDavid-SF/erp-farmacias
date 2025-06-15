#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
@file productos.py
@brief Rutas para la gestión de productos del ERP
@details Este módulo contiene todas las rutas relacionadas con la gestión
         de productos: crear, listar, editar, eliminar y control de stock.
@author José David Sánchez Fernández
@version 1.3
@date 2025-06-13
@copyright Copyright (c) 2025 Mega Nevada S.L. Todos los derechos reservados.
"""

from flask import Blueprint, render_template, request, jsonify, redirect, url_for, flash
from models.models import db, Producto
from datetime import datetime, date
import re
from decimal import Decimal

# Crear blueprint para productos
productos_bp = Blueprint('productos', __name__, url_prefix='/productos')

@productos_bp.route('/')
def lista_productos():
    """
    @brief Lista todos los productos del catálogo
    @details Muestra una tabla paginada con todos los productos registrados,
             con opción de búsqueda y filtros por categoría y stock.
    @return Template HTML con la lista de productos
    @version 1.1
    """
    try:
        page = request.args.get('page', 1, type=int)
        search = request.args.get('search', '', type=str)
        categoria = request.args.get('categoria', '', type=str)
        
        # Corregir el manejo del parámetro stock_bajo
        stock_bajo_param = request.args.get('stock_bajo', '').lower()
        stock_bajo = stock_bajo_param in ['true', '1', 'on', 'yes']
        
        query = Producto.query
        
        # Aplicar filtro de búsqueda si existe
        if search:
            search_filter = f"%{search}%"
            query = query.filter(
                (Producto.nombre.ilike(search_filter)) |
                (Producto.codigo.ilike(search_filter)) |
                (Producto.descripcion.ilike(search_filter)) |
                (Producto.codigo_nacional.ilike(search_filter)) |
                (Producto.num_referencia.ilike(search_filter)) |
                (Producto.nombre_proveedor.ilike(search_filter)) |
                (Producto.marca.ilike(search_filter))
            )
        
        # Filtrar por categoría
        if categoria:
            query = query.filter(Producto.categoria.ilike(f"%{categoria}%"))
        
        # Filtrar productos con stock bajo
        if stock_bajo:
            query = query.filter(Producto.stock <= Producto.stock_minimo)
        
        # Mostrar productos activos e inactivos
        # query = query.filter(Producto.activo == True)  # Comentado para mostrar también descontinuados
        
        # Paginación
        productos = query.order_by(Producto.nombre).paginate(
            page=page, per_page=12, error_out=False
        )
        
        # Obtener categorías para el filtro (solo de productos activos)
        try:
            categorias = db.session.query(Producto.categoria).filter(
                Producto.categoria.isnot(None),
                Producto.categoria != '',
                Producto.activo == True
            ).distinct().all()
            categorias = [cat[0] for cat in categorias if cat[0]]
        except:
            categorias = []
        
        return render_template('productos/lista.html', 
                             productos=productos, 
                             search=search,
                             categoria=categoria,
                             stock_bajo=stock_bajo,
                             categorias=categorias)
                             
    except Exception as e:
        flash(f'Error al cargar productos: {str(e)}', 'danger')
        return redirect(url_for('index'))

@productos_bp.route('/nuevo')
def nuevo_producto():
    """
    @brief Formulario para crear un nuevo producto
    @details Muestra el formulario de registro de producto nuevo
    @return Template HTML del formulario
    @version 1.0
    """
    return render_template('productos/formulario.html')

@productos_bp.route('/editar/<int:id>')
def editar_producto(id):
    """
    @brief Formulario para editar un producto existente
    @param id ID del producto a editar
    @return Template HTML del formulario de edición
    @version 1.0
    """
    producto = Producto.query.get_or_404(id)
    return render_template('productos/formulario.html', producto=producto)

@productos_bp.route('/detalle/<int:id>')
def detalle_producto(id):
    """
    @brief Vista detallada de un producto
    @param id ID del producto a mostrar
    @return Template HTML con detalles del producto
    @version 1.0
    """
    producto = Producto.query.get_or_404(id)
    return render_template('productos/detalle.html', producto=producto)

@productos_bp.route('/api/detalle/<int:id>')
def api_detalle_producto(id):
    """
    @brief API para obtener detalles de un producto incluyendo todos los campos
    @param id ID del producto
    @return JSON con datos completos del producto
    @version 1.1
    """
    try:
        producto = Producto.query.get_or_404(id)
        
        return jsonify({
            'success': True,
            'producto': producto.to_dict()
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'Error al obtener producto: {str(e)}'
        }), 500

@productos_bp.route('/api/crear', methods=['POST'])
def api_crear_producto():
    """
    @brief API para crear un nuevo producto
    @details Procesa los datos del formulario y crea un producto en la base de datos
    @return JSON con resultado de la operación
    @version 1.2
    """
    try:
        data = request.get_json()
        print(f"📥 Datos de producto recibidos: {data}")  # Debug log
        
        # Validar datos requeridos
        if not data.get('codigo') or not data.get('nombre') or not data.get('precio'):
            return jsonify({
                'success': False,
                'message': 'Código, nombre y precio son obligatorios'
            }), 400
        
        # Verificar que el código no exista
        producto_existente = Producto.query.filter_by(codigo=data['codigo']).first()
        if producto_existente:
            return jsonify({
                'success': False,
                'message': 'Ya existe un producto con ese código'
            }), 400
        
        # Validar precio
        try:
            precio = Decimal(str(data['precio']))
            if precio < 0:
                raise ValueError("El precio no puede ser negativo")
        except (ValueError, TypeError):
            return jsonify({
                'success': False,
                'message': 'El precio debe ser un número válido mayor o igual a 0'
            }), 400
        
        # Validar IVA
        iva_porcentaje = Decimal('21.0')  # Por defecto 21%
        if data.get('iva_porcentaje'):
            try:
                iva_porcentaje = Decimal(str(data['iva_porcentaje']))
                if iva_porcentaje not in [Decimal('4'), Decimal('10'), Decimal('21')]:
                    return jsonify({
                        'success': False,
                        'message': 'El IVA debe ser 4%, 10% o 21%'
                    }), 400
            except (ValueError, TypeError):
                return jsonify({
                    'success': False,
                    'message': 'El IVA debe ser un número válido'
                }), 400
        
        # Validar recargo de equivalencia
        recargo_equivalencia = Decimal('0.0')  # Por defecto 0%
        if data.get('recargo_equivalencia'):
            try:
                recargo_equivalencia = Decimal(str(data['recargo_equivalencia']))
                if recargo_equivalencia not in [Decimal('0'), Decimal('0.5'), Decimal('1.4'), Decimal('5.2')]:
                    return jsonify({
                        'success': False,
                        'message': 'El recargo de equivalencia debe ser 0%, 0.5%, 1.4% o 5.2%'
                    }), 400
            except (ValueError, TypeError):
                return jsonify({
                    'success': False,
                    'message': 'El recargo de equivalencia debe ser un número válido'
                }), 400
        
        # Validar stock
        try:
            stock = int(data.get('stock', 0))
            stock_minimo = int(data.get('stock_minimo', 0))
            if stock < 0 or stock_minimo < 0:
                raise ValueError("El stock no puede ser negativo")
        except (ValueError, TypeError):
            return jsonify({
                'success': False,
                'message': 'El stock debe ser un número entero válido'
            }), 400
        
        # Validar fecha de caducidad si se proporciona
        fecha_caducidad = None
        if data.get('fecha_caducidad'):
            try:
                fecha_caducidad = datetime.strptime(data['fecha_caducidad'], '%Y-%m-%d').date()
                if fecha_caducidad < date.today():
                    return jsonify({
                        'success': False,
                        'message': 'La fecha de caducidad no puede ser anterior a hoy'
                    }), 400
            except ValueError:
                return jsonify({
                    'success': False,
                    'message': 'Formato de fecha de caducidad inválido'
                }), 400
        
        # Crear nuevo producto
        producto = Producto(
            codigo=data['codigo'].strip().upper(),
            nombre=data['nombre'].strip(),
            descripcion=data.get('descripcion', '').strip(),
            precio=precio,
            stock=stock,
            stock_minimo=stock_minimo,
            lote=data.get('lote', '').strip(),
            fecha_caducidad=fecha_caducidad,
            categoria=data.get('categoria', '').strip(),
            imagen_url=data.get('imagen_url', '').strip(),
            # Campos de identificación
            codigo_nacional=data.get('codigo_nacional', '').strip(),
            num_referencia=data.get('num_referencia', '').strip(),
            nombre_proveedor=data.get('nombre_proveedor', '').strip(),
            marca=data.get('marca', '').strip(),
            # Campos fiscales
            iva_porcentaje=iva_porcentaje,
            recargo_equivalencia=recargo_equivalencia
        )
        
        print(f"✅ Producto creado en memoria: {producto}")  # Debug log
        
        db.session.add(producto)
        db.session.commit()
        
        print("✅ Producto guardado en base de datos")  # Debug log
        
        return jsonify({
            'success': True,
            'message': 'Producto creado correctamente',
            'producto': producto.to_dict()
        })
        
    except Exception as e:
        print(f"❌ Error en api_crear_producto: {str(e)}")  # Debug log
        db.session.rollback()
        return jsonify({
            'success': False,
            'message': f'Error al crear producto: {str(e)}'
        }), 500

@productos_bp.route('/api/actualizar/<int:id>', methods=['PUT'])
def api_actualizar_producto(id):
    """
    @brief API para actualizar un producto existente
    @param id ID del producto a actualizar
    @return JSON con resultado de la operación
    @version 1.2
    """
    try:
        producto = Producto.query.get_or_404(id)
        data = request.get_json()
        
        # Validar datos requeridos
        if not data.get('codigo') or not data.get('nombre') or not data.get('precio'):
            return jsonify({
                'success': False,
                'message': 'Código, nombre y precio son obligatorios'
            }), 400
        
        # Verificar código único (excepto el actual)
        codigo_existente = Producto.query.filter(
            Producto.codigo == data['codigo'],
            Producto.id != id
        ).first()
        
        if codigo_existente:
            return jsonify({
                'success': False,
                'message': 'Ya existe otro producto con ese código'
            }), 400
        
        # Validar precio
        try:
            precio = Decimal(str(data['precio']))
            if precio < 0:
                raise ValueError("El precio no puede ser negativo")
        except (ValueError, TypeError):
            return jsonify({
                'success': False,
                'message': 'El precio debe ser un número válido mayor o igual a 0'
            }), 400
        
        # Validar IVA
        iva_porcentaje = Decimal('21.0')  # Por defecto 21%
        if data.get('iva_porcentaje'):
            try:
                iva_porcentaje = Decimal(str(data['iva_porcentaje']))
                if iva_porcentaje not in [Decimal('4'), Decimal('10'), Decimal('21')]:
                    return jsonify({
                        'success': False,
                        'message': 'El IVA debe ser 4%, 10% o 21%'
                    }), 400
            except (ValueError, TypeError):
                return jsonify({
                    'success': False,
                    'message': 'El IVA debe ser un número válido'
                }), 400
        
        # Validar recargo de equivalencia
        recargo_equivalencia = Decimal('0.0')  # Por defecto 0%
        if data.get('recargo_equivalencia'):
            try:
                recargo_equivalencia = Decimal(str(data['recargo_equivalencia']))
                if recargo_equivalencia not in [Decimal('0'), Decimal('0.5'), Decimal('1.4'), Decimal('5.2')]:
                    return jsonify({
                        'success': False,
                        'message': 'El recargo de equivalencia debe ser 0%, 0.5%, 1.4% o 5.2%'
                    }), 400
            except (ValueError, TypeError):
                return jsonify({
                    'success': False,
                    'message': 'El recargo de equivalencia debe ser un número válido'
                }), 400
        
        # Validar stock
        try:
            stock = int(data.get('stock', 0))
            stock_minimo = int(data.get('stock_minimo', 0))
            if stock < 0 or stock_minimo < 0:
                raise ValueError("El stock no puede ser negativo")
        except (ValueError, TypeError):
            return jsonify({
                'success': False,
                'message': 'El stock debe ser un número entero válido'
            }), 400
        
        # Validar fecha de caducidad si se proporciona
        fecha_caducidad = None
        if data.get('fecha_caducidad'):
            try:
                fecha_caducidad = datetime.strptime(data['fecha_caducidad'], '%Y-%m-%d').date()
            except ValueError:
                return jsonify({
                    'success': False,
                    'message': 'Formato de fecha de caducidad inválido'
                }), 400
        
        # Actualizar datos básicos
        producto.codigo = data['codigo'].strip().upper()
        producto.nombre = data['nombre'].strip()
        producto.descripcion = data.get('descripcion', '').strip()
        producto.precio = precio
        producto.stock = stock
        producto.stock_minimo = stock_minimo
        producto.lote = data.get('lote', '').strip()
        producto.fecha_caducidad = fecha_caducidad
        producto.categoria = data.get('categoria', '').strip()
        producto.imagen_url = data.get('imagen_url', '').strip()
        producto.activo = data.get('activo', True)
        
        # Actualizar campos de identificación
        producto.codigo_nacional = data.get('codigo_nacional', '').strip()
        producto.num_referencia = data.get('num_referencia', '').strip()
        producto.nombre_proveedor = data.get('nombre_proveedor', '').strip()
        producto.marca = data.get('marca', '').strip()
        
        # Actualizar campos fiscales
        producto.iva_porcentaje = iva_porcentaje
        producto.recargo_equivalencia = recargo_equivalencia
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Producto actualizado correctamente',
            'producto': producto.to_dict()
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'message': f'Error al actualizar producto: {str(e)}'
        }), 500

@productos_bp.route('/api/eliminar/<int:id>', methods=['DELETE'])
def api_eliminar_producto(id):
    """
    @brief API para eliminar (desactivar) un producto
    @param id ID del producto a eliminar
    @return JSON con resultado de la operación
    @version 1.0
    """
    try:
        producto = Producto.query.get_or_404(id)
        
        # No eliminar físicamente, solo desactivar
        producto.activo = False
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Producto desactivado correctamente'
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'message': f'Error al eliminar producto: {str(e)}'
        }), 500

@productos_bp.route('/api/buscar')
def api_buscar_productos():
    """
    @brief API para buscar productos
    @details Busca productos por código, nombre, descripción y nuevos campos
    @return JSON con lista de productos encontrados
    @version 1.1
    """
    try:
        termino = request.args.get('q', '').strip()
        limite = request.args.get('limit', 10, type=int)
        
        if not termino:
            return jsonify({'productos': []})
        
        search_filter = f"%{termino}%"
        productos = Producto.query.filter(
            Producto.activo == True,
            (Producto.nombre.ilike(search_filter)) |
            (Producto.codigo.ilike(search_filter)) |
            (Producto.descripcion.ilike(search_filter)) |
            (Producto.codigo_nacional.ilike(search_filter)) |
            (Producto.num_referencia.ilike(search_filter)) |
            (Producto.nombre_proveedor.ilike(search_filter)) |
            (Producto.marca.ilike(search_filter))
        ).limit(limite).all()
        
        return jsonify({
            'productos': [producto.to_dict() for producto in productos]
        })
        
    except Exception as e:
        return jsonify({
            'error': f'Error en búsqueda: {str(e)}'
        }), 500

@productos_bp.route('/api/stock-bajo')
def api_productos_stock_bajo():
    """
    @brief API para obtener productos con stock bajo
    @return JSON con lista de productos con stock bajo o agotado
    @version 1.0
    """
    try:
        productos_stock_bajo = Producto.query.filter(
            Producto.activo == True,
            Producto.stock <= Producto.stock_minimo
        ).order_by(Producto.stock.asc()).all()
        
        return jsonify({
            'productos': [producto.to_dict() for producto in productos_stock_bajo],
            'total': len(productos_stock_bajo)
        })
        
    except Exception as e:
        return jsonify({
            'error': f'Error al obtener productos con stock bajo: {str(e)}'
        }), 500

@productos_bp.route('/api/estadisticas')
def api_estadisticas_productos():
    """
    @brief API para obtener estadísticas de productos
    @details Proporciona contadores y métricas para el home
    @return JSON con estadísticas de productos
    @version 1.0
    """
    try:
        # Contar productos totales
        total_productos = Producto.query.filter_by(activo=True).count()
        
        # Productos con stock bajo
        productos_stock_bajo = Producto.query.filter(
            Producto.activo == True,
            Producto.stock <= Producto.stock_minimo
        ).count()
        
        # Productos agotados
        productos_agotados = Producto.query.filter(
            Producto.activo == True,
            Producto.stock == 0
        ).count()
        
        # Valor total del inventario
        try:
            productos_con_stock = Producto.query.filter(
                Producto.activo == True,
                Producto.stock > 0
            ).all()
            
            valor_inventario = sum(float(p.precio) * p.stock for p in productos_con_stock)
        except:
            valor_inventario = 0
        
        return jsonify({
            'total_productos': total_productos,
            'productos_stock_bajo': productos_stock_bajo,
            'productos_agotados': productos_agotados,
            'valor_inventario': round(valor_inventario, 2)
        })
        
    except Exception as e:
        return jsonify({
            'error': f'Error al obtener estadísticas: {str(e)}'
        }), 500
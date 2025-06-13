#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
@file clientes.py
@brief Rutas para la gestión de clientes del ERP
@details Este módulo contiene todas las rutas relacionadas con la gestión
         de clientes: crear, listar, editar, eliminar y buscar.
@author José David Sánchez Fernández
@version 1.2
@date 2025-06-10
@copyright Copyright (c) 2025 Mega Nevada S.L. Todos los derechos reservados.
"""

from flask import Blueprint, render_template, request, jsonify, redirect, url_for, flash
from models.models import db, Cliente
from datetime import datetime
import re
from decimal import Decimal

# Crear blueprint para clientes
clientes_bp = Blueprint('clientes', __name__, url_prefix='/clientes')

@clientes_bp.route('/')
def lista_clientes():
    """
    @brief Lista todos los clientes del sistema
    @details Muestra una tabla paginada con todos los clientes registrados,
             con opción de búsqueda y filtros.
    @return Template HTML con la lista de clientes
    @version 1.0
    """
    try:
        page = request.args.get('page', 1, type=int)
        search = request.args.get('search', '', type=str)
        
        query = Cliente.query
        
        # Aplicar filtro de búsqueda si existe
        if search:
            search_filter = f"%{search}%"
            query = query.filter(
                (Cliente.nombre.ilike(search_filter)) |
                (Cliente.codigo.ilike(search_filter)) |
                (Cliente.telefono.ilike(search_filter)) |
                (Cliente.nombre_fiscal.ilike(search_filter)) |
                (Cliente.cif.ilike(search_filter)) |
                (Cliente.contacto.ilike(search_filter))
            )
        
        # Paginación
        clientes = query.order_by(Cliente.nombre).paginate(
            page=page, per_page=10, error_out=False
        )
        
        return render_template('clientes/lista.html', 
                             clientes=clientes, 
                             search=search)
                             
    except Exception as e:
        flash(f'Error al cargar clientes: {str(e)}', 'danger')
        return redirect(url_for('index'))

@clientes_bp.route('/nuevo')
def nuevo_cliente():
    """
    @brief Formulario para crear un nuevo cliente
    @details Muestra el formulario de registro de cliente nuevo
    @return Template HTML del formulario
    @version 1.0
    """
    return render_template('clientes/formulario.html')

@clientes_bp.route('/editar/<int:id>')
def editar_cliente(id):
    """
    @brief Formulario para editar un cliente existente
    @param id ID del cliente a editar
    @return Template HTML del formulario de edición
    @version 1.0
    """
    cliente = Cliente.query.get_or_404(id)
    return render_template('clientes/formulario.html', cliente=cliente)

@clientes_bp.route('/api/crear', methods=['POST'])
def api_crear_cliente():
    """
    @brief API para crear un nuevo cliente
    @details Procesa los datos del formulario y crea un cliente en la base de datos
    @return JSON con resultado de la operación
    @version 1.2
    """
    try:
        data = request.get_json()
        print(f"📥 Datos recibidos: {data}")  # Debug log
        
        # Validar datos requeridos
        if not data.get('codigo') or not data.get('nombre'):
            print("❌ Error: Faltan campos obligatorios")  # Debug log
            return jsonify({
                'success': False,
                'message': 'Código y nombre son obligatorios'
            }), 400
        
        # Verificar que el código no exista
        cliente_existente = Cliente.query.filter_by(codigo=data['codigo']).first()
        if cliente_existente:
            print(f"❌ Error: Cliente con código {data['codigo']} ya existe")  # Debug log
            return jsonify({
                'success': False,
                'message': 'Ya existe un cliente con ese código'
            }), 400
        
        # Validar email si se proporciona
        if data.get('email') and not validar_email(data['email']):
            return jsonify({
                'success': False,
                'message': 'El formato del email no es válido'
            }), 400
        
        # Validar recargo de equivalencia
        recargo_equivalencia = Decimal('0')
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
        
        # Crear nuevo cliente
        cliente = Cliente(
            codigo=data['codigo'].strip().upper(),
            nombre=data['nombre'].strip(),
            direccion=data.get('direccion', '').strip(),
            telefono=data.get('telefono', '').strip(),
            email=data.get('email', '').strip().lower(),
            notas=data.get('notas', '').strip(),
            # Nuevos campos fiscales
            nombre_fiscal=data.get('nombre_fiscal', '').strip(),
            cif=data.get('cif', '').strip().upper(),
            contacto=data.get('contacto', '').strip(),
            cuenta_bancaria=data.get('cuenta_bancaria', '').strip(),
            recargo_equivalencia=recargo_equivalencia
        )
        
        print(f"✅ Cliente creado en memoria: {cliente}")  # Debug log
        
        db.session.add(cliente)
        print("✅ Cliente añadido a la sesión")  # Debug log
        
        db.session.commit()
        print("✅ Cambios guardados en base de datos")  # Debug log
        
        return jsonify({
            'success': True,
            'message': 'Cliente creado correctamente',
            'cliente': cliente.to_dict()
        })
        
    except Exception as e:
        print(f"❌ Error en api_crear_cliente: {str(e)}")  # Debug log
        db.session.rollback()
        return jsonify({
            'success': False,
            'message': f'Error al crear cliente: {str(e)}'
        }), 500

@clientes_bp.route('/api/actualizar/<int:id>', methods=['PUT'])
def api_actualizar_cliente(id):
    """
    @brief API para actualizar un cliente existente
    @param id ID del cliente a actualizar
    @return JSON con resultado de la operación
    @version 1.1
    """
    try:
        cliente = Cliente.query.get_or_404(id)
        data = request.get_json()
        
        # Validar datos requeridos
        if not data.get('codigo') or not data.get('nombre'):
            return jsonify({
                'success': False,
                'message': 'Código y nombre son obligatorios'
            }), 400
        
        # Verificar código único (excepto el actual)
        codigo_existente = Cliente.query.filter(
            Cliente.codigo == data['codigo'],
            Cliente.id != id
        ).first()
        
        if codigo_existente:
            return jsonify({
                'success': False,
                'message': 'Ya existe otro cliente con ese código'
            }), 400
        
        # Validar email si se proporciona
        if data.get('email') and not validar_email(data['email']):
            return jsonify({
                'success': False,
                'message': 'El formato del email no es válido'
            }), 400
        
        # Validar recargo de equivalencia
        recargo_equivalencia = Decimal('0')
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
        
        # Actualizar datos básicos
        cliente.codigo = data['codigo'].strip().upper()
        cliente.nombre = data['nombre'].strip()
        cliente.direccion = data.get('direccion', '').strip()
        cliente.telefono = data.get('telefono', '').strip()
        cliente.email = data.get('email', '').strip().lower()
        cliente.notas = data.get('notas', '').strip()
        cliente.activo = data.get('activo', True)
        
        # Actualizar nuevos campos fiscales
        cliente.nombre_fiscal = data.get('nombre_fiscal', '').strip()
        cliente.cif = data.get('cif', '').strip().upper()
        cliente.contacto = data.get('contacto', '').strip()
        cliente.cuenta_bancaria = data.get('cuenta_bancaria', '').strip()
        cliente.recargo_equivalencia = recargo_equivalencia
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Cliente actualizado correctamente',
            'cliente': cliente.to_dict()
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'message': f'Error al actualizar cliente: {str(e)}'
        }), 500

@clientes_bp.route('/api/eliminar/<int:id>', methods=['DELETE'])
def api_eliminar_cliente(id):
    """
    @brief API para eliminar (desactivar) un cliente
    @param id ID del cliente a eliminar
    @return JSON con resultado de la operación
    @version 1.0
    """
    try:
        cliente = Cliente.query.get_or_404(id)
        
        # No eliminar físicamente, solo desactivar
        cliente.activo = False
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Cliente desactivado correctamente'
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'message': f'Error al eliminar cliente: {str(e)}'
        }), 500

@clientes_bp.route('/api/buscar')
def api_buscar_clientes():
    """
    @brief API para buscar clientes
    @details Busca clientes por código, nombre o teléfono
    @return JSON con lista de clientes encontrados
    @version 1.1
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
            (Cliente.codigo.ilike(search_filter)) |
            (Cliente.telefono.ilike(search_filter)) |
            (Cliente.nombre_fiscal.ilike(search_filter)) |
            (Cliente.cif.ilike(search_filter)) |
            (Cliente.contacto.ilike(search_filter))
        ).limit(limite).all()
        
        return jsonify({
            'clientes': [cliente.to_dict() for cliente in clientes]
        })
        
    except Exception as e:
        return jsonify({
            'error': f'Error en búsqueda: {str(e)}'
        }), 500

@clientes_bp.route('/api/detalle/<int:id>')
def api_detalle_cliente(id):
    """
    @brief API para obtener detalles de un cliente incluyendo todos los campos
    @param id ID del cliente
    @return JSON con datos completos del cliente
    @version 1.2
    """
    try:
        cliente = Cliente.query.get_or_404(id)
        
        # Obtener estadísticas del cliente
        total_pedidos = len(cliente.pedidos) if hasattr(cliente, 'pedidos') else 0
        
        return jsonify({
            'cliente': cliente.to_dict(),
            'estadisticas': {
                'total_pedidos': total_pedidos,
                'fecha_ultimo_pedido': cliente.fecha_ultima_visita.isoformat() if cliente.fecha_ultima_visita else None
            }
        })
        
    except Exception as e:
        return jsonify({
            'error': f'Error al obtener cliente: {str(e)}'
        }), 500

@clientes_bp.route('/api/estadisticas')
def api_estadisticas_clientes():
    """
    @brief API para obtener estadísticas de clientes
    @details Proporciona contadores y métricas para el home
    @return JSON con estadísticas de clientes
    @version 1.0
    """
    try:
        # Contar clientes totales
        total_clientes = Cliente.query.filter_by(activo=True).count()
        
        # Contar clientes activos e inactivos
        clientes_activos = Cliente.query.filter_by(activo=True).count()
        clientes_inactivos = Cliente.query.filter_by(activo=False).count()
        
        # Obtener cliente con última visita más reciente
        cliente_ultima_visita = Cliente.query.filter(
            Cliente.fecha_ultima_visita.isnot(None)
        ).order_by(Cliente.fecha_ultima_visita.desc()).first()
        
        return jsonify({
            'total_clientes': total_clientes,
            'clientes_activos': clientes_activos,
            'clientes_inactivos': clientes_inactivos,
            'ultima_visita': cliente_ultima_visita.fecha_ultima_visita.isoformat() if cliente_ultima_visita and cliente_ultima_visita.fecha_ultima_visita else None,
            'cliente_ultima_visita': cliente_ultima_visita.nombre if cliente_ultima_visita else None
        })
        
    except Exception as e:
        return jsonify({
            'error': f'Error al obtener estadísticas: {str(e)}'
        }), 500

def validar_email(email):
    """
    @brief Valida el formato de un email
    @param email Email a validar
    @return bool True si es válido, False en caso contrario
    @version 1.0
    """
    patron = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return re.match(patron, email) is not None
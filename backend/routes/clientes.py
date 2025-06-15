#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
@file clientes.py
@brief Rutas para la gestión de clientes del ERP de Mega Nevada
@details Este módulo contiene todas las rutas relacionadas con la gestión de clientes: crear, listar, editar, eliminar y buscar.
@author José David Sánchez Fernández
@version 1.5
@date 2025-06-14
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
    @details Muestra una tabla paginada con todos los clientes registrados, con opción de búsqueda y filtros.
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
    @version 1.1
    """
    try:
        cliente = Cliente.query.get_or_404(id)
        return render_template('clientes/formulario.html', cliente=cliente)
    except Exception as e:
        flash(f'Error al cargar cliente: {str(e)}', 'danger')
        return redirect(url_for('clientes.lista_clientes'))

@clientes_bp.route('/api/crear', methods=['POST'])
def api_crear_cliente():
    """
    @brief API para crear un nuevo cliente
    @details Procesa los datos del formulario y crea un cliente en la base de datos
    @return JSON con resultado de la operación
    @version 1.4
    """
    try:
        data = request.get_json()
        print(f"Datos recibidos: {data}")
        
        # Validar datos requeridos
        if not data.get('codigo') or not data.get('nombre'):
            print("Error: Faltan campos obligatorios")
            return jsonify({
                'success': False,
                'message': 'Código y nombre son obligatorios'
            }), 400
        
        # Verificar que el código no exista
        cliente_existente = Cliente.query.filter_by(codigo=data['codigo']).first()
        if cliente_existente:
            print(f"Error: Cliente con código {data['codigo']} ya existe")
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
        
        # Crear nuevo cliente
        cliente = Cliente(
            codigo=data['codigo'].strip().upper(),
            nombre=data['nombre'].strip(),
            direccion=data.get('direccion', '').strip(),
            telefono=data.get('telefono', '').strip(),
            email=data.get('email', '').strip().lower(),
            notas=data.get('notas', '').strip(),
            nombre_fiscal=data.get('nombre_fiscal', '').strip(),
            cif=data.get('cif', '').strip().upper(),
            contacto=data.get('contacto', '').strip(),
            cuenta_bancaria=data.get('cuenta_bancaria', '').strip()
        )
        
        print(f"Cliente creado en memoria: {cliente}")
        
        db.session.add(cliente)
        print("Cliente añadido a la sesión")
        
        db.session.commit()
        print("Cambios guardados en base de datos")
        
        return jsonify({
            'success': True,
            'message': 'Cliente creado correctamente',
            'cliente': cliente.to_dict()
        })
        
    except Exception as e:
        print(f"Error en api_crear_cliente: {str(e)}")
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
    @version 1.3
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
        
        # Actualizar datos básicos
        cliente.codigo = data['codigo'].strip().upper()
        cliente.nombre = data['nombre'].strip()
        cliente.direccion = data.get('direccion', '').strip()
        cliente.telefono = data.get('telefono', '').strip()
        cliente.email = data.get('email', '').strip().lower()
        cliente.notas = data.get('notas', '').strip()
        cliente.activo = data.get('activo', True)
        
        # Actualizar campos fiscales
        cliente.nombre_fiscal = data.get('nombre_fiscal', '').strip()
        cliente.cif = data.get('cif', '').strip().upper()
        cliente.contacto = data.get('contacto', '').strip()
        cliente.cuenta_bancaria = data.get('cuenta_bancaria', '').strip()
        
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
    @version 1.4
    """
    try:
        cliente = Cliente.query.get_or_404(id)
        total_pedidos = 0
        fecha_ultimo_pedido = None
        
        try:
            from models.models import Pedido
            total_pedidos = Pedido.query.filter_by(cliente_id=cliente.id).count()
            
            # Obtener el último pedido directamente
            if total_pedidos > 0:
                ultimo_pedido = Pedido.query.filter_by(cliente_id=cliente.id).order_by(
                    Pedido.fecha_pedido.desc()
                ).first()
                fecha_ultimo_pedido = ultimo_pedido.fecha_pedido if ultimo_pedido else None
            
            # Si no hay pedidos, usar fecha_ultima_visita del cliente
            if not fecha_ultimo_pedido:
                fecha_ultimo_pedido = cliente.fecha_ultima_visita
                
        except Exception as pedidos_error:
            print(f"Error al obtener pedidos del cliente {id}: {str(pedidos_error)}")
            # En caso de error, usar valores por defecto
            total_pedidos = 0
            fecha_ultimo_pedido = cliente.fecha_ultima_visita
        
        return jsonify({
            'cliente': cliente.to_dict(),
            'estadisticas': {
                'total_pedidos': total_pedidos,
                'fecha_ultimo_pedido': fecha_ultimo_pedido.isoformat() if fecha_ultimo_pedido else None
            }
        })
        
    except Exception as e:
        print(f"Error en api_detalle_cliente: {str(e)}")
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
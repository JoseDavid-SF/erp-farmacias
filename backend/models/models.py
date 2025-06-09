#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
@file models.py
@brief Modelos de base de datos para el ERP de proveedor autónomo de farmacias
@details Este módulo contiene todos los modelos de SQLAlchemy que representan 
         las entidades del sistema: clientes, productos, pedidos, facturas y albaranes.
@author José David Sánchez Fernández
@version 4.0
@date 2025-06-06
@copyright Copyright (c) 2025 Mega Nevada S.L. Todos los derechos reservados.
"""

from flask_sqlalchemy import SQLAlchemy
from datetime import datetime

# Instancia de SQLAlchemy
db = SQLAlchemy()

class Cliente(db.Model):
    """
    @brief Modelo para gestionar clientes del proveedor
    @details Representa la información completa de cada cliente farmacia,
             incluyendo datos de contacto, historial y estado.
    @version 3.0
    """
    __tablename__ = 'clientes'
    
    id = db.Column(db.Integer, primary_key=True)
    codigo = db.Column(db.String(20), unique=True, nullable=False, index=True)
    nombre = db.Column(db.String(100), nullable=False)
    direccion = db.Column(db.Text)
    telefono = db.Column(db.String(20))
    email = db.Column(db.String(100))
    fecha_creacion = db.Column(db.DateTime, default=datetime.utcnow)
    fecha_ultima_visita = db.Column(db.DateTime)
    activo = db.Column(db.Boolean, default=True)
    notas = db.Column(db.Text)
    
    # Relaciones
    pedidos = db.relationship('Pedido', backref='cliente', lazy=True)

    def __repr__(self):
        """
        @brief Representación en cadena del cliente
        @return String con código y nombre del cliente
        @version 2.0
        """
        return f'<Cliente {self.codigo}: {self.nombre}>'

    def to_dict(self):
        """
        @brief Convierte el objeto Cliente a diccionario
        @details Serializa todos los campos del cliente para uso en APIs JSON
        @return dict Diccionario con los datos del cliente
        @version 5.0
        """
        return {
            'id': self.id,
            'codigo': self.codigo,
            'nombre': self.nombre,
            'direccion': self.direccion,
            'telefono': self.telefono,
            'email': self.email,
            'activo': self.activo
        }

class Producto(db.Model):
    """
    @brief Modelo para gestionar productos del catálogo
    @details Representa cada producto farmacéutico con su información comercial,
             stock, precios y datos de control de caducidad.
    @version 7.0
    """
    __tablename__ = 'productos'
    
    id = db.Column(db.Integer, primary_key=True)
    codigo = db.Column(db.String(20), unique=True, nullable=False, index=True)
    nombre = db.Column(db.String(100), nullable=False)
    descripcion = db.Column(db.Text)
    precio = db.Column(db.Numeric(10, 2), nullable=False)
    categoria = db.Column(db.String(50))
    stock = db.Column(db.Integer, default=0)
    stock_minimo = db.Column(db.Integer, default=0)
    lote = db.Column(db.String(50))
    fecha_caducidad = db.Column(db.Date)
    imagen_url = db.Column(db.String(200))
    activo = db.Column(db.Boolean, default=True)
    fecha_creacion = db.Column(db.DateTime, default=datetime.utcnow)
    
    def __repr__(self):
        return f'<Producto {self.codigo}: {self.nombre}>'

    def to_dict(self):
        return {
            'id': self.id,
            'codigo': self.codigo,
            'nombre': self.nombre,
            'descripcion': self.descripcion,
            'precio': float(self.precio) if self.precio else 0,
            'categoria': self.categoria,
            'stock': self.stock,
            'stock_minimo': self.stock_minimo,
            'lote': self.lote,
            'fecha_caducidad': self.fecha_caducidad.isoformat() if self.fecha_caducidad else None,
            'imagen_url': self.imagen_url,
            'activo': self.activo
        }

class Pedido(db.Model):
    """
    @brief Modelo para gestionar pedidos de clientes
    @details Representa cada pedido realizado por un cliente, con su estado,
             total y relación con items individuales.
    @version 3.0
    """
    __tablename__ = 'pedidos'
    
    id = db.Column(db.Integer, primary_key=True)
    numero_pedido = db.Column(db.String(20), unique=True, nullable=False)
    cliente_id = db.Column(db.Integer, db.ForeignKey('clientes.id'), nullable=False)
    fecha_pedido = db.Column(db.DateTime, default=datetime.utcnow)
    total = db.Column(db.Numeric(10, 2), default=0)
    estado = db.Column(db.String(20), default='pendiente')
    observaciones = db.Column(db.Text)
    
    # Relaciones
    items = db.relationship('ItemPedido', backref='pedido', lazy=True, cascade='all, delete-orphan')

    def __repr__(self):
        """
        @brief Representación en cadena del pedido
        @return String con número de pedido
        @version 1.0
        """
        return f'<Pedido {self.numero_pedido}>'

class ItemPedido(db.Model):
    """
    @brief Items individuales de cada pedido
    @details Representa cada producto dentro de un pedido específico,
             con cantidad, precio y subtotal calculado.
    @version 2.0
    """
    __tablename__ = 'items_pedido'
    
    id = db.Column(db.Integer, primary_key=True)
    pedido_id = db.Column(db.Integer, db.ForeignKey('pedidos.id'), nullable=False)
    producto_id = db.Column(db.Integer, db.ForeignKey('productos.id'), nullable=False)
    cantidad = db.Column(db.Integer, nullable=False)
    precio_unitario = db.Column(db.Numeric(10, 2), nullable=False)
    subtotal = db.Column(db.Numeric(10, 2), nullable=False)
    
    # Relaciones
    producto = db.relationship('Producto', backref='items_pedido')

class Factura(db.Model):
    """
    @brief Modelo para gestionar facturas
    @details Representa las facturas generadas automáticamente a partir de pedidos,
             con control de envío por email y estado de pago.
    @version 5.0
    """
    __tablename__ = 'facturas'
    
    id = db.Column(db.Integer, primary_key=True)
    numero_factura = db.Column(db.String(20), unique=True, nullable=False)
    pedido_id = db.Column(db.Integer, db.ForeignKey('pedidos.id'), nullable=False)
    fecha_factura = db.Column(db.DateTime, default=datetime.utcnow)
    total = db.Column(db.Numeric(10, 2), nullable=False)
    enviada_por_email = db.Column(db.Boolean, default=False)
    
    # Relaciones
    pedido = db.relationship('Pedido', backref='factura', uselist=False)

class Albaran(db.Model):
    """
    @brief Modelo para gestionar albaranes de entrega
    @details Representa los documentos de entrega asociados a pedidos,
             con control de estado de entrega y fechas.
    @version 4.0
    """
    __tablename__ = 'albaranes'
    
    id = db.Column(db.Integer, primary_key=True)
    numero_albaran = db.Column(db.String(20), unique=True, nullable=False)
    pedido_id = db.Column(db.Integer, db.ForeignKey('pedidos.id'), nullable=False)
    fecha_albaran = db.Column(db.DateTime, default=datetime.utcnow)
    entregado = db.Column(db.Boolean, default=False)
    
    # Relaciones
    pedido = db.relationship('Pedido', backref='albaran', uselist=False)
#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
@file models.py
@brief Modelos de base de datos para el ERP de Mega Nevada
@details Este módulo contiene todos los modelos de SQLAlchemy que representan las entidades del sistema: clientes, productos, pedidos, facturas y albaranes.
@author José David Sánchez Fernández
@version 4.6
@date 2025-06-15
@copyright Copyright (c) 2025 Mega Nevada S.L. Todos los derechos reservados.
"""

from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
from decimal import Decimal

# Instancia de SQLAlchemy
db = SQLAlchemy()

class Cliente(db.Model):
    """
    @brief Modelo para gestionar clientes del proveedor
    @details Representa la información completa de cada cliente farmacia, incluyendo datos de contacto, historial y estado.
    @version 3.5
    """
    __tablename__ = 'clientes'
    
    # Campos básicos
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
    
    # Campos para facturación
    nombre_fiscal = db.Column(db.String(150))
    cif = db.Column(db.String(20))
    contacto = db.Column(db.String(100))
    cuenta_bancaria = db.Column(db.String(34))
    
    # Relaciones con manejo de errores
    pedidos = db.relationship('Pedido', backref='cliente', lazy='dynamic')

    def __repr__(self):
        return f'<Cliente {self.codigo}: {self.nombre}>'

    def to_dict(self):
        return {
            'id': self.id,
            'codigo': self.codigo,
            'nombre': self.nombre,
            'direccion': self.direccion,
            'telefono': self.telefono,
            'email': self.email,
            'nombre_fiscal': self.nombre_fiscal,
            'cif': self.cif,
            'contacto': self.contacto,
            'cuenta_bancaria': self.cuenta_bancaria,
            'activo': self.activo,
            'notas': self.notas,
            'fecha_ultima_visita': self.fecha_ultima_visita.isoformat() if self.fecha_ultima_visita else None
        }

class Producto(db.Model):
    """
    @brief Modelo para gestionar productos del catálogo
    @details Representa cada producto farmacéutico con su información comercial, stock, precios y datos de control de caducidad.
    @version 7.3
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
    
    # Campos para identificación y proveedor
    codigo_nacional = db.Column(db.String(20))
    num_referencia = db.Column(db.String(30))
    nombre_proveedor = db.Column(db.String(100))
    marca = db.Column(db.String(100))
    iva_porcentaje = db.Column(db.Numeric(5, 2), default=21.0)
    recargo_equivalencia = db.Column(db.Numeric(5, 2), default=0.0)

    def __repr__(self):
        return f'<Producto {self.codigo}: {self.nombre}>'

    @property
    def pvf_sin_iva(self):
        """Precio de venta a farmacia sin IVA (alias para precio)"""
        return self.precio

    @property
    def pvf_con_iva(self):
        """Precio de venta a farmacia con IVA incluido"""
        if self.precio and self.iva_porcentaje:
            multiplicador = Decimal('1') + (self.iva_porcentaje / Decimal('100'))
            return self.precio * multiplicador
        return self.precio or Decimal('0')

    @property
    def recargo_equivalencia_calculado(self):
        """Calcula el recargo de equivalencia basado en el IVA si no está definido manualmente"""
        # Si ya tiene un recargo manual definido, usarlo
        if hasattr(self, 'recargo_equivalencia') and self.recargo_equivalencia and self.recargo_equivalencia > 0:
            return self.recargo_equivalencia
        
        # Si no, calcular automáticamente basado en el IVA
        if not self.iva_porcentaje:
            return Decimal('0')
        
        # Tabla de correspondencia IVA - Recargo
        iva = float(self.iva_porcentaje)
        if iva == 4.0:
            return Decimal('0.5')
        elif iva == 10.0:
            return Decimal('1.4')
        elif iva == 21.0:
            return Decimal('5.2')
        else:
            return Decimal('0')

    @property
    def es_deposito(self):
        """Indica si el producto es en depósito (por defecto False)"""
        return False

    def to_dict(self):
        return {
            'id': self.id,
            'codigo': self.codigo,
            'nombre': self.nombre,
            'descripcion': self.descripcion,
            'precio': float(self.precio) if self.precio else 0,
            'pvf_sin_iva': float(self.pvf_sin_iva) if self.pvf_sin_iva else 0,
            'pvf_con_iva': float(self.pvf_con_iva) if self.pvf_con_iva else 0,
            'iva_porcentaje': float(self.iva_porcentaje) if self.iva_porcentaje else 21.0,
            'recargo_equivalencia': float(self.recargo_equivalencia) if hasattr(self, 'recargo_equivalencia') and self.recargo_equivalencia else 0.0,
            'recargo_equivalencia_calculado': float(self.recargo_equivalencia_calculado),
            'categoria': self.categoria,
            'stock': self.stock,
            'stock_minimo': self.stock_minimo,
            'lote': self.lote,
            'fecha_caducidad': self.fecha_caducidad.isoformat() if self.fecha_caducidad else None,
            'imagen_url': self.imagen_url,
            'activo': self.activo,
            'es_deposito': self.es_deposito,
            # Campos de identificación
            'codigo_nacional': self.codigo_nacional,
            'num_referencia': self.num_referencia,
            'nombre_proveedor': self.nombre_proveedor,
            'marca': self.marca
        }

class Pedido(db.Model):
    """
    @brief Modelo para gestionar pedidos de clientes
    @details Representa cada pedido realizado por un cliente, con su estado, total y relación con items individuales.
    @version 3.5
    """
    __tablename__ = 'pedidos'
    
    # Campos básicos que seguro existen
    id = db.Column(db.Integer, primary_key=True)
    numero_pedido = db.Column(db.String(20), unique=True, nullable=False)
    cliente_id = db.Column(db.Integer, db.ForeignKey('clientes.id'), nullable=False)
    fecha_pedido = db.Column(db.DateTime, default=datetime.utcnow)
    estado = db.Column(db.String(20), default='pendiente')
    observaciones = db.Column(db.Text)
    
    # Relaciones
    items = db.relationship('ItemPedido', backref='pedido', lazy=True, cascade='all, delete-orphan')

    def __repr__(self):
        return f'<Pedido {self.numero_pedido}>'
    
    @property
    def subtotal(self):
        """Subtotal calculado dinámicamente"""
        return sum(item.subtotal_sin_iva for item in self.items)
    
    @property
    def total_iva(self):
        """Total IVA calculado dinámicamente"""
        return sum(item.total_iva for item in self.items)
    
    @property
    def total_recargo(self):
        """
        Total recargo calculado dinámicamente por tipo de IVA
        """
        # Calcular bases por tipo de IVA
        base_iva_4 = Decimal('0')
        base_iva_10 = Decimal('0')
        base_iva_21 = Decimal('0')
        
        for item in self.items:
            iva = float(item.iva_porcentaje)
            if iva == 4.0:
                base_iva_4 += item.subtotal_sin_iva
            elif iva == 10.0:
                base_iva_10 += item.subtotal_sin_iva
            elif iva == 21.0:
                base_iva_21 += item.subtotal_sin_iva
        
        # Calcular recargos por tipo de IVA
        recargo_4 = base_iva_4 * Decimal('0.005')   # 0.50%
        recargo_10 = base_iva_10 * Decimal('0.014') # 1.40%
        recargo_21 = base_iva_21 * Decimal('0.052') # 5.20%
        
        total_recargo = recargo_4 + recargo_10 + recargo_21
        
        return total_recargo
    
    @property
    def total(self):
        """Total calculado dinámicamente"""
        return self.subtotal + self.total_iva + self.total_recargo
    
    def calcular_totales(self):
        """
        @brief Calcula los totales del pedido
        @details Método para compatibilidad - los totales se calculan dinámicamente
        @version 1.3
        """
        pass

    def to_dict(self):
        """Manejo seguro de len(self.items)"""
        try:
            items_count = len(self.items) if self.items else 0
        except:
            items_count = 0
            
        return {
            'id': self.id,
            'numero_pedido': self.numero_pedido,
            'cliente_id': self.cliente_id,
            'cliente_nombre': self.cliente.nombre if self.cliente else '',
            'cliente_codigo': self.cliente.codigo if self.cliente else '',
            'fecha_pedido': self.fecha_pedido.isoformat() if self.fecha_pedido else None,
            'subtotal': float(self.subtotal),
            'total_iva': float(self.total_iva),
            'total_recargo': float(self.total_recargo),
            'total': float(self.total),
            'estado': self.estado,
            'observaciones': self.observaciones,
            'items_count': items_count
        }

class ItemPedido(db.Model):
    """
    @brief Items individuales de cada pedido
    @details Representa cada producto dentro de un pedido específico, con cantidad, precio y subtotal calculado.
    @version 2.3
    """
    __tablename__ = 'items_pedido'
    
    id = db.Column(db.Integer, primary_key=True)
    pedido_id = db.Column(db.Integer, db.ForeignKey('pedidos.id'), nullable=False)
    producto_id = db.Column(db.Integer, db.ForeignKey('productos.id'), nullable=False)
    cantidad = db.Column(db.Integer, nullable=False)
    precio_unitario_sin_iva = db.Column(db.Numeric(10, 2), nullable=False)
    iva_porcentaje = db.Column(db.Numeric(5, 2), default=21.0)
    subtotal_sin_iva = db.Column(db.Numeric(10, 2), nullable=False)
    total_iva = db.Column(db.Numeric(10, 2), nullable=False)
    subtotal_con_iva = db.Column(db.Numeric(10, 2), nullable=False)
    
    # Relaciones
    producto = db.relationship('Producto', backref='items_pedido')
    
    # Para mantener compatibilidad
    @property
    def precio_unitario(self):
        return self.precio_unitario_sin_iva
    
    @property
    def subtotal(self):
        return self.subtotal_sin_iva

    def calcular_totales(self):
        """
        @brief Calcula los totales del item
        @version 1.3
        """
        self.subtotal_sin_iva = Decimal(str(self.cantidad)) * self.precio_unitario_sin_iva
        self.total_iva = self.subtotal_sin_iva * (self.iva_porcentaje / Decimal('100'))
        self.subtotal_con_iva = self.subtotal_sin_iva + self.total_iva

    def to_dict(self):
        return {
            'id': self.id,
            'producto_id': self.producto_id,
            'producto_codigo': self.producto.codigo if self.producto else '',
            'producto_nombre': self.producto.nombre if self.producto else '',
            'cantidad': self.cantidad,
            'precio_unitario_sin_iva': float(self.precio_unitario_sin_iva),
            'iva_porcentaje': float(self.iva_porcentaje),
            'subtotal_sin_iva': float(self.subtotal_sin_iva),
            'total_iva': float(self.total_iva),
            'subtotal_con_iva': float(self.subtotal_con_iva)
        }

class Factura(db.Model):
    """
    @brief Modelo para gestionar facturas
    @details Representa las facturas generadas automáticamente a partir de pedidos, con control de envío por email y estado de pago.
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
    @details Representa los documentos de entrega asociados a pedidos, con control de estado de entrega y fechas.
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
#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
@file app.py
@brief Aplicación principal del ERP de proveedor autónomo de farmacias
@details Archivo principal que inicializa Flask, configura la base de datos
         y define las rutas principales del sistema.
@author José David Sánchez Fernández
@version 6.1
@date 2025-06-09
@copyright Copyright (c) 2025 Mega Nevada S.L. Todos los derechos reservados.
"""

from flask import Flask, render_template, jsonify
from flask_cors import CORS
from config.config import config
from models.models import db
import os

def create_app(config_name=None):
    """
    @brief Factory para crear la aplicación Flask
    @details Función factory que configura y crea la instancia de Flask
             con todas las extensiones y configuraciones necesarias.
    @param config_name Nombre del entorno de configuración a usar
    @return Flask Instancia configurada de la aplicación
    @version 6.0
    """
    
    # Crear instancia de Flask
    app = Flask(__name__, 
                template_folder='../frontend/templates',
                static_folder='../frontend/static')
    
    # Configurar la aplicación
    config_name = config_name or os.getenv('FLASK_CONFIG', 'default')
    app.config.from_object(config[config_name])
    
    # Inicializar extensiones
    db.init_app(app)
    CORS(app)
    
    # Registrar blueprints
    from routes.clientes import clientes_bp
    try:
        from routes.productos import productos_bp
        app.register_blueprint(productos_bp)
    except ImportError:
        print("⚠️ Blueprint de productos no encontrado")
    
    app.register_blueprint(clientes_bp)
    
    # Crear las tablas de la base de datos
    with app.app_context():
        try:
            db.create_all()
            print("✅ Base de datos inicializada correctamente")
            print("✅ Tablas creadas en PostgreSQL")
        except Exception as e:
            print(f"❌ Error al inicializar la base de datos: {e}")
            print(f"❌ Verifica la configuración en .env")
    
    # Registrar rutas principales
    @app.route('/')
    def index():
        """
        @brief Página principal del ERP
        @details Renderiza el dashboard principal con las estadísticas del sistema
        @return Template HTML del dashboard
        @version 4.0
        """
        return render_template('index.html')
    
    @app.route('/api/test')
    def api_test():
        """
        @brief Endpoint para probar la conexión API y base de datos
        @details Verifica que la API funcione y que la conexión a PostgreSQL sea exitosa
        @return JSON con el estado de la conexión
        @version 5.0
        """
        try:
            # Probar conexión a la base de datos
            from sqlalchemy import text
            db.session.execute(text('SELECT 1'))
            return jsonify({
                "status": "success",
                "message": "API y base de datos PostgreSQL funcionando correctamente",
                "version": "6.0",
                "database": "PostgreSQL conectado"
            })
        except Exception as e:
            return jsonify({
                "status": "error",
                "message": f"Error de conexión: {str(e)}"
            }), 500
    
    @app.route('/api/status')
    def api_status():
        """
        @brief Estado general del sistema
        @details Proporciona información sobre el estado actual del sistema ERP
        @return JSON con información del sistema
        @version 2.0
        """
        return jsonify({
            "system": "ERP Proveedor Autónomo de Farmacias",
            "status": "running",
            "environment": config_name,
            "database": "PostgreSQL"
        })
    
    @app.route('/api/dashboard/estadisticas')
    def api_dashboard_estadisticas():
        """
        @brief API para obtener todas las estadísticas del dashboard
        @details Proporciona contadores de clientes, productos, pedidos y facturas
        @return JSON con estadísticas completas del sistema
        @version 1.0
        """
        try:
            from models.models import Cliente, Producto, Pedido, Factura
            from datetime import datetime, timedelta
            from sqlalchemy import func
            
            # Estadísticas de clientes
            total_clientes = Cliente.query.filter_by(activo=True).count()
            
            # Estadísticas de productos - manejar si no existe la tabla
            try:
                total_productos = Producto.query.filter_by(activo=True).count()
            except:
                total_productos = 0
            
            # Estadísticas de pedidos - manejar si no existe la tabla
            try:
                pedidos_pendientes = Pedido.query.filter_by(estado='pendiente').count()
            except:
                pedidos_pendientes = 0
            
            # Estadísticas de facturas del mes actual - manejar si no existe la tabla
            try:
                inicio_mes = datetime.now().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
                facturas_mes = Factura.query.filter(Factura.fecha_factura >= inicio_mes).count()
            except:
                facturas_mes = 0
            
            return jsonify({
                'success': True,
                'estadisticas': {
                    'total_clientes': total_clientes,
                    'total_productos': total_productos,
                    'pedidos_pendientes': pedidos_pendientes,
                    'facturas_mes': facturas_mes
                }
            })
            
        except Exception as e:
            print(f"❌ Error en estadísticas: {str(e)}")
            return jsonify({
                'success': False,
                'error': f'Error al obtener estadísticas: {str(e)}',
                'estadisticas': {
                    'total_clientes': 0,
                    'total_productos': 0,
                    'pedidos_pendientes': 0,
                    'facturas_mes': 0
                }
            }), 500
    
    @app.route('/api/dashboard/actividad')
    def api_dashboard_actividad():
        """
        @brief API para obtener actividad reciente del dashboard con enlaces
        @return JSON con actividad reciente del sistema incluyendo enlaces
        @version 2.0
        """
        try:
            from models.models import Cliente, Producto, Pedido
            from datetime import datetime, timedelta
            
            actividades = []
            
            # Últimos clientes creados
            clientes_recientes = Cliente.query.order_by(Cliente.fecha_creacion.desc()).limit(3).all()
            for cliente in clientes_recientes:
                actividades.append({
                    'tipo': 'cliente_nuevo',
                    'mensaje': f'Nuevo cliente: {cliente.nombre}',
                    'fecha': cliente.fecha_creacion.isoformat(),
                    'icono': 'fa-user-plus',
                    'color': 'success',
                    'enlace': f'/clientes',
                    'elemento_id': cliente.id,
                    'elemento_tipo': 'cliente'
                })
            
            # Últimos productos creados
            try:
                productos_recientes = Producto.query.order_by(Producto.fecha_creacion.desc()).limit(3).all()
                for producto in productos_recientes:
                    actividades.append({
                        'tipo': 'producto_nuevo',
                        'mensaje': f'Nuevo producto: {producto.nombre}',
                        'fecha': producto.fecha_creacion.isoformat(),
                        'icono': 'fa-box',
                        'color': 'info',
                        'enlace': f'/productos',
                        'elemento_id': producto.id,
                        'elemento_tipo': 'producto'
                    })
            except:
                pass  # Si no existe la tabla productos
            
            # Productos con stock bajo (últimos detectados)
            try:
                productos_stock_bajo = Producto.query.filter(
                    Producto.activo == True,
                    Producto.stock <= Producto.stock_minimo
                ).order_by(Producto.stock.asc()).limit(2).all()
                
                for producto in productos_stock_bajo:
                    actividades.append({
                        'tipo': 'stock_bajo',
                        'mensaje': f'Stock bajo: {producto.nombre} ({producto.stock} unidades)',
                        'fecha': datetime.now().isoformat(),
                        'icono': 'fa-exclamation-triangle',
                        'color': 'warning',
                        'enlace': f'/productos',
                        'elemento_id': producto.id,
                        'elemento_tipo': 'producto'
                    })
            except:
                pass  # Si no existe la tabla productos
            
            # Ordenar por fecha (más recientes primero)
            actividades.sort(key=lambda x: x['fecha'], reverse=True)
            
            # Actividad de muestra si no hay datos
            if not actividades:
                actividades = [
                    {
                        'tipo': 'sistema',
                        'mensaje': 'Sistema iniciado correctamente',
                        'fecha': datetime.now().isoformat(),
                        'icono': 'fa-check-circle',
                        'color': 'success',
                        'enlace': None,
                        'elemento_id': None,
                        'elemento_tipo': None
                    },
                    {
                        'tipo': 'info',
                        'mensaje': 'ERP listo para usar',
                        'fecha': datetime.now().isoformat(),
                        'icono': 'fa-info-circle',
                        'color': 'info',
                        'enlace': None,
                        'elemento_id': None,
                        'elemento_tipo': None
                    }
                ]
            
            return jsonify({
                'success': True,
                'actividades': actividades[:5]  # Últimas 5 actividades
            })
            
        except Exception as e:
            return jsonify({
                'success': False,
                'error': f'Error al obtener actividad: {str(e)}',
                'actividades': []
            })
    
    @app.route('/api/dashboard/stock-bajo')
    def api_dashboard_stock_bajo():
        """
        @brief API para obtener productos con stock bajo
        @return JSON con productos que requieren reabastecimiento
        @version 1.0
        """
        try:
            from models.models import Producto
            
            # Buscar productos con stock bajo
            try:
                productos_stock_bajo = Producto.query.filter(
                    Producto.stock <= Producto.stock_minimo,
                    Producto.activo == True
                ).all()
                
                productos = []
                for producto in productos_stock_bajo:
                    productos.append({
                        'id': producto.id,
                        'nombre': producto.nombre,
                        'codigo': producto.codigo,
                        'stock_actual': producto.stock,
                        'stock_minimo': producto.stock_minimo
                    })
                
                return jsonify({
                    'success': True,
                    'productos': productos
                })
                
            except:
                return jsonify({
                    'success': True,
                    'productos': []
                })
            
        except Exception as e:
            return jsonify({
                'success': False,
                'error': f'Error al obtener stock bajo: {str(e)}',
                'productos': []
            })
    
    return app

if __name__ == '__main__':
    """
    @brief Punto de entrada principal de la aplicación
    @details Crea y ejecuta la aplicación Flask en modo desarrollo
    @version 6.0
    """
    # Crear y ejecutar la aplicación
    app = create_app()
    
    print("🚀 Iniciando ERP Proveedor Autónomo de Farmacias...")
    print("📊 Dashboard disponible en: http://localhost:5000")
    print("🔧 API disponible en: http://localhost:5000/api/test")
    print("📋 Estado del sistema: http://localhost:5000/api/status")
    
    app.run(
        host='0.0.0.0',
        port=5000,
        debug=True
    )
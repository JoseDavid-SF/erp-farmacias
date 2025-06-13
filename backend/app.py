#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
@file app.py
@brief Aplicación principal del ERP de proveedor autónomo de farmacias
@details Archivo principal que inicializa Flask, configura la base de datos
         y define las rutas principales del sistema.
@author José David Sánchez Fernández
@version 6.2
@date 2025-06-10
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
    @version 6.1
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
    from routes.pedidos import pedidos_bp
    
    try:
        from routes.productos import productos_bp
        app.register_blueprint(productos_bp)
        print("✅ Blueprint de productos registrado")
    except ImportError:
        print("⚠️ Blueprint de productos no encontrado")
    
    app.register_blueprint(clientes_bp)
    app.register_blueprint(pedidos_bp)
    print("✅ Blueprints de clientes y pedidos registrados")
    
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
        @details Renderiza el home principal con las estadísticas del sistema
        @return Template HTML del home
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
                "version": "6.2",
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
            "database": "PostgreSQL",
            "modules": ["clientes", "productos", "pedidos", "facturas", "albaranes"]
        })
    
    @app.route('/api/home/estadisticas')
    def api_home_estadisticas():
        """
        @brief API para obtener todas las estadísticas del home
        @details Proporciona contadores de clientes, productos, pedidos y facturas
        @return JSON con estadísticas completas del sistema
        @version 1.1
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
                total_pedidos = Pedido.query.count()
            except:
                pedidos_pendientes = 0
                total_pedidos = 0
            
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
                    'total_pedidos': total_pedidos,
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
                    'total_pedidos': 0,
                    'pedidos_pendientes': 0,
                    'facturas_mes': 0
                }
            }), 500
    
    @app.route('/api/home/actividad')
    def api_home_actividad():
        """
        @brief API para obtener actividad reciente del home con enlaces
        @return JSON con actividad reciente del sistema incluyendo enlaces
        @version 2.1
        """
        try:
            from models.models import Cliente, Producto, Pedido
            from datetime import datetime, timedelta
            
            actividades = []
            
            # Últimos pedidos creados
            try:
                pedidos_recientes = Pedido.query.order_by(Pedido.fecha_pedido.desc()).limit(3).all()
                for pedido in pedidos_recientes:
                    actividades.append({
                        'tipo': 'pedido_nuevo',
                        'mensaje': f'Nuevo pedido: {pedido.numero_pedido} - {pedido.cliente.nombre}',
                        'fecha': pedido.fecha_pedido.isoformat(),
                        'icono': 'fa-shopping-cart',
                        'color': 'success',
                        'enlace': f'/pedidos',
                        'elemento_id': pedido.id,
                        'elemento_tipo': 'pedido'
                    })
            except:
                pass  # Si no existe la tabla pedidos
            
            # Últimos clientes creados
            clientes_recientes = Cliente.query.order_by(Cliente.fecha_creacion.desc()).limit(2).all()
            for cliente in clientes_recientes:
                actividades.append({
                    'tipo': 'cliente_nuevo',
                    'mensaje': f'Nuevo cliente: {cliente.nombre}',
                    'fecha': cliente.fecha_creacion.isoformat(),
                    'icono': 'fa-user-plus',
                    'color': 'primary',
                    'enlace': f'/clientes',
                    'elemento_id': cliente.id,
                    'elemento_tipo': 'cliente'
                })
            
            # Últimos productos creados
            try:
                productos_recientes = Producto.query.order_by(Producto.fecha_creacion.desc()).limit(2).all()
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
            
            # Pedidos pendientes (alertas)
            try:
                pedidos_pendientes = Pedido.query.filter_by(estado='pendiente').count()
                if pedidos_pendientes > 0:
                    actividades.append({
                        'tipo': 'pedidos_pendientes',
                        'mensaje': f'{pedidos_pendientes} pedidos pendientes de confirmar',
                        'fecha': datetime.now().isoformat(),
                        'icono': 'fa-clock',
                        'color': 'warning',
                        'enlace': f'/pedidos?estado=pendiente',
                        'elemento_id': None,
                        'elemento_tipo': None
                    })
            except:
                pass
            
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
                        'color': 'danger',
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
                        'mensaje': 'Sistema ERP iniciado correctamente',
                        'fecha': datetime.now().isoformat(),
                        'icono': 'fa-check-circle',
                        'color': 'success',
                        'enlace': None,
                        'elemento_id': None,
                        'elemento_tipo': None
                    },
                    {
                        'tipo': 'info',
                        'mensaje': 'ERP listo para gestionar pedidos',
                        'fecha': datetime.now().isoformat(),
                        'icono': 'fa-info-circle',
                        'color': 'info',
                        'enlace': '/pedidos/nuevo',
                        'elemento_id': None,
                        'elemento_tipo': None
                    }
                ]
            
            return jsonify({
                'success': True,
                'actividades': actividades[:6]  # Últimas 6 actividades
            })
            
        except Exception as e:
            return jsonify({
                'success': False,
                'error': f'Error al obtener actividad: {str(e)}',
                'actividades': []
            })
    
    @app.route('/api/home/stock-bajo')
    def api_home_stock_bajo():
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
    
    @app.route('/api/home/pedidos-resumen')
    def api_home_pedidos_resumen():
        """
        @brief API para obtener resumen de pedidos para el home
        @return JSON con resumen de pedidos por estado
        @version 1.0
        """
        try:
            from models.models import Pedido
            from sqlalchemy import func
            
            try:
                # Contar pedidos por estado
                resumen = db.session.query(
                    Pedido.estado,
                    func.count(Pedido.id).label('cantidad'),
                    func.sum(Pedido.total).label('valor_total')
                ).group_by(Pedido.estado).all()
                
                pedidos_resumen = {}
                for estado, cantidad, valor in resumen:
                    pedidos_resumen[estado] = {
                        'cantidad': cantidad,
                        'valor_total': float(valor) if valor else 0
                    }
                
                return jsonify({
                    'success': True,
                    'resumen': pedidos_resumen
                })
                
            except:
                return jsonify({
                    'success': True,
                    'resumen': {}
                })
                
        except Exception as e:
            return jsonify({
                'success': False,
                'error': f'Error al obtener resumen de pedidos: {str(e)}',
                'resumen': {}
            })
    
    return app

if __name__ == '__main__':
    """
    @brief Punto de entrada principal de la aplicación
    @details Crea y ejecuta la aplicación Flask en modo desarrollo
    @version 6.1
    """
    # Crear y ejecutar la aplicación
    app = create_app()
    
    print("🚀 Iniciando ERP Proveedor Autónomo de Farmacias...")
    print("📊 Home disponible en: http://localhost:5000")
    print("👥 Clientes disponible en: http://localhost:5000/clientes")
    print("📦 Productos disponible en: http://localhost:5000/productos")
    print("🛒 Pedidos disponible en: http://localhost:5000/pedidos")
    print("🔧 API disponible en: http://localhost:5000/api/test")
    print("📋 Estado del sistema: http://localhost:5000/api/status")
    
    app.run(
        host='0.0.0.0',
        port=5000,
        debug=True
    )
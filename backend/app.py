#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
@file app.py
@brief Aplicación principal del ERP de proveedor autónomo de farmacias
@details Archivo principal que inicializa Flask, configura la base de datos
         y define las rutas principales del sistema.
@author José David Sánchez Fernández
@version 6.0
@date 2025-06-06
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
            
            # Estadísticas de productos (placeholder - implementaremos después)
            total_productos = Producto.query.filter_by(activo=True).count()
            
            # Estadísticas de pedidos (placeholder - implementaremos después)
            pedidos_pendientes = Pedido.query.filter_by(estado='pendiente').count()
            
            # Estadísticas de facturas del mes actual
            inicio_mes = datetime.now().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
            facturas_mes = Factura.query.filter(Factura.fecha_factura >= inicio_mes).count()
            
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
            return jsonify({
                'success': False,
                'error': f'Error al obtener estadísticas: {str(e)}'
            }), 500
    
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
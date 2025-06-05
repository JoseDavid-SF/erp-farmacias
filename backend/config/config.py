#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
@file config.py
@brief Configuración principal del ERP de proveedor autónomo de farmacias
@details Este módulo maneja todas las configuraciones del sistema incluyendo
         base de datos, correo electrónico y parámetros de la aplicación.
@author José David Sánchez Fernández
@version 3.0
@date 2025-06-06
@copyright Copyright (c) 2025 Mega Nevada S.L. Todos los derechos reservados.
"""

import os
from dotenv import load_dotenv

# Cargar variables de entorno
load_dotenv()

class Config:
    """
    @brief Configuración base de la aplicación
    @details Clase base que contiene todos los parámetros de configuración
             comunes para el sistema ERP.
    @version 3.0
    """
    
    # Clave secreta para Flask
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'clave-super-secreta-cambiar-en-produccion'
    
    # Configuración de base de datos PostgreSQL
    DB_USER = os.environ.get('DB_USER') or 'postgres'
    DB_PASSWORD = os.environ.get('DB_PASSWORD') or 'admin123'
    DB_HOST = os.environ.get('DB_HOST') or 'localhost'
    DB_PORT = os.environ.get('DB_PORT') or '5432'
    DB_NAME = os.environ.get('DB_NAME') or 'erp_farmacias'
    
    SQLALCHEMY_DATABASE_URI = f'postgresql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}'
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    
    # Configuración de correo electrónico
    MAIL_SERVER = os.environ.get('MAIL_SERVER') or 'smtp.gmail.com'
    MAIL_PORT = int(os.environ.get('MAIL_PORT') or 587)
    MAIL_USE_TLS = os.environ.get('MAIL_USE_TLS', 'true').lower() in ['true', 'on', '1']
    MAIL_USERNAME = os.environ.get('MAIL_USERNAME')
    MAIL_PASSWORD = os.environ.get('MAIL_PASSWORD')
    
    # Configuraciones de la aplicación
    UPLOAD_FOLDER = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'frontend', 'static', 'uploads')
    MAX_CONTENT_LENGTH = 16 * 1024 * 1024  # 16MB máximo para archivos

class DevelopmentConfig(Config):
    """
    @brief Configuración para entorno de desarrollo
    @details Extiende la configuración base con parámetros específicos
             para desarrollo local.
    @version 2.0
    """
    DEBUG = True

class ProductionConfig(Config):
    """
    @brief Configuración para entorno de producción
    @details Configuración optimizada y segura para el entorno de producción.
    @version 5.0
    """
    DEBUG = False

# Diccionario de configuraciones
config = {
    'development': DevelopmentConfig,
    'production': ProductionConfig,
    'default': DevelopmentConfig
}
import os
from pathlib import Path
from datetime import timedelta

BASE_DIR = Path(__file__).resolve().parent.parent

SECRET_KEY = os.environ.get('DJANGO_SECRET_KEY', 'django-insecure-ko9_b6agm)00^%rp92dx(q^jzgzor64*+ihmm%som28!70ahug')

DEBUG = os.environ.get('DJANGO_DEBUG', 'True') == 'True'

ALLOWED_HOSTS = os.environ.get('DJANGO_ALLOWED_HOSTS', 'localhost,127.0.0.1').split(',')


# APPLICATIONS

INSTALLED_APPS = [

    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',

    # CORS
    'corsheaders',

    # APPS
    'users',
    'companies',
    'inventory',
    'logistics',
    'core',

    # DRF
    'rest_framework',
    'rest_framework.authtoken',
    
    # Dashboard & IA
    'analytics',
    'anymail',
]


# MIDDLEWARE

MIDDLEWARE = [

    'corsheaders.middleware.CorsMiddleware',

    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'core.middleware.CompanyMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',

]


ROOT_URLCONF = 'backend.urls'


TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]


WSGI_APPLICATION = 'backend.wsgi.application'


# DATABASE

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': os.environ.get('POSTGRES_DB', 'mibasededatos'),
        'USER': os.environ.get('POSTGRES_USER', 'django_user'),
        'PASSWORD': os.environ.get('POSTGRES_PASSWORD', 'Admin123'),
        'HOST': os.environ.get('POSTGRES_HOST', 'localhost'),
        'PORT': os.environ.get('POSTGRES_PORT', '5432'),
    }
}


# PASSWORD VALIDATION

AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]


# INTERNATIONALIZATION

LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'UTC'
USE_I18N = True
USE_TZ = True


# STATIC FILES

STATIC_URL = 'static/'
STATIC_ROOT = os.path.join(BASE_DIR, 'staticfiles')


# CUSTOM USER

AUTH_USER_MODEL = 'users.User'


# DJANGO REST FRAMEWORK

REST_FRAMEWORK = {

    'DEFAULT_AUTHENTICATION_CLASSES': (
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ),

    'DEFAULT_PERMISSION_CLASSES': (
        'rest_framework.permissions.IsAuthenticated',
    ),

}


# JWT CONFIG

from datetime import timedelta

SIMPLE_JWT = {

    'ACCESS_TOKEN_LIFETIME': timedelta(minutes=60),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=1),

}


# CORS (React)

# En producción (Docker), Nginx actúa como proxy y no necesita CORS.
# En desarrollo local, permitir todos los orígenes.
_cors_origins = os.environ.get('CORS_ALLOWED_ORIGINS', '')
if _cors_origins:
    CORS_ALLOW_ALL_ORIGINS = False
    CORS_ALLOWED_ORIGINS = [o.strip() for o in _cors_origins.split(',') if o.strip()]
else:
    CORS_ALLOW_ALL_ORIGINS = True


# EMAIL CONFIG (MAILTRAP SMTP)
_mailtrap_token = os.environ.get('MAILTRAP_API_TOKEN', '').strip()
if not _mailtrap_token:
    _mailtrap_token = '10543861f1bf4dd024275d8746840e9e'

EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
EMAIL_HOST = 'live.smtp.mailtrap.io'
EMAIL_PORT = 587
EMAIL_HOST_USER = 'api'
EMAIL_HOST_PASSWORD = _mailtrap_token
EMAIL_USE_TLS = True

DEFAULT_FROM_EMAIL = os.environ.get('DEFAULT_FROM_EMAIL', 'Correo StockVision <Correo@stockvision.site>')

# EMAIL CONFIG (RESEND - Anterior)
# EMAIL_BACKEND = 'core.email_backends.ResendEmailBackend'
# RESEND_API_KEY = 're_4axYBdXh_JnV5NYhVkiBjV7dBmmd8Gc8R'
# DEFAULT_FROM_EMAIL = 'StockVision <onboarding@resend.dev>'

MEDIA_URL = '/media/'
MEDIA_ROOT = os.path.join(BASE_DIR, 'media')
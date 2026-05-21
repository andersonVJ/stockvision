import psycopg2
import sys

conn_params = {
    'database': 'mibasededatos',
    'user': 'django_user',
    'password': 'Admin123',
    'host': 'localhost',
    'port': '5432'
}

print("Attempting to connect with params:", conn_params)
try:
    conn = psycopg2.connect(**conn_params)
    print("Success! Connected to database.")
    conn.close()
except Exception as e:
    print("Exception class:", e.__class__.__name__)
    # Let's inspect the arguments or attributes of the exception
    try:
        err_bytes = str(e).encode('utf-8', errors='replace')
        print("Error message (replaced utf-8):", str(e))
    except Exception as inner_e:
        print("Failed to print error message directly:", inner_e)
    
    # Try connecting with raw psycopg2 and catch OperationalError
    try:
        import psycopg2.extensions
        print("Checking libpq connection failure info...")
    except Exception:
        pass

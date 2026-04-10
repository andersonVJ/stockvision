import logging
import os
from pathlib import Path

# Base directory for the Models module
MODELS_BASE_DIR = Path(__file__).resolve().parent
LOGS_DIR = MODELS_BASE_DIR / 'logs'

# Ensure the logs directory exists
LOGS_DIR.mkdir(exist_ok=True)

# Define the log file path
LOG_FILE = LOGS_DIR / 'predictions.log'

def setup_logger(name="ModelsLogger"):

    logger = logging.getLogger(name)
    
    # Avoid duplicate logs if logger is already set up
    if not logger.handlers:
        logger.setLevel(logging.INFO)

        # Create a file handler
        file_handler = logging.FileHandler(LOG_FILE)
        file_handler.setLevel(logging.INFO)

        # Create a console handler
        console_handler = logging.StreamHandler()
        console_handler.setLevel(logging.INFO)

        # Create a logging format
        formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
        file_handler.setFormatter(formatter)
        console_handler.setFormatter(formatter)

        # Add the handlers to the logger
        logger.addHandler(file_handler)
        logger.addHandler(console_handler)

    return logger

# Expose a default instance for easy imports across the Models module
model_logger = setup_logger()

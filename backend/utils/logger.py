import logging
import colorlog
import os
import sys
import io
from datetime import datetime


def setup_logger(name: str = 'TradingBot') -> logging.Logger:
    logger = logging.getLogger(name)
    logger.setLevel(logging.DEBUG)

    if not logger.handlers:
        # Fix Windows cp1252 UnicodeEncodeError by wrapping stream with UTF-8
        try:
            utf8_stream = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
        except AttributeError:
            utf8_stream = sys.stdout
        console_handler = colorlog.StreamHandler(stream=utf8_stream)
        console_handler.setFormatter(colorlog.ColoredFormatter(
            '%(log_color)s%(asctime)s | %(levelname)-8s | %(name)s | %(message)s',
            datefmt='%Y-%m-%d %H:%M:%S',
            log_colors={
                'DEBUG':    'cyan',
                'INFO':     'green',
                'WARNING':  'yellow',
                'ERROR':    'red',
                'CRITICAL': 'bold_red',
            }
        ))
        logger.addHandler(console_handler)

        os.makedirs('logs', exist_ok=True)
        file_handler = logging.FileHandler(
            f'logs/bot_{datetime.now().strftime("%Y%m%d")}.log'
        )
        file_handler.setFormatter(logging.Formatter(
            '%(asctime)s | %(levelname)-8s | %(name)s | %(message)s'
        ))
        logger.addHandler(file_handler)
        logger.propagate = False  # Prevent cp1252 UnicodeEncodeError from root logger

    return logger


logger = setup_logger()

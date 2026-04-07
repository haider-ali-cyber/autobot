"""
IPv4-forced dependency installer.
Patches socket.getaddrinfo to prefer IPv4 before running pip.
This fixes SSL handshake timeouts caused by broken IPv6 connectivity.
"""
import socket

_orig_getaddrinfo = socket.getaddrinfo

def _ipv4_only(host, port, family=0, type=0, proto=0, flags=0):
    return _orig_getaddrinfo(host, port, socket.AF_INET, type, proto, flags)

socket.getaddrinfo = _ipv4_only

import sys
from pip._internal.cli.main import main as pip_main

print("IPv4-only mode + USTC mirror enabled. Installing packages...")
sys.exit(pip_main([
    'install', '-r', 'requirements.txt',
    '--no-cache-dir',
    '--index-url', 'https://mirrors.ustc.edu.cn/pypi/simple/',
    '--trusted-host', 'mirrors.ustc.edu.cn',
    '--timeout', '120',
]))

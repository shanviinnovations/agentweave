"""
Helper module to load shared configuration from config.json.
This allows port numbers and other configuration to be shared
between Python and TypeScript code.
"""
import os
import json
from typing import Dict, Any

def load_shared_config() -> Dict[str, Any]:
    """
    Load the shared configuration from config.json in the project root.
    
    Returns:
        Dict[str, Any]: Configuration dictionary
    """
    config_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '../config.json'))
    with open(config_path, 'r') as config_file:
        return json.load(config_file)

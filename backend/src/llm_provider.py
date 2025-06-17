import os

# Common provider config shared by all agents
COMMON_PROVIDER_CONFIG = {
    "openai": {
        "provider": "openai",
        "model": "gpt-4o",
        "temperature": 0.5,
        "api_key": lambda: os.getenv("OPENAI_API_KEY"),
    },
    "azure": {
        "provider": "azure",
        "deployment_name": "gpt-4o",
        "api_version": lambda: os.getenv("AZURE_OPENAI_API_VERSION"),
        "azure_endpoint": lambda: os.getenv("AZURE_OPENAI_ENDPOINT"),
        "api_key": lambda: os.getenv("AZURE_OPENAI_API_KEY"),
    },
    "google": {
        "provider": "google",
    }
}

def get_llm_provider():
    provider = os.getenv("LLM_PROVIDER")
    if provider not in ["openai", "google", "azure"]:
        raise ValueError(f"Unsupported provider: {provider}")
    return provider

def get_llm_provider_config(provider):
    config = COMMON_PROVIDER_CONFIG.get(provider)
    if not config:
        raise ValueError(f"No config for provider '{provider}'")
    kwargs = {}
    for key, value in config.items():
        if callable(value):
            kwargs[key] = value()
        else:
            kwargs[key] = value
    return kwargs

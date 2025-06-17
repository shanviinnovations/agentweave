# llm_factory.py
from typing import Literal, Any
from langchain_openai import ChatOpenAI
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_openai import AzureChatOpenAI 

class LLMFactory:
    """
    Central place to obtain a LangChain chat model.
    Extend with new providers or fine-tuning params in ONE file.
    """

    @staticmethod
    def create(
        provider: Literal["openai", "google", "azure"],
        /,
        **kwargs: Any,
    ):
        if provider == "openai":
            # kwargs → anything ChatOpenAI supports (api_key, model, temperature …)
            return ChatOpenAI(model=kwargs.pop("model", "gpt-4o"), **kwargs)

        if provider == "google":
            return ChatGoogleGenerativeAI(
                model=kwargs.pop("model", "gemini-2.0-flash"),
                **kwargs,
            )

        if provider == "azure":
            # typical kwargs: deployment_name="gpt-4o", api_version="2024-02-15-preview"
            return AzureChatOpenAI(**kwargs)

        raise ValueError(f"Unsupported provider: {provider}")
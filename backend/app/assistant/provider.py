"""Small async provider boundary. Never log prompts, response bodies or credentials."""
from dataclasses import dataclass, field
import os
from typing import Protocol
import httpx

@dataclass(frozen=True)
class ProviderConfig:
    provider: str = field(default_factory=lambda: os.getenv('AI_PROVIDER', '').strip())
    api_key: str = field(default_factory=lambda: os.getenv('OPENAI_API_KEY', '').strip(), repr=False)
    model: str = field(default_factory=lambda: os.getenv('AI_MODEL', '').strip())
    timeout_seconds: float = 25.0  # Application deadline, not a provider capability claim.
    max_output_tokens: int = 1000

class ProviderError(Exception):
    def __init__(self, code: str):
        self.code = code
        super().__init__(code)

class Provider(Protocol):
    configured: bool
    name: str
    model: str
    async def generate(self, messages: list[dict]) -> str: ...

class OpenAIProvider:
    name = 'openai'
    def __init__(self, config: ProviderConfig, transport=None):
        self.config, self.model, self.transport = config, config.model, transport
        self.configured = config.provider == 'openai' and bool(config.api_key and config.model)

    async def generate(self, messages):
        if not self.configured:
            raise ProviderError('not_configured')
        try:
            async with httpx.AsyncClient(timeout=self.config.timeout_seconds, transport=self.transport,
                                         follow_redirects=False, trust_env=False) as client:
                # Fixed trusted endpoint: prompts cannot select URLs, tools or credentials.
                async with client.stream('POST', 'https://api.openai.com/v1/chat/completions',
                    headers={'Authorization': f'Bearer {self.config.api_key}'},
                    json={'model': self.model, 'messages': messages,
                          'max_completion_tokens': self.config.max_output_tokens, 'store': False}) as response:
                    if response.status_code == 429:
                        raise ProviderError('provider_rate_limit')
                    if response.status_code >= 400:
                        raise ProviderError('provider_unavailable')
                    raw = bytearray()
                    async for chunk in response.aiter_bytes():
                        raw.extend(chunk)
                        if len(raw) > 262144:
                            raise ProviderError('invalid_response')
                    import json
                    data = json.loads(raw)
            text = data['choices'][0]['message']['content']
            if not isinstance(text, str) or not text.strip() or len(text) > 16000:
                raise ProviderError('invalid_response')
            return text.strip()
        except ProviderError:
            raise
        except httpx.TimeoutException:
            raise ProviderError('timeout') from None
        except (httpx.HTTPError, ValueError, KeyError, IndexError, TypeError):
            raise ProviderError('provider_unavailable') from None

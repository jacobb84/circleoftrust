from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    database_url: str = "sqlite:///./data/circleoftrust.db"
    mercure_publisher_jwt_key: str = "!ChangeThisMercureHubJWTSecretKey!"
    mercure_url: str = "http://mercure:80/.well-known/mercure"
    cors_origins: str = "http://localhost:5173 http://localhost:3000"
    
    @property
    def cors_origins_list(self) -> list[str]:
        """Parse space-separated CORS origins into a list."""
        return [origin.strip() for origin in self.cors_origins.split() if origin.strip()]
    
    class Config:
        env_file = ".env"


@lru_cache()
def get_settings() -> Settings:
    return Settings()

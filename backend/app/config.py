from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    database_url: str = "sqlite:///./data/circleoftrust.db"
    mercure_publisher_jwt_key: str = "!ChangeThisMercureHubJWTSecretKey!"
    mercure_url: str = "http://mercure:80/.well-known/mercure"
    
    class Config:
        env_file = ".env"


@lru_cache()
def get_settings() -> Settings:
    return Settings()

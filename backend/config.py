import os
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field

class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

    port: int = Field(default=8080, env="PORT")
    host: str = Field(default="127.0.0.1", env="HOST")
    
    groq_api_key: str = Field(default="", env="GROQ_API_KEY")
    firebase_web_api_key: str = Field(default="", env="FIREBASE_WEB_API_KEY")
    firebase_credentials_path: str = Field(default="firebase-service-account.json", env="FIREBASE_CREDENTIALS_PATH")

settings = Settings()

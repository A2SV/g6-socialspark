from pydantic import BaseModel
from domain.brand_dto import Brand
from typing import Optional,List



class CaptionRequest(BaseModel):
    idea: str
    platform : Optional[str] = "instagram"
    language: Optional[str] = "English"
    hashtags_count :Optional[int] = 4
    brand_presets: Brand



class CaptiononResponse(BaseModel):
   caption:str
   hashtags: List[str]

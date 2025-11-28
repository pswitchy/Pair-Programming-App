from pydantic import BaseModel
from typing import Optional

class RoomCreate(BaseModel):
    pass 

class RoomResponse(BaseModel):
    room_id: str
    code: str

    class Config:
        from_attributes = True

class AutocompleteRequest(BaseModel):
    code: str
    cursorPosition: int
    language: str

class AutocompleteResponse(BaseModel):
    suggestion: str
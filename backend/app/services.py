import uuid
from sqlalchemy.orm import Session
from . import models

def create_new_room(db: Session) -> models.Room:
    """
    Generates a unique Room ID and creates a record in the database.
    """
    room_id = str(uuid.uuid4())[:8]

    db_room = models.Room(room_id=room_id, code="")
    
    db.add(db_room)
    db.commit()
    db.refresh(db_room)
    return db_room

def get_room(db: Session, room_id: str) -> models.Room:
    """
    Fetches a room by ID.
    """
    return db.query(models.Room).filter(models.Room.room_id == room_id).first()

def get_or_create_room(db: Session, room_id: str) -> models.Room:
    """
    Fetches a room, or creates it if it doesn't exist (useful for joining via URL).
    """
    room = get_room(db, room_id)
    if not room:
        room = models.Room(room_id=room_id, code="")
        db.add(room)
        db.commit()
        db.refresh(room)
    return room

def update_room_code(db: Session, room_id: str, code: str):
    """
    Updates the code content for a specific room.
    """
    room = get_room(db, room_id)
    if room:
        room.code = code
        db.commit()

def generate_mock_suggestion(code: str, language: str) -> str:
    """
    Mock AI logic to return autocomplete suggestions based on simple rules.
    """
    if not code:
        return ""
        
    lines = code.split('\n')
    last_line = lines[-1].strip()

    if language.lower() == "python":
        if last_line.startswith("def ") and ":" not in last_line:
            return ":"
        elif last_line.endswith(":"):
            return "\n    pass"
        elif "print" in last_line and "(" not in last_line:
            return "('Hello World')"
        elif last_line.startswith("import "):
            return "os"
        elif "class " in last_line and ":" not in last_line:
            return ":"
            
    return " # AI Copilot suggestion"
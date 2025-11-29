import uuid
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from pydantic import BaseModel

from . import models, database, managers

models.Base.metadata.create_all(bind=database.engine)

app = FastAPI()
manager = managers.ConnectionManager()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class RoomResponse(BaseModel):
    room_id: str
    code: str

class SaveRequest(BaseModel):
    code: str

@app.post("/rooms", response_model=RoomResponse)
def create_room(db: Session = Depends(database.get_db)):
    room_id = str(uuid.uuid4())[:8]
    if db.query(models.Room).filter_by(room_id=room_id).first():
         room_id = str(uuid.uuid4())[:8]
         
    new_room = models.Room(room_id=room_id, code="# New Room Created\nprint('Hello World')")
    db.add(new_room)
    db.commit()
    return new_room

@app.get("/rooms/{room_id}", response_model=RoomResponse)
def get_room(room_id: str, db: Session = Depends(database.get_db)):
    room = db.query(models.Room).filter(models.Room.room_id == room_id).first()
    if not room:
        room = models.Room(room_id=room_id, code="# Auto-created Room")
        db.add(room)
        db.commit()
    return room

@app.put("/rooms/{room_id}/save")
def save_room_snapshot(room_id: str, payload: SaveRequest, db: Session = Depends(database.get_db)):
    """
    Since the backend only relays binary CRDT data, it doesn't know the string content.
    The frontend periodically calls this to save a readable snapshot to Postgres.
    """
    room = db.query(models.Room).filter(models.Room.room_id == room_id).first()
    if room:
        room.code = payload.code
        db.commit()
    return {"status": "saved"}

@app.post("/autocomplete")
def autocomplete(payload: dict):
    code = payload.get("code", "")
    lines = code.split('\n')
    last_line = lines[-1]
    
    suggestion = ""
    if last_line.strip() == "def":
        suggestion = " my_function():"
    elif last_line.strip() == "import":
        suggestion = " math"
    elif last_line.strip().startswith("print"):
        if "(" not in last_line:
            suggestion = "('Hello World')"
        elif last_line.endswith("("):
            suggestion = "'Hello World')"
    elif last_line.strip().endswith(":"):
        suggestion = "\n    pass"
    else:
        suggestion = ""

    return {"suggestion": suggestion}

@app.websocket("/ws/{room_id}")
async def websocket_endpoint(websocket: WebSocket, room_id: str):
    await manager.connect(room_id, websocket)
    try:
        while True:
            data = await websocket.receive_bytes()
            await manager.broadcast(room_id, data, websocket)
    except WebSocketDisconnect:
        manager.disconnect(room_id, websocket)


@app.get("/")
def health_check():
    return {"status": "ok", "message": "Pair Programming Backend is Running"}
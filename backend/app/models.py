from sqlalchemy import Column, String, Text
from .database import Base

class Room(Base):
    __tablename__ = "rooms"

    room_id = Column(String, primary_key=True, index=True)
    code = Column(Text, default="")
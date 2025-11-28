import React from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const Home: React.FC = () => {
  const navigate = useNavigate();
  const createRoom = async () => {
    const res = await axios.post('http://localhost:8000/rooms');
    navigate(`/room/${res.data.room_id}`);
  };
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: '50px' }}>
      <h1>Pair Programming App</h1>
      <button onClick={createRoom} style={{ padding: '10px 20px', fontSize: '1.2em' }}>
        Create New Room
      </button>
    </div>
  );
};
export default Home;
# Real-Time Collaborative Code Editor

A real-time pair programming web application allowing multiple users to edit code simultaneously without conflicts. The system uses **CRDTs (Conflict-free Replicated Data Types)** to ensure consistency and features a mock AI autocomplete assistant.

## 🛠 Tech Stack

### Backend
*   **Python 3.9+** & **FastAPI**: Handles WebSocket connections and REST APIs.
*   **PostgreSQL**: Persistent storage for room snapshots.
*   **SQLAlchemy**: ORM for database interactions.
*   **WebSockets (Binary)**: Relays Yjs binary update vectors between clients.

### Frontend
*   **React** (Create React App) & **TypeScript**: UI Framework.
*   **Redux Toolkit**: Manages local UI state.
*   **Monaco Editor**: VS Code-like editing experience.
*   **Yjs**: CRDT library for conflict-free shared state.
*   **y-websocket**: Handles syncing Yjs documents over WebSockets.

---

## 🚀 How to Run Locally

### Prerequisites
*   Node.js & npm
*   Python 3.8+
*   PostgreSQL installed and running.

### 1. Database Setup
Ensure PostgreSQL is running, then create a database:
```bash
# Terminal / Command Prompt
createdb pairprog_db
```

### 2. Backend Setup
Navigate to the backend folder:
```bash
cd backend
```

Create a `.env` file in the `backend/` directory with your DB credentials:
```ini
DATABASE_URL=postgresql://your_user:your_password@localhost/pairprog_db
```

Install dependencies and start the server:
```bash
# Create virtual env (optional but recommended)
python -m venv venv
source venv/bin/activate  

# Install deps
pip install -r requirements.txt

# Run Server (Listens on port 8000)
uvicorn app.main:app --reload
```

### 3. Frontend Setup
Open a new terminal and navigate to the frontend folder:
```bash
cd frontend

# Install dependencies
npm install

# Start React Dev Server (Listens on port 3000)
npm start
```

### 4. Verification
1.  Open `http://localhost:3000`.
2.  Click **Create New Room**.
3.  Copy the Room URL.
4.  Open a **New Incognito Window** (or a different browser) and paste the URL.
5.  Type in one window and watch it sync instantly in the other.
6.  Hover over the text to see the other user's cursor and name tag.

---

## 🏗 Architecture & Design Choices

### 1. Conflict Resolution (CRDTs vs. Last-Write-Wins)
Initially, a simple "Last-Write-Wins" approach was considered. However, for a production-grade coding tool, this causes data loss when two users type simultaneously.
*   **Choice**: Implemented **Yjs**.
*   **How it works**: The frontend maintains a local Yjs document. When a user types, it sends a binary "update vector" to the backend. The backend acts as a relay, broadcasting this binary blob to other clients. The clients then merge the update mathematically, ensuring `User A + User B` results in `User A & B` without overwriting.

### 2. Binary WebSockets
*   **Design**: The FastAPI WebSocket endpoint was modified to handle `bytes` instead of `text`. This reduces serialization overhead and allows the backend to be agnostic about the content—it simply routes the CRDT updates.

### 3. Persistence Strategy (Hybrid)
*   **Real-time**: State is held in the memory of connected clients (P2P via Server).
*   **Long-term**: To ensure code isn't lost if everyone leaves the room, the frontend uses a **Debounced Save** mechanism. If the document changes, it waits 2 seconds of inactivity before sending a snapshot string to the PostgreSQL database via a REST endpoint.

### 4. Mock AI Autocomplete
*   **Design**: To avoid paid API dependencies for this demo, the AI is mocked using rule-based logic. It analyzes the last line of code (e.g., if it ends in `:`, it suggests an indentation and `pass`). The frontend debounces this request (600ms) to prevent flooding the server while typing.

---

## 🚧 Limitations

1.  **Authentication**: There is currently no user login. User identities (Names/Colors) are randomly generated per session.
2.  **Mocked AI**: The autocomplete is static and rule-based. It does not actually "understand" code context like an LLM would.
3.  **Server Scaling**: The WebSocket manager uses in-memory tracking. This works for a single server instance but would require Redis Pub/Sub to scale across multiple server nodes.
4.  **Security**: The room URLs are public. Anyone with the ID can join and edit the code.

---

## 🔮 Future Improvements

If given more time, the following upgrades would be implemented:

1.  **Integration with OpenAI / LLMs**:
    Replace the mock endpoint with a real call to `gpt-3.5-turbo` or `CodeLlama` to provide intelligent, context-aware code completion.

2.  **Code Execution Sandbox**:
    Add a "Run" button that sends the code to a secure, isolated Docker container (or Firecracker microVM) to execute the Python script and return the output to the browser.

3.  **Horizontal Scalability**:
    Implement **Redis Pub/Sub**. When a WebSocket message arrives at Server A, it would publish the event to Redis, ensuring users connected to Server B also receive the update.

4.  **Operational Transformation (OT) History**:
    Add "Undo/Redo" functionality and a "History Slider" to view how the code evolved over time (similar to Google Docs history).

5.  **User Accounts**:
    Add GitHub/Google OAuth so users can save their room history to their profile.

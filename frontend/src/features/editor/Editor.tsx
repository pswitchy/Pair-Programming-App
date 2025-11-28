import React, { useEffect, useRef, useState } from 'react';
import Editor, { OnMount } from '@monaco-editor/react';
import { useParams } from 'react-router-dom';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import { MonacoBinding } from 'y-monaco';
import randomColor from 'randomcolor';
import axios from 'axios';
// Import the configuration to handle Localhost vs Production URLs automatically
import { REST_ENDPOINT, WS_ENDPOINT } from '../../config';

interface UserAwareness {
  name: string;
  color: string;
}

const CodeEditor: React.FC = () => {
  const { roomId } = useParams();
  const editorRef = useRef<any>(null);
  const [users, setUsers] = useState<UserAwareness[]>([]);

  const providerRef = useRef<WebsocketProvider | null>(null);
  const docRef = useRef<Y.Doc | null>(null);
  const bindingRef = useRef<MonacoBinding | null>(null);

  const myColor = useRef(randomColor());
  const myName = useRef(`User ${Math.floor(Math.random() * 1000)}`);

  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleEditorDidMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;
    
    if (!roomId) return;

    // 1. Initialize Yjs Document
    const doc = new Y.Doc();
    docRef.current = doc;

    // 2. Connect to WebSocket
    // Uses the Dynamic WS_ENDPOINT from config.ts
    const wsProvider = new WebsocketProvider(
      `${WS_ENDPOINT}/ws`, 
      roomId,                   
      doc,
      { connect: true }
    );
    providerRef.current = wsProvider;

    // 3. Bind Yjs Text to Monaco Editor
    const type = doc.getText('monaco'); 
    const binding = new MonacoBinding(
      type,
      editor.getModel()!,
      new Set([editor]),
      wsProvider.awareness 
    );
    bindingRef.current = binding;

    // 4. Set User Presence
    wsProvider.awareness.setLocalStateField('user', {
      name: myName.current,
      color: myColor.current,
    });

    wsProvider.awareness.on('change', () => {
      const activeUsers: UserAwareness[] = [];
      wsProvider.awareness.getStates().forEach((state: any) => {
        if (state.user) {
          activeUsers.push(state.user);
        }
      });
      setUsers(activeUsers);
    });

    // 5. Initial Fetch (REST)
    // Uses the Dynamic REST_ENDPOINT from config.ts
    axios.get(`${REST_ENDPOINT}/rooms/${roomId}`).then((res) => {
        if (type.toString().length === 0) {
            type.insert(0, res.data.code || "");
        }
    });

    // 6. Save Snapshot (Debounced)
    doc.on('update', () => {
        if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = setTimeout(() => {
            const currentCode = type.toString();
            // Uses the Dynamic REST_ENDPOINT from config.ts
            axios.put(`${REST_ENDPOINT}/rooms/${roomId}/save`, { code: currentCode });
        }, 2000); 
    });
  };

  useEffect(() => {
    return () => {
      providerRef.current?.destroy();
      docRef.current?.destroy();
      bindingRef.current?.destroy();
    };
  }, []);

  return (
    <div style={{ display: 'flex', height: '100vh', flexDirection: 'column' }}>
      {/* Header / Toolbar */}
      <div style={{ 
        padding: '10px 20px', 
        background: '#1e1e1e', 
        color: '#fff', 
        borderBottom: '1px solid #333',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div>
           Room: <strong>{roomId}</strong>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          {users.map((u, i) => (
             <div key={i} style={{ 
                 display: 'flex', 
                 alignItems: 'center', 
                 gap: '5px',
                 fontSize: '0.8rem' 
             }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: u.color }}></div>
                {u.name} {u.name === myName.current && '(You)'}
             </div>
          ))}
        </div>
      </div>

      {/* Editor Area */}
      <div style={{ flexGrow: 1 }}>
        <Editor
          height="100%"
          defaultLanguage="python"
          theme="vs-dark"
          onMount={handleEditorDidMount}
          options={{
             minimap: { enabled: false }
          }}
        />
      </div>
    </div>
  );
};

export default CodeEditor;
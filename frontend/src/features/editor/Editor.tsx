import React, { useEffect, useRef, useState } from 'react';
import Editor, { OnMount } from '@monaco-editor/react';
import { useParams } from 'react-router-dom';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import { MonacoBinding } from 'y-monaco';
import randomColor from 'randomcolor';
import axios from 'axios';
import { REST_ENDPOINT, WS_ENDPOINT } from '../../config';

interface UserAwareness {
  name: string;
  color: string;
}

const CodeEditor: React.FC = () => {
  const { roomId } = useParams();
  const editorRef = useRef<any>(null);
  
  const [users, setUsers] = useState<UserAwareness[]>([]);
  const [suggestion, setSuggestion] = useState<string | null>(null);

  const providerRef = useRef<WebsocketProvider | null>(null);
  const docRef = useRef<Y.Doc | null>(null);
  const bindingRef = useRef<MonacoBinding | null>(null);

  const myColor = useRef(randomColor());
  const myName = useRef(`User ${Math.floor(Math.random() * 1000)}`);

  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const aiTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleEditorDidMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;
    
    if (!roomId) return;

    const doc = new Y.Doc();
    docRef.current = doc;

    const wsProvider = new WebsocketProvider(
      `${WS_ENDPOINT}/ws`, 
      roomId,                   
      doc,
      { connect: true }
    );
    providerRef.current = wsProvider;

    const type = doc.getText('monaco'); 
    const binding = new MonacoBinding(
      type,
      editor.getModel()!,
      new Set([editor]),
      wsProvider.awareness 
    );
    bindingRef.current = binding;

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

    const dbContentPromise = axios.get(`${REST_ENDPOINT}/rooms/${roomId}`)
      .then(res => res.data.code || "")
      .catch(err => "");

    wsProvider.on('sync', async (isSynced: boolean) => {
      if (isSynced) {
        if (type.toString().length === 0) {
          const content = await dbContentPromise;
          if (type.toString().length === 0) {
            type.insert(0, content);
          }
        }
      }
    });

    doc.on('update', () => {
        if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = setTimeout(() => {
            const currentCode = type.toString();
            axios.put(`${REST_ENDPOINT}/rooms/${roomId}/save`, { code: currentCode });
        }, 2000); 
    });

    editor.onDidChangeModelContent(() => {
      setSuggestion(null);

      if (aiTimeoutRef.current) clearTimeout(aiTimeoutRef.current);
      
      aiTimeoutRef.current = setTimeout(async () => {
        const code = editor.getValue();
        if (!code.trim()) return;

        try {
           const res = await axios.post(`${REST_ENDPOINT}/autocomplete`, {
             code: code,
             cursorPosition: code.length, // Simplified
             language: "python"
           });
           
           if (res.data.suggestion) {
             setSuggestion(res.data.suggestion);
           }
        } catch (error) {
           console.error("AI Fetch error:", error);
        }
      }, 800); 
    });
  };

  useEffect(() => {
    return () => {
      providerRef.current?.destroy();
      docRef.current?.destroy();
      bindingRef.current?.destroy();
      if (aiTimeoutRef.current) clearTimeout(aiTimeoutRef.current);
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
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
           {suggestion && (
             <span style={{ 
               marginLeft: '20px', 
               color: '#4ade80', 
               fontSize: '0.9em', 
               background: 'rgba(74, 222, 128, 0.1)',
               padding: '2px 8px',
               borderRadius: '4px'
             }}>
               ✨ AI: {suggestion.replace(/\n/g, "\\n")}
             </span>
           )}
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
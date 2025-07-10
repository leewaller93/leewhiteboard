import React, { useState, useEffect, useRef } from "react";

function App() {
  const [phases, setPhases] = useState([]);
  const [team, setTeam] = useState([]);
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [stickyNoteText, setStickyNoteText] = useState("");
  const [stickyNotes, setStickyNotes] = useState([]);
  const [isDrawingMode, setIsDrawingMode] = useState(true);
  const canvasRef = useRef(null);
  let isDrawing = false;

  const [newTask, setNewTask] = useState({
    phase: "Design",
    goal: "",
    need: "",
    comments: "",
    execute: "N",
    stage: "review",
    commentArea: "",
    assigned_to: "team"
  });

  // Debounced update function
  const debouncedUpdate = useRef(null);
  const debouncedUpdatePhaseItem = (id, phase, updatedItem) => {
    if (debouncedUpdate.current) {
      clearTimeout(debouncedUpdate.current);
    }
    debouncedUpdate.current = setTimeout(() => {
      updatePhaseItem(id, phase, updatedItem);
    }, 500); // Wait 500ms after user stops typing
  };

  // Fetch initial data
  useEffect(() => {
    fetchPhases();
    fetchTeam();
    // eslint-disable-next-line
  }, []);

  const fetchPhases = async () => {
    const response = await fetch("https://whiteboard-backend-1cdi.onrender.com/api/phases");
    const data = await response.json();
    setPhases([
      { name: "Design", items: data.filter((item) => item.phase === "Design") },
      { name: "Development", items: data.filter((item) => item.phase === "Development") },
      { name: "Alpha Usage", items: data.filter((item) => item.phase === "Alpha Usage") },
      { name: "Beta Release (Web)", items: data.filter((item) => item.phase === "Beta Release (Web)") },
    ]);
  };

  const fetchTeam = async () => {
    const response = await fetch("https://whiteboard-backend-1cdi.onrender.com/api/team");
    const data = await response.json();
    setTeam(data);
  };

  // Whiteboard drawing
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.strokeStyle = "black";

    let isDrawing = false;

    const getOffset = (e) => {
      // Support both mouse and touch events
      if (e.touches && e.touches.length > 0) {
        const rect = canvas.getBoundingClientRect();
        return {
          offsetX: e.touches[0].clientX - rect.left,
          offsetY: e.touches[0].clientY - rect.top,
        };
      } else if (e.nativeEvent) {
        return {
          offsetX: e.nativeEvent.offsetX,
          offsetY: e.nativeEvent.offsetY,
        };
      } else {
        return { offsetX: 0, offsetY: 0 };
      }
    };

    const startDrawing = (e) => {
      isDrawing = true;
      const { offsetX, offsetY } = getOffset(e);
      ctx.beginPath();
      ctx.moveTo(offsetX, offsetY);
    };

    const draw = (e) => {
      if (!isDrawing) return;
      const { offsetX, offsetY } = getOffset(e);
      ctx.lineTo(offsetX, offsetY);
      ctx.stroke();
    };

    const stopDrawing = () => {
      isDrawing = false;
      ctx.closePath();
    };

    canvas.addEventListener("mousedown", startDrawing);
    canvas.addEventListener("mousemove", draw);
    canvas.addEventListener("mouseup", stopDrawing);
    canvas.addEventListener("mouseout", stopDrawing);
    canvas.addEventListener("touchstart", startDrawing);
    canvas.addEventListener("touchmove", draw);
    canvas.addEventListener("touchend", stopDrawing);
    canvas.addEventListener("touchcancel", stopDrawing);

    return () => {
      canvas.removeEventListener("mousedown", startDrawing);
      canvas.removeEventListener("mousemove", draw);
      canvas.removeEventListener("mouseup", stopDrawing);
      canvas.removeEventListener("mouseout", stopDrawing);
      canvas.removeEventListener("touchstart", startDrawing);
      canvas.removeEventListener("touchmove", draw);
      canvas.removeEventListener("touchend", stopDrawing);
      canvas.removeEventListener("touchcancel", stopDrawing);
    };
  }, []);

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const addStickyNote = () => {
    if (stickyNoteText.trim()) {
      const newNote = {
        id: Date.now(),
        text: stickyNoteText,
        x: Math.random() * 600 + 50, // Random position on canvas
        y: Math.random() * 300 + 50,
        color: ['#ffeb3b', '#ff9800', '#4caf50', '#2196f3', '#e91e63'][Math.floor(Math.random() * 5)] // Random color
      };
      setStickyNotes(prev => [...prev, newNote]);
      setStickyNoteText("");
    }
  };

  const deleteStickyNote = (id) => {
    setStickyNotes(prev => prev.filter(note => note.id !== id));
  };

  const [draggedNote, setDraggedNote] = useState(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  const moveStickyNote = (id, newX, newY) => {
    setStickyNotes(prev => 
      prev.map(note => 
        note.id === id ? { ...note, x: newX, y: newY } : note
      )
    );
  };

  const handleMouseDown = (e, note) => {
    if (!isDrawingMode) {
      const rect = e.currentTarget.parentElement.getBoundingClientRect();
      const offsetX = e.clientX - rect.left - note.x;
      const offsetY = e.clientY - rect.top - note.y;
      setDraggedNote(note);
      setDragOffset({ x: offsetX, y: offsetY });
      e.preventDefault();
    }
  };

  const handleMouseMove = (e) => {
    if (draggedNote && !isDrawingMode) {
      const rect = e.currentTarget.getBoundingClientRect();
      const newX = e.clientX - rect.left - dragOffset.x;
      const newY = e.clientY - rect.top - dragOffset.y;
      moveStickyNote(draggedNote.id, newX, newY);
    }
  };

  const handleMouseUp = () => {
    setDraggedNote(null);
    setDragOffset({ x: 0, y: 0 });
  };

  const addTeamMember = async () => {
    if (!username || !email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      alert("Please enter a valid username and email");
      return;
    }
    const response = await fetch("https://whiteboard-backend-1cdi.onrender.com/api/invite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, email }),
    });
    if (response.ok) {
      fetchTeam();
      setUsername("");
      setEmail("");
    } else {
      alert("Failed to add user");
    }
  };

  const updatePhaseItem = async (id, phase, updatedItem) => {
    try {
      const response = await fetch(`https://whiteboard-backend-1cdi.onrender.com/api/phases/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...updatedItem, phase }),
      });
      if (response.ok) {
        // Update local state immediately for better UX
        setPhases(prevPhases => 
          prevPhases.map(p => ({
            ...p,
            items: p.items.map(item => 
              item.id === id ? { ...item, ...updatedItem } : item
            )
          }))
        );
      }
    } catch (error) {
      console.error('Error updating item:', error);
    }
  };

  const addPhaseItem = async (phase) => {
    const response = await fetch("https://whiteboard-backend-1cdi.onrender.com/api/phases", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        phase,
        goal: "",
        need: "",
        comments: "",
        execute: "N",
        stage: "review",
        commentArea: "",
      }),
    });
    if (response.ok) {
      fetchPhases();
    }
  };

  const handleNewTaskChange = (e) => {
    const { name, value } = e.target;
    setNewTask((prev) => ({ ...prev, [name]: value }));
  };

  const addNewTask = async () => {
    if (!newTask.goal) {
      alert("Please enter a goal");
      return;
    }
    const response = await fetch("https://whiteboard-backend-1cdi.onrender.com/api/phases", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...newTask, assigned_to: newTask.assigned_to || "team" }),
    });
    if (response.ok) {
      fetchPhases();
      setNewTask({
        phase: "Design",
        goal: "",
        need: "",
        comments: "",
        execute: "N",
        stage: "review",
        commentArea: "",
        assigned_to: "team"
      });
    } else {
      alert("Failed to add task");
    }
  };

  const deletePhaseItem = async (id) => {
    if (window.confirm("Are you sure you want to delete this task?")) {
      try {
        const response = await fetch(`https://whiteboard-backend-1cdi.onrender.com/api/phases/${id}`, {
          method: "DELETE",
        });
        if (response.ok) {
          // Remove from local state immediately
          setPhases(prevPhases => 
            prevPhases.map(p => ({
              ...p,
              items: p.items.filter(item => item.id !== id)
            }))
          );
        } else {
          alert("Failed to delete task");
        }
      } catch (error) {
        console.error('Error deleting item:', error);
        alert("Failed to delete task");
      }
    }
  };

  return (
    <div style={{ padding: 16, maxWidth: 1200, margin: "0 auto" }}>
      <h1 style={{ fontSize: 24, fontWeight: "bold", marginBottom: 16 }}>
        Development Strategy Whiteboard
      </h1>

      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 20, fontWeight: "bold", marginBottom: 8 }}>Whiteboard</h2>
        
        {/* Mode Toggle */}
        <div style={{ marginBottom: 16, display: "flex", gap: 8, alignItems: "center" }}>
          <button
            onClick={() => setIsDrawingMode(true)}
            style={{
              background: isDrawingMode ? "#3b82f6" : "#e5e7eb",
              color: isDrawingMode ? "white" : "#374151",
              padding: "8px 16px",
              borderRadius: 4,
              border: "none",
              cursor: "pointer",
              fontSize: "14px",
              fontWeight: isDrawingMode ? "bold" : "normal"
            }}
          >
            ✏️ Drawing Mode
          </button>
          <button
            onClick={() => setIsDrawingMode(false)}
            style={{
              background: !isDrawingMode ? "#3b82f6" : "#e5e7eb",
              color: !isDrawingMode ? "white" : "#374151",
              padding: "8px 16px",
              borderRadius: 4,
              border: "none",
              cursor: "pointer",
              fontSize: "14px",
              fontWeight: !isDrawingMode ? "bold" : "normal"
            }}
          >
            📝 Note Mode
          </button>
        </div>
        
        {/* Sticky Note Input - Only show in Note Mode */}
        {!isDrawingMode && (
          <div style={{ marginBottom: 16, display: "flex", gap: 8, alignItems: "center" }}>
            <input
              type="text"
              value={stickyNoteText}
              onChange={(e) => setStickyNoteText(e.target.value)}
              placeholder="Type your sticky note here..."
              style={{ 
                flex: 1, 
                padding: "8px 12px", 
                borderRadius: 4, 
                border: "1px solid #ccc",
                fontSize: "14px"
              }}
              onKeyPress={(e) => e.key === 'Enter' && addStickyNote()}
            />
            <button
              onClick={addStickyNote}
              style={{
                background: "#22c55e",
                color: "white",
                padding: "8px 16px",
                borderRadius: 4,
                border: "none",
                cursor: "pointer",
                fontSize: "14px"
              }}
            >
              Add Note
            </button>
          </div>
        )}

        {/* Canvas Container with Sticky Notes */}
        <div 
          style={{ position: "relative", display: "inline-block" }}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          <canvas
            ref={canvasRef}
            width={800}
            height={400}
            style={{ 
              border: "1px solid #ccc", 
              display: "block",
              pointerEvents: "auto" // Ensure canvas always receives pointer events
            }}
          />
          
          {/* Sticky Notes Overlay */}
          {stickyNotes.map((note) => (
            <div
              key={note.id}
              style={{
                position: "absolute",
                left: note.x,
                top: note.y,
                backgroundColor: note.color,
                padding: "12px",
                borderRadius: "4px",
                boxShadow: isDrawingMode ? "1px 1px 4px rgba(0,0,0,0.1)" : "2px 2px 8px rgba(0,0,0,0.2)",
                minWidth: "120px",
                maxWidth: "200px",
                cursor: isDrawingMode ? "default" : "move",
                fontSize: "12px",
                fontFamily: "Arial, sans-serif",
                wordWrap: "break-word",
                pointerEvents: isDrawingMode ? "none" : "auto", // Only interactive in Note Mode
                userSelect: "none", // Prevent text selection during drag
                opacity: isDrawingMode ? 0.7 : 1, // Make notes slightly transparent in drawing mode
                transition: "opacity 0.2s ease",
                zIndex: draggedNote?.id === note.id ? 1000 : 1 // Bring dragged note to front
              }}
              onMouseDown={(e) => handleMouseDown(e, note)}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "4px" }}>
                <div style={{ flex: 1, marginRight: "8px" }}>{note.text}</div>
                {!isDrawingMode && (
                  <button
                    onClick={() => deleteStickyNote(note.id)}
                    style={{
                      background: "rgba(255,255,255,0.7)",
                      border: "none",
                      borderRadius: "50%",
                      width: "16px",
                      height: "16px",
                      cursor: "pointer",
                      fontSize: "10px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center"
                    }}
                    title="Delete note"
                  >
                    ×
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
        
        <div style={{ marginTop: 8 }}>
          <button
            onClick={clearCanvas}
            style={{
              background: "#ef4444",
              color: "white",
              padding: "8px 16px",
              borderRadius: 4,
              border: "none",
              cursor: "pointer",
              marginRight: 8
            }}
          >
            Clear Whiteboard
          </button>
          <button
            onClick={() => setStickyNotes([])}
            style={{
              background: "#f59e0b",
              color: "white",
              padding: "8px 16px",
              borderRadius: 4,
              border: "none",
              cursor: "pointer"
            }}
          >
            Clear All Notes
          </button>
        </div>
      </div>

      {/* Add Task Form */}
      <div style={{ marginBottom: 24, padding: 16, border: "1px solid #ccc", borderRadius: 8 }}>
        <h2 style={{ fontSize: 20, fontWeight: "bold", marginBottom: 8 }}>Add New Task/Goal</h2>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          <select name="phase" value={newTask.phase} onChange={handleNewTaskChange} style={{ padding: 8, borderRadius: 4, border: "1px solid #ccc" }}>
            <option value="Design">Design</option>
            <option value="Development">Development</option>
            <option value="Alpha Usage">Alpha Usage</option>
            <option value="Beta Release (Web)">Beta Release (Web)</option>
          </select>
          <input name="goal" value={newTask.goal} onChange={handleNewTaskChange} placeholder="Goal" style={{ padding: 8, borderRadius: 4, border: "1px solid #ccc", flex: 1 }} />
          <input name="need" value={newTask.need} onChange={handleNewTaskChange} placeholder="Need" style={{ padding: 8, borderRadius: 4, border: "1px solid #ccc", flex: 1 }} />
          <input name="comments" value={newTask.comments} onChange={handleNewTaskChange} placeholder="Comments" style={{ padding: 8, borderRadius: 4, border: "1px solid #ccc", flex: 1 }} />
          <select name="execute" value={newTask.execute} onChange={handleNewTaskChange} style={{ padding: 8, borderRadius: 4, border: "1px solid #ccc" }}>
            <option value="Y">Y</option>
            <option value="N">N</option>
          </select>
          <select name="stage" value={newTask.stage} onChange={handleNewTaskChange} style={{ padding: 8, borderRadius: 4, border: "1px solid #ccc" }}>
            <option value="review">Review</option>
            <option value="in dev">In Dev</option>
            <option value="testing">Testing</option>
            <option value="complete">Complete</option>
            <option value="released">Released</option>
          </select>
          <select name="assigned_to" value={newTask.assigned_to} onChange={handleNewTaskChange} style={{ padding: 8, borderRadius: 4, border: "1px solid #ccc", flex: 1 }}>
            <option value="team">team</option>
            {team.map((member) => (
              <option key={member.id} value={member.username}>{member.username}</option>
            ))}
          </select>
          <input name="commentArea" value={newTask.commentArea} onChange={handleNewTaskChange} placeholder="Comment Area" style={{ padding: 8, borderRadius: 4, border: "1px solid #ccc", flex: 1 }} />
          <button onClick={addNewTask} style={{ background: "#22c55e", color: "white", padding: "8px 16px", borderRadius: 4, border: "none", cursor: "pointer" }}>Add</button>
        </div>
      </div>

      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 20, fontWeight: "bold", marginBottom: 8 }}>Invite Team Member</h2>
        <div style={{ display: "flex", gap: 8 }}>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Enter username"
            style={{ flex: 1, padding: 8, borderRadius: 4, border: "1px solid #ccc" }}
          />
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter email"
            style={{ flex: 1, padding: 8, borderRadius: 4, border: "1px solid #ccc" }}
          />
          <button
            onClick={addTeamMember}
            style={{
              background: "#3b82f6",
              color: "white",
              padding: "8px 16px",
              borderRadius: 4,
              border: "none",
              cursor: "pointer",
            }}
          >
            Add User
          </button>
        </div>
        <div style={{ marginTop: 8 }}>
          <h3 style={{ fontWeight: "bold" }}>Team Members:</h3>
          <ul>
            {team.map((member) => (
              <li key={member.id}>
                {member.username} ({member.email})
              </li>
            ))}
          </ul>
        </div>
      </div>

      {phases.map((phase) => (
        <div key={phase.name} style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: 20, fontWeight: "bold", marginBottom: 8 }}>{phase.name}</h2>
          <table style={{ width: "100%", borderCollapse: "collapse", border: "1px solid #ccc" }}>
            <thead>
              <tr style={{ background: "#f3f4f6" }}>
                <th style={{ border: "1px solid #ccc", padding: 8 }}>Goal</th>
                <th style={{ border: "1px solid #ccc", padding: 8 }}>Need</th>
                <th style={{ border: "1px solid #ccc", padding: 8 }}>Comments</th>
                <th style={{ border: "1px solid #ccc", padding: 8 }}>Execute</th>
                <th style={{ border: "1px solid #ccc", padding: 8 }}>Stage</th>
                <th style={{ border: "1px solid #ccc", padding: 8 }}>Comment Area</th>
                <th style={{ border: "1px solid #ccc", padding: 8 }}>Assigned To</th>
                <th style={{ border: "1px solid #ccc", padding: 8 }}>Delete</th>
              </tr>
            </thead>
            <tbody>
              {phase.items.map((item) => (
                <tr key={item.id}>
                  <td style={{ border: "1px solid #ccc", padding: 8 }}>
                    <input
                      type="text"
                      value={item.goal}
                      onChange={(e) => {
                        const newValue = e.target.value;
                        // Update local state immediately
                        setPhases(prevPhases => 
                          prevPhases.map(p => ({
                            ...p,
                            items: p.items.map(i => 
                              i.id === item.id ? { ...i, goal: newValue } : i
                            )
                          }))
                        );
                        // Debounce the API call
                        debouncedUpdatePhaseItem(item.id, phase.name, { ...item, goal: newValue });
                      }}
                      style={{ width: "100%", padding: 4 }}
                    />
                  </td>
                  <td style={{ border: "1px solid #ccc", padding: 8 }}>
                    <input
                      type="text"
                      value={item.need}
                      onChange={(e) => {
                        const newValue = e.target.value;
                        setPhases(prevPhases => 
                          prevPhases.map(p => ({
                            ...p,
                            items: p.items.map(i => 
                              i.id === item.id ? { ...i, need: newValue } : i
                            )
                          }))
                        );
                        debouncedUpdatePhaseItem(item.id, phase.name, { ...item, need: newValue });
                      }}
                      style={{ width: "100%", padding: 4 }}
                    />
                  </td>
                  <td style={{ border: "1px solid #ccc", padding: 8 }}>
                    <input
                      type="text"
                      value={item.comments}
                      onChange={(e) => {
                        const newValue = e.target.value;
                        setPhases(prevPhases => 
                          prevPhases.map(p => ({
                            ...p,
                            items: p.items.map(i => 
                              i.id === item.id ? { ...i, comments: newValue } : i
                            )
                          }))
                        );
                        debouncedUpdatePhaseItem(item.id, phase.name, { ...item, comments: newValue });
                      }}
                      style={{ width: "100%", padding: 4 }}
                    />
                  </td>
                  <td style={{ border: "1px solid #ccc", padding: 8 }}>
                    <select
                      value={item.execute}
                      onChange={(e) => {
                        const newValue = e.target.value;
                        setPhases(prevPhases => 
                          prevPhases.map(p => ({
                            ...p,
                            items: p.items.map(i => 
                              i.id === item.id ? { ...i, execute: newValue } : i
                            )
                          }))
                        );
                        updatePhaseItem(item.id, phase.name, { ...item, execute: newValue });
                      }}
                      style={{ width: "100%", padding: 4 }}
                    >
                      <option value="Y">Y</option>
                      <option value="N">N</option>
                    </select>
                  </td>
                  <td style={{ border: "1px solid #ccc", padding: 8 }}>
                    <select
                      value={item.stage}
                      onChange={(e) => {
                        const newValue = e.target.value;
                        setPhases(prevPhases => 
                          prevPhases.map(p => ({
                            ...p,
                            items: p.items.map(i => 
                              i.id === item.id ? { ...i, stage: newValue } : i
                            )
                          }))
                        );
                        updatePhaseItem(item.id, phase.name, { ...item, stage: newValue });
                      }}
                      style={{ width: "100%", padding: 4 }}
                    >
                      <option value="review">Review</option>
                      <option value="in dev">In Dev</option>
                      <option value="testing">Testing</option>
                      <option value="complete">Complete</option>
                      <option value="released">Released</option>
                    </select>
                  </td>
                  <td style={{ border: "1px solid #ccc", padding: 8 }}>
                    <textarea
                      value={item.commentArea}
                      onChange={(e) => {
                        const newValue = e.target.value;
                        setPhases(prevPhases => 
                          prevPhases.map(p => ({
                            ...p,
                            items: p.items.map(i => 
                              i.id === item.id ? { ...i, commentArea: newValue } : i
                            )
                          }))
                        );
                        debouncedUpdatePhaseItem(item.id, phase.name, { ...item, commentArea: newValue });
                      }}
                      style={{ width: "100%", padding: 4 }}
                    />
                  </td>
                  <td style={{ border: "1px solid #ccc", padding: 8 }}>
                    <select
                      value={item.assigned_to || "team"}
                      onChange={(e) => {
                        const newValue = e.target.value;
                        setPhases(prevPhases => 
                          prevPhases.map(p => ({
                            ...p,
                            items: p.items.map(i => 
                              i.id === item.id ? { ...i, assigned_to: newValue } : i
                            )
                          }))
                        );
                        updatePhaseItem(item.id, phase.name, { ...item, assigned_to: newValue });
                      }}
                      style={{ width: "100%", padding: 4 }}
                    >
                      <option value="team">team</option>
                      {team.map((member) => (
                        <option key={member.id} value={member.username}>{member.username}</option>
                      ))}
                    </select>
                  </td>
                  <td style={{ border: "1px solid #ccc", padding: 8, textAlign: "center" }}>
                    <button
                      onClick={() => deletePhaseItem(item.id)}
                      style={{
                        background: "#ef4444",
                        color: "white",
                        border: "none",
                        borderRadius: "4px",
                        padding: "4px 8px",
                        cursor: "pointer",
                        fontSize: "12px"
                      }}
                      title="Delete this task"
                    >
                      🗑️
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
}

export default App;
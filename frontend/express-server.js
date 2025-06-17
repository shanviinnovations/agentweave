const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const axios = require('axios');
const multer = require('multer');
const upload = multer();
const { exec, spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// Load the shared configuration
const configPath = path.resolve(__dirname, '../config.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
const EXPRESS_PORT = config.EXPRESS_PORT;
const PY_BACKEND_PORT = config.PY_BACKEND_PORT;

// Expose port config to process.env so React app can access it
process.env.REACT_APP_EXPRESS_PORT = EXPRESS_PORT;
process.env.REACT_APP_PY_BACKEND_PORT = PY_BACKEND_PORT;
process.env.REACT_APP_ENGINE_PORT = config.ENGINE_PORT;

const app = express();
const PORT = EXPRESS_PORT;
const PY_BACKEND = `http://localhost:${PY_BACKEND_PORT}`;

app.use(cors());
app.use(bodyParser.json());

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Proxy: Create a new task (no file upload for now)
app.post('/api/task', async (req, res) => {
  try {
    const { prompt, sessionId, usePushNotifications, agentName, agentCard } = req.body;
    //console.log('[express-server] Received task request:', { prompt, sessionId, usePushNotifications, agentName, agentCard });
    // Generate a unique taskId
    const taskId = require('crypto').randomUUID ? require('crypto').randomUUID() : require('crypto').randomBytes(16).toString('hex');
    // Build message payload
    const message = {
      role: 'user',
      parts: [
        { type: 'text', text: prompt },
      ],
    };
    const payload = {
      id: taskId,
      sessionId,
      acceptedOutputModes: ['text'],
      message,
    };
    // Pass agentName or agentCard if provided
    if (agentName) payload.agentName = agentName;
    if (agentCard) payload.agentCard = agentCard;
    if (usePushNotifications) {
      payload.pushNotification = {
        url: req.body.pushNotificationUrl,
        authentication: { schemes: ['bearer'] },
      };
    }
    // Forward to Python backend
    // Convert payload to form-data for FastAPI compatibility
    const FormData = require('form-data');
    const form = new FormData();
    for (const key in payload) {
      if (payload[key] !== undefined && payload[key] !== null) {
        // Stringify objects (message, agentCard, etc.)
        if (typeof payload[key] === 'object') {
          form.append(key, JSON.stringify(payload[key]));
        } else {
          form.append(key, payload[key]);
        }
      }
    }
    //console.log('[express-server] Forwarding task request to Python backend:', form.getHeaders());
    //console.log('[express-server] Form data:', form);
    const response = await axios.post(`${PY_BACKEND}/task`, form, { headers: form.getHeaders() });
    res.json(response.data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Proxy: Get agent card
app.get('/api/agent/card', async (req, res) => {
  try {
    const response = await axios.get(`${PY_BACKEND}/agent/card`);
    res.json(response.data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Proxy: Create a new agent
app.post('/api/agent', async (req, res) => {
  try {
    // Forward the agent creation request to the Python backend
    const response = await axios.post(`${PY_BACKEND}/agent`, req.body);
    res.json(response.data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Proxy: Delete an agent by name
app.delete('/api/agent/:agent_name', async (req, res) => {
  try {
    const { agent_name } = req.params;
    const response = await axios.delete(`${PY_BACKEND}/agent/${agent_name}`);
    res.json(response.data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Proxy: Refresh a single agent by name
app.post('/api/agent/:agent_name/refresh', async (req, res) => {
  try {
    const { agent_name } = req.params;
    const response = await axios.post(`${PY_BACKEND}/agent/${agent_name}/refresh`);
    res.json(response.data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Proxy: Discovery server health check
app.get('/api/discovery-health', async (req, res) => {
  try {
    console.log('[express-server] Proxying /api/discovery-health to', `${PY_BACKEND}/discovery-health`);
    const response = await axios.get(`${PY_BACKEND}/discovery-health`);
    console.log('[express-server] /api/discovery-health backend response:', response.data);
    res.json(response.data);
  } catch (err) {
    console.error('[express-server] /api/discovery-health error:', err.message, err.response?.data);
    res.status(500).json({ error: 'Discovery health check failed', detail: err.message });
  }
});

// Proxy: Fetch list of running agent servers from discovery server
app.get('/api/agent-servers', async (req, res) => {
  try {
    const response = await axios.get(`${PY_BACKEND}/agent-servers`);
    res.json(response.data);
  } catch (err) {
    console.log('[express-server] Python backend unavailable for /api/agent-servers:', err.message);
    // Return empty agents list instead of error to prevent frontend runtime errors
    res.json({ agents: [], backend_status: 'unavailable', backend_error: err.message });
  }
});

// Proxy: Fetch LLM provider config from backend
app.get('/api/llm-provider-config', async (req, res) => {
  try {
    const response = await axios.get(`${PY_BACKEND}/llm-provider-config`);
    res.json(response.data);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch LLM provider config', detail: err.message });
  }
});

// Proxy: Save LLM provider config to backend
app.post('/api/llm-provider-config', async (req, res) => {
  try {
    const response = await axios.post(`${PY_BACKEND}/llm-provider-config`, req.body);
    res.json(response.data);
  } catch (err) {
    res.status(500).json({ error: 'Failed to save LLM provider config', detail: err.message });
  }
});

// Start backend engine
app.post('/api/start-backend', (req, res) => {
  // Use --background so the script runs backend in background and exits for Express
  exec('sh scripts/start-backend.sh --background', { cwd: __dirname + '/../' }, (error, stdout, stderr) => {
    if (error) {
      // Clean up the error message for the frontend
      let cleanError = stderr || error.message || '';
      // Only show the first relevant error line (e.g., Docker/MongoDB)
      if (cleanError) {
        // Remove ANSI color codes and trim
        cleanError = cleanError.replace(/\x1b\[[0-9;]*m/g, '').trim();
        // Show only the first non-empty line
        const lines = cleanError.split('\n').filter(line => line.trim() !== '');
        if (lines.length > 0) {
          cleanError = lines[0];
        }
      }
      res.status(500).json({ success: false, error: cleanError, output: stdout });
    } else {
      res.json({ success: true, output: stdout });
    }
  });
});

// Stop backend engine
app.post('/api/stop-backend', async (req, res) => {
  try {
    // Read the engine port from shared config
    const fs = require('fs');
    const path = require('path');
    let enginePort = 9500; // default fallback
    
    try {
      const configPath = path.join(__dirname, '../config.json');
      const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      enginePort = config.ENGINE_PORT || 9500;
    } catch (configError) {
      console.log('Could not read config, using default engine port 9500');
    }
    
    // Call the backend shutdown API directly
    const response = await axios.post(`http://localhost:${enginePort}/api/shutdown`, {}, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 10000 // 10 second timeout
    });
    
    if (response.status === 200) {
      const result = response.data;
      res.json({
        success: true,
        message: result.message || 'Backend shutdown initiated',
        output: `✓ Graceful shutdown initiated via API on port ${enginePort}\n${result.message}`
      });
    } else {
      res.status(500).json({
        success: false,
        error: `Shutdown API failed with status ${response.status}`,
        detail: response.data
      });
    }
  } catch (error) {
    // If API call fails, return error
    console.error('Shutdown API error:', error);
    let errorMessage = 'Failed to connect to backend shutdown API';
    let detail = error.message;
    
    if (error.code === 'ECONNREFUSED') {
      errorMessage = 'Backend is not running or already stopped';
      detail = 'Connection refused - the backend may already be shut down';
    } else if (error.code === 'ETIMEDOUT') {
      errorMessage = 'Shutdown request timed out';
      detail = 'The backend did not respond within 10 seconds';
    }
    
    res.status(500).json({
      success: false,
      error: errorMessage,
      detail: detail,
      suggestion: 'The backend may already be stopped or unreachable.'
    });
  }
});

app.listen(PORT, () => {
  console.log(`Express server running on http://localhost:${PORT}`);
});

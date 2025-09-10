const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 3001;

// Enable CORS for all origins during development
app.use(cors());
app.use(express.json());

// Serve static audio files
const audioDir = path.join(__dirname, 'public', 'audio');
app.use('/audio', express.static(audioDir));

// API endpoint to list stems
app.get('/api/stems', (req, res) => {
  fs.readdir(audioDir, (err, files) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to read audio directory' });
    }
    const stems = files
      .filter((file) => file.toLowerCase().endsWith('.mp3'))
      .map((file) => ({
        file,
        label: path
          .basename(file, '.mp3')
          .replace(/[_-]+/g, ' ')
          .replace(/\b\w/g, (l) => l.toUpperCase()),
      }));
    res.json(stems);
  });
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});

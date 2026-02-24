import express from 'express';
import cors from 'cors';

const app = express();
app.use(cors());
app.use(express.json());

app.get('/api/test', (req, res) => {
  res.json({ message: '✅ API is working!' });
});

app.get('/api/business/search', (req, res) => {
  const { query } = req.query;
  res.json({
    success: true,
    data: [
      { id: 1, name: `Business: ${query || 'test'}`, category: 'tech', location: 'Abidjan' }
    ],
    total: 1,
    totalInDatabase: 10
  });
});

const PORT = 5003;
app.listen(PORT, () => {
  console.log(`🚀 Simple API running on http://localhost:${PORT}`);
  console.log(`🔗 Test: http://localhost:${PORT}/api/test`);
  console.log(`🔗 Search: http://localhost:${PORT}/api/business/search?query=tech`);
});

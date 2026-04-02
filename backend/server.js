const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

app.use(cors());
app.use(express.json());

app.use('/api/leads', require('./routes/leads'));
app.use('/api/telecallers', require('./routes/telecallers'));
app.use('/api/auth', require('./routes/auth'));
app.use('/api', require('./routes/auth'));
app.use('/api/assignment', require('./routes/assignment'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/telecaller-dashboard', require('./routes/telecaller-dashboard'));

app.get('/', (req, res) => res.json({ status: 'CRM API running' }));

io.on('connection', (socket) => {
  socket.on('disconnect', () => {});
});

const { startNotificationScheduler } = require('./utils/pushNotify');

mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('Connected to MongoDB successfully');
    startNotificationScheduler();
    server.listen(process.env.PORT || 5000, () =>
      console.log('Advanced CRM Backend Running on port 5000')
    );
  })
  .catch(err => {
    console.error('MongoDB connection error:', err.message);
    process.exit(1);
  });
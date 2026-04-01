const mongoose = require('mongoose');
require('dotenv').config();
const User = require('./models/User');

mongoose.connect(process.env.MONGO_URI).then(async () => {
  await User.create({
    name: 'Admin',
    email: 'admin@crm.com',
    password: 'admin123',
    role: 'admin'
  });
  console.log('User created!');
  process.exit();
});
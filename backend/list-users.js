// Script to list all users
const mongoose = require('mongoose');
require('dotenv').config();

const User = require('./src/models/User.model');

const listUsers = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    const users = await User.find({}).select('name email role isActive');
    
    if (users.length === 0) {
      console.log('❌ No users found in database');
    } else {
      console.log('📋 Available Users:\n');
      users.forEach((user, index) => {
        console.log(`${index + 1}. Role: ${user.role.toUpperCase()}`);
        console.log(`   Email: ${user.email}`);
        console.log(`   Name: ${user.name}`);
        console.log(`   Active: ${user.isActive ? '✅' : '❌'}`);
        console.log('');
      });
      
      console.log('\n💡 Common default passwords to try:');
      console.log('   - admin123');
      console.log('   - password123');
      console.log('   - 12345678\n');
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
};

listUsers();

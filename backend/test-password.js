const bcrypt = require('bcrypt');
const mongoose = require('mongoose');
require('dotenv').config();

const User = require('./src/models/User.model');

const testPassword = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    const user = await User.findOne({ email: 'admin@college.edu' }).select('+password');
    
    if (!user) {
      console.log('❌ User not found');
      process.exit(1);
    }

    console.log('User found:', user.email);
    console.log('Active:', user.isActive);
    console.log('Password hash:', user.password);
    console.log('\nTesting password: admin123');

    const isMatch = await bcrypt.compare('admin123', user.password);
    console.log('Password match:', isMatch ? '✅ YES' : '❌ NO');

    // Test various passwords
    console.log('\nTesting other common passwords:');
    const passwords = ['password123', '12345678', 'Admin123', 'admin'];
    for (const pwd of passwords) {
      const match = await bcrypt.compare(pwd, user.password);
      console.log(`  ${pwd}: ${match ? '✅' : '❌'}`);
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
};

testPassword();

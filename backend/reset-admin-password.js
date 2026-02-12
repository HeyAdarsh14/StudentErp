// Script to reset admin password
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
require('dotenv').config();

const User = require('./src/models/User.model');

const resetPassword = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Find admin user
    const admin = await User.findOne({ email: 'admin@college.edu' });
    
    if (!admin) {
      console.log('❌ Admin user not found!');
      process.exit(1);
    }

    // Set new password
    const newPassword = 'Admin@123';
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    admin.password = hashedPassword;
    admin.isActive = true;
    admin.isEmailVerified = true;
    await admin.save();

    console.log('✅ Password reset successful!\n');
    console.log('📧 Login Credentials:');
    console.log('   Email: admin@college.edu');
    console.log('   Password: Admin@123');
    console.log('\n🔄 Please refresh your browser and try logging in now.\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
};

resetPassword();

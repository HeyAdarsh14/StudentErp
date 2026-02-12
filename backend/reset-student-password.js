// Script to reset student password
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
require('dotenv').config();

const User = require('./src/models/User.model');

const resetPassword = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Reset admin password
    const admin = await User.findOne({ email: 'admin@college.edu' });
    if (admin) {
      admin.password = await bcrypt.hash('Admin@123', 10);
      admin.isActive = true;
      admin.isEmailVerified = true;
      await admin.save();
      console.log('✅ Admin password reset!');
    }

    // Reset student password
    const student = await User.findOne({ email: 'student@college.edu' });
    if (student) {
      student.password = await bcrypt.hash('Student@123', 10);
      student.isActive = true;
      student.isEmailVerified = true;
      await student.save();
      console.log('✅ Student password reset!');
    }

    console.log('\n📧 Login Credentials:\n');
    console.log('👨‍💼 ADMIN:');
    console.log('   Email: admin@college.edu');
    console.log('   Password: Admin@123\n');
    
    console.log('🎓 STUDENT:');
    console.log('   Email: student@college.edu');
    console.log('   Password: Student@123\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
};

resetPassword();

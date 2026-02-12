const bcrypt = require('bcrypt');
const mongoose = require('mongoose');
require('dotenv').config();

const User = require('./src/models/User.model');

const resetPassword = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    const newPassword = 'admin123';
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update all users with the new password
    const users = ['admin@college.edu', 'superadmin@college.edu', 'faculty@college.edu', 'student@college.edu'];
    
    for (const email of users) {
      await User.findOneAndUpdate(
        { email },
        { password: hashedPassword },
        { new: true }
      );
      console.log(`✅ Password reset for: ${email}`);
    }

    console.log('\n📧 All user passwords have been reset to: admin123');
    console.log('\n🔑 You can now login with:');
    console.log('   Email: admin@college.edu (or any user above)');
    console.log('   Password: admin123\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
};

resetPassword();

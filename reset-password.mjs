import { initializeApp } from 'firebase/app';
import { getAuth, sendPasswordResetEmail } from 'firebase/auth';

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDRwVnC_TmgNglmF4v_eRV0ePNPGOYYdNA",
  authDomain: "life-arrow-v1.firebaseapp.com",
  projectId: "life-arrow-v1",
  storageBucket: "life-arrow-v1.firebasestorage.app",
  messagingSenderId: "909801207914",
  appId: "1:909801207914:web:6781dffb71a74aa33bf213"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

async function resetPassword(email) {
  try {
    console.log(`📧 Sending password reset email to: ${email}`);
    await sendPasswordResetEmail(auth, email);
    console.log('✅ Password reset email sent successfully!');
    console.log('📬 Check your email inbox (including spam folder)');
    console.log('🔗 Click the link in the email to reset your password');
  } catch (error) {
    console.error('❌ Error sending password reset email:', error.code, error.message);
  }
}

// Get email from command line argument
const email = process.argv[2];

if (!email) {
  console.log('Usage: node reset-password.mjs <email>');
  console.log('Example: node reset-password.mjs mitzi@xinox.co.za');
  process.exit(1);
}

resetPassword(email); 
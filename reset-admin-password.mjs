import { initializeApp } from 'firebase/app';
import { getAuth, sendPasswordResetEmail } from 'firebase/auth';

// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyCQHOGE6wjx-TFWHaOCIKbA7y9-IWN_J_k",
  authDomain: "life-arrow-v1.firebaseapp.com",
  projectId: "life-arrow-v1",
  storageBucket: "life-arrow-v1.firebasestorage.app",
  messagingSenderId: "810491503055",
  appId: "1:810491503055:web:dcb3e9e3dc5c8c3e3bb4b9"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

async function resetAdminPassword() {
  const adminEmail = 'marietjie@lifearrow.biz';
  
  try {
    console.log(`🔧 Sending password reset email to ${adminEmail}...`);
    
    await sendPasswordResetEmail(auth, adminEmail);
    
    console.log(`✅ Password reset email sent successfully!`);
    console.log(`📧 Check ${adminEmail} inbox and spam folder`);
    console.log(`🔗 Click the link in the email to set a new password`);
    console.log(`⏰ Password reset link expires in 24 hours`);
    
  } catch (error) {
    console.error(`❌ Error sending password reset:`, error.message);
    
    if (error.code === 'auth/user-not-found') {
      console.log(`🚨 Account for ${adminEmail} does not exist in Firebase Auth`);
      console.log(`💡 The admin account creation may have failed during promotion`);
      console.log(`🔧 Recommended action: Re-promote the staff member to admin`);
    } else if (error.code === 'auth/invalid-email') {
      console.log(`🚨 Invalid email address: ${adminEmail}`);
    } else if (error.code === 'auth/too-many-requests') {
      console.log(`🚨 Too many password reset requests. Try again later.`);
    }
  }
}

resetAdminPassword(); 
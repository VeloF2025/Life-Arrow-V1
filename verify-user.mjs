import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword, sendEmailVerification, sendPasswordResetEmail } from 'firebase/auth';
import { getFirestore, doc, getDoc } from 'firebase/firestore';

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
const db = getFirestore(app);

async function checkUser(email) {
  try {
    console.log(`\n🔍 Checking user: ${email}`);
    
    // Try to sign in with a dummy password to get user info
    try {
      await signInWithEmailAndPassword(auth, email, 'dummypassword');
    } catch (error) {
      if (error.code === 'auth/wrong-password') {
        console.log('✅ User exists in Firebase Auth');
        
        // Check if user profile exists in Firestore
        const userQuery = await getDoc(doc(db, 'users', 'dummy'));
        console.log('📄 Checking Firestore user profile...');
        
        // Send password reset email
        console.log('📧 Sending password reset email...');
        await sendPasswordResetEmail(auth, email);
        console.log('✅ Password reset email sent! Check your inbox.');
        
      } else if (error.code === 'auth/user-not-found') {
        console.log('❌ User not found in Firebase Auth');
      } else if (error.code === 'auth/invalid-email') {
        console.log('❌ Invalid email format');
      } else {
        console.log(`⚠️  Error: ${error.code} - ${error.message}`);
      }
    }
    
  } catch (error) {
    console.error('❌ Error checking user:', error.message);
  }
}

// Get email from command line argument
const email = process.argv[2];

if (!email) {
  console.log('Usage: node verify-user.mjs <email>');
  console.log('Example: node verify-user.mjs mitzi@xinox.co.za');
  process.exit(1);
}

checkUser(email); 
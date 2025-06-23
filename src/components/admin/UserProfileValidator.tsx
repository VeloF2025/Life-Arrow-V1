import React, { useState } from 'react';
import { doc, setDoc, getDoc, collection, getDocs, query, where } from 'firebase/firestore';
import { createUserWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { auth, db } from '../../lib/firebase';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import LoadingSpinner from '../ui/LoadingSpinner';
import { 
  ExclamationTriangleIcon,
  CheckCircleIcon,
  UserIcon,
  ShieldCheckIcon,
  EnvelopeIcon,
  WrenchIcon
} from '@heroicons/react/24/outline';

interface UserProfileIssue {
  uid: string;
  email: string;
  firstName: string;
  lastName: string;
  hasUserDoc: boolean;
  hasAdminProfile: boolean;
  hasStaffRecord: boolean;
  role: string;
  issues: string[];
}

export function UserProfileValidator() {
  const [loading, setLoading] = useState(false);
  const [issues, setIssues] = useState<UserProfileIssue[]>([]);
  const [fixing, setFixing] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const validateProfiles = async () => {
    setLoading(true);
    setMessage(null);
    setIssues([]);

    try {
      const foundIssues: UserProfileIssue[] = [];

      // Check staff members who were promoted to admin
      const staffSnapshot = await getDocs(collection(db, 'staff'));
      
      for (const staffDoc of staffSnapshot.docs) {
        const staffData = staffDoc.data();
        
        if (staffData.hasAdminAccount || staffData.promotedToAdmin) {
          const userIssues: string[] = [];
          
          // Check if they have an adminUserId
          if (!staffData.adminUserId) {
            userIssues.push('Missing adminUserId in staff record');
          }
          
          // If they have an adminUserId, check if user profile exists
          let hasUserDoc = false;
          let hasAdminProfile = false;
          
          if (staffData.adminUserId) {
            try {
              const userDoc = await getDoc(doc(db, 'users', staffData.adminUserId));
              hasUserDoc = userDoc.exists();
              
              if (!hasUserDoc) {
                userIssues.push('Missing user document in users collection');
              }
              
              const adminDoc = await getDoc(doc(db, 'adminProfiles', staffData.adminUserId));
              hasAdminProfile = adminDoc.exists();
              
              if (!hasAdminProfile) {
                userIssues.push('Missing admin profile document');
              }
            } catch (error) {
              userIssues.push(`Error checking profiles: ${error}`);
            }
          }
          
          if (userIssues.length > 0) {
            foundIssues.push({
              uid: staffData.adminUserId || 'unknown',
              email: staffData.email,
              firstName: staffData.firstName,
              lastName: staffData.lastName,
              hasUserDoc,
              hasAdminProfile,
              hasStaffRecord: true,
              role: 'admin',
              issues: userIssues
            });
          }
        }
      }

      // Also check known problematic users from auth export
      const knownProblematicUsers = [
        { uid: "FcZTJXl8k0WDttLIg4R0EMQn2hB3", email: "marietjie@lifearrow.biz", firstName: "Marietjie", lastName: "Potgieter" }
      ];

      for (const user of knownProblematicUsers) {
        const userIssues: string[] = [];
        
        try {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          const hasUserDoc = userDoc.exists();
          
          if (!hasUserDoc) {
            userIssues.push('Missing user document');
          }
          
          const adminDoc = await getDoc(doc(db, 'adminProfiles', user.uid));
          const hasAdminProfile = adminDoc.exists();
          
          if (!hasAdminProfile) {
            userIssues.push('Missing admin profile');
          }
          
          if (userIssues.length > 0) {
            foundIssues.push({
              uid: user.uid,
              email: user.email,
              firstName: user.firstName,
              lastName: user.lastName,
              hasUserDoc,
              hasAdminProfile,
              hasStaffRecord: false,
              role: 'admin',
              issues: userIssues
            });
          }
        } catch (error) {
          foundIssues.push({
            uid: user.uid,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            hasUserDoc: false,
            hasAdminProfile: false,
            hasStaffRecord: false,
            role: 'admin',
            issues: [`Error checking profiles: ${error}`]
          });
        }
      }

      setIssues(foundIssues);
      
      if (foundIssues.length === 0) {
        setMessage({ type: 'success', text: 'All user profiles are valid! No issues found.' });
      } else {
        setMessage({ type: 'error', text: `Found ${foundIssues.length} user(s) with profile issues.` });
      }

    } catch (error) {
      console.error('Error validating profiles:', error);
      setMessage({ type: 'error', text: 'Error validating profiles. Check console for details.' });
    } finally {
      setLoading(false);
    }
  };

  const fixUserProfile = async (issue: UserProfileIssue) => {
    setFixing(issue.uid);
    setMessage(null);

    try {
      // Create missing user document
      if (!issue.hasUserDoc) {
        await setDoc(doc(db, 'users', issue.uid), {
          id: issue.uid,
          email: issue.email,
          firstName: issue.firstName,
          lastName: issue.lastName,
          role: 'admin',
          avatar: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        }, { merge: true });
        
        console.log('✅ User document created');
      }

      // Create missing admin profile
      if (!issue.hasAdminProfile) {
        await setDoc(doc(db, 'adminProfiles', issue.uid), {
          id: issue.uid,
          email: issue.email,
          firstName: issue.firstName,
          lastName: issue.lastName,
          role: 'admin',
          specializations: [],
          credentials: [],
          bio: 'Repaired admin profile',
          experience: 0,
          clients: [],
          availability: [],
          permissions: {
            canCreateAdmins: false,
            canDeleteAdmins: false,
            canManageSystem: false,
            canViewAllData: false,
          },
          settings: {
            appointmentDuration: 60,
            bufferTime: 15,
            maxDailyAppointments: 8,
            autoAcceptBookings: false,
          },
          centreIds: [],
          repairedAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        }, { merge: true });
        
        console.log('✅ Admin profile created');
      }

      // Send password reset email
      try {
        await sendPasswordResetEmail(auth, issue.email);
        console.log('✅ Password reset email sent');
      } catch (emailError: any) {
        if (emailError.code === 'auth/user-not-found') {
          // The Firebase Auth account doesn't exist, need to create it
          console.log('🔧 Firebase Auth account missing, creating...');
          
          try {
            const tempPassword = `TempAdmin${Math.random().toString(36).slice(2)}${Date.now()}`;
            const userCredential = await createUserWithEmailAndPassword(auth, issue.email, tempPassword);
            
            console.log('✅ Firebase Auth account created');
            
            // If the UID is different, we need to update our documents
            if (userCredential.user.uid !== issue.uid) {
              console.log('⚠️ UID mismatch - updating documents with new UID');
              
              // Create documents with the new UID
              await setDoc(doc(db, 'users', userCredential.user.uid), {
                id: userCredential.user.uid,
                email: issue.email,
                firstName: issue.firstName,
                lastName: issue.lastName,
                role: 'admin',
                avatar: null,
                createdAt: new Date(),
                updatedAt: new Date(),
              });

              await setDoc(doc(db, 'adminProfiles', userCredential.user.uid), {
                id: userCredential.user.uid,
                email: issue.email,
                firstName: issue.firstName,
                lastName: issue.lastName,
                role: 'admin',
                specializations: [],
                credentials: [],
                bio: 'Recreated admin profile with new UID',
                experience: 0,
                clients: [],
                availability: [],
                permissions: {
                  canCreateAdmins: false,
                  canDeleteAdmins: false,
                  canManageSystem: false,
                  canViewAllData: false,
                },
                settings: {
                  appointmentDuration: 60,
                  bufferTime: 15,
                  maxDailyAppointments: 8,
                  autoAcceptBookings: false,
                },
                centreIds: [],
                recreatedAt: new Date(),
                createdAt: new Date(),
                updatedAt: new Date(),
              });
              
              // Update staff record if it exists
              if (issue.hasStaffRecord) {
                const staffQuery = query(collection(db, 'staff'), where('email', '==', issue.email));
                const staffSnapshot = await getDocs(staffQuery);
                
                if (!staffSnapshot.empty) {
                  const staffDoc = staffSnapshot.docs[0];
                  await setDoc(doc(db, 'staff', staffDoc.id), {
                    ...staffDoc.data(),
                    adminUserId: userCredential.user.uid,
                    updatedAt: new Date()
                  }, { merge: true });
                  
                  console.log('✅ Staff record updated with new UID');
                }
              }
              
              console.log(`✅ All documents updated with new UID: ${userCredential.user.uid}`);
            }
            
            // Send password reset email
            await sendPasswordResetEmail(auth, issue.email);
            console.log('✅ Password reset email sent');
            
          } catch (createError) {
            console.error('❌ Error creating Firebase Auth account:', createError);
            throw createError;
          }
        } else {
          throw emailError;
        }
      }

      setMessage({ type: 'success', text: `Successfully fixed profile for ${issue.firstName} ${issue.lastName}!` });
      
      // Refresh the validation
      await validateProfiles();
      
    } catch (error) {
      console.error('Error fixing profile:', error);
      setMessage({ type: 'error', text: `Error fixing profile: ${error}` });
    } finally {
      setFixing(null);
    }
  };

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <WrenchIcon className="w-6 h-6 text-blue-600 mr-3" />
          <h2 className="text-xl font-bold text-gray-900">User Profile Validator</h2>
        </div>
        <Button
          onClick={validateProfiles}
          disabled={loading}
          className="bg-blue-600 hover:bg-blue-700"
        >
          {loading ? (
            <>
              <LoadingSpinner className="w-4 h-4 mr-2" />
              Validating...
            </>
          ) : (
            <>
              <CheckCircleIcon className="w-4 h-4 mr-2" />
              Validate Profiles
            </>
          )}
        </Button>
      </div>

      <p className="text-gray-600 mb-6">
        This tool checks for missing user profiles and admin profiles for staff members who were promoted to admin roles.
        It identifies accounts that exist in Firebase Auth but are missing required Firestore documents.
      </p>

      {message && (
        <div className={`p-4 rounded-lg mb-6 ${
          message.type === 'success' 
            ? 'bg-green-50 border border-green-200 text-green-800' 
            : 'bg-red-50 border border-red-200 text-red-800'
        }`}>
          <div className="flex items-center">
            {message.type === 'success' ? (
              <CheckCircleIcon className="w-5 h-5 mr-2" />
            ) : (
              <ExclamationTriangleIcon className="w-5 h-5 mr-2" />
            )}
            {message.text}
          </div>
        </div>
      )}

      {issues.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">Profile Issues Found:</h3>
          
          {issues.map((issue, index) => (
            <div key={index} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center mb-2">
                    <UserIcon className="w-5 h-5 text-gray-500 mr-2" />
                    <h4 className="text-lg font-medium text-gray-900">
                      {issue.firstName} {issue.lastName}
                    </h4>
                    <span className="ml-2 px-2 py-1 bg-red-100 text-red-800 text-xs rounded-full">
                      {issue.issues.length} issue{issue.issues.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                  
                  <p className="text-gray-600 mb-2">📧 {issue.email}</p>
                  <p className="text-gray-600 mb-2">🆔 {issue.uid}</p>
                  
                  <div className="space-y-1 mb-3">
                    <div className="flex items-center text-sm">
                      <span className={`w-3 h-3 rounded-full mr-2 ${issue.hasUserDoc ? 'bg-green-500' : 'bg-red-500'}`} />
                      Users Document: {issue.hasUserDoc ? '✅ Exists' : '❌ Missing'}
                    </div>
                    <div className="flex items-center text-sm">
                      <span className={`w-3 h-3 rounded-full mr-2 ${issue.hasAdminProfile ? 'bg-green-500' : 'bg-red-500'}`} />
                      Admin Profile: {issue.hasAdminProfile ? '✅ Exists' : '❌ Missing'}
                    </div>
                    <div className="flex items-center text-sm">
                      <span className={`w-3 h-3 rounded-full mr-2 ${issue.hasStaffRecord ? 'bg-green-500' : 'bg-yellow-500'}`} />
                      Staff Record: {issue.hasStaffRecord ? '✅ Found' : '⚠️ Not found'}
                    </div>
                  </div>
                  
                  <div className="text-sm text-red-600">
                    <strong>Issues:</strong>
                    <ul className="list-disc list-inside ml-2">
                      {issue.issues.map((issueText, issueIndex) => (
                        <li key={issueIndex}>{issueText}</li>
                      ))}
                    </ul>
                  </div>
                </div>
                
                <Button
                  onClick={() => fixUserProfile(issue)}
                  disabled={fixing !== null}
                  className="bg-green-600 hover:bg-green-700 ml-4"
                >
                  {fixing === issue.uid ? (
                    <>
                      <LoadingSpinner className="w-4 h-4 mr-2" />
                      Fixing...
                    </>
                  ) : (
                    <>
                      <WrenchIcon className="w-4 h-4 mr-2" />
                      Fix Profile
                    </>
                  )}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
} 
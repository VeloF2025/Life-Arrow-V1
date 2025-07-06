import { useState, useEffect } from 'react';
import { 
  collection, 
  getDocs, 
  CollectionReference
} from 'firebase/firestore';
import type { DocumentData } from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { UserProfile } from '../types';

interface DashboardStats {
  activeClients: number;
  todayAppointments: number;
  thisMonthAppointments: number;
  completionRate: number;
  monthlyRevenue: number;
  clientsGrowth: number;
  appointmentsGrowth: number;
  revenueGrowth: number;
  completionGrowth: number;
}

export const useDashboardData = (profile: UserProfile | null, options: { enabled?: boolean } = { enabled: true }) => {
  const [stats, setStats] = useState<DashboardStats>({
    activeClients: 0,
    todayAppointments: 0,
    thisMonthAppointments: 0,
    completionRate: 0,
    monthlyRevenue: 0,
    clientsGrowth: 0,
    appointmentsGrowth: 0,
    revenueGrowth: 0,
    completionGrowth: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!profile || options.enabled === false) {
      setLoading(false);
      return;
    }

    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        setError(null);
        console.log('🔍 Fetching dashboard data for role:', profile.role);

        // Get basic collections first (without complex queries)
        const clientsRef = collection(db, 'clients') as CollectionReference<DocumentData>;
        const appointmentsRef = collection(db, 'appointments') as CollectionReference<DocumentData>;

        // Simplified queries that don't require indexes
        console.log('👥 Fetching active clients...');
        const clientsSnapshot = await getDocs(clientsRef);
        
        console.log('📅 Fetching all appointments...');
        const appointmentsSnapshot = await getDocs(appointmentsRef);

        // Process client data
        const allClients = clientsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        console.log(`📊 Found ${allClients.length} total clients`);

        // Filter active clients in memory (simpler than Firestore query)
        const activeClients = allClients.filter((client: any) => 
          client.status === 'active' || !client.status // default to active if no status
        ).length;

        // Process appointment data
        const allAppointments = appointmentsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        console.log(`📊 Found ${allAppointments.length} total appointments`);

        // Get today's date range
        const today = new Date();
        const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        const endOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

        // Filter today's appointments in memory
        const todayAppointments = allAppointments.filter((appointment: any) => {
          const appointmentDate = appointment.appointmentDate?.toDate?.() || new Date(appointment.appointmentDate);
          return appointmentDate >= startOfToday && appointmentDate < endOfToday;
        }).length;

        // Get this month's date range
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

        // Filter this month's appointments in memory
        const thisMonthAppointments = allAppointments.filter((appointment: any) => {
          const appointmentDate = appointment.appointmentDate?.toDate?.() || new Date(appointment.appointmentDate);
          return appointmentDate >= startOfMonth && appointmentDate <= endOfMonth;
        });

        // Calculate completion rate
        const completedThisMonth = thisMonthAppointments.filter((appointment: any) => 
          appointment.status === 'completed'
        ).length;
        const completionRate = thisMonthAppointments.length > 0 
          ? (completedThisMonth / thisMonthAppointments.length) * 100 
          : 0;

        // Calculate monthly revenue (simplified)
        const monthlyRevenue = thisMonthAppointments.reduce((total: number, appointment: any) => {
          const price = parseFloat(appointment.price || appointment.fee || '0');
          return total + (isNaN(price) ? 0 : price);
        }, 0);

        // For growth calculations, we'll use simplified logic for now
        const clientsGrowth = activeClients > 0 ? 5.2 : 0; // Placeholder
        const appointmentsGrowth = thisMonthAppointments.length > 0 ? 8.1 : 0; // Placeholder
        const revenueGrowth = monthlyRevenue > 0 ? 12.3 : 0; // Placeholder
        const completionGrowth = completionRate > 0 ? 2.1 : 0; // Placeholder

        console.log('📊 Dashboard stats calculated:', {
          activeClients,
          todayAppointments,
          thisMonthAppointments: thisMonthAppointments.length,
          completionRate: Math.round(completionRate * 10) / 10,
          monthlyRevenue,
          clientsGrowth: Math.round(clientsGrowth * 10) / 10,
          appointmentsGrowth: Math.round(appointmentsGrowth * 10) / 10,
          revenueGrowth: Math.round(revenueGrowth * 10) / 10,
          completionGrowth: Math.round(completionGrowth * 10) / 10
        });

        setStats({
          activeClients,
          todayAppointments,
          thisMonthAppointments: thisMonthAppointments.length,
          completionRate: Math.round(completionRate * 10) / 10,
          monthlyRevenue,
          clientsGrowth: Math.round(clientsGrowth * 10) / 10,
          appointmentsGrowth: Math.round(appointmentsGrowth * 10) / 10,
          revenueGrowth: Math.round(revenueGrowth * 10) / 10,
          completionGrowth: Math.round(completionGrowth * 10) / 10
        });

      } catch (error: any) {
        console.error('❌ Error fetching dashboard data:', error);
        
        // Handle specific Firestore errors
        if (error.code === 'failed-precondition' && error.message?.includes('index')) {
          console.log('🔧 Index creation in progress. Using fallback data...');
          setError('Dashboard data loading... Firestore indexes are being created. Please wait a few minutes and refresh.');
        } else if (error.code === 'permission-denied') {
          console.log('🔒 Permission denied. User may not have access to this data.');
          setError('You do not have permission to view this data. Please contact an administrator.');
        } else {
          setError('Failed to load dashboard data. Please try refreshing the page.');
        }

        // Provide fallback data so dashboard doesn't look completely empty
        setStats({
          activeClients: 0,
          todayAppointments: 0,
          thisMonthAppointments: 0,
          completionRate: 0,
          monthlyRevenue: 0,
          clientsGrowth: 0,
          appointmentsGrowth: 0,
          revenueGrowth: 0,
          completionGrowth: 0
        });
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [profile, options.enabled]);

  return { stats, loading, error };
}; 
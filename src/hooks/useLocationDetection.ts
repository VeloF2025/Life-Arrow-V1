import { useState, useEffect } from 'react';
import type { Location } from '../types';

export const useLocationDetection = () => {
  const [location, setLocation] = useState<Location | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const detectLocation = async () => {
      try {
        // First: Fast IP-based detection
        const ipLocation = await getIPLocation();
        if (ipLocation) {
          setLocation(ipLocation);
        }
        
        // Second: More accurate GPS (if available and user consents)
        if ('geolocation' in navigator) {
          navigator.geolocation.getCurrentPosition(
            (position) => {
              setLocation(prev => ({
                ...prev,
                coordinates: {
                  lat: position.coords.latitude,
                  lng: position.coords.longitude
                },
                accuracy: 'gps'
              }));
            },
            (geoError) => {
              console.log('GPS unavailable:', geoError.message);
              // Keep IP location if GPS fails
            },
            {
              timeout: 10000,
              maximumAge: 300000, // 5 minutes
              enableHighAccuracy: false
            }
          );
        }
      } catch (err) {
        console.error('Location detection failed:', err);
        setError('Unable to detect location');
      } finally {
        setLoading(false);
      }
    };

    detectLocation();
  }, []);

  return { location, loading, error };
};

// Fallback IP-based location detection
const getIPLocation = async (): Promise<Location | null> => {
  try {
    // Using a free IP geolocation service
    const response = await fetch('https://ipapi.co/json/');
    const data = await response.json();
    
    if (data.latitude && data.longitude) {
      return {
        coordinates: {
          lat: parseFloat(data.latitude),
          lng: parseFloat(data.longitude)
        },
        city: data.city,
        country: data.country_name,
        accuracy: 'ip'
      };
    }
  } catch (error) {
    console.error('IP location detection failed:', error);
  }
  
  // Default to Cape Town, South Africa if all else fails
  return {
    coordinates: { lat: -33.9249, lng: 18.4241 },
    city: 'Cape Town',
    country: 'South Africa',
    accuracy: 'ip'
  };
}; 
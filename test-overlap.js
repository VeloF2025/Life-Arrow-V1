// Test script to verify overlap detection logic
const timeToMinutes = (time) => {
  if (!time || !time.includes(':')) return 0;
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
};

// Test the overlap detection logic
const testOverlapDetection = () => {
  console.log('Testing overlap detection...');
  
  // Simulate existing appointments
  const existingAppointments = [
    { time: '10:30', duration: 60 }, // 10:30 - 11:30
    { time: '11:00', duration: 30 }  // 11:00 - 11:30 (OVERLAPS!)
  ];
  
  const bookedTimeRanges = existingAppointments.map(appt => {
    const start = timeToMinutes(appt.time);
    const end = start + appt.duration;
    return { start, end, timeStr: `${appt.time} (${appt.duration}min)` };
  });
  
  console.log('Booked time ranges:');
  bookedTimeRanges.forEach(range => {
    const startHours = Math.floor(range.start / 60);
    const startMins = range.start % 60;
    const endHours = Math.floor(range.end / 60);
    const endMins = range.end % 60;
    console.log(`  ${range.timeStr}: ${startHours}:${startMins.toString().padStart(2, '0')} - ${endHours}:${endMins.toString().padStart(2, '0')} (${range.start}-${range.end} minutes)`);
  });
  
  // Test if 11:00 slot (30 min service) would be detected as overlapping
  const testSlotStart = timeToMinutes('11:00'); // 660 minutes
  const testSlotEnd = testSlotStart + 30; // 690 minutes
  
  console.log(`\nTesting slot: 11:00-11:30 (${testSlotStart}-${testSlotEnd} minutes)`);
  
  const isOverlapping = bookedTimeRanges.some(booked =>
    (testSlotStart < booked.end && testSlotEnd > booked.start)
  );
  
  console.log(`Overlap detected: ${isOverlapping}`);
  
  // Check each existing appointment for overlap
  bookedTimeRanges.forEach(booked => {
    const overlaps = (testSlotStart < booked.end && testSlotEnd > booked.start);
    console.log(`  vs ${booked.timeStr}: ${overlaps ? 'OVERLAPS' : 'no overlap'}`);
  });
};

testOverlapDetection();

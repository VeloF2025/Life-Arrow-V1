import { CalendarIcon, ClockIcon } from '@heroicons/react/24/outline';

const StaffScheduleInterface = () => {
  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="text-center py-12">
        <CalendarIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Staff Schedule Management
        </h2>
        <p className="text-gray-600 mb-8">
          Schedule management interface for staff members - Coming Soon
        </p>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 max-w-md mx-auto">
          <ClockIcon className="w-8 h-8 text-blue-500 mx-auto mb-2" />
          <p className="text-blue-700 font-medium">Under Development</p>
          <p className="text-blue-600 text-sm mt-1">
            This interface will allow staff to manage their schedules and view appointments
          </p>
        </div>
      </div>
    </div>
  );
};

export default StaffScheduleInterface; 
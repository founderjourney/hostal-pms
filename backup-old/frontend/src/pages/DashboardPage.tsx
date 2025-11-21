
import React from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';

const DashboardPage = () => {
  return (
    <DashboardLayout>
      <h1 className="text-2xl font-semibold text-gray-800">Dashboard</h1>
      <div className="grid grid-cols-1 gap-6 mt-6 sm:grid-cols-2 lg:grid-cols-4">
        <div className="p-6 bg-white rounded-md shadow-md">
          <h3 className="text-lg font-medium text-gray-800">Ocupación Actual</h3>
          <p className="mt-2 text-3xl font-semibold text-gray-900">75%</p>
        </div>
        <div className="p-6 bg-white rounded-md shadow-md">
          <h3 className="text-lg font-medium text-gray-800">Check-ins Hoy</h3>
          <p className="mt-2 text-3xl font-semibold text-gray-900">12</p>
        </div>
        <div className="p-6 bg-white rounded-md shadow-md">
          <h3 className="text-lg font-medium text-gray-800">Check-outs Hoy</h3>
          <p className="mt-2 text-3xl font-semibold text-gray-900">8</p>
        </div>
        <div className="p-6 bg-white rounded-md shadow-md">
          <h3 className="text-lg font-medium text-gray-800">Ingresos del Día</h3>
          <p className="mt-2 text-3xl font-semibold text-gray-900">$1,250</p>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default DashboardPage;

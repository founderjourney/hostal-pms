
import React from 'react';
import { FiHome, FiCalendar, FiUsers, FiBox, FiDollarSign, FiSettings } from 'react-icons/fi';

const Sidebar = () => {
  return (
    <div className="flex flex-col w-64 h-screen px-4 py-8 bg-white border-r">
      <h2 className="text-3xl font-semibold text-gray-800">Almanik</h2>
      <div className="flex flex-col justify-between flex-1 mt-6">
        <nav>
          <a
            className="flex items-center px-4 py-2 text-gray-700 bg-gray-100 rounded-md"
            href="#"
          >
            <FiHome className="w-5 h-5" />
            <span className="mx-4 font-medium">Dashboard</span>
          </a>
          <a
            className="flex items-center px-4 py-2 mt-5 text-gray-600 rounded-md hover:bg-gray-100"
            href="#"
          >
            <FiCalendar className="w-5 h-5" />
            <span className="mx-4 font-medium">Reservas</span>
          </a>
          <a
            className="flex items-center px-4 py-2 mt-5 text-gray-600 rounded-md hover:bg-gray-100"
            href="#"
          >
            <FiUsers className="w-5 h-5" />
            <span className="mx-4 font-medium">Huéspedes</span>
          </a>
          <a
            className="flex items-center px-4 py-2 mt-5 text-gray-600 rounded-md hover:bg-gray-100"
            href="#"
          >
            <FiBox className="w-5 h-5" />
            <span className="mx-4 font-medium">Productos</span>
          </a>
          <a
            className="flex items-center px-4 py-2 mt-5 text-gray-600 rounded-md hover:bg-gray-100"
            href="#"
          >
            <FiDollarSign className="w-5 h-5" />
            <span className="mx-4 font-medium">Folios</span>
          </a>
        </nav>

        <div className="flex items-center px-4 -mx-2">
          <a href="#" className="flex items-center mx-2 text-gray-600">
            <FiSettings className="w-5 h-5" />
            <span className="mx-2 font-medium">Settings</span>
          </a>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;

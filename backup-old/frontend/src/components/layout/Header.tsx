
import React from 'react';
import { FiSearch, FiBell, FiUser } from 'react-icons/fi';

const Header = () => {
  return (
    <header className="flex items-center justify-between w-full px-6 py-4 bg-white border-b">
      <div className="flex items-center">
        <div className="relative">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3">
            <FiSearch className="w-5 h-5 text-gray-400" />
          </span>
          <input
            type="text"
            className="w-full py-2 pl-10 pr-4 text-gray-700 bg-white border rounded-md focus:outline-none focus:border-indigo-500"
            placeholder="Search"
          />
        </div>
      </div>

      <div className="flex items-center">
        <button className="p-2 text-gray-500 rounded-md hover:bg-gray-100 hover:text-gray-600 focus:outline-none">
          <FiBell className="w-6 h-6" />
        </button>

        <div className="relative">
          <button className="flex items-center p-2 ml-3 text-gray-500 rounded-md hover:bg-gray-100 hover:text-gray-600 focus:outline-none">
            <FiUser className="w-6 h-6" />
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;

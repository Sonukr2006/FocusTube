import React from 'react'

const Logo = () => {
  return (
    <div className="flex items-center gap-2">
      <img
        src="/logo.svg"
        alt="Logo"
        className="w-8 h-8 rounded-full object-cover"
      />
    </div>
  );
}

export default Logo
import React from 'react'
import { auth } from '../../config/firebase';
import { signOut } from 'firebase/auth';

const Navbar = () => {
  const Logout = () => {
          try{
          signOut(auth)
          } catch (err) {
              console.error("Error signing out: ", err);
              setMessage("Failed to log out. Please try again.");
          }
      }
  return (
    <div className='flex justify-between px-8 py-4 w-full rounded'>
      <div className='text-xl font-bold'>
        <a href="/">
            <span className='text-violet-900'>Social Manager</span> 
            </a>
      </div>
      <div>
        <button 
                    className='text-sm bg-purple-200 rounded-full py-2 px-4 text-purple-700 hover:text-red-500 transition duration-200 font-semibold'
                    onClick={Logout}>Logout</button>
      </div>
    </div>
  )
}

export default Navbar;

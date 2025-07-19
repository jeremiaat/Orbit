import React from 'react';

const Footer = () => {
  return (
    <footer className='bg-gray-900 text-white py-10'>
      <div className='max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-3 gap-8'>

        {/* About Section */}
        <div>
          <h2 className='text-xl font-bold mb-4'>About Us</h2>
          <p className='text-gray-400 text-sm'>
            We are dedicated to providing innovative solutions and exceptional experiences. Our mission is to connect, inform, and inspire.
          </p>
        </div>

        {/* Media Links Section */}
        <div>
          <h2 className='text-xl font-bold mb-4'>Connect With Us</h2>
          <ul className='space-y-2'>
            <li>
              <a href='https://www.example.com/social_media_user1' target='_blank' rel='noopener noreferrer' className='text-gray-400 hover:text-white transition-colors duration-200'>
                SocialMedia: AnonymousUser1
              </a>
            </li>
            <li>
              <a href='https://www.example.com/blog/random_post' target='_blank' rel='noopener noreferrer' className='text-gray-400 hover:text-white transition-colors duration-200'>
                Blog: Latest Insights
              </a>
            </li>
            <li>
              <a href='https://www.example.com/company-profile' target='_blank' rel='noopener noreferrer' className='text-gray-400 hover:text-white transition-colors duration-200'>
                Professional: Our Company
              </a>
            </li>
          </ul>
        </div>

        {/* Contact Us Section */}
        <div>
          <h2 className='text-xl font-bold mb-4'>Get In Touch</h2>
          <ul className='space-y-2'>
            <li>
              <a href='mailto:info@example.com' className='text-gray-400 hover:text-white transition-colors duration-200'>
                Email: info@example.com
              </a>
            </li>
            <li>
              <a href='tel:+1-555-123-4567' className='text-gray-400 hover:text-white transition-colors duration-200'>
                Phone: +1-555-123-4567
              </a>
            </li>
            <li className='text-gray-400'>
              Address: Somewhere, Anytown, USA
            </li>
          </ul>
        </div>
      </div>

      {/* Copyright Section */}
      <div className='border-t border-gray-700 mt-8 pt-8 text-center text-gray-500 text-sm'>
        &copy; {new Date().getFullYear()} YourAppName. All rights reserved.
      </div>
    </footer>
  );
};

export default Footer;
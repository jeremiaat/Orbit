import React from 'react';
import { Link, ListChecks, CalendarCheck, Rocket } from 'lucide-react'; // Import additional icons

const Hero = () => {
  const options = [
    {
      id: '1',
      title: 'URL Manager',
      description: 'Organize and save your important links with custom titles and descriptions. Perfect for social media, articles, tools, and more.',
      href: '/urlmanager',
      bgColor: 'bg-gradient-to-br from-violet-600 to-purple-700', // Gradient background
      icon: Link, // Icon for URL Manager
    },
    {
      id: '2',
      title: 'To-Do List',
      description: 'Keep track of your daily tasks, prioritize work, and mark completed items. Stay productive and focused throughout the day.',
      href: '/to-do-list',
      bgColor: 'bg-gradient-to-br from-indigo-600 to-blue-700', // Gradient background
      icon: ListChecks, // Icon for To-Do List
    },
    {
      id: '3',
      title: 'Habit Tracker',
      description: 'Build better habits by tracking your routines and consistency. Visualize your progress and stay motivated over time.',
      href: '/habit-tracker',
      bgColor: 'bg-gradient-to-br from-blue-600 to-cyan-700', // Gradient background
      icon: CalendarCheck, // Icon for Habit Tracker
    },
  ];

  const howItWorksSteps = [
    {
      id: 1,
      title: 'Explore Our Tools',
      description: 'Discover the URL Manager, To-Do List, and Habit Tracker. Each designed to simplify a part of your digital life.',
      icon: '✨', // You can use Lucide icons here too, e.g., Icon: Sparkles
    },
    {
      id: 2,
      title: 'Personalize Your Experience',
      description: 'Click on any tool to start. Add your links, create tasks, or define new habits. It’s all about tailoring to your needs.',
      icon: '✍️', // Icon: Edit
    },
    {
      id: 3,
      title: 'Track Your Progress',
      description: 'Watch your productivity grow! The intuitive interfaces help you monitor your journey and stay on top of your goals.',
      icon: '📈', // Icon: TrendingUp
    },
    {
      id: 4,
      title: 'Achieve More',
      description: 'With everything organized, you’ll find more time for what truly matters. Unlock your full potential with our integrated tools.',
      icon: '🎯', // Icon: Target
    },
  ];

  return (
    <div className='min-h-screen bg-gradient-to-br from-blue-50 to-purple-100 flex flex-col items-center justify-start py-16 px-4 font-sans overflow-hidden'>

      {/* 🌟 Website Introduction */}
      <div className='max-w-4xl text-center mb-16 animate-fade-in-down'>
        <h1 className='text-5xl md:text-6xl font-extrabold text-gray-900 mb-6 leading-tight'>
          Welcome to Your <span className='text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-blue-600'>Productivity Hub</span> 
        </h1>
        <p className='text-xl text-gray-700 max-w-2xl mx-auto'>
          This platform helps you streamline your digital life with ease. From organizing URLs and planning tasks to tracking your habits — we’ve got it all in one integrated space. Start being more productive, one step at a time.
        </p>
        <div className="mt-8">
            <a href="#how-it-works" className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-full shadow-lg text-white bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 transition-all duration-300 transform hover:scale-105">
                Learn How It Works <Rocket className="ml-2 w-5 h-5" />
            </a>
        </div>
      </div>

      {/* Service Options */}
      <div className='w-full max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-20 animate-fade-in-up'>
        {options.map((option, index) => {
          const IconComponent = option.icon; // Get the Lucide icon component
          return (
            <div
              key={option.id}
              className={`
                ${option.bgColor}
                p-8 rounded-2xl shadow-2xl
                transform transition-all duration-500 hover:scale-[1.03] hover:shadow-3xl
                flex flex-col justify-between items-start
                text-white
                border-b-4 border-l-2 border-transparent hover:border-white/30
                relative overflow-hidden
              `}
              style={{ animationDelay: `${index * 0.1}s` }} // Staggered animation
            >
              <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-10 transition-opacity duration-300 rounded-2xl pointer-events-none"></div> {/* Subtle overlay */}
              <a href={option.href} className='block w-full h-full relative z-10'>
                <div className='flex items-center mb-5'>
                  {IconComponent && <IconComponent size={36} className='mr-4 text-white/90 animate-bounce-subtle' />} {/* Render icon with animation */}
                  <h2 className='text-4xl font-extrabold leading-tight text-white'>{option.title}</h2>
                </div>
                <p className='text-lg font-light text-gray-100 opacity-90 leading-relaxed'>
                  {option.description}
                </p>
                <button className="mt-6 px-5 py-2 bg-white text-gray-900 rounded-full text-base font-semibold shadow-md hover:bg-gray-100 transition-colors duration-200">
                    Get Started &rarr;
                </button>
              </a>
            </div>
          );
        })}
      </div>

      {/* --- How It Works Section --- */}
      <div id="how-it-works" className='w-full max-w-6xl mx-auto py-16 px-4 bg-white rounded-3xl shadow-xl border border-gray-100 animate-fade-in'>
        <h2 className='text-4xl md:text-5xl font-extrabold text-center text-gray-800 mb-12'>
          How It Works
        </h2>
        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8'>
          {howItWorksSteps.map((step, index) => (
            <div
              key={step.id}
              className='flex flex-col items-center text-center p-6 bg-gray-50 rounded-xl shadow-md transition-transform duration-300 hover:scale-105 hover:shadow-lg'
            >
              <div className='text-5xl mb-4 p-4 bg-gradient-to-br from-blue-200 to-purple-200 rounded-full inline-flex justify-center items-center'>
                {step.icon} {/* Display icon */}
              </div>
              <h3 className='text-2xl font-bold text-gray-800 mb-3'>{step.title}</h3>
              <p className='text-gray-600 leading-relaxed'>
                {step.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Hero;
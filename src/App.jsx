import { useState, useEffect } from 'react';
import Login from './components/login';
import UrlManager from './components/UrlManager';
import HomePage from './components/HOME/HomePage';
import HabitTracker from './components/Habit-Tracker';
import TodoList from './components/ToDo-list';
import { BrowserRouter as Router, Routes, Route, useNavigate } from 'react-router-dom';
import { auth } from './config/firebase'; // Make sure this path is correct for your Firebase config
import { onAuthStateChanged } from 'firebase/auth';

function App() {
    
    const [user, setUser] = useState(null); // State to hold the authenticated user
    const [loading, setLoading] = useState(true); // State to manage initial loading

    useEffect(() => {
        // This listener will be called when the authentication state changes (login, logout, initial load)
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser); // Set the user state
            setLoading(false); // Authentication check is complete
        });

        // Cleanup the subscription when the component unmounts
        return () => unsubscribe();
    }, []); // Empty dependency array means this effect runs once on mount

    if (loading) {
        // You can render a loading spinner or splash screen here
        return (
            <div className="flex items-center justify-center min-h-screen bg-gray-100 font-sans text-inter">
            {/* Container for the loading animation and text */}
            <div className="flex flex-col items-center space-y-4 p-6 bg-white rounded-lg shadow-lg">
                {/* Bouncing Dots Loading Animation */}
                <div className="flex space-x-2">
                    {/* Dot 1 */}
                    <div className="w-4 h-4 bg-blue-500 rounded-full animate-[bounce-dot_1.4s_infinite_ease-in-out_both]"></div>
                    {/* Dot 2 */}
                    <div className="w-4 h-4 bg-violet-500 rounded-full animate-[bounce-dot_1.4s_infinite_ease-in-out_both] delay-150"></div>
                    {/* Dot 3 */}
                    <div className="w-4 h-4 bg-indigo-500 rounded-full animate-[bounce-dot_1.4s_infinite_ease-in-out_both] delay-300"></div>
                </div>
                {/* Loading Text */}
                <p className='font-bold text-lg text-gray-700'>Loading...</p>
            </div>

            {/* Custom CSS for the bounce-dot animation */}
            <style jsx>{`
                @keyframes bounce-dot {
                    0%, 80%, 100% {
                        transform: scale(0);
                    }
                    40% {
                        transform: scale(1.0);
                    }
                }
            `}</style>
        </div>
        );
    }

    return (
        <Router>
            <Routes>
                {/*
                    If a user is logged in (user is not null), show the Main component for /home
                    and redirect from / to /home.
                    If no user is logged in (user is null), show the Login component for / and redirect from /home to /.
                */}
                {user ? (
                    <>
                        <Route path="/urlmanager" element={<UrlManager />} />
                        <Route path="/" element={<HomePage />} /> {/* Redirect from root if logged in */}
                        <Route path='/to-do-list' element={<TodoList />}/>
                        <Route path='/habit-tracker' element={<HabitTracker />}/>
                        
                        {/* You might want a catch-all redirect for any other unauthenticated routes */}
                         <Route path="*" element={<UrlManager />} />
                         
                    </>
                ) : (
                    <>
                        <Route path="/" element={<Login />} />
                        <Route path="/urlmanager" element={<Login />} /> {/* Redirect from /home if not logged in */}
                        {/* Catch-all for any other routes, redirecting to login if not authenticated */}
                         <Route path="*" element={<Login />} />
                    </>
                )}
            </Routes>
        </Router>
    );
}

export default App;
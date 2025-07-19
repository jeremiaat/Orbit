import React from 'react'
import { auth } from '../config/firebase'
import { createUserWithEmailAndPassword, GoogleAuthProvider, signInWithPopup } from 'firebase/auth'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const navigate = useNavigate();

    console.log(auth?.currentUser?.email);
    const signin = async () =>{
        
        await createUserWithEmailAndPassword(auth, email, password)
        navigate('/dashboard');
        console.log('User signed in:', email);
        
    }
    const LoginWithGoogle = async () => {
        const provider = new GoogleAuthProvider();
        await signInWithPopup(auth, provider)
        console.log('User signed in with Google');
    }
return (
        <div className='min-h-screen bg-gradient-to-br from-purple-100 to-blue-200 
                        flex flex-col flex-wrap items-center space-y-8 py-10 px-4 font-sans 
                        md:flex-row md:flex-nowrap md:justify-center md:items-start md:space-y-0 md:space-x-8'> {/* Adjusted classes */}
            
            {/* The individual containers will need responsive width adjustments */}
            <div className='bg-white p-8 rounded-xl shadow-xl w-full max-w-2xl md:w-1/2 lg:w-2/5'> {/* Added responsive widths */}
                <input 
                onChange={(e)=> setEmail(e.target.value)}
                className='w-full p-3 mb-3 border border-gray-300 rounded-lg focus:ring-purple-400 focus:border-transparent outline-none transition duration-200'
                placeholder="Enter your Email" type="text" />
                <input 
                onChange={(e)=> setPassword(e.target.value)}
                className='w-full p-3 mb-3 border border-gray-300 rounded-lg focus:ring-purple-400 focus:border-transparent outline-none transition duration-200'
                placeholder="Enter your Yourpassword" type="password" />
                <button
                    className='flex-1 w-full bg-purple-600 text-white py-3 rounded-lg font-semibold hover:bg-purple-700 transition duration-200'
                    onClick={signin}
                    
                >Signin
                </button>
                <div className="relative flex items-center justify-center my-6">
                    <div className={`absolute inset-0 border-t  'border-gray-600' : 'border-gray-300'}`}></div>
                    <span className='relative px-4 text-sm '>OR</span>
                </div>
                <button
                    onClick={LoginWithGoogle}
                    className= 'w-full py-3 rounded-xl font-semibold text-gray-600 text-lg transition duration-300 flex items-center justify-center shadow-lg'
                >
                    <img src="https://www.google.com/favicon.ico" alt="Google icon" className="w-6 h-6 mr-3" />
                    Continue with Google
                </button>

                <p className={`text-center mt-6 text-sm  'text-gray-400' : 'text-gray-600'}`}>
                    Don't have an account? <a href="#" className={`font-semibold 'text-purple-400 hover:text-purple-300' : 'text-purple-600 hover:text-purple-800'}`}>Sign Up</a>
                </p>
            </div>
        </div>
    )
}

export default Login;


import React, { useState, useEffect } from 'react';
import { useUser } from '../shared/UserContext';
import { useNavigate } from 'react-router-dom';
import '../styles/Login.css';

function Login() {
	const navigate = useNavigate();
	const { setUser } = useUser();
	const [username, setUsername] = useState('');
	const [password, setPassword] = useState('');
	const [rememberMe, setRememberMe] = useState(false);
	const [errorMessage, setErrorMessage] = useState('');
	const [currentImageIndex, setCurrentImageIndex] = useState(0);
	const [isLoading, setIsLoading] = useState(false);
	const [showPassword, setShowPassword] = useState(false);

	// Auto-playing carousel images - Add image paths here
	const backgroundImages = [
		'/images/image-1.jpg',
		'/images/image-2.jpg',
		'/images/image-3.jpg',
		'/images/image-4.jpg',
	];

	// Auto-play background images every 5 seconds
	useEffect(() => {
		const interval = setInterval(() => {
			setCurrentImageIndex((prev) => (prev + 1) % backgroundImages.length);
		}, 7000);
		return () => clearInterval(interval);
	}, [backgroundImages.length]);

	let renderError = null;
	try {
		const handleSubmit = async (e) => {
			e.preventDefault();
			setErrorMessage('');

			// Validation for empty fields
			if (!username.trim()) {
				setErrorMessage('Please enter your username');
				return;
			}
			if (!password.trim()) {
				setErrorMessage('Please enter your password');
				return;
			}

			setIsLoading(true);
			try {
				const res = await fetch(`${process.env.REACT_APP_API_URL}/api/user/login`, {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ username, password })
				});
				const data = await res.json();

				if (res.ok && data.user) {
					// Always set role for all user types
					let role = data.user.role || data.user.type;
					const userObj = { ...data.user, role, rememberMe: role === 'admin' ? true : rememberMe };
					setUser(userObj);
					localStorage.setItem('currentUser', JSON.stringify(userObj));
					
					if (role === 'admin') {
						navigate('/admin-dashboard');
					} else if (role === 'teacher') {
						navigate('/dashboard');
					} else if (role === 'parent') {
						navigate('/parent-dashboard');
					} else {
						setErrorMessage('Unable to determine user type. Please contact support.');
					}
				} else {
					// Invalid credentials or server error
					setErrorMessage('Invalid username or password. Please try again.');
				}
			} catch (err) {
				setErrorMessage('Connection error. Please check your internet and try again.');
			} finally {
				setIsLoading(false);
			}
		};

		return (
			<div className="login-page">
				{/* Left Side - Auto-playing Background Images */}
				<div 
					className="login-left"
					style={{
						backgroundImage: `url(${backgroundImages[currentImageIndex]})`,
						backgroundSize: 'cover',
						backgroundPosition: 'center'
					}}
				>
					<div className="login-left-overlay"></div>
				</div>

				{/* Right Side - Login Form */}
				<div className="login-right">
					<form onSubmit={handleSubmit} className="login-form">
						{/* Form Header with Logo and School Name */}
						<div className="form-header">
							<img
								src="/spcclogo.png"
								alt="SPCC Logo"
								className="form-logo"
							/>
							<h1 className="form-title">System Plus Computer College</h1>
							<p className="form-subtitle">Attendance System</p>
						</div>

						<div className="form-group">
							<input
								type="text"
								placeholder="Username"
								value={username}
								onChange={(e) => setUsername(e.target.value)}
								disabled={isLoading}
								required
							/>
						</div>
						<div className="form-group password-group">
							<input
								type={showPassword ? 'text' : 'password'}
								placeholder="Password"
								value={password}
								onChange={(e) => setPassword(e.target.value)}
								disabled={isLoading}
								required
							/>
							<button
								type="button"
								className="password-toggle"
								onClick={() => setShowPassword(!showPassword)}
								disabled={isLoading}
								title={showPassword ? 'Hide password' : 'Show password'}
							>
								<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
									{showPassword ? (
										<>
											<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
											<circle cx="12" cy="12" r="3"></circle>
										</>
									) : (
										<>
											<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
											<line x1="1" y1="1" x2="23" y2="23"></line>
										</>
									)}
								</svg>
							</button>
						</div>
						<label className="remember-me">
							<input
								type="checkbox"
								checked={rememberMe}
								onChange={(e) => setRememberMe(e.target.checked)}
								disabled={isLoading}
							/>
							Remember me
						</label>
						<button type="submit" className="login-button" disabled={isLoading}>
							{isLoading ? 'Signing in...' : 'Sign In'}
						</button>
						{/* Show error message */}
						{errorMessage && <div className="error-message">{errorMessage}</div>}
						<div className="login-links">
							<button type="button" className="link-button" onClick={() => alert('Feature coming soon!')}>
								Forgot password?
							</button>
						</div>
					</form>
				</div>
			</div>
		);
	} catch (err) {
		renderError = err;
	}
	return <div style={{ color: 'red' }}>[FATAL ERROR] {renderError && renderError.message}</div>;
}

export default Login;

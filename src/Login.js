import React, { useState } from 'react';
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
	const [isLoading, setIsLoading] = useState(false);

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
					setUser(data.user);
					const userType = data.user.type;

					if (userType === 'admin') {
						navigate('/admin-dashboard');
					} else if (userType === 'teacher') {
						navigate('/dashboard');
					} else if (userType === 'parent') {
						navigate('/parent-dashboard');
					} else {
						setErrorMessage('Unable to determine user type. Please contact support.');
					}
				} else {
					// Invalid credentials
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
				<div className="login-left">
					<div className="login-left-overlay"></div>
				</div>

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
						<div className="form-group">
							<input
								type="password"
								placeholder="Password"
								value={password}
								onChange={(e) => setPassword(e.target.value)}
								disabled={isLoading}
								required
							/>
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
						{/* Error message */}
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

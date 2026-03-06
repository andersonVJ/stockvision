import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

/**
 * Component that automatically logs out users after a period of inactivity.
 * Default timeout is 15 minutes (900000 ms).
 */
export default function AutoLogout({ timeoutMs = 900000 }) {
    const navigate = useNavigate();
    const timerRef = useRef(null);

    useEffect(() => {
        // Only set up auto-logout if the user is authenticated (token exists)
        const token = localStorage.getItem('token');
        if (!token) return;

        const resetTimer = () => {
            if (timerRef.current) clearTimeout(timerRef.current);
            timerRef.current = setTimeout(() => {
                // Clear session on timeout
                localStorage.removeItem('user');
                localStorage.removeItem('token');
                navigate('/');
            }, timeoutMs);
        };

        // Events that reset the inactivity timer
        const events = ['mousemove', 'keydown', 'scroll', 'click'];

        events.forEach(event => {
            window.addEventListener(event, resetTimer);
        });

        // Start timer initially
        resetTimer();

        return () => {
            if (timerRef.current) clearTimeout(timerRef.current);
            events.forEach(event => {
                window.removeEventListener(event, resetTimer);
            });
        };
    }, [navigate, timeoutMs]);

    return null;
}

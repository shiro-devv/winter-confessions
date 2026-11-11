import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { messageFromError } from '../db/errors';
import { useAuth } from '../hooks/auth';
import { useToast } from '../hooks/toast';
import { supabase } from '../lib/supabase';
import { unreadCount } from '../services/confessions';
import { Button } from './Button';
import { Snowflake } from './Snowflake';

export function Navbar() {
  const { user, loading, logOut } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [unread, setUnread] = useState(0);

  const userId = user?.id ?? null;

  // Keep the badge fresh: load once, then follow new confessions and tab focus.
  useEffect(() => {
    if (!userId) {
      setUnread(0);
      return;
    }

    let active = true;
    const load = () => {
      unreadCount(userId).then((count) => {
        if (active) setUnread(count);
      });
    };

    load();
    const interval = window.setInterval(load, 60_000);
    window.addEventListener('focus', load);

    const channel = supabase
      .channel(`nav-unread-${userId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'confessions', filter: `recipient_id=eq.${userId}` },
        load,
      )
      .subscribe();

    return () => {
      active = false;
      window.clearInterval(interval);
      window.removeEventListener('focus', load);
      void supabase.removeChannel(channel);
    };
  }, [userId]);

  const handleLogOut = async () => {
    try {
      await logOut();
      toast.show('You are logged out. See you in the snow!', 'info');
      navigate('/');
    } catch (error) {
      toast.show(messageFromError(error), 'error');
    }
  };

  return (
    <motion.header
      className="nav"
      initial={{ y: -64, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
    >
      <Link to="/" className="brand" aria-label="Winter Confessions home">
        <motion.span
          className="brand-mark"
          animate={{ rotate: 360 }}
          transition={{ duration: 24, ease: 'linear', repeat: Infinity }}
        >
          <Snowflake size={26} />
        </motion.span>
        <span className="brand-name">Winter Confessions</span>
      </Link>

      <nav className="nav-actions" aria-label="Main">
        {loading ? null : user ? (
          <>
            <Link to="/inbox" className="nav-link">
              Inbox
              {unread > 0 && (
                <span className="badge" aria-label={`${unread} unread`}>
                  {unread > 99 ? '99+' : unread}
                </span>
              )}
            </Link>
            <Button variant="ghost" onClick={() => void handleLogOut()}>
              Log out
            </Button>
          </>
        ) : (
          <>
            <Link to="/auth?mode=login" className="nav-link">
              Log in
            </Link>
            <Button to="/auth?mode=signup">Get your link</Button>
          </>
        )}
      </nav>
    </motion.header>
  );
}

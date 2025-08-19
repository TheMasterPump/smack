// 🎮 Système de gamification et social
import React, { useState, useEffect } from 'react';
import { useNotifications } from './NotificationSystem';

// 🏆 Badges système
const BADGES = {
  FIRST_BUY: { id: 'first_buy', name: 'First Purchase', icon: '💰', description: 'Your first token purchase!' },
  HOLDER_100: { id: 'holder_100', name: 'Century Club', icon: '💎', description: 'Hold 100+ tokens' },
  EARLY_BIRD: { id: 'early_bird', name: 'Early Bird', icon: '🐦', description: 'Bought in first 100 holders' },
  DIAMOND_HANDS: { id: 'diamond_hands', name: 'Diamond Hands', icon: '💎', description: 'Hold for 30+ days' },
  WHALE: { id: 'whale', name: 'Whale', icon: '🐋', description: 'Top 5 holder by volume' },
  MIGRATOR: { id: 'migrator', name: 'Migration Pioneer', icon: '🚀', description: 'Participated in Raydium migration' },
  SOCIAL_BUTTERFLY: { id: 'social_butterfly', name: 'Social Butterfly', icon: '🦋', description: 'Active in chat (50+ messages)' },
  PRICE_PREDICTOR: { id: 'price_predictor', name: 'Price Oracle', icon: '🔮', description: 'Accurate price predictions' }
};

// 📊 Leaderboard Component
export const Leaderboard = ({ tokenAddress }) => {
  const [leaderboardData, setLeaderboardData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [timeframe, setTimeframe] = useState('24h'); // 24h, 7d, 30d, all

  useEffect(() => {
    fetchLeaderboard();
  }, [tokenAddress, timeframe]);

  const fetchLeaderboard = async () => {
    try {
      // Simulated leaderboard data - replace with real API call
      const mockData = [
        { rank: 1, address: '7xKXt...fK2p', volume: 156.7, profit: 45.2, badges: ['whale', 'early_bird'], xp: 2540 },
        { rank: 2, address: '9mPqW...xR8k', volume: 134.2, profit: 38.7, badges: ['diamond_hands', 'holder_100'], xp: 2180 },
        { rank: 3, address: '4nLkM...cT9j', volume: 98.5, profit: 28.4, badges: ['first_buy', 'social_butterfly'], xp: 1920 },
        { rank: 4, address: '8vBxQ...wN3s', volume: 87.3, profit: 22.1, badges: ['early_bird'], xp: 1650 },
        { rank: 5, address: '2hGpV...eZ7m', volume: 76.8, profit: 19.8, badges: ['migrator', 'holder_100'], xp: 1480 }
      ];
      setLeaderboardData(mockData);
      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch leaderboard:', error);
      setLoading(false);
    }
  };

  if (loading) {
    return <div style={{ color: '#888', textAlign: 'center', padding: 20 }}>Loading leaderboard...</div>;
  }

  return (
    <div style={{
      background: "#181b20",
      borderRadius: 10,
      padding: "15px",
      marginBottom: 19
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 15
      }}>
        <h3 style={{ color: '#ffcc32', margin: 0, fontSize: '1.1rem' }}>🏆 Leaderboard</h3>
        <select 
          value={timeframe}
          onChange={(e) => setTimeframe(e.target.value)}
          style={{
            background: '#232324',
            color: '#fff',
            border: '1px solid #333',
            borderRadius: 4,
            padding: '4px 8px',
            fontSize: '0.85rem'
          }}
        >
          <option value="24h">24h</option>
          <option value="7d">7d</option>
          <option value="30d">30d</option>
          <option value="all">All Time</option>
        </select>
      </div>

      {leaderboardData.map((player, index) => (
        <div key={index} style={{
          display: 'flex',
          alignItems: 'center',
          padding: '8px 0',
          borderBottom: index < leaderboardData.length - 1 ? '1px solid #333' : 'none'
        }}>
          <div style={{
            width: 30,
            textAlign: 'center',
            color: index < 3 ? ['#ffd700', '#c0c0c0', '#cd7f32'][index] : '#888',
            fontWeight: 'bold',
            fontSize: '0.9rem'
          }}>
            #{player.rank}
          </div>
          
          <div style={{ flex: 1, marginLeft: 10 }}>
            <div style={{ color: '#fff', fontSize: '0.9rem', fontFamily: 'monospace' }}>
              {player.address}
            </div>
            <div style={{ display: 'flex', gap: 4, marginTop: 2 }}>
              {player.badges?.slice(0, 3).map(badgeId => (
                <span key={badgeId} style={{ fontSize: '0.7rem' }}>
                  {BADGES[badgeId]?.icon}
                </span>
              ))}
            </div>
          </div>

          <div style={{ textAlign: 'right' }}>
            <div style={{ color: '#27eb91', fontSize: '0.85rem', fontWeight: 'bold' }}>
              {player.profit > 0 ? '+' : ''}{player.profit}%
            </div>
            <div style={{ color: '#888', fontSize: '0.75rem' }}>
              {player.xp} XP
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

// 🎖️ User Badges Component
export const UserBadges = ({ userAddress, badges = [] }) => {
  const [userBadges, setUserBadges] = useState(badges);

  return (
    <div style={{
      background: "#181b20",
      borderRadius: 10,
      padding: "15px",
      marginBottom: 19
    }}>
      <h3 style={{ color: '#ffcc32', margin: 0, marginBottom: 10, fontSize: '1.1rem' }}>
        🎖️ Your Achievements
      </h3>
      
      {userBadges.length > 0 ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 10 }}>
          {userBadges.map(badgeId => {
            const badge = BADGES[badgeId];
            return (
              <div key={badgeId} style={{
                background: '#22232b',
                border: '1px solid #ffcc32',
                borderRadius: 6,
                padding: '8px',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '1.5rem', marginBottom: 4 }}>
                  {badge?.icon}
                </div>
                <div style={{ color: '#ffcc32', fontSize: '0.8rem', fontWeight: 'bold' }}>
                  {badge?.name}
                </div>
                <div style={{ color: '#888', fontSize: '0.7rem', marginTop: 2 }}>
                  {badge?.description}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div style={{ textAlign: 'center', color: '#888', padding: 20 }}>
          <div style={{ fontSize: '2rem', marginBottom: 8 }}>🏆</div>
          <div>Start trading to earn your first badge!</div>
        </div>
      )}
    </div>
  );
};

// 📈 XP Progress Component
export const XPProgress = ({ currentXP = 0, nextLevelXP = 1000 }) => {
  const progress = (currentXP / nextLevelXP) * 100;
  const level = Math.floor(currentXP / 1000) + 1;

  return (
    <div style={{
      background: "#181b20",
      borderRadius: 10,
      padding: "15px",
      marginBottom: 19
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10
      }}>
        <h3 style={{ color: '#ffcc32', margin: 0, fontSize: '1.1rem' }}>
          ⭐ Level {level}
        </h3>
        <div style={{ color: '#888', fontSize: '0.9rem' }}>
          {currentXP} / {nextLevelXP} XP
        </div>
      </div>

      <div style={{
        width: '100%',
        height: 8,
        background: '#333',
        borderRadius: 4,
        overflow: 'hidden'
      }}>
        <div style={{
          width: `${progress}%`,
          height: '100%',
          background: 'linear-gradient(90deg, #ffcc32, #27eb91)',
          transition: 'width 0.3s ease'
        }} />
      </div>

      <div style={{ color: '#888', fontSize: '0.8rem', marginTop: 5 }}>
        {nextLevelXP - currentXP} XP to next level
      </div>
    </div>
  );
};

// 🎯 Achievements System Hook
export const useAchievements = () => {
  const notifications = useNotifications();
  const [userStats, setUserStats] = useState({
    totalTrades: 0,
    totalVolume: 0,
    holdingDays: 0,
    chatMessages: 0,
    badges: [],
    xp: 0
  });

  const checkAchievements = (action, data) => {
    const newBadges = [];

    switch (action) {
      case 'FIRST_BUY':
        if (!userStats.badges.includes('first_buy')) {
          newBadges.push('first_buy');
          notifications?.success('Achievement Unlocked: First Purchase! 💰', 'New Badge');
        }
        break;
      
      case 'WHALE_STATUS':
        if (data.rank <= 5 && !userStats.badges.includes('whale')) {
          newBadges.push('whale');
          notifications?.success('Achievement Unlocked: Whale Status! 🐋', 'New Badge');
        }
        break;

      case 'MIGRATION_PARTICIPATED':
        if (!userStats.badges.includes('migrator')) {
          newBadges.push('migrator');
          notifications?.success('Achievement Unlocked: Migration Pioneer! 🚀', 'New Badge');
        }
        break;
    }

    if (newBadges.length > 0) {
      setUserStats(prev => ({
        ...prev,
        badges: [...prev.badges, ...newBadges],
        xp: prev.xp + (newBadges.length * 100)
      }));
    }
  };

  return { userStats, checkAchievements };
};

export default { Leaderboard, UserBadges, XPProgress, useAchievements };
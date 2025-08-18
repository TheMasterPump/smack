import React, { useState, useEffect } from 'react';
import MainNavigation from './MainNavigation';

const LaunchCountdown = () => {
  // 🚀 Date de lancement - SAMEDI 23H (Mettre une date future!)
  const launchDate = new Date('2025-08-23T23:00:00Z'); // Samedi 23 août 2025 à 23h UTC
  
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0
  });
  
  const [isLaunched, setIsLaunched] = useState(false);
  const [showMessage, setShowMessage] = useState(false);
  const [sideMessages, setSideMessages] = useState([]);
  const [lastPositions, setLastPositions] = useState([]);
  const [clickCount, setClickCount] = useState(() => {
    // Charger le compteur depuis localStorage au démarrage
    const saved = localStorage.getItem('smackButtonClicks');
    return saved ? parseInt(saved, 10) : 0;
  });

  const [timeReduced, setTimeReduced] = useState(() => {
    // Charger le temps réduit depuis localStorage
    const saved = localStorage.getItem('smackTimeReduced');
    return saved ? parseInt(saved, 10) : 0;
  });

  // Générer un ID de session unique pour cet utilisateur
  const [sessionId] = useState(() => {
    let session = localStorage.getItem('sessionId');
    if (!session) {
      session = 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
      localStorage.setItem('sessionId', session);
    }
    return session;
  });

  const [isShaking, setIsShaking] = useState(false);
  const [showStatsPopup, setShowStatsPopup] = useState(false);
  const [showShareButton, setShowShareButton] = useState(false);
  const [lastRewardSeconds, setLastRewardSeconds] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date().getTime();
      // Appliquer la réduction de temps (en millisecondes)
      const adjustedLaunchTime = launchDate.getTime() - (timeReduced * 1000);
      const distance = adjustedLaunchTime - now;

      if (distance < 0) {
        setIsLaunched(true);
        clearInterval(timer);
        return;
      }

      const days = Math.floor(distance / (1000 * 60 * 60 * 24));
      const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((distance % (1000 * 60)) / 1000);

      setTimeLeft({ days, hours, minutes, seconds });
    }, 1000);

    return () => clearInterval(timer);
  }, [launchDate, timeReduced]);


  // Fonction pour sauvegarder les clics
  const saveClickData = async (newCount) => {
    // Sauvegarder localement
    localStorage.setItem('smackButtonClicks', newCount.toString());
    localStorage.setItem('smackLastClickTime', new Date().toISOString());
    
    // Sauvegarder le premier clic si c'est le premier
    if (newCount === 1) {
      localStorage.setItem('smackFirstClick', new Date().toISOString());
    }
    
    // Sauvegarder sur le serveur (optionnel)
    try {
      await fetch('/api/analytics/button-clicks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          clickCount: newCount,
          timestamp: new Date().toISOString(),
          userAgent: navigator.userAgent,
          sessionId: sessionId
        })
      });
    } catch (error) {
      console.log('Analytics not available:', error);
    }
  };

  // Styles inspirés de UserProfile.css
  const pageStyle = {
    minHeight: '100vh',
    background: '#23232b',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '42px 20px',
    fontFamily: "'Rubik', 'Inter', Arial, sans-serif",
    letterSpacing: '0.01em'
  };

  const containerStyle = {
    maxWidth: '950px',
    width: '100%',
    background: '#181B24',
    borderRadius: '24px',
    padding: '36px 38px 32px 38px',
    color: '#fff',
    position: 'relative',
    minHeight: '700px',
    textAlign: 'center'
  };



  const launchedStyle = {
    fontSize: '48px',
    fontWeight: '800',
    color: '#fb4023',
    textShadow: '0 2px 15px #fb402390',
    animation: 'pulse 2s infinite',
    marginBottom: '20px'
  };


  if (isLaunched) {
    return (
      <div style={pageStyle}>
        <div style={containerStyle}>
          <div style={launchedStyle}>
            🚀 LANCÉ ! 🚀
          </div>
          <p style={{
            fontSize: '19px',
            marginBottom: '40px',
            color: '#aaa',
            fontWeight: '500'
          }}>Notre projet est maintenant disponible !</p>
          <a href="/tokens" style={{
            background: 'linear-gradient(90deg, #ffcc32 30%, #fb4023 100%)',
            color: '#181B24',
            border: 'none',
            padding: '8px 34px',
            borderRadius: '13px',
            textDecoration: 'none',
            fontWeight: '700',
            fontSize: '17px',
            transition: 'all 0.18s',
            cursor: 'pointer',
            boxShadow: '0 2px 12px #fb402344'
          }}>
            Voir les Tokens 🎉
          </a>
          <style>
            {`
              @keyframes pulse {
                0% { transform: scale(1); }
                50% { transform: scale(1.05); }
                100% { transform: scale(1); }
              }
              @keyframes blink {
                0%, 50% { opacity: 1; }
                51%, 100% { opacity: 0.3; }
              }
            `}
          </style>
        </div>
      </div>
    );
  }

  return (
    <>
      <MainNavigation activePage="countdown" isLaunched={isLaunched} />
      <div style={{
        ...pageStyle,
        animation: isShaking ? 'siteShake 0.5s ease-in-out 4' : 'none'
      }}>
        <div style={containerStyle} className="countdown-container">
        {/* Affichage chronométre digital */}
        <div style={{
          background: '#000',
          border: '3px solid #fb4023',
          borderRadius: '12px',
          padding: '30px 40px',
          margin: '30px auto',
          maxWidth: '750px',
          boxShadow: '0 0 15px #fb4023, 0 0 30px rgba(251, 64, 35, 0.5), 0 0 45px rgba(251, 64, 35, 0.3)',
          fontFamily: '"SevenSegment", "Digital-7", "SegmentedDisplay", monospace',
          letterSpacing: '3px',
          position: 'relative',
          animation: 'frameGlow 3s ease-in-out infinite'
        }} className="countdown-timer">
          <div style={{
            fontSize: '84px',
            color: '#fb4023',
            textAlign: 'center',
            textShadow: '0 0 2px #fb4023, 0 0 4px #fb4023',
            lineHeight: '1',
            fontWeight: 'bold',
            fontVariantNumeric: 'tabular-nums',
            filter: 'brightness(1.1) contrast(1.2)',
            letterSpacing: '10px',
            fontStyle: 'normal'
          }}>
            {String(timeLeft.days).padStart(2, '0')}
            <span style={{ animation: 'blink 1s infinite' }}>:</span>
            {String(timeLeft.hours).padStart(2, '0')}
            <span style={{ animation: 'blink 1s infinite' }}>:</span>
            {String(timeLeft.minutes).padStart(2, '0')}
            <span style={{ animation: 'blink 1s infinite' }}>:</span>
            {String(timeLeft.seconds).padStart(2, '0')}
          </div>
          
          {/* Labels en dessous du chronomètre */}
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            marginTop: '15px',
            fontSize: '16px',
            fontWeight: '700',
            color: '#ffaa04',
            textShadow: '0 0 8px #ffaa04, 0 0 16px #ffaa04',
            letterSpacing: '6px',
            fontFamily: '"SevenSegment", "Digital-7", "SegmentedDisplay", monospace'
          }} className="countdown-labels">
            <div style={{ width: '100px', textAlign: 'center' }}>DAYS</div>
            <div style={{ width: '20px', textAlign: 'center', opacity: 0 }}>:</div>
            <div style={{ width: '100px', textAlign: 'center' }}>HOURS</div>
            <div style={{ width: '20px', textAlign: 'center', opacity: 0 }}>:</div>
            <div style={{ width: '100px', textAlign: 'center' }}>MIN</div>
            <div style={{ width: '20px', textAlign: 'center', opacity: 0 }}>:</div>
            <div style={{ width: '100px', textAlign: 'center' }}>SEC</div>
          </div>
          
        </div>

        {/* SMACK image animée */}
        <div style={{
          textAlign: 'center',
          marginTop: '-70px',
          animation: 'smackPulse 2s ease-in-out infinite'
        }}>
          <img 
            src="/smack.png" 
            alt="SMACK" 
            className="smack-logo"
            style={{
              maxWidth: '300px',
              height: 'auto'
            }}
          />
        </div>

        {/* Flèche qui glisse vers le bas */}
        <div style={{
          textAlign: 'center',
          marginTop: '-100px',
          animation: 'arrowSlide 2s ease-in-out infinite'
        }} className="countdown-arrow">
          <div style={{
            fontSize: '72px',
            color: '#ffaa04',
            textShadow: '0 0 10px #ffaa04',
            WebkitTextStroke: '2px #dd190f',
            textStroke: '2px #dd190f',
            filter: 'drop-shadow(2px 2px 4px rgba(0,0,0,0.5))'
          }}>
            ↓
          </div>
        </div>

        {/* Bouton 3D rouge spectaculaire */}
        <div style={{
          textAlign: 'center',
          marginTop: '30px'
        }}>
          <div style={{
            position: 'relative',
            width: '200px',
            height: '200px',
            margin: '0 auto',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            transform: 'perspective(800px) rotateX(5deg) scale(0.6)',
          }} className="countdown-button-container">
            {/* Lueur rouge diffuse derrière */}
            <div style={{
              position: 'absolute',
              width: '280px',
              height: '280px',
              background: 'radial-gradient(circle at center, rgba(255, 40, 40, 0.6) 0%, rgba(220, 20, 20, 0.4) 15%, rgba(180, 10, 10, 0.25) 30%, rgba(140, 5, 5, 0.15) 45%, rgba(100, 0, 0, 0.08) 60%, rgba(60, 0, 0, 0.03) 75%, transparent 85%)',
              filter: 'blur(50px)',
              animation: 'glowBreathing 3s ease-in-out infinite',
              zIndex: -1
            }} />

            {/* Base principale très sombre */}
            <div style={{
              position: 'relative',
              width: '200px',
              height: '200px',
              background: 'radial-gradient(circle at 50% 40%, #303030 0%, #202020 20%, #151515 40%, #0a0a0a 70%, #000000 100%)',
              borderRadius: '50%',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              boxShadow: '0 30px 70px rgba(0, 0, 0, 0.95), 0 20px 40px rgba(0, 0, 0, 1), 0 10px 20px rgba(0, 0, 0, 1), inset 0 -5px 20px rgba(0, 0, 0, 1), inset 0 3px 3px rgba(255, 255, 255, 0.01)'
            }}>
              
              {/* Anneau métallique avec reflets */}
              <div style={{
                position: 'absolute',
                width: '186px',
                height: '186px',
                background: 'conic-gradient(from 0deg at 50% 50%, #787878 0deg, #585858 45deg, #484848 90deg, #383838 135deg, #282828 180deg, #383838 225deg, #484848 270deg, #585858 315deg, #787878 360deg)',
                borderRadius: '50%',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                boxShadow: 'inset 0 5px 10px rgba(0, 0, 0, 0.9), inset 0 -3px 8px rgba(255, 255, 255, 0.04), inset 2px 2px 4px rgba(0, 0, 0, 0.6), 0 2px 5px rgba(0, 0, 0, 1)'
              }}>

                {/* Zone creuse intérieure */}
                <div style={{
                  position: 'absolute',
                  width: '168px',
                  height: '168px',
                  background: 'radial-gradient(circle at 50% 45%, #1f1f1f 0%, #111111 25%, #080808 50%, #000000 100%)',
                  borderRadius: '50%',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  boxShadow: 'inset 0 12px 30px rgba(0, 0, 0, 1), inset 0 -5px 15px rgba(20, 20, 20, 0.1)'
                }}>

                  {/* Bouton 3D complet */}
                  <div 
                    onClick={() => {
                      // Incrémenter le compteur de clics
                      const newClickCount = clickCount + 1;
                      setClickCount(newClickCount);
                      
                      // Système anti-bot: chances aléatoires vraiment mélangées!
                      let reductionSeconds = 0;
                      let specialMessage = '';
                      let isSpecialBonus = false;
                      
                      // Chances très variables pour éviter les bots
                      const random = Math.random();
                      const extraRandom = Math.random(); // Double aléatoire pour plus de variabilité
                      
                      // Gros jackpots ultra rares (après beaucoup de clics)
                      if (newClickCount >= 1000 && random < 0.001 && extraRandom < 0.5) { 
                        reductionSeconds = 300; // 5 minutes - ultra rare
                        specialMessage = `🌟 MYTHICAL! -5 MINUTES! Unbelievable! (${newClickCount} clicks)`;
                        isSpecialBonus = true;
                      } else if (newClickCount >= 500 && random < 0.003 && extraRandom < 0.3) { 
                        reductionSeconds = 240; // 4 minutes
                        specialMessage = `🔥 LEGENDARY! -4 MINUTES! Ultimate boost! (${newClickCount} clicks)`;
                        isSpecialBonus = true;
                      } else if (newClickCount >= 200 && random < 0.008 && extraRandom < 0.6) { 
                        reductionSeconds = 120; // 2 minutes
                        specialMessage = `💎 EPIC! -2 MINUTES! Incredible! (${newClickCount} clicks)`;
                        isSpecialBonus = true;
                      } else if (newClickCount >= 100 && random < 0.015 && extraRandom < 0.4) { 
                        reductionSeconds = 60; // 1 minute
                        specialMessage = `🚀 MEGA BOOST! -1 MINUTE! Amazing! (${newClickCount} clicks)`;
                        isSpecialBonus = true;
                      } 
                      // Bonus moyens - chances variables
                      else if (random < 0.08 && extraRandom > 0.5) { // ~4% chance réelle
                        reductionSeconds = 30; // 30 secondes
                        specialMessage = `⚡ POWER UP! -30 seconds! Nice! (${newClickCount} clicks)`;
                        isSpecialBonus = true;
                      } else if (random < 0.12 && extraRandom < 0.7) { // ~8% chance réelle
                        reductionSeconds = 20; // 20 secondes
                        specialMessage = `💪 BOOST! -20 seconds! Good! (${newClickCount} clicks)`;
                        isSpecialBonus = true;
                      }
                      // Petites réductions - 1 sur 4/5 clics environ (ROUGE)
                      else if (random < 0.25) { // 25% chance
                        const smallReductions = [2, 3, 4, 5, 6, 7, 8, 10];
                        reductionSeconds = smallReductions[Math.floor(Math.random() * smallReductions.length)];
                        const smallMessages = [
                          `HELL YEAH, ${reductionSeconds}s SMACKED OFF! 🔥`,
                          `BOOM, -${reductionSeconds}s, YOU SMACKED IT! 💥`,
                          `NICE SMACK, -${reductionSeconds}s FASTER! ⚡`,
                          `FUCK YEAH, ${reductionSeconds}s DESTROYED! 💀`,
                          `SMACK ATTACK, -${reductionSeconds}s! 🎯`,
                          `${reductionSeconds}s OBLITERATED, KEEP SMACKING! 🚀`,
                          `CRITICAL SMACK, -${reductionSeconds}s! 💫`,
                          `${reductionSeconds}s ANNIHILATED, MORE! 🔨`
                        ];
                        specialMessage = smallMessages[Math.floor(Math.random() * smallMessages.length)];
                      }
                      
                      // Gérer les clics qui ne donnent pas de réduction de temps
                      if (reductionSeconds > 0) {
                        // Limite maximale: 2 heures = 7200 secondes
                        const maxReduction = 7200; 
                        const currentReduction = timeReduced;
                        
                        if (currentReduction >= maxReduction) {
                          // Limite atteinte - message spécial
                          specialMessage = `🏁 MAX SPEED REACHED! Community saved 2 hours! No more acceleration possible.`;
                          const newMessage = {
                            id: Date.now(),
                            text: specialMessage,
                            side: 'top',
                            position: { left: '50%', transform: 'translateX(-50%)' },
                            isSpecial: true,
                            isMaxReached: true
                          };
                          
                          setSideMessages(prev => [...prev, newMessage]);
                          setTimeout(() => {
                            setSideMessages(prev => prev.filter(msg => msg.id !== newMessage.id));
                          }, 6000);
                          
                        } else {
                          // Appliquer la réduction avec limite
                          const newTimeReduced = Math.min(currentReduction + reductionSeconds, maxReduction);
                          const actualReduction = newTimeReduced - currentReduction;
                          
                          setTimeReduced(newTimeReduced);
                          localStorage.setItem('smackTimeReduced', newTimeReduced.toString());
                          
                          // Mettre à jour le message avec la réduction réelle
                          if (newTimeReduced >= maxReduction) {
                            specialMessage = `🎯 FINAL BOOST! -${actualReduction}s! MAX SPEED: 2 HOURS SAVED!`;
                            isSpecialBonus = true;
                          } else if (!isSpecialBonus) {
                            // Message pour les réductions normales (2-10s)
                            specialMessage = `+${actualReduction}s faster! Keep clicking!`;
                          }
                        
                          // Afficher le bouton de partage pour les récompenses >= 3 secondes
                          if (actualReduction >= 3) {
                            setLastRewardSeconds(actualReduction);
                            setShowShareButton(true);
                            setTimeout(() => setShowShareButton(false), 8000); // Disparaît après 8 secondes
                          }
                          
                          // Afficher le message approprié
                          if (isSpecialBonus || newTimeReduced >= maxReduction) {
                            // TREMBLEMENT DU SITE pour les gros bonus (minutes)!
                            if (reductionSeconds >= 60) {
                              setIsShaking(true);
                              setTimeout(() => setIsShaking(false), 2000);
                              
                              // Message spécial pendant le tremblement
                              const shakeMessages = [
                                "WTF, YOU SMACK SO HARD, KEEP IT UP! 🔥💥",
                                "HOLY SHIT, SITE IS TREMBLING, SMACK HARDER! 🌪️💀",
                                "DAMN, YOU BROKE IT, KEEP SMACKING! 💣⚡",
                                "HELL YEAH, YOU SMACK LIKE A DEGEN, MORE! 🚀💥",
                                "SHIT, SITE IS EXPLODING, SMACK HARDER! 💥🔥",
                                "WTF, YOU DESTROYED IT, KEEP SMACKING! 💀⚡"
                              ];
                              
                              const shakeMessage = {
                                id: Date.now() + Math.random(), // ID unique
                                text: shakeMessages[Math.floor(Math.random() * shakeMessages.length)],
                                side: 'center',
                                position: { left: '50%', top: '30%', transform: 'translate(-50%, -50%)' },
                                isShakeMessage: true
                              };
                              
                              setSideMessages(prev => [...prev, shakeMessage]);
                              
                              // Message de tremblement reste pendant le shake (2s)
                              setTimeout(() => {
                                setSideMessages(prev => prev.filter(msg => msg.id !== shakeMessage.id));
                              }, 2000);
                            }
                            
                            // Message spécial pour gros bonus ou max atteint
                            const newMessage = {
                              id: Date.now(),
                              text: specialMessage,
                              side: 'top',
                              position: { left: '50%', transform: 'translateX(-50%)' },
                              isSpecial: true,
                              isMaxReached: newTimeReduced >= maxReduction,
                              isBigBonus: reductionSeconds >= 60
                            };
                            
                            setSideMessages(prev => [...prev, newMessage]);
                            
                            // Message spécial reste plus longtemps (5 secondes)
                            setTimeout(() => {
                              setSideMessages(prev => prev.filter(msg => msg.id !== newMessage.id));
                            }, 5000);
                          } else {
                            // Message normal pour petites réductions - positionnement varié
                            const positions = [
                              { side: 'left', position: { top: '15%' } },    // Haut gauche
                              { side: 'left', position: { top: '35%' } },    // Milieu gauche
                              { side: 'left', position: { top: '55%' } },    // Bas gauche
                              { side: 'right', position: { top: '15%' } },   // Haut droite
                              { side: 'right', position: { top: '35%' } },   // Milieu droite
                              { side: 'right', position: { top: '55%' } },   // Bas droite
                              { side: 'top-left', position: { top: '-80px', left: '20%' } },   // Au-dessus côté gauche
                              { side: 'top-right', position: { top: '-80px', left: '80%' } },  // Au-dessus côté droit
                              { side: 'bottom-left', position: { top: 'calc(100% + 40px)', left: '20%' } },   // En dessous côté gauche
                              { side: 'bottom-right', position: { top: 'calc(100% + 40px)', left: '80%' } }   // En dessous côté droit
                            ];
                            
                            const randomPos = positions[Math.floor(Math.random() * positions.length)];
                            
                            const newMessage = {
                              id: Date.now(),
                              text: specialMessage,
                              side: randomPos.side,
                              position: randomPos.position
                            };
                            
                            setSideMessages(prev => [...prev, newMessage]);
                            
                            // Message normal reste moins longtemps (2 secondes)
                            setTimeout(() => {
                              setSideMessages(prev => prev.filter(msg => msg.id !== newMessage.id));
                            }, 2000);
                          }
                        }
                      } else {
                        // Messages marrants pour les clics sans réduction (JAUNE)
                        const funnyMessages = [
                          "SMACK HARDER! 💪",
                          "SMACK MORE! 🔥",
                          "LMAO CONTINUE! 😂",
                          "SHIT SMACK MORE! 💥",
                          "HARDER HARDER! ⚡",
                          "SMACK THAT SHIT! 🎯",
                          "MORE SMACKING! 🚀",
                          "SMACK LIKE CRAZY! 💀",
                          "FUCKING SMACK! 😈",
                          "SMACK TILL IT BREAKS! 🔨",
                          "SMACK THE HELL OUT! 🌪️",
                          "GIMME MORE SMACK! 🤤",
                          "SMACK IT REAL GOOD! 💫",
                          "BOOM SMACK BOOM! 💣"
                        ];
                        
                        const randomFunnyMessage = funnyMessages[Math.floor(Math.random() * funnyMessages.length)];
                        
                        // Message d'encouragement - positionnement varié
                        const encouragementPositions = [
                          { side: 'left', position: { top: '20%' } },    // Haut gauche
                          { side: 'left', position: { top: '40%' } },    // Milieu gauche  
                          { side: 'left', position: { top: '60%' } },    // Bas gauche
                          { side: 'right', position: { top: '20%' } },   // Haut droite
                          { side: 'right', position: { top: '40%' } },   // Milieu droite
                          { side: 'right', position: { top: '60%' } },   // Bas droite
                          { side: 'top-left', position: { top: '-60px', left: '15%' } },   // Au-dessus côté gauche
                          { side: 'top-right', position: { top: '-60px', left: '85%' } },  // Au-dessus côté droit
                          { side: 'bottom-left', position: { top: 'calc(100% + 20px)', left: '15%' } },   // En dessous côté gauche
                          { side: 'bottom-right', position: { top: 'calc(100% + 20px)', left: '85%' } }   // En dessous côté droit
                        ];
                        
                        const randomEncPos = encouragementPositions[Math.floor(Math.random() * encouragementPositions.length)];
                        
                        const encouragementMessage = {
                          id: Date.now(),
                          text: randomFunnyMessage,
                          side: randomEncPos.side,
                          position: randomEncPos.position,
                          isEncouragement: true
                        };
                        
                        setSideMessages(prev => [...prev, encouragementMessage]);
                        
                        // Message d'encouragement disparaît rapidement (1.5s)
                        setTimeout(() => {
                          setSideMessages(prev => prev.filter(msg => msg.id !== encouragementMessage.id));
                        }, 1500);
                      }
                      
                      // Sauvegarder les données
                      saveClickData(newClickCount);
                    }}
                    style={{
                      position: 'relative',
                      width: '158px',
                      height: '158px',
                      cursor: 'pointer',
                      transform: 'translateY(-20px) translateZ(20px)',
                      transition: 'transform 0.08s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
                      transformStyle: 'preserve-3d'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.filter = 'brightness(1.05) saturate(1.08)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.filter = '';
                    }}
                    onMouseDown={(e) => {
                      e.currentTarget.style.transform = 'translateY(-15px) translateZ(15px)';
                    }}
                    onMouseUp={(e) => {
                      e.currentTarget.style.transform = 'translateY(-20px) translateZ(20px)';
                    }}
                  >
                    {/* Multiples couches pour le cylindre */}
                    <div style={{position: 'absolute', width: '158px', height: '158px', background: 'linear-gradient(135deg, #550000 0%, #440000 100%)', borderRadius: '50%', transform: 'translateY(20px)', boxShadow: '0 5px 15px rgba(0, 0, 0, 0.8)'}} />
                    <div style={{position: 'absolute', width: '158px', height: '158px', background: '#660000', borderRadius: '50%', transform: 'translateY(17px)'}} />
                    <div style={{position: 'absolute', width: '158px', height: '158px', background: '#770000', borderRadius: '50%', transform: 'translateY(14px)'}} />
                    <div style={{position: 'absolute', width: '158px', height: '158px', background: '#880000', borderRadius: '50%', transform: 'translateY(11px)'}} />
                    <div style={{position: 'absolute', width: '158px', height: '158px', background: '#990000', borderRadius: '50%', transform: 'translateY(8px)'}} />
                    <div style={{position: 'absolute', width: '158px', height: '158px', background: '#aa0000', borderRadius: '50%', transform: 'translateY(5px)'}} />
                    <div style={{position: 'absolute', width: '158px', height: '158px', background: '#bb0000', borderRadius: '50%', transform: 'translateY(2px)'}} />

                    {/* Surface supérieure du bouton */}
                    <div style={{
                      position: 'absolute',
                      width: '158px',
                      height: '158px',
                      background: 'radial-gradient(circle at 43% 38%, #ff8888 0%, #ff6666 8%, #ff4444 18%, #ff2222 30%, #ff0000 42%, #ee0000 54%, #dd0000 66%, #cc0000 78%, #bb0000 90%, #aa0000 100%)',
                      borderRadius: '50%',
                      border: '2.5px solid #880000',
                      overflow: 'hidden',
                      boxShadow: 'inset 0 -10px 25px rgba(0, 0, 0, 0.5), inset 0 5px 10px rgba(255, 255, 255, 0.35), inset -4px -4px 10px rgba(0, 0, 0, 0.35), inset 3px 3px 8px rgba(255, 100, 100, 0.2), 0 5px 15px rgba(0, 0, 0, 0.8)'
                    }}>
                      
                      {/* Reflet principal ovale très brillant */}
                      <div style={{
                        position: 'absolute',
                        width: '56px',
                        height: '43px',
                        background: 'radial-gradient(ellipse at 50% 50%, rgba(255, 255, 255, 1) 0%, rgba(255, 255, 255, 0.95) 15%, rgba(255, 245, 245, 0.8) 30%, rgba(255, 230, 230, 0.6) 45%, rgba(255, 215, 215, 0.4) 60%, rgba(255, 200, 200, 0.2) 75%, rgba(255, 185, 185, 0.1) 90%, transparent 100%)',
                        top: '20px',
                        left: '28px',
                        borderRadius: '50%',
                        transform: 'rotate(-23deg) skewX(-5deg)',
                        filter: 'blur(0.3px)',
                        mixBlendMode: 'screen'
                      }} />

                      {/* Petit reflet intense */}
                      <div style={{
                        position: 'absolute',
                        width: '25px',
                        height: '18px',
                        background: 'radial-gradient(ellipse at center, rgba(255, 255, 255, 0.95) 0%, rgba(255, 255, 255, 0.7) 40%, rgba(255, 245, 245, 0.4) 70%, transparent 90%)',
                        top: '27px',
                        left: '38px',
                        borderRadius: '50%',
                        transform: 'rotate(-18deg)'
                      }} />

                      {/* Bande de reflet courbée caractéristique */}
                      <div style={{
                        position: 'absolute',
                        width: '133px',
                        height: '80px',
                        borderRadius: '50%',
                        borderTop: '4px solid rgba(255, 255, 255, 0.22)',
                        borderLeft: '3px solid rgba(255, 255, 255, 0.12)',
                        borderRight: '2px solid rgba(255, 255, 255, 0.05)',
                        borderBottom: '2px solid transparent',
                        top: '35px',
                        left: '13px',
                        transform: 'rotate(-20deg)',
                        filter: 'blur(1.7px)'
                      }} />

                      {/* Lueur de bord subtile */}
                      <div style={{
                        position: 'absolute',
                        width: '146px',
                        height: '67px',
                        background: 'linear-gradient(to top, transparent 0%, rgba(255, 150, 150, 0.04) 25%, rgba(255, 170, 170, 0.02) 50%, transparent 100%)',
                        bottom: '12px',
                        left: '6px',
                        borderRadius: '50%'
                      }} />

                      {/* Ombre interne pour profondeur */}
                      <div style={{
                        position: 'absolute',
                        width: '158px',
                        height: '158px',
                        borderRadius: '50%',
                        boxShadow: 'inset 0 -15px 30px rgba(0, 0, 0, 0.4), inset 5px 5px 15px rgba(0, 0, 0, 0.2)',
                        pointerEvents: 'none'
                      }} />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Compteur de clics stylé */}
          {clickCount > 0 && (
            <div style={{
              textAlign: 'center',
              marginTop: '20px',
              animation: 'smackPulse 1s ease-in-out infinite'
            }}>
              <div style={{
                display: 'inline-block',
                background: '#181B24',
                color: '#fff',
                padding: '12px 24px',
                borderRadius: '25px',
                border: '2px solid #fb4023',
                fontSize: '18px',
                fontWeight: '700',
                textShadow: '0 0 10px #fb4023, 0 0 20px #fb4023, 0 0 30px #fb4023',
                boxShadow: '0 0 20px #fb4023, 0 0 40px rgba(251, 64, 35, 0.5), 0 0 60px rgba(251, 64, 35, 0.3), inset 0 2px 5px rgba(251, 64, 35, 0.1)',
                transform: 'perspective(100px) rotateX(0deg)',
                letterSpacing: '1px',
                position: 'relative',
                overflow: 'hidden'
              }} className="countdown-stats">
{clickCount} SMACKS!
              </div>
              
              {/* Indicateur du temps économisé */}
              {timeReduced > 0 && (
                <div style={{
                  marginTop: '10px',
                  fontSize: '14px',
                  color: '#13ff98',
                  fontWeight: '600',
                  textShadow: '0 0 8px #13ff98',
                  animation: 'smackPulse 2s ease-in-out infinite'
                }}>
                  ⚡ {Math.floor(timeReduced / 60)}:{(timeReduced % 60).toString().padStart(2, '0')} saved by community!
                </div>
              )}
            </div>
          )}
          
          {/* Bouton stats en bas de SMACK */}
          {clickCount > 0 && (
            <div style={{
              textAlign: 'center',
              marginTop: '15px'
            }}>
              <button
                onClick={() => setShowStatsPopup(true)}
                style={{
                  background: 'transparent',
                  border: '1px solid #ffaa04',
                  color: '#ffaa04',
                  padding: '8px 16px',
                  borderRadius: '15px',
                  fontSize: '12px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
                onMouseOver={(e) => {
                  e.target.style.background = '#ffaa04';
                  e.target.style.color = '#000';
                }}
                onMouseOut={(e) => {
                  e.target.style.background = 'transparent';
                  e.target.style.color = '#ffaa04';
                }}
              >
                📊 View Stats
              </button>
            </div>
          )}
        </div>

        {/* Messages marrants autour du cadre */}
        {sideMessages.map(message => {
          let positionStyle = {};
          
          if (message.side === 'left') {
            positionStyle = {
              top: message.position.top,
              left: '-220px'
            };
          } else if (message.side === 'right') {
            positionStyle = {
              top: message.position.top,
              left: 'calc(100% + 20px)'
            };
          } else if (message.side === 'top') {
            positionStyle = {
              top: '-60px',
              left: message.position.left,
              transform: 'translateX(-50%)'
            };
          } else if (message.side === 'bottom') {
            positionStyle = {
              top: 'calc(100% + 20px)',
              left: message.position.left,
              transform: 'translateX(-50%)'
            };
          } else if (message.side === 'top-left') {
            positionStyle = {
              top: message.position.top,
              left: message.position.left,
              transform: 'translateX(-50%)'
            };
          } else if (message.side === 'top-right') {
            positionStyle = {
              top: message.position.top,
              left: message.position.left,
              transform: 'translateX(-50%)'
            };
          } else if (message.side === 'bottom-left') {
            positionStyle = {
              top: message.position.top,
              left: message.position.left,
              transform: 'translateX(-50%)'
            };
          } else if (message.side === 'bottom-right') {
            positionStyle = {
              top: message.position.top,
              left: message.position.left,
              transform: 'translateX(-50%)'
            };
          } else if (message.side === 'center') {
            positionStyle = {
              ...message.position
            };
          }
          
          return (
            <div 
              key={message.id}
              style={{
                position: 'absolute',
                ...positionStyle,
                fontSize: message.isShakeMessage ? '28px' : (message.isSpecial ? (message.isMaxReached ? '24px' : '22px') : (message.isEncouragement ? '16px' : '18px')),
                fontWeight: message.isEncouragement ? '600' : '900',
                color: message.isShakeMessage ? '#ff3300' : (message.isSpecial ? (message.isMaxReached ? '#ff6b47' : (message.isBigBonus ? '#ff0066' : '#13ff98')) : (message.isEncouragement ? '#ffaa04' : '#ff4444')),
                textShadow: message.isShakeMessage ? '0 0 30px #ff3300, 0 0 60px #ff3300, 0 0 90px #ff3300, 0 0 120px #ff3300' : (message.isSpecial ? (message.isMaxReached ? '0 0 20px #ff6b47, 0 0 40px #ff6b47, 0 0 60px #ff6b47' : (message.isBigBonus ? '0 0 25px #ff0066, 0 0 50px #ff0066, 0 0 75px #ff0066' : '0 0 15px #13ff98, 0 0 30px #13ff98, 0 0 45px #13ff98')) : (message.isEncouragement ? '0 0 10px #ffaa04, 0 0 20px #ffaa04' : '0 0 15px #ff4444, 0 0 30px #ff4444')),
                animation: message.isShakeMessage ? 'shakeMessagePop 2s ease-out' : (message.isSpecial ? (message.isMaxReached ? 'maxReachedPop 6s ease-out' : 'specialMessagePop 5s ease-out') : (message.isEncouragement ? 'encouragementPop 1.5s ease-out' : 'sideMessagePop 3s ease-out')),
                zIndex: 1000,
                pointerEvents: 'none',
                textAlign: 'center',
                maxWidth: message.isSpecial ? '250px' : '180px',
                background: 'transparent',
                border: 'none',
                borderRadius: '0',
                padding: '0',
                whiteSpace: 'nowrap'
              }}
            >
              {message.text}
            </div>
          );
        })}

        {/* Bouton de partage après réussite */}
        {showShareButton && (
          <div style={{
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            zIndex: 8888,
            background: '#181B24',
            borderRadius: '15px',
            padding: '20px 25px',
            border: '2px solid #1DA1F2',
            boxShadow: '0 0 20px #1DA1F2, 0 0 40px rgba(29, 161, 242, 0.5)',
            animation: 'shareButtonPop 0.5s ease-out',
            textAlign: 'center',
            maxWidth: '350px'
          }}>
            {/* Message d'encouragement */}
            <div style={{
              color: '#fff',
              fontSize: '16px',
              fontWeight: '700',
              marginBottom: '15px',
              textShadow: '0 0 10px rgba(255,255,255,0.5)'
            }}>
              🔥 YOU SMACKED {lastRewardSeconds} SECONDS! 🔥
            </div>
            
            <div style={{
              color: '#1DA1F2',
              fontSize: '14px',
              fontWeight: '600',
              marginBottom: '18px',
              lineHeight: '1.4'
            }}>
              Share your success and challenge your friends!
            </div>

            {/* Bouton de partage */}
            <button
              onClick={() => {
                // Messages prédéfinis edgy aléatoires
                const edgyMessages = [
                  `SHIT, I just SMACKED ${lastRewardSeconds} seconds on smack.fun! Try to beat me... 🔥💥`,
                  `DAMN, just crushed ${lastRewardSeconds}s on smack.fun! Your turn to SMACK harder 💀⚡`,
                  `FUCK YEAH! Smacked ${lastRewardSeconds} seconds off! Think you can do better? smack.fun 🚀💣`,
                  `BOOM! ${lastRewardSeconds} seconds destroyed on smack.fun! Come prove you're better 😈🔨`,
                  `HOLY SHIT! Just wrecked ${lastRewardSeconds}s! Challenge accepted at smack.fun? 🌪️💥`
                ];
                
                const randomMessage = edgyMessages[Math.floor(Math.random() * edgyMessages.length)];
                const shareText = `${randomMessage}\n\n#SMACK #Challenge`;
                
                // Ouvrir Twitter avec le message pré-rempli
                const shareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`;
                window.open(shareUrl, '_blank');
                
                setShowShareButton(false);
              }}
              style={{
                background: 'linear-gradient(135deg, #1DA1F2, #0d8bd9)',
                border: 'none',
                color: '#fff',
                padding: '12px 20px',
                borderRadius: '25px',
                fontSize: '15px',
                fontWeight: '700',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                textShadow: '0 1px 2px rgba(0,0,0,0.5)',
                boxShadow: '0 4px 15px rgba(29, 161, 242, 0.3)',
                marginRight: '10px'
              }}
              onMouseOver={(e) => {
                e.target.style.transform = 'translateY(-2px)';
                e.target.style.boxShadow = '0 6px 20px rgba(29, 161, 242, 0.4)';
              }}
              onMouseOut={(e) => {
                e.target.style.transform = 'translateY(0)';
                e.target.style.boxShadow = '0 4px 15px rgba(29, 161, 242, 0.3)';
              }}
            >
              📸 SHARE ON X
            </button>

            {/* Bouton fermer */}
            <button
              onClick={() => setShowShareButton(false)}
              style={{
                background: 'transparent',
                border: '1px solid #666',
                color: '#666',
                padding: '8px 16px',
                borderRadius: '20px',
                fontSize: '12px',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
              onMouseOver={(e) => {
                e.target.style.borderColor = '#fff';
                e.target.style.color = '#fff';
              }}
              onMouseOut={(e) => {
                e.target.style.borderColor = '#666';
                e.target.style.color = '#666';
              }}
            >
              LATER
            </button>
          </div>
        )}

        {/* Popup des statistiques stylée */}
        {showStatsPopup && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.8)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 9999
          }}
          onClick={() => setShowStatsPopup(false)}
          >
            <div style={{
              background: '#181B24',
              borderRadius: '20px',
              padding: '30px',
              maxWidth: '500px',
              width: '90%',
              border: '3px solid #fb4023',
              boxShadow: '0 0 30px #fb4023, 0 0 60px rgba(251, 64, 35, 0.5)',
              animation: 'statsPopupShow 0.3s ease-out'
            }}
            onClick={(e) => e.stopPropagation()}
            >
              {/* Titre */}
              <div style={{
                textAlign: 'center',
                fontSize: '28px',
                fontWeight: '900',
                color: '#fb4023',
                textShadow: '0 0 15px #fb4023, 0 0 30px #fb4023',
                marginBottom: '25px',
                letterSpacing: '2px'
              }}>
                SMACK STATISTICS
              </div>

              {/* Statistiques */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '15px',
                marginBottom: '25px'
              }}>
                {/* Total Clicks */}
                <div style={{
                  background: '#232328',
                  padding: '15px',
                  borderRadius: '10px',
                  border: '1px solid #fb4023',
                  textAlign: 'center'
                }}>
                  <div style={{ 
                    fontSize: '24px', 
                    fontWeight: '900', 
                    color: '#ffaa04',
                    textShadow: '0 0 10px #ffaa04'
                  }}>
                    {clickCount}
                  </div>
                  <div style={{ 
                    fontSize: '12px', 
                    color: '#aaa',
                    marginTop: '5px'
                  }}>
                    TOTAL SMACKS
                  </div>
                </div>

                {/* Time Saved */}
                <div style={{
                  background: '#232328',
                  padding: '15px',
                  borderRadius: '10px',
                  border: '1px solid #13ff98',
                  textAlign: 'center'
                }}>
                  <div style={{ 
                    fontSize: '20px', 
                    fontWeight: '900', 
                    color: '#13ff98',
                    textShadow: '0 0 10px #13ff98'
                  }}>
                    {Math.floor(timeReduced / 60)}:{(timeReduced % 60).toString().padStart(2, '0')}
                  </div>
                  <div style={{ 
                    fontSize: '12px', 
                    color: '#aaa',
                    marginTop: '5px'
                  }}>
                    TIME SAVED
                  </div>
                </div>

                {/* Success Rate */}
                <div style={{
                  background: '#232328',
                  padding: '15px',
                  borderRadius: '10px',
                  border: '1px solid #ff6b47',
                  textAlign: 'center'
                }}>
                  <div style={{ 
                    fontSize: '20px', 
                    fontWeight: '900', 
                    color: '#ff6b47',
                    textShadow: '0 0 10px #ff6b47'
                  }}>
                    {clickCount > 0 ? Math.round((timeReduced > 0 ? 25 : 0)) : 0}%
                  </div>
                  <div style={{ 
                    fontSize: '12px', 
                    color: '#aaa',
                    marginTop: '5px'
                  }}>
                    SUCCESS RATE
                  </div>
                </div>

                {/* Session Power */}
                <div style={{
                  background: '#232328',
                  padding: '15px',
                  borderRadius: '10px',
                  border: '1px solid #9966ff',
                  textAlign: 'center'
                }}>
                  <div style={{ 
                    fontSize: '16px', 
                    fontWeight: '900', 
                    color: '#9966ff',
                    textShadow: '0 0 10px #9966ff'
                  }}>
                    {clickCount >= 1000 ? 'LEGENDARY' : clickCount >= 500 ? 'EPIC' : clickCount >= 100 ? 'RARE' : clickCount >= 50 ? 'UNCOMMON' : 'COMMON'}
                  </div>
                  <div style={{ 
                    fontSize: '12px', 
                    color: '#aaa',
                    marginTop: '5px'
                  }}>
                    SMACK LEVEL
                  </div>
                </div>
              </div>

              {/* Informations détaillées */}
              <div style={{
                background: '#232328',
                padding: '15px',
                borderRadius: '10px',
                border: '1px solid #333',
                marginBottom: '20px'
              }}>
                <div style={{ color: '#ddd', fontSize: '13px', lineHeight: '1.5' }}>
                  <div>🚀 <strong style={{color: '#ffaa04'}}>First Click:</strong> {localStorage.getItem('smackFirstClick') ? new Date(localStorage.getItem('smackFirstClick')).toLocaleString() : 'Never'}</div>
                  <div style={{marginTop: '5px'}}>⏰ <strong style={{color: '#ffaa04'}}>Last Click:</strong> {localStorage.getItem('smackLastClickTime') ? new Date(localStorage.getItem('smackLastClickTime')).toLocaleString() : 'Never'}</div>
                  <div style={{marginTop: '5px'}}>🎯 <strong style={{color: '#ffaa04'}}>Max Saved:</strong> {Math.floor((7200 - timeReduced) / 60)}:{((7200 - timeReduced) % 60).toString().padStart(2, '0')} remaining</div>
                  <div style={{marginTop: '5px'}}>💎 <strong style={{color: '#ffaa04'}}>Session ID:</strong> {sessionId.slice(-8)}</div>
                </div>
              </div>

              {/* Bouton de fermeture */}
              <div style={{ textAlign: 'center' }}>
                <button
                  onClick={() => setShowStatsPopup(false)}
                  style={{
                    background: 'linear-gradient(135deg, #fb4023, #ff5722)',
                    border: 'none',
                    color: '#fff',
                    padding: '12px 24px',
                    borderRadius: '10px',
                    fontSize: '16px',
                    fontWeight: '700',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    textShadow: '0 1px 2px rgba(0,0,0,0.5)',
                    boxShadow: '0 4px 15px rgba(251, 64, 35, 0.3)'
                  }}
                  onMouseOver={(e) => {
                    e.target.style.transform = 'translateY(-2px)';
                    e.target.style.boxShadow = '0 6px 20px rgba(251, 64, 35, 0.4)';
                  }}
                  onMouseOut={(e) => {
                    e.target.style.transform = 'translateY(0)';
                    e.target.style.boxShadow = '0 4px 15px rgba(251, 64, 35, 0.3)';
                  }}
                >
                  CLOSE STATS
                </button>
              </div>
            </div>
          </div>
        )}

        <style>
          {`
            @keyframes blink {
              0%, 50% { opacity: 1; }
              51%, 100% { opacity: 0.3; }
            }
            @keyframes smackPulse {
              0% { 
                transform: scale(1);
                text-shadow: 0 0 20px #fb4023, 0 0 40px #fb4023, 0 0 60px #fb4023;
              }
              50% { 
                transform: scale(1.1);
                text-shadow: 0 0 30px #fb4023, 0 0 60px #fb4023, 0 0 90px #fb4023, 0 0 120px #ff0000;
              }
              100% { 
                transform: scale(1);
                text-shadow: 0 0 20px #fb4023, 0 0 40px #fb4023, 0 0 60px #fb4023;
              }
            }
            @keyframes frameGlow {
              0% {
                box-shadow: 0 0 15px #fb4023, 0 0 30px rgba(251, 64, 35, 0.5), 0 0 45px rgba(251, 64, 35, 0.3);
              }
              50% {
                box-shadow: 0 0 20px #fb4023, 0 0 40px rgba(251, 64, 35, 0.7), 0 0 60px rgba(251, 64, 35, 0.5);
              }
              100% {
                box-shadow: 0 0 15px #fb4023, 0 0 30px rgba(251, 64, 35, 0.5), 0 0 45px rgba(251, 64, 35, 0.3);
              }
            }
            @keyframes arrowSlide {
              0% {
                transform: translateY(0px);
                opacity: 1;
              }
              50% {
                transform: translateY(15px);
                opacity: 0.7;
              }
              100% {
                transform: translateY(0px);
                opacity: 1;
              }
            }
            @keyframes logoFloat {
              0% {
                transform: translateY(0px);
              }
              50% {
                transform: translateY(-10px);
              }
              100% {
                transform: translateY(0px);
              }
            }
            @keyframes glowBreathing {
              0%, 100% {
                transform: scale(1) rotate(0deg);
                opacity: 0.9;
              }
              50% {
                transform: scale(1.15) rotate(5deg);
                opacity: 1;
              }
            }
            @keyframes flame1 {
              0% {
                transform: scaleY(1) rotate(-2deg);
                opacity: 0.9;
              }
              50% {
                transform: scaleY(1.3) scaleX(0.8) rotate(1deg);
                opacity: 1;
              }
              100% {
                transform: scaleY(0.8) scaleX(1.1) rotate(-1deg);
                opacity: 0.8;
              }
            }
            @keyframes flame2 {
              0% {
                transform: scaleY(1) rotate(1deg);
                opacity: 1;
              }
              33% {
                transform: scaleY(1.4) scaleX(0.9) rotate(-2deg);
                opacity: 0.9;
              }
              66% {
                transform: scaleY(0.9) scaleX(1.2) rotate(2deg);
                opacity: 0.8;
              }
              100% {
                transform: scaleY(1.2) scaleX(0.7) rotate(0deg);
                opacity: 1;
              }
            }
            @keyframes flame3 {
              0% {
                transform: scaleY(1) rotate(2deg);
                opacity: 0.8;
              }
              50% {
                transform: scaleY(1.5) scaleX(0.6) rotate(-1deg);
                opacity: 1;
              }
              100% {
                transform: scaleY(0.7) scaleX(1.3) rotate(1deg);
                opacity: 0.9;
              }
            }
            @keyframes flame4 {
              0% {
                transform: scaleY(1) rotate(-1deg);
                opacity: 0.9;
              }
              50% {
                transform: scaleY(1.2) scaleX(0.8) rotate(2deg);
                opacity: 0.8;
              }
              100% {
                transform: scaleY(0.9) scaleX(1.1) rotate(-2deg);
                opacity: 1;
              }
            }
            @keyframes flame5 {
              0% {
                transform: scaleY(1) rotate(1deg);
                opacity: 1;
              }
              25% {
                transform: scaleY(1.3) scaleX(0.9) rotate(-1deg);
                opacity: 0.9;
              }
              75% {
                transform: scaleY(0.8) scaleX(1.2) rotate(2deg);
                opacity: 0.8;
              }
              100% {
                transform: scaleY(1.1) scaleX(0.8) rotate(0deg);
                opacity: 1;
              }
            }
            @keyframes flame6 {
              0% {
                transform: scaleY(1) rotate(-2deg);
                opacity: 0.8;
              }
              50% {
                transform: scaleY(1.4) scaleX(0.7) rotate(1deg);
                opacity: 1;
              }
              100% {
                transform: scaleY(0.9) scaleX(1.2) rotate(-1deg);
                opacity: 0.9;
              }
            }
            @keyframes siteShake {
              0% { transform: translateX(0); }
              10% { transform: translateX(-10px); }
              20% { transform: translateX(10px); }
              30% { transform: translateX(-15px); }
              40% { transform: translateX(15px); }
              50% { transform: translateX(-10px); }
              60% { transform: translateX(10px); }
              70% { transform: translateX(-8px); }
              80% { transform: translateX(8px); }
              90% { transform: translateX(-5px); }
              100% { transform: translateX(0); }
            }
            @keyframes encouragementPop {
              0% {
                transform: scale(0);
                opacity: 0;
              }
              30% {
                transform: scale(1.1);
                opacity: 0.8;
              }
              70% {
                transform: scale(1);
                opacity: 0.7;
              }
              100% {
                transform: scale(0.9);
                opacity: 0;
              }
            }
            @keyframes maxReachedPop {
              0% {
                transform: scale(0) rotate(0deg);
                opacity: 0;
              }
              10% {
                transform: scale(1.5) rotate(5deg);
                opacity: 1;
              }
              20% {
                transform: scale(0.8) rotate(-3deg);
                opacity: 1;
              }
              30% {
                transform: scale(1.2) rotate(2deg);
                opacity: 1;
              }
              40% {
                transform: scale(0.95) rotate(-1deg);
                opacity: 1;
              }
              50% {
                transform: scale(1.05) rotate(0deg);
                opacity: 1;
              }
              80% {
                transform: scale(1) rotate(0deg);
                opacity: 1;
              }
              100% {
                transform: scale(0.3) rotate(0deg);
                opacity: 0;
              }
            }
            @keyframes specialMessagePop {
              0% {
                transform: scale(0) rotate(0deg);
                opacity: 0;
              }
              15% {
                transform: scale(1.3) rotate(3deg);
                opacity: 1;
              }
              25% {
                transform: scale(0.9) rotate(-1deg);
                opacity: 1;
              }
              35% {
                transform: scale(1.1) rotate(1deg);
                opacity: 1;
              }
              50% {
                transform: scale(1) rotate(0deg);
                opacity: 1;
              }
              90% {
                transform: scale(1) rotate(0deg);
                opacity: 1;
              }
              100% {
                transform: scale(0.5) rotate(0deg);
                opacity: 0;
              }
            }
            @keyframes shakeMessagePop {
              0% { 
                transform: scale(0) rotate(0deg); 
                opacity: 0; 
              }
              15% { 
                transform: scale(1.4) rotate(5deg); 
                opacity: 1; 
              }
              30% { 
                transform: scale(0.9) rotate(-3deg); 
                opacity: 1; 
              }
              50% { 
                transform: scale(1.1) rotate(2deg); 
                opacity: 1; 
              }
              80% { 
                transform: scale(1) rotate(0deg); 
                opacity: 1; 
              }
              100% { 
                transform: scale(0.8) rotate(0deg); 
                opacity: 0; 
              }
            }
            @keyframes statsPopupShow {
              0% {
                transform: scale(0.3) rotate(0deg);
                opacity: 0;
              }
              50% {
                transform: scale(1.05) rotate(0deg);
                opacity: 0.9;
              }
              100% {
                transform: scale(1) rotate(0deg);
                opacity: 1;
              }
            }
            @keyframes shareButtonPop {
              0% {
                transform: translate(-50%, -50%) scale(0.5);
                opacity: 0;
              }
              30% {
                transform: translate(-50%, -50%) scale(1.1);
                opacity: 0.8;
              }
              100% {
                transform: translate(-50%, -50%) scale(1);
                opacity: 1;
              }
            }
            @keyframes sideMessagePop {
              0% {
                transform: scale(0) rotate(0deg);
                opacity: 0;
              }
              15% {
                transform: scale(1.3) rotate(${(Math.random() - 0.5) * 30}deg);
                opacity: 1;
              }
              85% {
                transform: scale(1) rotate(${(Math.random() - 0.5) * 20}deg);
                opacity: 1;
              }
              100% {
                transform: scale(0.8) rotate(${(Math.random() - 0.5) * 40}deg);
                opacity: 0;
              }
            }
            
            /* Mobile Responsive Styles */
            @media (max-width: 768px) {
              .countdown-container {
                padding: 20px 15px !important;
                margin: 0 10px !important;
              }
              
              .countdown-timer {
                padding: 20px 25px !important;
                font-size: 48px !important;
                letter-spacing: 5px !important;
              }
              
              .countdown-labels {
                font-size: 12px !important;
                letter-spacing: 3px !important;
              }
              
              .countdown-labels > div {
                width: 70px !important;
              }
              
              .smack-logo {
                max-width: 200px !important;
                margin-top: -50px !important;
              }
              
              .countdown-arrow {
                font-size: 48px !important;
                margin-top: -70px !important;
              }
              
              .countdown-button-container {
                transform: perspective(600px) rotateX(5deg) scale(0.8) !important;
              }
              
              .countdown-button-base {
                width: 160px !important;
                height: 160px !important;
              }
              
              .countdown-stats {
                font-size: 14px !important;
                padding: 8px 16px !important;
              }
              
              .countdown-stats-number {
                font-size: 20px !important;
              }
              
              .countdown-stats-button {
                font-size: 10px !important;
                padding: 6px 12px !important;
              }
              
              .countdown-messages {
                font-size: 14px !important;
                max-width: 150px !important;
              }
              
              .countdown-share-popup {
                max-width: 320px !important;
                padding: 20px !important;
              }
              
              .countdown-share-title {
                font-size: 14px !important;
              }
              
              .countdown-share-message {
                font-size: 12px !important;
              }
              
              .countdown-share-buttons button {
                padding: 8px 15px !important;
                font-size: 13px !important;
              }
            }
            
            @media (max-width: 480px) {
              .countdown-container {
                padding: 15px 10px !important;
                margin: 0 5px !important;
              }
              
              .countdown-timer {
                font-size: 36px !important;
                padding: 15px 20px !important;
                letter-spacing: 3px !important;
              }
              
              .countdown-labels {
                font-size: 10px !important;
                letter-spacing: 2px !important;
              }
              
              .countdown-labels > div {
                width: 60px !important;
              }
              
              .smack-logo {
                max-width: 150px !important;
              }
              
              .countdown-arrow {
                font-size: 36px !important;
              }
              
              .countdown-button-container {
                transform: perspective(500px) rotateX(5deg) scale(0.7) !important;
              }
              
              .countdown-button-base {
                width: 140px !important;
                height: 140px !important;
              }
            }
          `}
        </style>
      </div>
    </div>
    </>
  );
};

export default LaunchCountdown;
import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useCountUp } from "use-count-up";
import { doc, getDoc, setDoc, updateDoc, arrayUnion, arrayRemove } from "firebase/firestore";
import { db } from "./firebase";
import EditProfile from "./EditProfile";
import "./UserProfile.css";
import axios from "axios";
import MainNavigation from "./MainNavigation";

// ======= AJOUT : fonction pour calculer le rank selon l’xp =========
function getRankByXP(xp) {
  if (!xp) return 0;
  if (xp < 1000) return Math.floor(xp / 100) + 1; // 1-10 (1 à 1000xp, tous les 100xp)
  return 10 + Math.floor((xp - 1000) / 200) + 1;  // 11... (200xp/rank après 1000)
}
// ================================================================

// ======= AJOUT : fonction pour ajouter de l'XP et maj le rank ======
async function addXP(wallet, amount) {
  if (!wallet || !amount) return;
  const userRef = doc(db, "users", wallet);
  const userSnap = await getDoc(userRef);
  if (!userSnap.exists()) return;
  const data = userSnap.data();
  const newXP = (data.xp || 0) + amount;
  const newRank = getRankByXP(newXP);
  await setDoc(userRef, { xp: newXP, rank: newRank }, { merge: true });
}
// ===================================================================

const allAchievements = [
  { name: "OG", label: "OG Level", icon: "👑", color: "#ffcc32", desc: "Reach OG level.", type: "og" },
  { name: "Legend", label: "Legend", icon: "🔥", color: "#fb4023", desc: "Reach Legend level.", type: "legend" },
  { name: "Voter", label: "Active Voter", icon: "🗳️", color: "#00e1ff", desc: "Participate in 5 votes.", type: "degen" },
  { name: "Streak7", label: "7-Day Streak", icon: "⏰", color: "#d988ff", desc: "Be active 7 days in a row.", type: "og" },
  { name: "Top10", label: "Top 10", icon: "🏆", color: "#F5A623", desc: "Reach top 10 leaderboard.", type: "legend" },
];

function getUserLevelProps(xp) {
  if (xp >= 3000)
    return { badge: "Legend", color: "#fb4023", glow: "0 0 18px 4px #fb4023, 0 0 34px 10px #ff1a4d77", orbe: "#fb4023", label: "Legend", type: "legend" };
  if (xp >= 1000)
    return { badge: "OG", color: "#ffcc32", glow: "0 0 16px 3px #ffcc32, 0 0 28px 8px #ffd70060", orbe: "#ffcc32", label: "OG", type: "og" };
  return { badge: "Degen", color: "#13ff98", glow: "0 0 14px 3px #13ff98, 0 0 20px 8px #13ff9844", orbe: "#13ff98", label: "Degen", type: "degen" };
}

async function getTokensHelius(wallet) {
  const apiKey = "27496bcd-2a62-4e7a-b8f5-0ae44a7d0445"; // <= METS TA CLE ICI !
  const url = `https://api.helius.xyz/v0/addresses/${wallet}/balances?api-key=${apiKey}`;
  try {
    const res = await axios.get(url);
    const sol = res.data.nativeBalance ? (res.data.nativeBalance / 1e9) : 0;
    const tokens = (res.data.tokens || []).filter(t => Number(t.amountUi) > 0);
    return { sol, tokens };
  } catch (e) {
    console.error("Erreur API Helius:", e);
    return { sol: 0, tokens: [] };
  }
}

export default function UserProfile({ userWallet, connectedWallet }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [xpAnimPercent, setXpAnimPercent] = useState(0);
  const [referralAnimPercent, setReferralAnimPercent] = useState(0);
  const [copiedReferral, setCopiedReferral] = useState(false);
  const [claimed] = useState(false);
  const [editing, setEditing] = useState(false);

  // Pour les vrais tokens onchain
  const [solBalance, setSolBalance] = useState(0);
  const [tokensOnChain, setTokensOnChain] = useState([]);
  const [updatingFollow, setUpdatingFollow] = useState(false); // Follow/unfollow state

  // Création auto du profil si absent
  useEffect(() => {
    if (!userWallet) return;
    async function ensureUserProfile() {
      const docRef = doc(db, "users", userWallet);
      const docSnap = await getDoc(docRef);
      if (!docSnap.exists()) {
        await setDoc(docRef, {
          handle: userWallet.slice(0, 8),
          address: userWallet,
          bio: "",
          avatar: "",
          twitter: "",
          xp: 0,
          xpMax: 3000,
          followers: [],
          following: [],
          tokensCreated: 0,
          rank: 0,
          achievements: [],
          referralLink: "",
          referralStats: { rank: 0, maxRank: 1, tokensCreated: 0, rewards: 0, level: "N/A" },
          portfolio: [],
          walletValue: 0,
          walletUsd: 0,
          feed: [],
          createdAt: Date.now()
        });
      }
    }
    ensureUserProfile();
  }, [userWallet]);

  // Fetch Firebase user
  useEffect(() => {
    if (!userWallet) return;
    async function fetchUser() {
      setLoading(true);
      const docRef = doc(db, "users", userWallet);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        let data = docSnap.data();
        if (!data.address) data.address = userWallet;
        if (!Array.isArray(data.followers)) data.followers = [];
        if (!Array.isArray(data.following)) data.following = [];
        setUser(data);
      } else {
        setUser(null);
      }
      setLoading(false);
    }
    fetchUser();
  }, [userWallet, editing, updatingFollow]);

  // Fetch onchain portfolio (live)
  useEffect(() => {
    if (!userWallet) return;
    getTokensHelius(userWallet).then(data => {
      setSolBalance(data.sol);
      setTokensOnChain(data.tokens);
    });
  }, [userWallet]);

  async function handleSave(formData) {
    formData.address = userWallet;
    const docRef = doc(db, "users", userWallet);
    await setDoc(docRef, formData, { merge: true });
    setEditing(false);
  }

  // ----- FOLLOW / UNFOLLOW LOGIQUE -----
  const isFollowing = user && connectedWallet && user.followers && user.followers.includes(connectedWallet);

  async function handleFollow() {
    if (!connectedWallet || !userWallet) return;
    setUpdatingFollow(true);
    try {
      const profileRef = doc(db, "users", userWallet);
      await updateDoc(profileRef, {
        followers: arrayUnion(connectedWallet)
      });
      const myProfileRef = doc(db, "users", connectedWallet);
      await updateDoc(myProfileRef, {
        following: arrayUnion(userWallet)
      });
    } catch (e) {
      alert("Erreur Follow: " + e.message);
    }
    setUpdatingFollow(false);
  }

  async function handleUnfollow() {
    if (!connectedWallet || !userWallet) return;
    setUpdatingFollow(true);
    try {
      const profileRef = doc(db, "users", userWallet);
      await updateDoc(profileRef, {
        followers: arrayRemove(connectedWallet)
      });
      const myProfileRef = doc(db, "users", connectedWallet);
      await updateDoc(myProfileRef, {
        following: arrayRemove(userWallet)
      });
    } catch (e) {
      alert("Erreur Unfollow: " + e.message);
    }
    setUpdatingFollow(false);
  }
  // --------------------------------------

  const levelProps = getUserLevelProps(user?.xp || 0);
  const avatarGlow = levelProps.glow;

  // CountUp doit être array.length pour followers/following
  const { value: followersCount } = useCountUp({ isCounting: true, end: user?.followers ? user.followers.length : 0, duration: 1.2 });
  const { value: followingCount } = useCountUp({ isCounting: true, end: user?.following ? user.following.length : 0, duration: 1.1 });
  const { value: xp } = useCountUp({ isCounting: true, end: user?.xp || 0, duration: 1.3 });
  const { value: tokensCreated } = useCountUp({ isCounting: true, end: user?.tokensCreated || 0, duration: 1.1 });
  const { value: rank } = useCountUp({ isCounting: true, end: user?.rank || 0, duration: 1.1 });

  const xpPercent = Math.min(100, ((user?.xp || 0) / (user?.xpMax || 3000)) * 100);
  const referralPercent = Math.min(100, ((user?.referralStats?.rank || 0) / (user?.referralStats?.maxRank || 1)) * 100);

  useEffect(() => {
    let frame, start;
    const duration = 1100;
    function animateBar(ts) {
      if (!start) start = ts;
      const progress = Math.min(1, (ts - start) / duration);
      setXpAnimPercent(progress * xpPercent);
      if (progress < 1) frame = requestAnimationFrame(animateBar);
      else setXpAnimPercent(xpPercent);
    }
    frame = requestAnimationFrame(animateBar);
    return () => cancelAnimationFrame(frame);
  }, [xpPercent]);

  useEffect(() => {
    let frame, start;
    const duration = 1100;
    function animateBar(ts) {
      if (!start) start = ts;
      const progress = Math.min(1, (ts - start) / duration);
      setReferralAnimPercent(progress * referralPercent);
      if (progress < 1) frame = requestAnimationFrame(animateBar);
      else setReferralAnimPercent(referralPercent);
    }
    frame = requestAnimationFrame(animateBar);
    return () => cancelAnimationFrame(frame);
  }, [referralPercent]);

  const handleReferralCopy = () => {
    if(user?.referralLink) {
      navigator.clipboard.writeText(user.referralLink);
      setCopiedReferral(true);
      setTimeout(() => setCopiedReferral(false), 1500);
    }
  };

  const isOwner = connectedWallet && connectedWallet === userWallet;

  if(loading) return <div style={{color:"#fff", textAlign:"center", marginTop:60}}>Loading profile...</div>;
  if(!user) return <div style={{color:"#fff", textAlign:"center", marginTop:60}}>No profile found for this wallet.</div>;

  if (editing) {
    return (
      <>
        <MainNavigation activePage="profile" isLaunched={true} />
        <div className="user-profile-main" style={{ maxWidth: 500, margin: "auto" }}>
          <EditProfile
            user={user}
            currentWallet={connectedWallet}
            onSave={handleSave}
            onCancel={() => setEditing(false)}
          />
        </div>
      </>
    );
  }

  return (
    <>
      <MainNavigation activePage="profile" isLaunched={true} />
    <AnimatePresence>
      <motion.div
        variants={{
          animate: {
            boxShadow: [
              `0 0 0px 0px ${levelProps.orbe}11, 0 0 0px 0px ${levelProps.orbe}10`,
              `0 0 24px 6px ${levelProps.orbe}44, 0 0 30px 12px ${levelProps.orbe}22`,
              `0 0 34px 10px ${levelProps.orbe}66, 0 0 54px 18px ${levelProps.orbe}44`,
              `0 0 24px 6px ${levelProps.orbe}44, 0 0 30px 12px ${levelProps.orbe}22`,
              `0 0 0px 0px ${levelProps.orbe}11, 0 0 0px 0px ${levelProps.orbe}10`
            ],
            transition: {
              duration: 2.9,
              repeat: Infinity,
              ease: "easeInOut"
            }
          }
        }}
        animate="animate"
        className="user-profile-main"
        style={{ border: `2.7px solid ${levelProps.orbe}bb` }}
      >
        <motion.div
          initial="hidden"
          animate="visible"
          exit="hidden"
          variants={{
            hidden: { opacity: 0, y: 40 },
            visible: {
              opacity: 1, y: 0,
              transition: { staggerChildren: 0.10, delayChildren: 0.08, duration: 0.65, ease: [0.17, 0.67, 0.38, 0.96] }
            }
          }}
          className="user-profile-inner"
        >
          <motion.div variants={{
            hidden: { opacity: 0, y: 22 },
            visible: { opacity: 1, y: 0, transition: { duration: 0.48, ease: [0.17, 0.67, 0.38, 0.96] } }
          }} className="user-profile-top">
            <img
              src={user.avatar && user.avatar.startsWith("http") ? user.avatar : "https://cdn-icons-png.flaticon.com/512/1077/1077114.png"}
              alt="Avatar"
              className="user-profile-avatar"
              style={{ boxShadow: avatarGlow }}
            />
            <div>
              <div className="user-profile-header-row">
                <span className="user-profile-handle" style={{
                  color: levelProps.orbe,
                  textShadow: `0 2px 16px ${levelProps.orbe}90`
                }}>{user.handle}</span>
                {["Degen", "OG", "Legend"].map((b) => (
                  <motion.span
                    key={b}
                    variants={{
                      animate: {
                        boxShadow: [
                          "0 0 0px 0px #fff7",
                          "0 0 12px 2px #fff7",
                          "0 0 0px 0px #fff7"
                        ],
                        transition: {
                          duration: 1.6,
                          repeat: Infinity,
                          ease: "easeInOut"
                        }
                      }
                    }}
                    animate={levelProps.label === b ? "animate" : ""}
                    className={`user-profile-badge user-profile-badge-${b.toLowerCase()}`}
                    style={{
                      background: b === "Degen" ? "#13ff98"
                        : b === "OG" ? "#ffcc32"
                          : "#fb4023",
                      fontSize: levelProps.label === b ? 16 : 13,
                      padding: levelProps.label === b ? "3.5px 18px" : "2.5px 15px",
                      fontWeight: levelProps.label === b ? 900 : 700,
                      opacity: levelProps.label === b ? 1 : 0.38,
                      filter: levelProps.label === b ? "none" : "grayscale(100%)",
                      boxShadow: levelProps.label === b
                        ? `0 2px 14px ${levelProps.orbe}88, 0 0 16px ${levelProps.orbe}55`
                        : "none",
                      textShadow: levelProps.label === b ? "0 2px 14px #fff8" : "none"
                    }}
                  >{b}</motion.span>
                ))}
                {/* ==== BOUTON FOLLOW / UNFOLLOW ==== */}
                {connectedWallet && connectedWallet !== userWallet && (
                  isFollowing ? (
                    <button
                      className="user-profile-follow-btn"
                      onClick={handleUnfollow}
                      disabled={updatingFollow}
                      style={{
                        marginLeft: 10, background: "#222", color: "#ff6969", borderRadius: 9, padding: "3px 15px", border: 0, cursor: "pointer", fontWeight: 700
                      }}
                    >Unfollow</button>
                  ) : (
                    <button
                      className="user-profile-follow-btn"
                      onClick={handleFollow}
                      disabled={updatingFollow}
                      style={{
                        marginLeft: 10, background: "#13ff98", color: "#181B24", borderRadius: 9, padding: "3px 15px", border: 0, cursor: "pointer", fontWeight: 700
                      }}
                    >Follow</button>
                  )
                )}
                {/* =============================== */}
              </div>
              <div className="user-profile-address">
                @{user.address}
              </div>
            </div>
          </motion.div>

          {isOwner && (
            <div style={{ textAlign: "right", marginBottom: 8 }}>
              <button
                className="user-profile-edit-btn"
                style={{
                  background: "linear-gradient(90deg,#00e1ff,#ffcc32)",
                  color: "#22242e",
                  fontWeight: 700,
                  border: 0,
                  borderRadius: 13,
                  padding: "4px 18px",
                  fontSize: 14,
                  cursor: "pointer",
                  boxShadow: "0 1px 8px #00e1ff33",
                  marginRight: 6,
                  marginTop: 4,
                  letterSpacing: 0.7
                }}
                onClick={() => setEditing(true)}
              >
                Edit
              </button>
            </div>
          )}

          <motion.div variants={{
            hidden: { opacity: 0, y: 22 },
            visible: { opacity: 1, y: 0, transition: { duration: 0.48, ease: [0.17, 0.67, 0.38, 0.96] } }
          }} className="user-profile-maininfo">
            <div className="user-profile-bio">{user.bio}</div>
            <div className="user-profile-link">
              <a
                href={user.externalLink}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  color: levelProps.orbe
                }}
              >
                Twitter
              </a>
            </div>
            <div className="user-profile-stats">
              <span>Followers: <b style={{ color: "#ffcc32" }}>{Math.round(followersCount)}</b></span>
              <span>Following: <b>{Math.round(followingCount)}</b></span>
              <span>XP: <b style={{ color: "#ffcc32" }}>{Math.round(xp)}</b></span>
              <span>Tokens created: <b>{Math.round(tokensCreated)}</b></span>
              <span>Rank: <b style={{ color: levelProps.orbe }}>#{Math.round(rank)}</b></span>
            </div>
            <div className="user-profile-xp-progress-wrap">
              <div className="user-profile-xp-label">Level progression</div>
              <div className="user-profile-xp-bar-bg">
                <div
                  className="user-profile-xp-bar"
                  style={{
                    background: `linear-gradient(90deg, ${levelProps.orbe} 0%, #ffcc32 70%)`,
                    width: `${xpAnimPercent}%`,
                    boxShadow: `0 0 8px ${levelProps.orbe}77`
                  }}
                >
                  <div className="user-profile-xp-shine" />
                </div>
                <span className="user-profile-xp-text">{user.xp} / {user.xpMax}</span>
              </div>
            </div>
            <div className="user-profile-claim-wrap">
              <button
                disabled={true}
                className="user-profile-claim-btn"
                style={{
                  background: "linear-gradient(90deg, #c2c2c2 65%, #b7b7b7 100%)",
                  color: "#888",
                  cursor: "not-allowed",
                  boxShadow: "none",
                  opacity: 0.5,
                }}>
                Claim reward
              </button>
            </div>
          </motion.div>
          <motion.div variants={{
            hidden: { opacity: 0, y: 22 },
            visible: { opacity: 1, y: 0, transition: { duration: 0.48, ease: [0.17, 0.67, 0.38, 0.96] } }
          }} className="user-profile-referral">
            <div className="user-profile-referral-row">
              <span>
                <b style={{ color: "#ffcc32" }}>Referral link:</b>{" "}
                <span style={{ color: "#13ff98" }}>{user.referralLink}</span>
              </span>
              <button
                className="user-profile-referral-btn"
                style={{
                  background: copiedReferral
                    ? "linear-gradient(90deg, #fb4023 70%, #ffcc32 100%)"
                    : "linear-gradient(90deg, #fb4023, #ffcc32)",
                  color: copiedReferral ? "#fff" : "#181B24",
                  boxShadow: copiedReferral
                    ? "0 2px 16px #fb4023cc, 0 0 20px #ffcc3290"
                    : "0 1.5px 10px #fb402377"
                }}
                onClick={handleReferralCopy}
                disabled={copiedReferral}
              >
                {copiedReferral ? "Copied!" : "Copy link"}
              </button>
            </div>
            <div className="user-profile-referral-progress-wrap">
              <div className="user-profile-referral-label">Referral Rank</div>
              <div className="user-profile-referral-bar-bg">
                <div
                  className="user-profile-referral-bar"
                  style={{
                    width: `${referralAnimPercent}%`
                  }}
                >
                  <div className="user-profile-referral-shine" />
                </div>
                <span className="user-profile-referral-text">#{user.referralStats?.rank || 0} / {user.referralStats?.maxRank || 1}</span>
              </div>
            </div>
            <div className="user-profile-referral-stats">
              <span>Tokens via referral: <b>{user.referralStats?.tokensCreated || 0}</b></span>
              <span>Rewards earned: <b style={{ color: "#13ff98" }}>{user.referralStats?.rewards || 0} SOL</b></span>
              <span>Level: <b>{user.referralStats?.level || "N/A"}</b></span>
            </div>
          </motion.div>
          <motion.div variants={{
            hidden: { opacity: 0, y: 22 },
            visible: { opacity: 1, y: 0, transition: { duration: 0.48, ease: [0.17, 0.67, 0.38, 0.96] } }
          }} className="user-profile-tabs">
            <button className="user-profile-tab user-profile-tab-active">Portfolio</button>
            <button className="user-profile-tab">Feed</button>
            <button className="user-profile-tab">Achievements</button>
            <button className="user-profile-tab">Leaderboard</button>
          </motion.div>
          <motion.div variants={{
            hidden: { opacity: 0, y: 22 },
            visible: { opacity: 1, y: 0, transition: { duration: 0.48, ease: [0.17, 0.67, 0.38, 0.96] } }
          }} className="user-profile-portfolio">
            <h3 className="user-profile-portfolio-title">Portfolio</h3>
            <div className="user-profile-portfolio-content">
              <div>
                <div className="user-profile-walletval">{solBalance} <span className="user-profile-sol">◎</span></div>
              </div>
              <div className="user-profile-walletlist">
                {tokensOnChain.length === 0 && (
                  <div style={{ color: "#aaa" }}>Loading...</div>
                )}
                {tokensOnChain.map((tok, i) => (
                  <div key={tok.mint + i} className="user-profile-walletrow">
                    <span className="user-profile-walletsymb">{tok.tokenSymbol || "?"}</span>
                    <span className="user-profile-walletbal">{tok.amountUi}</span>
                    <span className="user-profile-walletusd2">{tok.tokenName || tok.mint}</span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
          <motion.div variants={{
            hidden: { opacity: 0, y: 22 },
            visible: { opacity: 1, y: 0, transition: { duration: 0.48, ease: [0.17, 0.67, 0.38, 0.96] } }
          }} className="user-profile-feed">
            <h3 className="user-profile-feed-title">Activity Feed</h3>
            <ul className="user-profile-feed-list">
              {(user.feed || []).map((event, idx) => (
                <li key={idx} className="user-profile-feedrow">
                  <span className="user-profile-feedtype">[{event.type}]</span> {event.detail} <span className="user-profile-feeddate">{event.date}</span>
                </li>
              ))}
            </ul>
          </motion.div>
          <motion.div variants={{
            hidden: { opacity: 0, y: 22 },
            visible: { opacity: 1, y: 0, transition: { duration: 0.48, ease: [0.17, 0.67, 0.38, 0.96] } }
          }} className="user-profile-achievements">
            <h3 className="user-profile-ach-title">Achievements to unlock</h3>
            <div className="user-profile-ach-list">
              {allAchievements.map((ach) => {
                const unlocked = (user.achievements || []).includes(ach.name);
                return (
                  <motion.div
                    key={ach.name}
                    variants={{
                      animate: {
                        boxShadow: [
                          "0 0 0px 0px #fff7",
                          "0 0 12px 2px #fff7",
                          "0 0 0px 0px #fff7"
                        ],
                        transition: {
                          duration: 1.6,
                          repeat: Infinity,
                          ease: "easeInOut"
                        }
                      }
                    }}
                    animate={unlocked ? "animate" : ""}
                    className={`user-profile-ach-badge ${unlocked ? "unlocked" : ""}`}
                    style={{
                      background: unlocked ? ach.color + "26" : "#22242e",
                      border: unlocked ? `2.5px solid ${ach.color}` : "2px solid #333",
                      color: unlocked ? "#fff" : "#aaa",
                      boxShadow: unlocked ? `0 0 12px ${ach.color}44` : "none"
                    }}
                    title={ach.desc}
                  >
                    <span className="user-profile-ach-icon" style={{
                      filter: unlocked ? "none" : "grayscale(100%)",
                      textShadow: unlocked ? `0 2px 9px ${ach.color}66` : "none"
                    }}>{ach.icon}</span>
                    <span className="user-profile-ach-label" style={{
                      color: unlocked ? ach.color : "#bbb"
                    }}>{ach.label}</span>
                  </motion.div>
                );
              })}
            </div>
            <div className="user-profile-ach-tip">
              <span>Unlock achievements by being active on the platform!</span>
            </div>
          </motion.div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
    </>
  );
}

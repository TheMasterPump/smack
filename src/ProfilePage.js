import React from "react";
import UserProfile from "./UserProfile";
import { useWallet } from "@solana/wallet-adapter-react";

export default function ProfilePage() {
  const { publicKey } = useWallet();

  // userWallet : le profil affiché (par exemple, tu pourrais le prendre de l’URL)
  // Ici, on affiche juste le profil du wallet connecté pour l’exemple
  const userWallet = publicKey?.toBase58() || "";

  // connectedWallet : le wallet actuellement connecté (pour permission d’édition)
  const connectedWallet = publicKey?.toBase58() || "";

  // Si tu veux afficher un autre profil :
  // const userWallet = "clé_publique_d_un_autre_utilisateur"

  return (
    <div>
      <UserProfile userWallet={userWallet} connectedWallet={connectedWallet} />
    </div>
  );
}

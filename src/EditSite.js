import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useWallet } from '@solana/wallet-adapter-react';
import ReactQuill from 'react-quill'; // WYSIWYG editor (à installer)
import 'react-quill/dist/quill.snow.css';

export default function EditSite() {
  const { slug } = useParams();
  const wallet = useWallet();
  const navigate = useNavigate();

  const [token, setToken] = useState(null);
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`http://localhost:4000/api/token/${slug}`)
      .then(res => res.json())
      .then(data => {
        setToken(data);
        setContent(data.description || '');
        setLoading(false);
      });
  }, [slug]);

  if (loading) return <div>Loading...</div>;

  if (wallet.publicKey?.toBase58() !== token?.marketStats?.creator) {
    return <div>You are not authorized to edit this site.</div>;
  }

  // Sauvegarde des changements
  const handleSave = async () => {
    if (!content.trim()) {
      alert("Content can't be empty.");
      return;
    }
    try {
      const updatedToken = { ...token, description: content };
      const res = await fetch(`http://localhost:4000/api/token/${slug}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedToken),
      });
      if (!res.ok) throw new Error('Failed to save');
      alert('Saved!');
      navigate(`/mini-site/${slug}`);
    } catch (e) {
      alert('Error saving content: ' + e.message);
    }
  };

  return (
    <div>
      <h2>Edit Mini Site for {token.name}</h2>
      <ReactQuill value={content} onChange={setContent} />
      <button onClick={handleSave}>Save</button>
      <button onClick={() => navigate(`/mini-site/${slug}`)}>Cancel</button>
    </div>
  );
}

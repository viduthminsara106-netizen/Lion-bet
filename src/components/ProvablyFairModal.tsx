import React, { useState } from 'react';
import { RoundInfo } from '../types/game';
import { calculateCrashPoint, sha256 } from '../services/provablyFair';
import { ShieldCheck, CheckCircle2, Copy, X, KeyRound, Cpu } from 'lucide-react';

interface ProvablyFairModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedRound: RoundInfo | null;
  currentClientSeed: string;
  onUpdateClientSeed: (seed: string) => void;
}

export const ProvablyFairModal: React.FC<ProvablyFairModalProps> = ({
  isOpen,
  onClose,
  selectedRound,
  currentClientSeed,
  onUpdateClientSeed,
}) => {
  const [activeTab, setActiveTab] = useState<'info' | 'verifier'>('info');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Verifier Inputs
  const [verifyServerSeed, setVerifyServerSeed] = useState(selectedRound?.serverSeed || '');
  const [verifyClientSeed, setVerifyClientSeed] = useState(selectedRound?.clientSeed || currentClientSeed);
  const [verifyNonce, setVerifyNonce] = useState(selectedRound?.nonce?.toString() || '1');
  const [verificationResult, setVerificationResult] = useState<{
    calculatedCrash: number;
    serverHash: string;
    hmacHex: string;
  } | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  if (!isOpen) return null;

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleVerify = async () => {
    setIsVerifying(true);
    try {
      const nonceNum = parseInt(verifyNonce, 10) || 1;
      const { crashPoint, hashHex } = await calculateCrashPoint(
        verifyServerSeed.trim(),
        verifyClientSeed.trim(),
        nonceNum
      );
      const serverHash = await sha256(verifyServerSeed.trim());
      setVerificationResult({
        calculatedCrash: crashPoint,
        serverHash,
        hmacHex: hashHex,
      });
    } catch (e) {
      console.error(e);
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-white">Provably Fair Algorithm</h2>
              <p className="text-xs text-slate-400">100% Cryptographically Verifiable Results</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-800 px-6 pt-2 bg-slate-950/30">
          <button
            type="button"
            onClick={() => setActiveTab('info')}
            className={`pb-3 px-3 text-xs font-bold border-b-2 transition ${
              activeTab === 'info'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Round Proof & Seeds
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('verifier');
              if (selectedRound) {
                setVerifyServerSeed(selectedRound.serverSeed);
                setVerifyClientSeed(selectedRound.clientSeed);
                setVerifyNonce(selectedRound.nonce.toString());
              }
            }}
            className={`pb-3 px-3 text-xs font-bold border-b-2 transition ${
              activeTab === 'verifier'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Independent Verifier Tool
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-5 text-xs text-slate-300">
          {activeTab === 'info' ? (
            <>
              {/* Selected Round Details */}
              {selectedRound ? (
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
                    <span className="font-bold text-slate-400">Inspecting Round #{selectedRound.nonce}</span>
                    <span className="font-black text-base text-emerald-400">
                      Crash: {selectedRound.crashPoint.toFixed(2)}x
                    </span>
                  </div>

                  {/* Server Seed */}
                  <div>
                    <label className="text-[11px] font-bold text-slate-400 flex items-center justify-between">
                      <span>Server Seed (Revealed)</span>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(selectedRound.serverSeed, 'serverSeed')}
                        className="text-emerald-400 hover:underline flex items-center gap-1"
                      >
                        <Copy className="w-3 h-3" />
                        {copiedKey === 'serverSeed' ? 'Copied!' : 'Copy'}
                      </button>
                    </label>
                    <div className="mt-1 font-mono text-[11px] p-2 bg-slate-900 rounded-lg break-all text-slate-300 select-all border border-slate-800">
                      {selectedRound.serverSeed}
                    </div>
                  </div>

                  {/* Server Seed Hash */}
                  <div>
                    <label className="text-[11px] font-bold text-slate-400 flex items-center justify-between">
                      <span>Server Seed Hash (SHA-256 Public Commitment)</span>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(selectedRound.serverSeedHash, 'serverHash')}
                        className="text-emerald-400 hover:underline flex items-center gap-1"
                      >
                        <Copy className="w-3 h-3" />
                        {copiedKey === 'serverHash' ? 'Copied!' : 'Copy'}
                      </button>
                    </label>
                    <div className="mt-1 font-mono text-[11px] p-2 bg-slate-900 rounded-lg break-all text-slate-400 select-all border border-slate-800">
                      {selectedRound.serverSeedHash}
                    </div>
                  </div>

                  {/* Client Seed & Nonce */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <span className="text-[11px] font-bold text-slate-400">Client Seed</span>
                      <div className="mt-1 font-mono text-[11px] p-2 bg-slate-900 rounded-lg text-slate-300 border border-slate-800">
                        {selectedRound.clientSeed}
                      </div>
                    </div>
                    <div>
                      <span className="text-[11px] font-bold text-slate-400">Nonce</span>
                      <div className="mt-1 font-mono text-[11px] p-2 bg-slate-900 rounded-lg text-slate-300 border border-slate-800">
                        {selectedRound.nonce}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-center text-slate-400">
                  Select any previous multiplier in the top bar to inspect its exact cryptographic seeds.
                </div>
              )}

              {/* Player Client Seed Configuration */}
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <label className="font-bold text-slate-200 flex items-center gap-2">
                  <KeyRound className="w-4 h-4 text-emerald-400" />
                  Your Active Client Seed
                </label>
                <p className="text-[11px] text-slate-400">
                  You can randomize or personalize your client seed at any time. This guarantees the house cannot predict your flight crash point in advance.
                </p>
                <div className="flex gap-2 pt-1">
                  <input
                    type="text"
                    value={currentClientSeed}
                    onChange={(e) => onUpdateClientSeed(e.target.value)}
                    className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono text-emerald-300 focus:outline-none focus:border-emerald-500"
                  />
                  <button
                    type="button"
                    onClick={() => onUpdateClientSeed('balloon_' + Math.random().toString(36).substring(2, 10))}
                    className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl transition cursor-pointer"
                  >
                    Randomize
                  </button>
                </div>
              </div>

              {/* How it works */}
              <div className="space-y-2 text-slate-400 text-[11px] leading-relaxed">
                <h4 className="font-bold text-slate-200 text-xs flex items-center gap-1.5">
                  <Cpu className="w-4 h-4 text-blue-400" />
                  How Provably Fair Works
                </h4>
                <p>
                  1. <strong className="text-slate-300">Hash Commitment:</strong> Before each flight begins, the server generates a secret 256-bit seed and publishes its SHA-256 hash. The server cannot change the outcome afterwards without altering the hash.
                </p>
                <p>
                  2. <strong className="text-slate-300">Player Entropy:</strong> The crash multiplier is calculated via <code className="text-emerald-400 bg-slate-950 px-1 py-0.5 rounded">HMAC-SHA256(ServerSeed, ClientSeed + &quot;:&quot; + Nonce)</code>.
                </p>
                <p>
                  3. <strong className="text-slate-300">Third-Party Verification:</strong> You can verify any round independently using the Verifier tab or external tools like Python, Node.js, or CyberChef.
                </p>
              </div>
            </>
          ) : (
            /* Independent Verifier Tool */
            <div className="space-y-4">
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-300 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>Test any past flight outcome directly below to verify zero tampering.</span>
              </div>

              <div>
                <label className="font-bold text-slate-300 block mb-1">Server Seed (Hex)</label>
                <input
                  type="text"
                  value={verifyServerSeed}
                  onChange={(e) => setVerifyServerSeed(e.target.value)}
                  placeholder="Paste 64-character Server Seed..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 font-mono text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-300 block mb-1">Client Seed</label>
                  <input
                    type="text"
                    value={verifyClientSeed}
                    onChange={(e) => setVerifyClientSeed(e.target.value)}
                    placeholder="Client Seed..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 font-mono text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-300 block mb-1">Nonce (Round #)</label>
                  <input
                    type="number"
                    value={verifyNonce}
                    onChange={(e) => setVerifyNonce(e.target.value)}
                    placeholder="1"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 font-mono text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={handleVerify}
                disabled={!verifyServerSeed.trim() || isVerifying}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-slate-950 font-black text-sm tracking-wide transition active:scale-98 disabled:opacity-40 cursor-pointer"
              >
                {isVerifying ? 'Verifying Hashes...' : 'VERIFY ROUND OUTCOME'}
              </button>

              {verificationResult && (
                <div className="p-4 rounded-xl bg-slate-950 border border-emerald-500/40 space-y-2 animate-fade-in">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                    <span className="font-bold text-slate-300">Calculated Crash Multiplier:</span>
                    <span className="text-xl font-black text-emerald-400">
                      {verificationResult.calculatedCrash.toFixed(2)}x
                    </span>
                  </div>

                  <div>
                    <span className="text-[11px] text-slate-400 block">SHA-256 Server Hash:</span>
                    <span className="font-mono text-[10px] text-slate-300 break-all">
                      {verificationResult.serverHash}
                    </span>
                  </div>

                  <div>
                    <span className="text-[11px] text-slate-400 block">HMAC-SHA256 Output:</span>
                    <span className="font-mono text-[10px] text-slate-400 break-all">
                      {verificationResult.hmacHex}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import { createGoogleFeedbackForm, getAccessToken, googleSignIn } from '../services/firebaseAuth';
import { FileText, Send, CheckCircle2, AlertCircle, ExternalLink, X, Star } from 'lucide-react';

interface GoogleFormsModalProps {
  isOpen: boolean;
  onClose: () => void;
  userEmail: string;
}

export const GoogleFormsModal: React.FC<GoogleFormsModalProps> = ({
  isOpen,
  onClose,
  userEmail,
}) => {
  const [rating, setRating] = useState<number>(5);
  const [feedbackCategory, setFeedbackCategory] = useState<string>('Parachute Jumper Mechanics');
  const [comments, setComments] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [createdFormUrl, setCreatedFormUrl] = useState<string | null>(null);
  const [submittedLocal, setSubmittedLocal] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Confirmation dialog state for Google Workspace modification
  const [showConfirmDialog, setShowConfirmDialog] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleInitiateCreateForm = () => {
    setShowConfirmDialog(true);
  };

  const handleConfirmCreateGoogleForm = async () => {
    setShowConfirmDialog(false);
    setIsSubmitting(true);
    setError(null);
    try {
      let token = await getAccessToken();
      if (!token) {
        // Sign in first
        const res = await googleSignIn();
        token = res?.accessToken || null;
      }

      if (!token) {
        throw new Error('Google authentication required to create forms in your Google Drive/Forms.');
      }

      const result = await createGoogleFeedbackForm(
        "Balloon Crash Game - Player Feedback & VIP Survey",
        "Official survey responses and game balance feedback from Balloon Crash players."
      );

      setCreatedFormUrl(result.formUrl);
    } catch (err: any) {
      console.error(err);
      setError(err?.message || 'Could not create Google Form. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitInApp = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittedLocal(true);
    setTimeout(() => {
      setSubmittedLocal(false);
      onClose();
    }, 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-500/20 text-indigo-400 rounded-xl">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-white">Player Feedback & Google Forms</h2>
              <p className="text-xs text-slate-400">Rate the parachute action or export surveys to Google Forms</p>
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

        {/* Confirmation Modal for Google Forms creation */}
        {showConfirmDialog && (
          <div className="p-5 bg-amber-500/15 border-b border-amber-500/30 text-xs text-amber-200 space-y-3">
            <div className="flex items-center gap-2 font-bold text-amber-300">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>Permission Confirmation Required</span>
            </div>
            <p>
              Are you sure you want to create a new survey form titled <strong>&quot;Balloon Crash Game - Player Feedback &amp; VIP Survey&quot;</strong> in your Google Forms account?
            </p>
            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowConfirmDialog(false)}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmCreateGoogleForm}
                className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-black"
              >
                Yes, Create Form
              </button>
            </div>
          </div>
        )}

        {/* Body */}
        <div className="p-6 space-y-4 text-xs text-slate-300">
          {error && (
            <div className="p-3 bg-rose-500/15 border border-rose-500/30 rounded-xl text-rose-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {createdFormUrl && (
            <div className="p-4 bg-emerald-500/15 border border-emerald-500/30 rounded-xl text-emerald-300 space-y-2 animate-fade-in">
              <div className="flex items-center gap-2 font-bold">
                <CheckCircle2 className="w-4 h-4" />
                <span>Google Form Successfully Created!</span>
              </div>
              <p className="text-slate-300 text-[11px]">
                Your official Google Form has been generated with custom questions for rating, parachute feedback, and VIP requests.
              </p>
              <a
                href={createdFormUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-black rounded-lg text-xs mt-1"
              >
                Open Form in Google Forms <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          )}

          {submittedLocal ? (
            <div className="p-6 bg-slate-950 rounded-xl border border-emerald-500/40 text-center space-y-2">
              <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
              <h3 className="font-black text-white text-sm">Thank You for Your Feedback!</h3>
              <p className="text-slate-400 text-xs">Your suggestions help make Balloon Crash even better.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmitInApp} className="space-y-4">
              <div>
                <label className="font-bold text-slate-300 block mb-1.5">Game Rating</label>
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      className="p-1 text-2xl transition hover:scale-110 active:scale-95 cursor-pointer"
                    >
                      <Star
                        className={`w-6 h-6 ${
                          star <= rating
                            ? 'text-amber-400 fill-amber-400'
                            : 'text-slate-600 hover:text-slate-400'
                        }`}
                      />
                    </button>
                  ))}
                  <span className="text-xs font-bold text-amber-400 ml-2">
                    {rating === 5 ? '5/5 Outstanding!' : `${rating}/5 Stars`}
                  </span>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-300 block mb-1">Feedback Category</label>
                <select
                  value={feedbackCategory}
                  onChange={(e) => setFeedbackCategory(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 font-medium"
                >
                  <option value="Parachute Jumper Mechanics">Parachute Jumper Mechanics</option>
                  <option value="Multiplayer Chat & Bots">Multiplayer Chat &amp; Bots</option>
                  <option value="Provably Fair Verification">Provably Fair Verification</option>
                  <option value="Referral Rewards & Cashouts">Referral Rewards &amp; Cashouts</option>
                  <option value="VIP High Roller Application">VIP High Roller Application</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-300 block mb-1">Your Suggestions / Comments</label>
                <textarea
                  rows={3}
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                  placeholder="Tell us what you'd love to see in future updates..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs flex items-center justify-center gap-2 transition active:scale-98 cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                  Submit Feedback
                </button>

                <button
                  type="button"
                  onClick={handleInitiateCreateForm}
                  disabled={isSubmitting}
                  className="py-3 px-4 rounded-xl bg-indigo-600/20 border border-indigo-500/40 hover:bg-indigo-600/30 text-indigo-300 font-bold text-xs flex items-center gap-1.5 transition active:scale-98 cursor-pointer disabled:opacity-40"
                  title="Generate a Google Form in your Google Drive/Forms"
                >
                  <FileText className="w-4 h-4" />
                  {isSubmitting ? 'Creating...' : 'Sync to Google Forms'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

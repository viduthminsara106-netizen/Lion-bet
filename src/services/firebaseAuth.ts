import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, User } from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

// Initialize Firebase App
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);

const provider = new GoogleAuthProvider();
// Google Workspace Scopes
export const SCOPES = [
  'https://www.googleapis.com/auth/forms.body',
  'https://www.googleapis.com/auth/forms.responses.readonly'
];

SCOPES.forEach(scope => provider.addScope(scope));

let isSigningIn = false;
let cachedAccessToken: string | null = null;

export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      if (cachedAccessToken) {
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
      } else if (!isSigningIn) {
        cachedAccessToken = null;
        if (onAuthFailure) onAuthFailure();
      }
    } else {
      cachedAccessToken = null;
      if (onAuthFailure) onAuthFailure();
    }
  });
};

export const googleSignIn = async (): Promise<{ user: User; accessToken: string } | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Failed to get access token from Google Auth');
    }

    cachedAccessToken = credential.accessToken;
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error) {
    console.error('Sign in error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const getAccessToken = async (): Promise<string | null> => {
  return cachedAccessToken;
};

export const logoutGoogle = async () => {
  await auth.signOut();
  cachedAccessToken = null;
};

/**
 * Creates a Google Form for Balloon Crash Player Feedback
 */
export async function createGoogleFeedbackForm(title: string, description: string): Promise<any> {
  const token = await getAccessToken();
  if (!token) throw new Error('Not authenticated with Google Workspace');

  const response = await fetch('https://forms.googleapis.com/v1/forms', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      info: {
        title: title,
        documentTitle: title,
        description: description
      }
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Google Forms API error: ${response.status} - ${errorText}`);
  }

  const formData = await response.json();

  // Add questions to the form
  const formId = formData.formId;
  const updateResponse = await fetch(`https://forms.googleapis.com/v1/forms/${formId}:batchUpdate`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      requests: [
        {
          createItem: {
            item: {
              title: "What is your Balloon Crash rating?",
              description: "Rate the graphics, parachute jump effect, and flight suspense.",
              questionItem: {
                question: {
                  required: true,
                  choiceQuestion: {
                    type: "RADIO",
                    options: [
                      { value: "⭐️⭐️⭐️⭐️⭐️ Phenomenal!" },
                      { value: "⭐️⭐️⭐️⭐️ Great game" },
                      { value: "⭐️⭐️⭐️ Good" },
                      { value: "⭐️⭐️ Needs improvement" }
                    ]
                  }
                }
              }
            },
            location: { index: 0 }
          }
        },
        {
          createItem: {
            item: {
              title: "What is your favorite feature in the game?",
              description: "Tell us what you like best.",
              questionItem: {
                question: {
                  required: false,
                  choiceQuestion: {
                    type: "RADIO",
                    options: [
                      { value: "Parachute Jumper when Cashing Out" },
                      { value: "Provably Fair SHA-256 Verifier" },
                      { value: "Dual Betting & Auto Cashout" },
                      { value: "Referral Rewards & Leaderboards" },
                      { value: "Live Multiplayer Chat" }
                    ]
                  }
                }
              }
            },
            location: { index: 1 }
          }
        },
        {
          createItem: {
            item: {
              title: "Suggestions or VIP Support Notes",
              questionItem: {
                question: {
                  required: false,
                  textQuestion: {
                    paragraph: true
                  }
                }
              }
            },
            location: { index: 2 }
          }
        }
      ]
    })
  });

  return { formId, formUrl: `https://docs.google.com/forms/d/${formId}/edit`, responderUri: formData.responderUri };
}

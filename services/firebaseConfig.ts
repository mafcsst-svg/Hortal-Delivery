// Mocking Firebase to ensure the app runs without external dependencies or version conflicts.
// This replaces the actual Firebase SDK calls with local simulations.

export const app = {
  name: 'HortalApp',
};

export const auth = {
  currentUser: null,
};

// Simulated Firebase Auth functions
export const createUserWithEmailAndPassword = async (authInstance: any, email: string, password: string) => {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 800));
  
  if (email.includes('error')) {
    throw { code: 'auth/invalid-email' };
  }

  return {
    user: {
      uid: 'user-' + Math.random().toString(36).substr(2, 9),
      email: email,
      displayName: null
    }
  };
};

export const signInWithEmailAndPassword = async (authInstance: any, email: string, password: string) => {
  await new Promise(resolve => setTimeout(resolve, 800));

  if (email === 'fail@test.com') {
     throw { code: 'auth/user-not-found' };
  }

  return {
    user: {
      uid: 'user-' + Math.random().toString(36).substr(2, 9),
      email: email,
      displayName: 'Usuário Simulado'
    }
  };
};

export const updateProfile = async (user: any, updates: { displayName?: string }) => {
  if (user) {
    Object.assign(user, updates);
  }
  return;
};

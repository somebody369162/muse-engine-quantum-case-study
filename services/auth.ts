import { type Project, type User } from '../types';

// Simulate a user database in localStorage
const USERS_DB_KEY = 'muse-engine-users-db';
// FIX: Using a more generic prefix for cloud data storage.
// Simulate a cloud database in localStorage
const CLOUD_DATA_PREFIX = 'muse-engine-cloud-';
const CURRENT_USER_KEY = 'muse-engine-current-user';

// Internal type for the "database"
interface UserWithPassword extends User {
  passwordHash: string; // In a real app, this would be a hash
}

const getUsers = (): Record<string, UserWithPassword> => {
  try {
    const users = localStorage.getItem(USERS_DB_KEY);
    return users ? JSON.parse(users) : {};
  } catch {
    return {};
  }
};

const saveUsers = (users: Record<string, UserWithPassword>) => {
  localStorage.setItem(USERS_DB_KEY, JSON.stringify(users));
};

export const signUp = async (name: string, email: string, password: string): Promise<User> => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      const users = getUsers();
      if (users[email]) {
        return reject(new Error("An account with this email already exists."));
      }
      const newUser: UserWithPassword = {
        id: `user_${Date.now()}`,
        name,
        email,
        passwordHash: password, // In a real app: await hashPassword(password);
      };
      users[email] = newUser;
      saveUsers(users);

      const { passwordHash, ...userToReturn } = newUser;
      resolve(userToReturn);
    }, 500);
  });
};

export const signIn = async (email: string, password: string, rememberMe: boolean): Promise<User> => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      const users = getUsers();
      const userRecord = users[email];
      if (userRecord && userRecord.passwordHash === password) { // In a real app: await verifyPassword(password, userRecord.passwordHash)
        const { passwordHash, ...userToReturn } = userRecord;
        const storage = rememberMe ? localStorage : sessionStorage;
        storage.setItem(CURRENT_USER_KEY, JSON.stringify(userToReturn));
        resolve(userToReturn);
      } else {
        reject(new Error("Invalid credentials. Please check your email and password."));
      }
    }, 500);
  });
};

export const signOut = async (): Promise<void> => {
  return new Promise(resolve => {
    localStorage.removeItem(CURRENT_USER_KEY);
    sessionStorage.removeItem(CURRENT_USER_KEY);
    resolve();
  });
};

export const getPersistedUser = (): User | null => {
  try {
    // Prioritize localStorage for "Remember Me"
    const persistedUser = localStorage.getItem(CURRENT_USER_KEY);
    if (persistedUser) {
      return JSON.parse(persistedUser);
    }
    
    // Fallback to sessionStorage for the current session
    const sessionUser = sessionStorage.getItem(CURRENT_USER_KEY);
    return sessionUser ? JSON.parse(sessionUser) : null;
  } catch {
    return null;
  }
};

// FIX: Replaced project-specific functions with generic data handling for both projects and profiles.
export const saveDataForUser = async (userId: string, data: any[], storageType: 'projects' | 'profiles' | 'templates'): Promise<void> => {
  return new Promise(resolve => {
    console.log(`Simulating save ${storageType} to cloud for user ${userId}...`);
    setTimeout(() => {
      const key = `${CLOUD_DATA_PREFIX}${storageType}-${userId}`;
      localStorage.setItem(key, JSON.stringify(data));
      console.log('Cloud save successful.');
      resolve();
    }, 500);
  });
};

export const loadDataForUser = async (userId: string, storageType: 'projects' | 'profiles' | 'templates'): Promise<any[] | null> => {
  return new Promise(resolve => {
    console.log(`Simulating load ${storageType} from cloud for user ${userId}...`);
    setTimeout(() => {
      try {
        const key = `${CLOUD_DATA_PREFIX}${storageType}-${userId}`;
        const data = localStorage.getItem(key);
        resolve(data ? JSON.parse(data) : null);
      } catch {
        resolve(null);
      }
    }, 500);
  });
};
// Auth utility functions for localStorage operations
export const saveUser = (userData) => {
    const users = JSON.parse(localStorage.getItem('users')) || [];
    const existingUserIndex = users.findIndex(user => user.email === userData.email);
    
    if (existingUserIndex >= 0) {
      users[existingUserIndex] = userData; // Update existing user
    } else {
      users.push(userData); // Add new user
    }
    
    localStorage.setItem('users', JSON.stringify(users));
  };
  
  export const getUser = (email) => {
    const users = JSON.parse(localStorage.getItem('users')) || [];
    return users.find(user => user.email === email);
  };
  
  export const authenticateUser = (email, password) => {
    const user = getUser(email);
    return user && user.password === password;
  };